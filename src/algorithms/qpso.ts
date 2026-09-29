import {
  GraphVertex,
  GraphEdge,
  VehicleType,
  OptimizationMode,
  ObjectiveWeights,
  TrafficState,
  QpsoResult,
  QpsoIterationRecord,
  QpsoParticleCalculationState,
  EvaluatedRoute,
} from '../types';
import {
  computeEdgeMetaheuristicWeight,
  computeGraphNormalizationBounds,
  removeLoopsFromPath,
  resolveObjectiveWeights,
  getDynamicEdgeState,
  buildTrafficState,
  GraphNormalizationBounds,
} from './evaluator';
import { DirectedWeightedGraph } from '../core/graph';
import { recalculateRouteMetrics } from '../core/shortestPath';
import { GLOBAL_TRAINED_TRAFFIC_MODEL } from './trafficModel';

export interface QpsoOptions {
  swarmSize?: number;
  populationSize?: number;
  maxIterations?: number;
  betaMax?: number;
  betaMin?: number;
  seed?: number;
  stagnationLimit?: number;
  trafficState?: TrafficState;
  objectiveWeights?: ObjectiveWeights;
  graph?: DirectedWeightedGraph;
}

/**
 * Seeded pseudo-random number generator (Mulberry32)
 * Ensures 100% deterministic reproducibility when given the same random seed.
 */
export function createSeededRng(seed: number = 42): () => number {
  let a = (seed ^ 0xdeadbeef) >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Builds directed adjacency map for graph traversal under the given TrafficState.
 */
export function buildAdjacencyMap(
  edges: GraphEdge[],
  _vehicle?: VehicleType,
  trafficState?: TrafficState
): Map<string, GraphEdge[]> {
  const map = new Map<string, GraphEdge[]>();
  for (const edge of edges) {
    const dyn = getDynamicEdgeState(edge, trafficState);
    if (dyn.isBlocked || !isFinite(dyn.travelTime)) continue;
    let list = map.get(edge.from);
    if (!list) {
      list = [];
      map.set(edge.from, list);
    }
    list.push(edge);
  }
  return map;
}

/**
 * Calculates exact weighted shortest path on the network for a given objective weight configuration & TrafficState.
 */
export function findShortestDijkstraPath(
  startId: string,
  destId: string,
  vertices: GraphVertex[],
  edges: GraphEdge[],
  _vehicle?: VehicleType,
  adjMap?: Map<string, GraphEdge[]>,
  mode: OptimizationMode = 'balanced',
  bounds?: GraphNormalizationBounds,
  trafficState?: TrafficState,
  customWeights?: ObjectiveWeights
): string[] {
  if (startId === destId) return [startId];
  const graphAdj = adjMap ?? buildAdjacencyMap(edges, undefined, trafficState);
  const distances = new Map<string, number>();
  const previous = new Map<string, string | null>();
  const unvisited = new Set<string>();

  vertices.forEach(v => {
    distances.set(v.id, Infinity);
    previous.set(v.id, null);
    unvisited.add(v.id);
  });
  distances.set(startId, 0);

  const normBounds = bounds ?? computeGraphNormalizationBounds(edges, trafficState);

  while (unvisited.size > 0) {
    let current: string | null = null;
    let minDist = Infinity;
    for (const node of unvisited) {
      const d = distances.get(node)!;
      if (d < minDist) {
        minDist = d;
        current = node;
      }
    }

    if (!current || minDist === Infinity) break;
    if (current === destId) break;

    unvisited.delete(current);

    const outgoing = graphAdj.get(current) ?? [];
    for (const edge of outgoing) {
      if (!unvisited.has(edge.to)) continue;
      const edgeCost = computeEdgeMetaheuristicWeight(
        edge,
        mode,
        undefined,
        normBounds,
        trafficState,
        customWeights
      );
      if (!isFinite(edgeCost)) continue;

      const alt = minDist + edgeCost;
      if (alt < distances.get(edge.to)!) {
        distances.set(edge.to, alt);
        previous.set(edge.to, current);
      }
    }
  }

  const path: string[] = [];
  let curr: string | null = destId;
  const visited = new Set<string>();
  while (curr && !visited.has(curr)) {
    visited.add(curr);
    path.unshift(curr);
    if (curr === startId) break;
    curr = previous.get(curr) ?? null;
  }

  if (path[0] === startId && path[path.length - 1] === destId) {
    return removeLoopsFromPath(path);
  }
  return [];
}

export interface RouteDecodingDiagnostics {
  wasRepaired: boolean;
  isFeasible: boolean;
}

/**
 * Decodes a continuous QPSO particle position vector X_i in [0, 1]^D into a valid,
 * connected route R = (startId, ..., destId) through the Andhra Pradesh directed graph.
 *
 * Guarantees:
 * 1. Origin is strictly fixed to startId.
 * 2. Destination is strictly fixed to destId.
 * 3. Every edge transition exists in the directed graph.
 * 4. Disconnected jumps invoke graph-aware repair.
 * 5. Loops are eliminated.
 * 6. Fitness is evaluated using the unified multi-objective F(R, t).
 */
export function decodeParticleToRoute(
  startId: string,
  destId: string,
  particlePosition: number[],
  nodeIndexMap: Map<string, number>,
  vertices: GraphVertex[],
  edges: GraphEdge[],
  _vehicle?: VehicleType,
  mode: OptimizationMode = 'balanced',
  adjMap?: Map<string, GraphEdge[]>,
  bounds?: GraphNormalizationBounds,
  trafficState?: TrafficState,
  customWeights?: ObjectiveWeights,
  graphInstance?: DirectedWeightedGraph,
  diagnostics?: RouteDecodingDiagnostics
): EvaluatedRoute {
  const normBounds = bounds ?? computeGraphNormalizationBounds(edges, trafficState);
  const weights = resolveObjectiveWeights(mode, customWeights);
  const graph = graphInstance ?? DirectedWeightedGraph.fromNetwork(vertices, edges);

  if (startId === destId) {
    if (diagnostics) {
      diagnostics.wasRepaired = false;
      diagnostics.isFeasible = true;
    }
    return recalculateRouteMetrics([startId], graph, trafficState, weights, normBounds, startId, destId);
  }

  const graphAdj = adjMap ?? buildAdjacencyMap(edges, undefined, trafficState);
  const distances = new Map<string, number>();
  const previous = new Map<string, string | null>();
  const unvisited = new Set<string>();

  vertices.forEach(v => {
    distances.set(v.id, Infinity);
    previous.set(v.id, null);
    unvisited.add(v.id);
  });
  distances.set(startId, 0);

  while (unvisited.size > 0) {
    let current: string | null = null;
    let minDist = Infinity;
    for (const node of unvisited) {
      const d = distances.get(node)!;
      if (d < minDist) {
        minDist = d;
        current = node;
      }
    }

    if (!current || minDist === Infinity) break;
    if (current === destId) break;

    unvisited.delete(current);

    const outgoing = graphAdj.get(current) ?? [];
    for (const edge of outgoing) {
      if (!unvisited.has(edge.to)) continue;

      const baseCost = computeEdgeMetaheuristicWeight(
        edge,
        mode,
        undefined,
        normBounds,
        trafficState,
        weights
      );
      if (!isFinite(baseCost)) continue;

      // Particle continuous gene modulating edge traversal desirability
      const targetIdx = nodeIndexMap.get(edge.to) ?? 0;
      const pWeight = particlePosition[targetIdx % particlePosition.length] ?? 0.5;
      // Quantum potential modulation of edge traversal
      const modulatedCost = baseCost * (0.75 + 0.50 * pWeight);

      const alt = minDist + modulatedCost;
      if (alt < distances.get(edge.to)!) {
        distances.set(edge.to, alt);
        previous.set(edge.to, current);
      }
    }
  }

  // Reconstruct connected path
  const rawPath: string[] = [];
  let curr: string | null = destId;
  const visitedDecoded = new Set<string>();
  while (curr && !visitedDecoded.has(curr)) {
    visitedDecoded.add(curr);
    rawPath.unshift(curr);
    if (curr === startId) break;
    curr = previous.get(curr) ?? null;
  }

  const cleanPath = removeLoopsFromPath(rawPath);

  // Check if primary decoded path successfully connected startId to destId
  if (cleanPath[0] === startId && cleanPath[cleanPath.length - 1] === destId) {
    const evaluated = recalculateRouteMetrics(cleanPath, graph, trafficState, weights, normBounds, startId, destId);
    if (evaluated.isFeasible) {
      if (diagnostics) {
        diagnostics.wasRepaired = false;
        diagnostics.isFeasible = true;
      }
      return evaluated;
    }
  }

  // Graph-aware repair mechanism: fallback to connected shortest feasible path on active graph
  if (diagnostics) {
    diagnostics.wasRepaired = true;
  }

  const fallbackPath = findShortestDijkstraPath(
    startId,
    destId,
    vertices,
    edges,
    undefined,
    graphAdj,
    mode,
    normBounds,
    trafficState,
    weights
  );

  if (fallbackPath.length >= 2) {
    const repairedEval = recalculateRouteMetrics(fallbackPath, graph, trafficState, weights, normBounds, startId, destId);
    if (diagnostics) {
      diagnostics.isFeasible = repairedEval.isFeasible;
    }
    return repairedEval;
  }

  if (diagnostics) {
    diagnostics.isFeasible = false;
  }

  return {
    nodeIds: cleanPath,
    segments: [],
    totalDistanceKm: 0,
    baseTimeMin: 0,
    totalTimeMin: 0,
    totalCongestion: 0,
    normalizedTime: 0,
    normalizedDistance: 0,
    normalizedCongestion: 0,
    objectiveWeights: weights,
    trafficTimestamp: trafficState?.timestamp,
    averageTrafficFactor: 1.0,
    averageRisk: 0,
    congestionCost: 0,
    riskCost: 0,
    fitness: Infinity,
    isFeasible: false,
    infeasibilityReason: 'No feasible connected route exists between origin and destination under current traffic state',
  };
}

export interface CorridorSubgraph {
  subVertices: GraphVertex[];
  subEdges: GraphEdge[];
  nodeIndexMap: Map<string, number>;
  corridorNodeIds: Set<string>;
}

/**
 * Extracts a compact corridor subgraph around the Pareto-efficient paths (Time, Distance, Congestion, Balanced, and Bypass)
 * between origin and destination under the active TrafficState.
 */
export function extractCorridorSubgraph(
  startId: string,
  destId: string,
  vertices: GraphVertex[],
  edges: GraphEdge[],
  _vehicle?: VehicleType,
  trafficState?: TrafficState,
  customWeights?: ObjectiveWeights
): CorridorSubgraph {
  const corridorNodeIds = new Set<string>();
  corridorNodeIds.add(startId);
  corridorNodeIds.add(destId);

  const adjMap = buildAdjacencyMap(edges, undefined, trafficState);
  const bounds = computeGraphNormalizationBounds(edges, trafficState);

  // 1. Collect nodes from extreme & balanced objective weight vectors
  const weightProfiles: ObjectiveWeights[] = [
    customWeights ?? { wT: 0.40, wD: 0.30, wC: 0.30 },
    { wT: 1.0, wD: 0.0, wC: 0.0 },   // Pure Time
    { wT: 0.0, wD: 1.0, wC: 0.0 },   // Pure Distance
    { wT: 0.0, wD: 0.0, wC: 1.0 },   // Pure Congestion Avoidance
    { wT: 0.70, wD: 0.15, wC: 0.15 }, // Time-focused
    { wT: 0.15, wD: 0.70, wC: 0.15 }, // Distance-focused
    { wT: 0.25, wD: 0.15, wC: 0.60 }, // Congestion-focused
  ];

  for (const w of weightProfiles) {
    const p = findShortestDijkstraPath(
      startId,
      destId,
      vertices,
      edges,
      undefined,
      adjMap,
      'balanced',
      bounds,
      trafficState,
      w
    );
    p.forEach(id => corridorNodeIds.add(id));
  }

  // 2. Discover alternative bypass corridors by penalizing primary edges
  const penalizedEdges: GraphEdge[] = edges.map(e => {
    if (corridorNodeIds.has(e.from) && corridorNodeIds.has(e.to) && e.roadType !== 'expressway') {
      return {
        ...e,
        trafficFactor: e.trafficFactor * 2.2,
        historical_congestion: (e.historical_congestion ?? e.trafficFactor) * 2.2,
      };
    }
    return e;
  });
  const detour = findShortestDijkstraPath(
    startId,
    destId,
    vertices,
    penalizedEdges,
    undefined,
    undefined,
    'balanced',
    bounds,
    undefined,
    customWeights
  );
  detour.forEach(id => corridorNodeIds.add(id));

  // 3. Include connected adjacent bypass vertices (up to 120 vertices)
  for (const edge of edges) {
    if (corridorNodeIds.size >= 120) break;
    if (corridorNodeIds.has(edge.from) && !corridorNodeIds.has(edge.to)) {
      const hasReturn = edges.some(
        e2 => e2.from === edge.to && corridorNodeIds.has(e2.to) && e2.to !== edge.from
      );
      if (hasReturn) {
        corridorNodeIds.add(edge.to);
      }
    }
  }

  const subVertices = vertices.filter(v => corridorNodeIds.has(v.id));
  const subEdges = edges.filter(e => corridorNodeIds.has(e.from) && corridorNodeIds.has(e.to));

  const nodeIndexMap = new Map<string, number>();
  subVertices.forEach((v, idx) => nodeIndexMap.set(v.id, idx));

  return {
    subVertices,
    subEdges,
    nodeIndexMap,
    corridorNodeIds,
  };
}

/**
 * Adaptive Quantum-Inspired Particle Swarm Optimization (QPSO) Engine
 *
 * Implements the continuous Delta-Potential-Well quantum swarm mechanics:
 *   mbest(t) = (1/M) * sum(P_i(t))
 *   p_ij(t)  = phi * P_ij(t) + (1 - phi) * G_j(t)
 *   X_ij(t+1)= p_ij(t) +/- beta(t) * |mbest_j - X_ij(t)| * ln(1 / u)
 *
 * Evaluates candidate routes strictly against the unified multi-objective:
 *   F(R, t) = wT * T_norm(R, t) + wD * D_norm(R) + wC * C_norm(R, t)
 */
export function runQpsoOptimization(
  startId: string,
  destId: string,
  vertices: GraphVertex[],
  edges: GraphEdge[],
  mode: OptimizationMode = 'balanced',
  _vehicle?: VehicleType,
  options: QpsoOptions = {}
): QpsoResult {
  const startTime = performance.now();

  const swarmSize = options.populationSize ?? options.swarmSize ?? 18;
  const maxIterations = options.maxIterations ?? 30;
  const betaMax = options.betaMax ?? 1.0;
  const betaMin = options.betaMin ?? 0.5;
  const seed = options.seed ?? 42;
  const stagnationLimit = options.stagnationLimit ?? 6;

  const rng = createSeededRng(seed);

  const activeTrafficState = options.trafficState ?? buildTrafficState(edges, '08:30', 'weekday');
  const activeWeights = resolveObjectiveWeights(mode, options.objectiveWeights);
  const fullGraph = options.graph ?? DirectedWeightedGraph.fromNetwork(vertices, edges);

  const { subVertices, subEdges, nodeIndexMap } = extractCorridorSubgraph(
    startId,
    destId,
    vertices,
    edges,
    undefined,
    activeTrafficState,
    activeWeights
  );
  const subAdjMap = buildAdjacencyMap(subEdges, undefined, activeTrafficState);
  const dim = Math.max(1, subVertices.length);
  const normBounds = fullGraph.computeNormalizationBounds(activeTrafficState);

  // Tracking counters
  let totalCandidateEvaluations = 0;
  let totalRepairs = 0;
  let totalFeasibleSolutions = 0;

  // Initialize particles
  const particles: number[][] = [];
  const pbestPositions: number[][] = [];
  const pbestFitnesses: number[] = [];
  const pbestRoutes: EvaluatedRoute[] = [];

  let gbestPosition: number[] = new Array(dim).fill(0.5);
  let gbestFitness = Infinity;
  let gbestRoute: EvaluatedRoute | null = null;

  // Compute Trained Model Predictions for Subgraph Corridor Nodes
  const nodeModelPriors = subVertices.map(v => {
    const connectedEdges = subEdges.filter(e => e.from === v.id || e.to === v.id);
    if (connectedEdges.length === 0) {
      return {
        predictedCongestion: 1.15,
        predictedRisk: 2.0,
        confidence: 0.90,
        desirability: 0.5,
      };
    }
    let totalCong = 0;
    let totalRisk = 0;
    let totalConf = 0;
    let totalDesir = 0;
    for (const edge of connectedEdges) {
      const pred = GLOBAL_TRAINED_TRAFFIC_MODEL.predictEdge(
        edge,
        activeTrafficState.hour,
        activeTrafficState
      );
      totalCong += pred.predictedCongestion;
      totalRisk += pred.predictedRiskScore;
      totalConf += pred.modelConfidence;
      totalDesir += pred.priorDesirability;
    }
    const k = connectedEdges.length;
    return {
      predictedCongestion: Number((totalCong / k).toFixed(2)),
      predictedRisk: Number((totalRisk / k).toFixed(1)),
      confidence: Number((totalConf / k).toFixed(3)),
      desirability: Number((totalDesir / k).toFixed(3)),
    };
  });

  // Heuristic seed path for initial particle 0
  const seedPath = findShortestDijkstraPath(
    startId,
    destId,
    subVertices,
    subEdges,
    undefined,
    subAdjMap,
    mode,
    normBounds,
    activeTrafficState,
    activeWeights
  );

  // Swarm Initialization
  for (let i = 0; i < swarmSize; i++) {
    const pos: number[] = [];
    for (let d = 0; d < dim; d++) {
      if (i === 0 && seedPath.length > 0) {
        const nodeId = subVertices[d]?.id;
        const onSeed = nodeId ? seedPath.includes(nodeId) : false;
        const baseVal = onSeed ? 0.15 : 0.70;
        const perturb = (rng() - 0.5) * 0.08;
        pos.push(Math.max(0.01, Math.min(0.99, baseVal + perturb)));
      } else if (i <= Math.floor(swarmSize / 2)) {
        const modelTarget = 1.0 - (nodeModelPriors[d]?.desirability ?? 0.5);
        const uncert = (1.0 - (nodeModelPriors[d]?.confidence ?? 0.9)) * 0.35;
        const noise = (rng() - 0.5) * uncert;
        pos.push(Math.max(0.01, Math.min(0.99, modelTarget + noise)));
      } else {
        const stratBase = (i + (nodeModelPriors[d]?.desirability ?? 0.5)) / (swarmSize + 1);
        const perturb = (rng() - 0.5) * 0.30;
        pos.push(Math.max(0.01, Math.min(0.99, stratBase + perturb)));
      }
    }
    particles.push(pos);
    pbestPositions.push([...pos]);

    const diag: RouteDecodingDiagnostics = { wasRepaired: false, isFeasible: false };
    const initialRoute = decodeParticleToRoute(
      startId,
      destId,
      pos,
      nodeIndexMap,
      subVertices,
      subEdges,
      undefined,
      mode,
      subAdjMap,
      normBounds,
      activeTrafficState,
      activeWeights,
      fullGraph,
      diag
    );

    totalCandidateEvaluations++;
    if (diag.wasRepaired) totalRepairs++;
    if (initialRoute.isFeasible) totalFeasibleSolutions++;

    pbestFitnesses.push(initialRoute.fitness);
    pbestRoutes.push(initialRoute);

    if (initialRoute.isFeasible && initialRoute.fitness < gbestFitness) {
      gbestFitness = initialRoute.fitness;
      gbestPosition = [...pos];
      gbestRoute = initialRoute;
    }
  }

  // Ensure gbest is initialized
  if (!gbestRoute && seedPath.length >= 2) {
    const fallbackEval = recalculateRouteMetrics(seedPath, fullGraph, activeTrafficState, activeWeights, normBounds, startId, destId);
    if (fallbackEval.isFeasible) {
      gbestRoute = fallbackEval;
      gbestFitness = fallbackEval.fitness;
    }
  }

  const convergenceHistory: QpsoIterationRecord[] = [];
  let sampleCalculation: QpsoParticleCalculationState | undefined;

  // Initial Swarm Diversity S(0)
  const meanPos0: number[] = new Array(dim).fill(0);
  for (let d = 0; d < dim; d++) {
    let s = 0;
    for (let i = 0; i < swarmSize; i++) s += particles[i][d];
    meanPos0[d] = s / swarmSize;
  }
  let totalDisp0 = 0;
  for (let i = 0; i < swarmSize; i++) {
    let distSq = 0;
    for (let d = 0; d < dim; d++) {
      const diff = particles[i][d] - meanPos0[d];
      distSq += diff * diff;
    }
    totalDisp0 += Math.sqrt(distSq / dim);
  }
  const initDiversity = Number((totalDisp0 / swarmSize).toFixed(4));

  const validInitFits = pbestFitnesses.filter(f => f < Infinity);
  const initMean = validInitFits.length > 0
    ? validInitFits.reduce((a, b) => a + b, 0) / validInitFits.length
    : gbestFitness;
  const initWorst = validInitFits.length > 0 ? Math.max(...validInitFits) : gbestFitness;
  const initVariance = validInitFits.length > 0
    ? validInitFits.reduce((s, f) => s + Math.pow(f - initMean, 2), 0) / validInitFits.length
    : 0;

  convergenceHistory.push({
    iteration: 0,
    bestFitness: gbestFitness === Infinity ? 999 : Number(gbestFitness.toFixed(4)),
    meanFitness: Number(initMean.toFixed(4)),
    worstFitness: Number(initWorst.toFixed(4)),
    fitnessStdDev: Number(Math.sqrt(initVariance).toFixed(4)),
    swarmDiversity: initDiversity,
    beta: betaMax,
    deltaFitness: 0,
    explorationRate: 100,
  });

  let prevBestFitness = gbestFitness;
  let stagnationCounter = 0;

  // Main Adaptive QPSO Evolution Loop
  for (let t = 1; t <= maxIterations; t++) {
    // 1. Adaptive Beta Schedule with Stagnation Mitigation
    let beta = betaMax - (t / maxIterations) * (betaMax - betaMin);
    if (stagnationCounter >= stagnationLimit) {
      // Dynamic exploration boost to escape local basin
      beta = Math.min(betaMax, beta + 0.18);
    }

    // 2. Compute Mean Best Position (mbest) across Personal Bests
    const mbest: number[] = new Array(dim).fill(0);
    for (let d = 0; d < dim; d++) {
      let sum = 0;
      for (let i = 0; i < swarmSize; i++) {
        sum += pbestPositions[i][d];
      }
      mbest[d] = sum / swarmSize;
    }

    // 3. Update Quantum Particle Coordinates
    for (let i = 0; i < swarmSize; i++) {
      for (let d = 0; d < dim; d++) {
        const modelPrior = nodeModelPriors[d] ?? {
          predictedCongestion: 1.15,
          predictedRisk: 2.0,
          confidence: 0.9,
          desirability: 0.5,
        };

        const phi = rng();
        // Stochastic local attractor p_id
        const p_id = phi * pbestPositions[i][d] + (1.0 - phi) * (gbestPosition[d] ?? 0.5);

        const u = Math.max(1e-5, Math.min(1.0 - 1e-5, rng()));
        const delta = beta * Math.abs(mbest[d] - particles[i][d]) * Math.log(1.0 / u);
        const sign = rng() < 0.5 ? 1 : -1;

        let newPos = p_id + sign * delta;
        if (newPos < 0) newPos = 0;
        if (newPos > 1) newPos = 1;

        if (!sampleCalculation && t === Math.min(4, Math.floor(maxIterations / 3)) && i === 0 && d === 0) {
          sampleCalculation = {
            particleIndex: 1,
            iteration: t,
            dimension: d,
            dimensionName: subVertices[d]?.name || `Node ${d}`,
            x_current: Number(particles[i][d].toFixed(4)),
            pbest_val: Number(pbestPositions[i][d].toFixed(4)),
            gbest_val: Number((gbestPosition[d] ?? 0.5).toFixed(4)),
            mbest_val: Number(mbest[d].toFixed(4)),
            phi: Number(phi.toFixed(4)),
            p_attractor: Number(p_id.toFixed(4)),
            beta: Number(beta.toFixed(4)),
            u: Number(u.toFixed(4)),
            delta: Number(delta.toFixed(4)),
            sign,
            x_next: Number(newPos.toFixed(4)),
            isModelGuided: true,
            modelPredictedCongestion: modelPrior.predictedCongestion,
            modelPredictedRisk: modelPrior.predictedRisk,
            modelConfidence: modelPrior.confidence,
            modelPriorDesirability: modelPrior.desirability,
            modelFeatureContribution: 'Adaptive QPSO Potential-Well Update',
          };
        }

        particles[i][d] = newPos;
      }

      // 4. Graph-Aware Route Decoding & Multi-Objective Evaluation
      const diag: RouteDecodingDiagnostics = { wasRepaired: false, isFeasible: false };
      const candidateRoute = decodeParticleToRoute(
        startId,
        destId,
        particles[i],
        nodeIndexMap,
        subVertices,
        subEdges,
        undefined,
        mode,
        subAdjMap,
        normBounds,
        activeTrafficState,
        activeWeights,
        fullGraph,
        diag
      );

      totalCandidateEvaluations++;
      if (diag.wasRepaired) totalRepairs++;
      if (candidateRoute.isFeasible) totalFeasibleSolutions++;

      // 5. Personal Best Update
      if (candidateRoute.isFeasible && candidateRoute.fitness < pbestFitnesses[i]) {
        pbestFitnesses[i] = candidateRoute.fitness;
        pbestPositions[i] = [...particles[i]];
        pbestRoutes[i] = candidateRoute;

        // 6. Global Best Update
        if (candidateRoute.fitness < gbestFitness) {
          gbestFitness = candidateRoute.fitness;
          gbestPosition = [...particles[i]];
          gbestRoute = candidateRoute;
        }
      }
    }

    // 7. Swarm Spatial Diversity Calculation S(t)
    const currentMeanPos: number[] = new Array(dim).fill(0);
    for (let d = 0; d < dim; d++) {
      let sum = 0;
      for (let i = 0; i < swarmSize; i++) sum += particles[i][d];
      currentMeanPos[d] = sum / swarmSize;
    }
    let totalDisp = 0;
    let exploringCount = 0;
    for (let i = 0; i < swarmSize; i++) {
      let distSqMean = 0;
      let distSqPbest = 0;
      for (let d = 0; d < dim; d++) {
        const diffMean = particles[i][d] - currentMeanPos[d];
        distSqMean += diffMean * diffMean;
        const diffPbest = particles[i][d] - pbestPositions[i][d];
        distSqPbest += diffPbest * diffPbest;
      }
      totalDisp += Math.sqrt(distSqMean / dim);
      if (Math.sqrt(distSqPbest / dim) > 0.08) {
        exploringCount++;
      }
    }
    const swarmDiversity = Number((totalDisp / swarmSize).toFixed(4));
    const explorationRate = Number(((exploringCount / swarmSize) * 100).toFixed(1));

    const validFitnesses = pbestFitnesses.filter(f => f < Infinity);
    const meanFit = validFitnesses.length > 0
      ? validFitnesses.reduce((a, b) => a + b, 0) / validFitnesses.length
      : gbestFitness;
    const worstFit = validFitnesses.length > 0 ? Math.max(...validFitnesses) : gbestFitness;
    const variance = validFitnesses.length > 0
      ? validFitnesses.reduce((s, f) => s + Math.pow(f - meanFit, 2), 0) / validFitnesses.length
      : 0;
    const fitnessStdDev = Number(Math.sqrt(variance).toFixed(4));

    const deltaFitness = Number(Math.abs(prevBestFitness - gbestFitness).toFixed(4));
    if (deltaFitness < 1e-4) {
      stagnationCounter++;
    } else {
      stagnationCounter = 0;
    }
    prevBestFitness = gbestFitness;

    convergenceHistory.push({
      iteration: t,
      bestFitness: gbestFitness === Infinity ? 999 : Number(gbestFitness.toFixed(4)),
      meanFitness: Number(meanFit.toFixed(4)),
      worstFitness: Number(worstFit.toFixed(4)),
      fitnessStdDev,
      swarmDiversity,
      beta: Number(beta.toFixed(3)),
      deltaFitness,
      explorationRate,
    });
  }

  // Final Validation on Full Graph Instance
  if (gbestRoute && gbestRoute.isFeasible && gbestRoute.nodeIds.length >= 2) {
    gbestRoute = recalculateRouteMetrics(
      gbestRoute.nodeIds,
      fullGraph,
      activeTrafficState,
      activeWeights,
      normBounds,
      startId,
      destId
    );
    gbestFitness = gbestRoute.fitness;
  }

  const executionTimeMs = Number(Math.max(0.65, performance.now() - startTime).toFixed(2));
  const modelMetrics = GLOBAL_TRAINED_TRAFFIC_MODEL.getMetrics();

  return {
    bestRoute: gbestRoute,
    convergenceHistory,
    executionTimeMs,
    particlesCount: swarmSize,
    iterationsCount: maxIterations,
    allCandidateRoutesEvaluated: totalCandidateEvaluations,
    sampleCalculation,
    trafficState: activeTrafficState,
    objectiveWeights: activeWeights,
    seed,
    repairCount: totalRepairs,
    feasibleSolutionCount: totalFeasibleSolutions,
    trainedModelMetrics: {
      modelType: modelMetrics.modelType,
      r2Score: modelMetrics.r2Score,
      meanAbsoluteError: modelMetrics.meanAbsoluteError,
      trainingSamples: modelMetrics.totalTrainingSamples,
      trainingEpochs: modelMetrics.trainingEpochs,
      topFeatures: modelMetrics.featureWeights.slice(0, 5).map(f => ({
        name: f.featureName,
        importancePercent: f.relativeImportancePercent,
      })),
    },
  };
}
