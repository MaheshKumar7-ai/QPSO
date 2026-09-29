import {
  EvaluatedRoute,
  RouteSegment,
  ObjectiveWeights,
  TrafficState,
  DynamicEdgeState,
} from '../types';
import { DirectedWeightedGraph, GraphNormalizationBounds } from './graph';
import { calculateHaversineKm } from '../data/indiaLocations';
import { getDynamicEdgeState } from '../algorithms/trafficModel';

export interface ShortestPathResult extends EvaluatedRoute {
  nodesEvaluated: number;
  runtimeMs: number;
  algorithm: 'Dijkstra' | 'A*';
}

/**
 * Validates route feasibility on the directed graph:
 * - Checks node count >= 2
 * - Checks start and destination match
 * - Checks every consecutive node pair has a valid directed edge
 * - Checks no edge is blocked in active traffic state
 */
export function validateDirectedRoute(
  nodeIds: string[],
  graph: DirectedWeightedGraph,
  trafficState?: TrafficState,
  expectedStartId?: string,
  expectedDestId?: string
): {
  isValid: boolean;
  reason?: string;
  edges: import('../types').GraphEdge[];
  dynamicStates: DynamicEdgeState[];
} {
  if (!nodeIds || nodeIds.length < 2) {
    return { isValid: false, reason: 'Route contains fewer than 2 nodes', edges: [], dynamicStates: [] };
  }

  if (expectedStartId && nodeIds[0] !== expectedStartId) {
    return { isValid: false, reason: `Route does not start at origin (${expectedStartId})`, edges: [], dynamicStates: [] };
  }

  if (expectedDestId && nodeIds[nodeIds.length - 1] !== expectedDestId) {
    return { isValid: false, reason: `Route does not end at destination (${expectedDestId})`, edges: [], dynamicStates: [] };
  }

  const edges: import('../types').GraphEdge[] = [];
  const dynamicStates: DynamicEdgeState[] = [];

  for (let i = 0; i < nodeIds.length - 1; i++) {
    const fromId = nodeIds[i];
    const toId = nodeIds[i + 1];

    if (!graph.hasVertex(fromId) || !graph.hasVertex(toId)) {
      return { isValid: false, reason: `Vertex ${fromId} or ${toId} does not exist in graph`, edges: [], dynamicStates: [] };
    }

    const edge = graph.getEdge(fromId, toId);
    if (!edge) {
      return { isValid: false, reason: `No directed edge exists from ${fromId} to ${toId}`, edges: [], dynamicStates: [] };
    }

    const dyn = getDynamicEdgeState(edge, trafficState);
    if (dyn.isBlocked) {
      return { isValid: false, reason: `Edge ${edge.id} (${fromId} -> ${toId}) is blocked under current traffic state`, edges: [], dynamicStates: [] };
    }

    edges.push(edge);
    dynamicStates.push(dyn);
  }

  return { isValid: true, edges, dynamicStates };
}

/**
 * Independent route metrics recalculator from actual directed graph edges.
 * Strictly calculates:
 * - Distance D(R) = sum of edge distances
 * - Travel Time T(R, t) = sum of dynamic travel times
 * - Congestion C(R, t) = sum of dynamic edge congestion costs
 * - Objective Cost F(R, t) = wT * T_norm + wD * D_norm + wC * C_norm
 */
export function recalculateRouteMetrics(
  nodeIds: string[],
  graph: DirectedWeightedGraph,
  trafficState?: TrafficState,
  objectiveWeights?: ObjectiveWeights,
  bounds?: GraphNormalizationBounds,
  expectedStartId?: string,
  expectedDestId?: string
): EvaluatedRoute {
  const normBounds = bounds ?? graph.computeNormalizationBounds(trafficState);
  const weights = objectiveWeights ?? { wT: 0.40, wD: 0.30, wC: 0.30 };

  const validation = validateDirectedRoute(nodeIds, graph, trafficState, expectedStartId, expectedDestId);

  if (!validation.isValid) {
    return {
      nodeIds,
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
      infeasibilityReason: validation.reason,
    };
  }

  let totalDistKm = 0;
  let totalBaseTimeMin = 0;
  let totalDynamicTimeMin = 0;
  let totalCongestionCost = 0;
  let totalRisk = 0;
  let weightedCongestionSum = 0;

  const segments: RouteSegment[] = [];

  for (let i = 0; i < validation.edges.length; i++) {
    const edge = validation.edges[i];
    const dyn = validation.dynamicStates[i];
    const fromNode = graph.getVertex(edge.from)!;
    const toNode = graph.getVertex(edge.to)!;

    const segDist = dyn.distance;
    const segBaseTime = (segDist / Math.max(15, edge.baseSpeedKmH)) * 60;
    const segDynTime = dyn.travelTime;
    const segCongCost = Math.max(0, (dyn.congestion - 1.0) * segDist);
    const segRisk = edge.historical_risk ?? edge.riskScore ?? 2.0;

    totalDistKm += segDist;
    totalBaseTimeMin += segBaseTime;
    totalDynamicTimeMin += segDynTime;
    totalCongestionCost += segCongCost;
    totalRisk += segRisk;
    weightedCongestionSum += dyn.congestion * segDist;

    const normT = normBounds.maxTime > 0 ? segDynTime / normBounds.maxTime : 0;
    const normD = normBounds.maxDist > 0 ? segDist / normBounds.maxDist : 0;
    const normC = normBounds.maxCongestion > 0 ? segCongCost / normBounds.maxCongestion : 0;
    const segCost = weights.wT * normT + weights.wD * normD + weights.wC * normC;

    segments.push({
      fromNode,
      toNode,
      edge,
      segmentDistanceKm: segDist,
      baseTimeMin: Number(segBaseTime.toFixed(2)),
      adjustedTimeMin: Number(segDynTime.toFixed(2)),
      congestionIndex: dyn.congestion,
      currentSpeedKmH: dyn.currentSpeed,
      normalizedTime: Number(normT.toFixed(4)),
      normalizedDistance: Number(normD.toFixed(4)),
      normalizedCongestion: Number(normC.toFixed(4)),
      segmentObjectiveCost: Number(segCost.toFixed(6)),
      effectiveRisk: segRisk,
      isBlocked: dyn.isBlocked,
    });
  }

  const k = Math.max(1, segments.length);
  const avgTrafficFactor = totalDistKm > 0 ? weightedCongestionSum / totalDistKm : 1.0;
  const avgRisk = totalRisk / k;

  // Global Route Normalization
  const routeNormT = normBounds.maxTime > 0 ? totalDynamicTimeMin / (normBounds.maxTime * Math.max(1, k * 0.45)) : 0;
  const routeNormD = normBounds.maxDist > 0 ? totalDistKm / (normBounds.maxDist * Math.max(1, k * 0.45)) : 0;
  const routeNormC = normBounds.maxCongestion > 0 ? totalCongestionCost / (normBounds.maxCongestion * Math.max(1, k * 0.45)) : 0;

  // Recalculate centralized objective value from segment costs
  const totalObjectiveValue = segments.reduce((acc, s) => acc + (s.segmentObjectiveCost ?? 0), 0);

  return {
    nodeIds,
    segments,
    totalDistanceKm: Number(totalDistKm.toFixed(2)),
    baseTimeMin: Number(totalBaseTimeMin.toFixed(2)),
    totalTimeMin: Number(totalDynamicTimeMin.toFixed(2)),
    totalCongestion: Number(totalCongestionCost.toFixed(2)),
    normalizedTime: Number(routeNormT.toFixed(4)),
    normalizedDistance: Number(routeNormD.toFixed(4)),
    normalizedCongestion: Number(routeNormC.toFixed(4)),
    objectiveWeights: weights,
    trafficTimestamp: trafficState?.timestamp,
    averageTrafficFactor: Number(avgTrafficFactor.toFixed(3)),
    averageRisk: Number(avgRisk.toFixed(2)),
    congestionCost: Number(totalCongestionCost.toFixed(2)),
    riskCost: Number(totalRisk.toFixed(2)),
    fitness: Number(totalObjectiveValue.toFixed(4)),
    isFeasible: true,
  };
}

/**
 * Dijkstra Shortest Path Engine on Directed Weighted Graph
 * Uniform-cost search optimizing the exact dynamic multi-objective cost:
 * f(e, t) = wT * T_norm(e, t) + wD * D_norm(e) + wC * C_norm(e, t)
 */
export function runDijkstraShortestPath(
  graph: DirectedWeightedGraph,
  startId: string,
  destId: string,
  trafficState?: TrafficState,
  objectiveWeights?: ObjectiveWeights,
  bounds?: GraphNormalizationBounds
): ShortestPathResult {
  const startTime = performance.now();
  const normBounds = bounds ?? graph.computeNormalizationBounds(trafficState);
  const weights = objectiveWeights ?? { wT: 0.40, wD: 0.30, wC: 0.30 };

  if (!graph.hasVertex(startId) || !graph.hasVertex(destId)) {
    const res = recalculateRouteMetrics([], graph, trafficState, weights, normBounds, startId, destId);
    return {
      ...res,
      nodesEvaluated: 0,
      runtimeMs: Number((performance.now() - startTime).toFixed(2)),
      algorithm: 'Dijkstra',
    };
  }

  if (startId === destId) {
    const res = recalculateRouteMetrics([startId], graph, trafficState, weights, normBounds, startId, destId);
    return {
      ...res,
      nodesEvaluated: 1,
      runtimeMs: Number((performance.now() - startTime).toFixed(2)),
      algorithm: 'Dijkstra',
    };
  }

  const distances = new Map<string, number>();
  const previous = new Map<string, string | null>();
  const unvisited = new Set<string>();
  let nodesEvaluated = 0;

  for (const v of graph.getVertices()) {
    distances.set(v.id, Infinity);
    previous.set(v.id, null);
    unvisited.add(v.id);
  }
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
    nodesEvaluated++;

    if (current === destId) break;

    unvisited.delete(current);

    const outgoing = graph.getOutgoingEdges(current);
    for (const edge of outgoing) {
      if (!unvisited.has(edge.to)) continue;

      const weight = graph.getDynamicEdgeWeight(edge, trafficState, weights, normBounds);
      if (!isFinite(weight)) continue;

      const alt = minDist + weight;
      if (alt < distances.get(edge.to)!) {
        distances.set(edge.to, alt);
        previous.set(edge.to, current);
      }
    }
  }

  const path: string[] = [];
  let curr: string | null = destId;
  const visitedTracker = new Set<string>();
  while (curr && !visitedTracker.has(curr)) {
    visitedTracker.add(curr);
    path.unshift(curr);
    if (curr === startId) break;
    curr = previous.get(curr) ?? null;
  }

  const runtimeMs = Number(Math.max(0.15, performance.now() - startTime).toFixed(2));

  if (path[0] === startId && path[path.length - 1] === destId) {
    const evaluated = recalculateRouteMetrics(path, graph, trafficState, weights, normBounds, startId, destId);
    return {
      ...evaluated,
      nodesEvaluated,
      runtimeMs,
      algorithm: 'Dijkstra',
    };
  }

  return {
    ...recalculateRouteMetrics([], graph, trafficState, weights, normBounds, startId, destId),
    nodesEvaluated,
    runtimeMs,
    algorithm: 'Dijkstra',
  };
}

/**
 * A* Shortest Path Engine on Directed Weighted Graph
 * Uses a provably admissible and monotonic multi-objective Haversine lower bound:
 * h(u, dest) = wD * (d_hav(u, dest) / maxDist) + wT * ((d_hav(u, dest) / maxSpeed) * 60 / maxTime)
 * Since d_hav <= d_road, travel_time >= (d_hav / maxSpeed)*60, and cong >= 0, h(u) <= h*(u) everywhere.
 */
export function runAStarShortestPath(
  graph: DirectedWeightedGraph,
  startId: string,
  destId: string,
  trafficState?: TrafficState,
  objectiveWeights?: ObjectiveWeights,
  bounds?: GraphNormalizationBounds
): ShortestPathResult {
  const startTime = performance.now();
  const normBounds = bounds ?? graph.computeNormalizationBounds(trafficState);
  const weights = objectiveWeights ?? { wT: 0.40, wD: 0.30, wC: 0.30 };

  if (!graph.hasVertex(startId) || !graph.hasVertex(destId)) {
    const res = recalculateRouteMetrics([], graph, trafficState, weights, normBounds, startId, destId);
    return {
      ...res,
      nodesEvaluated: 0,
      runtimeMs: Number((performance.now() - startTime).toFixed(2)),
      algorithm: 'A*',
    };
  }

  if (startId === destId) {
    const res = recalculateRouteMetrics([startId], graph, trafficState, weights, normBounds, startId, destId);
    return {
      ...res,
      nodesEvaluated: 1,
      runtimeMs: Number((performance.now() - startTime).toFixed(2)),
      algorithm: 'A*',
    };
  }

  const destNode = graph.getVertex(destId)!;
  const maxSpeedKmH = Math.max(70, normBounds.maxSpeedKmH || 85);

  const heuristic = (nodeId: string): number => {
    const node = graph.getVertex(nodeId);
    if (!node) return 0;
    const dHav = calculateHaversineKm(node.coords.lat, node.coords.lng, destNode.coords.lat, destNode.coords.lng);
    const hDist = normBounds.maxDist > 0 ? (dHav / normBounds.maxDist) : 0;
    const minTimeMin = (dHav / maxSpeedKmH) * 60;
    const hTime = normBounds.maxTime > 0 ? (minTimeMin / normBounds.maxTime) : 0;
    return weights.wD * hDist + weights.wT * hTime;
  };

  const gScore = new Map<string, number>();
  const fScore = new Map<string, number>();
  const previous = new Map<string, string | null>();
  const openSet = new Set<string>();
  const closedSet = new Set<string>();
  let nodesEvaluated = 0;

  for (const v of graph.getVertices()) {
    gScore.set(v.id, Infinity);
    fScore.set(v.id, Infinity);
    previous.set(v.id, null);
  }

  gScore.set(startId, 0);
  fScore.set(startId, heuristic(startId));
  openSet.add(startId);

  while (openSet.size > 0) {
    let current: string | null = null;
    let minF = Infinity;

    for (const node of openSet) {
      const f = fScore.get(node)!;
      if (f < minF) {
        minF = f;
        current = node;
      }
    }

    if (!current || minF === Infinity) break;
    nodesEvaluated++;

    if (current === destId) break;

    openSet.delete(current);
    closedSet.add(current);

    const outgoing = graph.getOutgoingEdges(current);
    for (const edge of outgoing) {
      if (closedSet.has(edge.to)) continue;

      const weight = graph.getDynamicEdgeWeight(edge, trafficState, weights, normBounds);
      if (!isFinite(weight)) continue;

      const tentativeG = gScore.get(current)! + weight;
      if (tentativeG < gScore.get(edge.to)!) {
        previous.set(edge.to, current);
        gScore.set(edge.to, tentativeG);
        fScore.set(edge.to, tentativeG + heuristic(edge.to));
        openSet.add(edge.to);
      }
    }
  }

  const path: string[] = [];
  let curr: string | null = destId;
  const visitedTracker = new Set<string>();
  while (curr && !visitedTracker.has(curr)) {
    visitedTracker.add(curr);
    path.unshift(curr);
    if (curr === startId) break;
    curr = previous.get(curr) ?? null;
  }

  const runtimeMs = Number(Math.max(0.12, performance.now() - startTime).toFixed(2));

  if (path[0] === startId && path[path.length - 1] === destId) {
    const evaluated = recalculateRouteMetrics(path, graph, trafficState, weights, normBounds, startId, destId);
    return {
      ...evaluated,
      nodesEvaluated,
      runtimeMs,
      algorithm: 'A*',
    };
  }

  return {
    ...recalculateRouteMetrics([], graph, trafficState, weights, normBounds, startId, destId),
    nodesEvaluated,
    runtimeMs,
    algorithm: 'A*',
  };
}
