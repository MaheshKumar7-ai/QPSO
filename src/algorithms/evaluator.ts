import {
  GraphVertex,
  GraphEdge,
  VehicleType,
  OptimizationMode,
  ModeWeights,
  ObjectiveWeights,
  TrafficState,
  DynamicEdgeState,
  EvaluatedRoute,
  RouteSegment,
} from '../types';
import { getDynamicEdgeState, buildTrafficState } from './trafficModel';

export { getDynamicEdgeState, buildTrafficState };

/**
 * Core SIH 2026 Multi-Objective Weight Presets (wT + wD + wC = 1.0)
 */
export const OBJECTIVE_WEIGHT_PRESETS: Record<OptimizationMode, ObjectiveWeights> = {
  balanced: {
    wT: 0.40,
    wD: 0.30,
    wC: 0.30,
  },
  fastest: {
    wT: 0.70,
    wD: 0.15,
    wC: 0.15,
  },
  shortest: {
    wT: 0.10,
    wD: 0.85,
    wC: 0.05,
  },
  traffic: {
    wT: 0.25,
    wD: 0.15,
    wC: 0.60,
  },
  safer: {
    wT: 0.30,
    wD: 0.20,
    wC: 0.50,
  },
};

export const MODE_WEIGHTS: Record<OptimizationMode, ModeWeights> = {
  balanced: {
    timeWeight: 0.40,
    distanceWeight: 0.30,
    trafficWeight: 0.30,
    riskWeight: 0.0,
  },
  fastest: {
    timeWeight: 0.70,
    distanceWeight: 0.15,
    trafficWeight: 0.15,
    riskWeight: 0.0,
  },
  shortest: {
    timeWeight: 0.15,
    distanceWeight: 0.70,
    trafficWeight: 0.15,
    riskWeight: 0.0,
  },
  traffic: {
    timeWeight: 0.25,
    distanceWeight: 0.15,
    trafficWeight: 0.60,
    riskWeight: 0.0,
  },
  safer: {
    timeWeight: 0.30,
    distanceWeight: 0.20,
    trafficWeight: 0.50,
    riskWeight: 0.0,
  },
};

/**
 * Ensures objective weights are non-negative and satisfy wT + wD + wC = 1
 */
export function normalizeObjectiveWeights(weights: ObjectiveWeights): ObjectiveWeights {
  const wT = Math.max(0, Number(weights.wT) || 0);
  const wD = Math.max(0, Number(weights.wD) || 0);
  const wC = Math.max(0, Number(weights.wC) || 0);
  const sum = wT + wD + wC;
  if (sum <= 1e-9) {
    return { wT: 0.40, wD: 0.30, wC: 0.30 };
  }
  const normWT = Number((wT / sum).toFixed(4));
  const normWD = Number((wD / sum).toFixed(4));
  const normWC = Number(Math.max(0, 1 - normWT - normWD).toFixed(4));
  return {
    wT: normWT,
    wD: normWD,
    wC: normWC,
  };
}

export function resolveObjectiveWeights(
  mode: OptimizationMode = 'balanced',
  customWeights?: ObjectiveWeights
): ObjectiveWeights {
  if (customWeights) {
    return normalizeObjectiveWeights(customWeights);
  }
  return OBJECTIVE_WEIGHT_PRESETS[mode] ?? OBJECTIVE_WEIGHT_PRESETS.balanced;
}

// Isolated legacy vehicle helpers (kept only for isolated UI compatibility, NOT used in core route optimization)
export function getVehicleSpeedMultiplier(_vehicle: VehicleType, _roadType: GraphEdge['roadType']): number {
  return 1.0;
}

export function getVehicleTrafficSensitivity(_vehicle: VehicleType): number {
  return 1.0;
}

export function getVehicleRoadPreferenceMultiplier(_vehicle: VehicleType, _roadType: GraphEdge['roadType']): number {
  return 1.0;
}

export interface GraphNormalizationBounds {
  minDist: number;
  maxDist: number;
  minTime: number;
  maxTime: number;
  minCongestion: number;
  maxCongestion: number;
  minRisk: number;
  maxRisk: number;
  maxSpeedKmH: number;
}

export const DEFAULT_BOUNDS: GraphNormalizationBounds = {
  minDist: 3.5,
  maxDist: 96.0,
  minTime: 2.5,
  maxTime: 110.0,
  minCongestion: 1.0,
  maxCongestion: 1.85,
  minRisk: 1.0,
  maxRisk: 8.5,
  maxSpeedKmH: 85,
};

/**
 * Computes normalization scales across the network for a given TrafficState.
 */
export function computeGraphNormalizationBounds(
  edges: GraphEdge[],
  trafficState?: TrafficState
): GraphNormalizationBounds {
  let minDist = Infinity, maxDist = -Infinity;
  let minTime = Infinity, maxTime = -Infinity;
  let minCongestion = Infinity, maxCongestion = -Infinity;
  let minRisk = Infinity, maxRisk = -Infinity;
  let maxSpeedFound = 85;
  let maxCongFactor = 1.85;

  for (const e of edges) {
    const dyn = getDynamicEdgeState(e, trafficState);
    if (dyn.isBlocked || !isFinite(dyn.travelTime)) continue;

    const d = dyn.distance;
    const t = dyn.travelTime;
    const c = Math.max(0, (dyn.congestion - 1.0) * dyn.distance);
    const r = e.historical_risk ?? e.riskScore;

    if (d < minDist) minDist = d;
    if (d > maxDist) maxDist = d;
    if (t < minTime) minTime = t;
    if (t > maxTime) maxTime = t;
    if (c < minCongestion) minCongestion = c;
    if (c > maxCongestion) maxCongestion = c;
    if (dyn.congestion > maxCongFactor) maxCongFactor = dyn.congestion;
    if (r < minRisk) minRisk = r;
    if (r > maxRisk) maxRisk = r;
    if (e.baseSpeedKmH > maxSpeedFound) maxSpeedFound = e.baseSpeedKmH;
  }

  const resolvedMaxDist = maxDist === -Infinity || maxDist <= 0 ? 96.0 : maxDist;
  const resolvedMaxCongestion = Math.max(
    maxCongestion === -Infinity || maxCongestion <= 0 ? 45.0 : maxCongestion,
    Math.max(0.45, maxCongFactor - 1.0) * resolvedMaxDist * 0.65
  );

  return {
    minDist: minDist === Infinity ? 3.5 : minDist,
    maxDist: resolvedMaxDist,
    minTime: minTime === Infinity ? 2.5 : minTime,
    maxTime: maxTime === -Infinity || maxTime <= 0 ? 110.0 : maxTime,
    minCongestion: minCongestion === Infinity ? 0.0 : minCongestion,
    maxCongestion: resolvedMaxCongestion,
    minRisk: minRisk === Infinity ? 1.0 : minRisk,
    maxRisk: maxRisk === -Infinity || maxRisk <= 0 ? 8.5 : maxRisk,
    maxSpeedKmH: maxSpeedFound,
  };
}

export function getNormalizedEdgeMetrics(
  edge: GraphEdge,
  bounds: GraphNormalizationBounds = DEFAULT_BOUNDS,
  trafficState?: TrafficState
) {
  const dyn = getDynamicEdgeState(edge, trafficState);
  const normT = bounds.maxTime > 0 ? dyn.travelTime / bounds.maxTime : 0;
  const normD = bounds.maxDist > 0 ? dyn.distance / bounds.maxDist : 0;
  const edgeCongCost = Math.max(0, (dyn.congestion - 1.0) * dyn.distance);
  const normC = bounds.maxCongestion > 0 ? edgeCongCost / bounds.maxCongestion : 0;
  const r = edge.historical_risk ?? edge.riskScore;
  const normR = bounds.maxRisk > 0 ? r / bounds.maxRisk : 0;

  return {
    normD: Number(normD.toFixed(4)),
    normT: Number(normT.toFixed(4)),
    normC: Number(normC.toFixed(4)),
    normR: Number(normR.toFixed(4)),
  };
}

/**
 * Computes normalized multi-objective edge cost:
 * f(e, t) = wT * T_norm(e, t) + wD * D_norm(e) + wC * C_norm(e, t)
 * Strictly independent of vehicle type and risk penalties.
 */
export function computeEdgeMetaheuristicWeight(
  edge: GraphEdge,
  mode: OptimizationMode = 'balanced',
  _vehicle?: VehicleType,
  bounds: GraphNormalizationBounds = DEFAULT_BOUNDS,
  trafficState?: TrafficState,
  customWeights?: ObjectiveWeights
): number {
  const dyn = getDynamicEdgeState(edge, trafficState);
  if (dyn.isBlocked || !isFinite(dyn.travelTime)) return Infinity;

  const weights = resolveObjectiveWeights(mode, customWeights);

  const normT = bounds.maxTime > 0 ? dyn.travelTime / bounds.maxTime : 0;
  const normD = bounds.maxDist > 0 ? dyn.distance / bounds.maxDist : 0;
  const edgeCongCost = Math.max(0, (dyn.congestion - 1.0) * dyn.distance);
  const normC = bounds.maxCongestion > 0 ? edgeCongCost / bounds.maxCongestion : 0;

  const edgeObjective =
    weights.wT * normT +
    weights.wD * normD +
    weights.wC * normC;

  return Number(edgeObjective.toFixed(6));
}

export function removeConsecutiveDuplicates(rawNodeIds: string[]): string[] {
  if (rawNodeIds.length <= 1) return rawNodeIds;
  const clean: string[] = [];
  for (const id of rawNodeIds) {
    if (clean.length === 0 || clean[clean.length - 1] !== id) {
      clean.push(id);
    }
  }
  return clean;
}

export function removeLoopsFromPath(rawNodeIds: string[], allowClosedCircuit: boolean = false): string[] {
  if (rawNodeIds.length <= 2) return removeConsecutiveDuplicates(rawNodeIds);

  const isClosed = allowClosedCircuit || (rawNodeIds.length >= 3 && rawNodeIds[0] === rawNodeIds[rawNodeIds.length - 1]);
  if (isClosed) {
    // For a closed circuit / round trip (start === end), clean internal loops on intermediate nodes [1 ... length-2], keeping start and end intact
    const startNode = rawNodeIds[0];
    const endNode = rawNodeIds[rawNodeIds.length - 1];
    const middleNodes = rawNodeIds.slice(1, -1);
    const cleanMiddle = removeLoopsFromPath(middleNodes, false);
    return removeConsecutiveDuplicates([startNode, ...cleanMiddle, endNode]);
  }

  const clean: string[] = [];
  const visitedIndices = new Map<string, number>();

  for (const id of rawNodeIds) {
    if (visitedIndices.has(id)) {
      const firstIdx = visitedIndices.get(id)!;
      while (clean.length > firstIdx + 1) {
        const removed = clean.pop()!;
        visitedIndices.delete(removed);
      }
    } else {
      visitedIndices.set(id, clean.length);
      clean.push(id);
    }
  }

  return removeConsecutiveDuplicates(clean);
}

export interface RouteFeasibilityValidation {
  isValid: boolean;
  reason?: string;
  cleanNodeIds: string[];
  validatedSegments: {
    fromNode: GraphVertex;
    toNode: GraphVertex;
    edge: GraphEdge;
    dynamicState: DynamicEdgeState;
  }[];
}

/**
 * Explicit route feasibility validator for shortest-path / metaheuristic route optimization:
 * - Verifies route has >= 2 nodes
 * - Verifies origin and destination match when specified
 * - Verifies every consecutive pair (u, v) is a valid directed edge in the graph
 * - Verifies no edge is blocked in the active TrafficState
 */
export function validateRouteFeasibility(
  rawNodeIds: string[],
  vertices: GraphVertex[],
  edges: GraphEdge[],
  trafficState?: TrafficState,
  expectedStartId?: string,
  expectedDestId?: string,
  skipLoopRemoval: boolean = false
): RouteFeasibilityValidation {
  const isClosedCircuit =
    (expectedStartId && expectedDestId && expectedStartId === expectedDestId) ||
    (rawNodeIds.length >= 3 && rawNodeIds[0] === rawNodeIds[rawNodeIds.length - 1]);

  const cleanNodeIds = skipLoopRemoval
    ? removeConsecutiveDuplicates(rawNodeIds)
    : isClosedCircuit
    ? removeLoopsFromPath(rawNodeIds, true)
    : removeLoopsFromPath(rawNodeIds, false);

  if (cleanNodeIds.length < 2) {
    return {
      isValid: false,
      reason: 'Route contains fewer than 2 nodes',
      cleanNodeIds,
      validatedSegments: [],
    };
  }

  if (expectedStartId && cleanNodeIds[0] !== expectedStartId) {
    return {
      isValid: false,
      reason: `Route does not start at origin (${expectedStartId})`,
      cleanNodeIds,
      validatedSegments: [],
    };
  }

  if (expectedDestId && cleanNodeIds[cleanNodeIds.length - 1] !== expectedDestId) {
    return {
      isValid: false,
      reason: `Route does not end at destination (${expectedDestId})`,
      cleanNodeIds,
      validatedSegments: [],
    };
  }

  const vertexMap = new Map<string, GraphVertex>();
  vertices.forEach(v => vertexMap.set(v.id, v));

  const validatedSegments: {
    fromNode: GraphVertex;
    toNode: GraphVertex;
    edge: GraphEdge;
    dynamicState: DynamicEdgeState;
  }[] = [];

  for (let i = 0; i < cleanNodeIds.length - 1; i++) {
    const fromId = cleanNodeIds[i];
    const toId = cleanNodeIds[i + 1];
    const fromNode = vertexMap.get(fromId);
    const toNode = vertexMap.get(toId);

    if (!fromNode || !toNode) {
      return {
        isValid: false,
        reason: `Node ${fromId} or ${toId} does not exist in network`,
        cleanNodeIds,
        validatedSegments: [],
      };
    }

    const edge = edges.find(e => e.from === fromId && e.to === toId);
    if (!edge) {
      return {
        isValid: false,
        reason: `No directed edge between ${fromNode.name} (${fromId}) and ${toNode.name} (${toId})`,
        cleanNodeIds,
        validatedSegments: [],
      };
    }

    const dynamicState = getDynamicEdgeState(edge, trafficState);
    if (dynamicState.isBlocked || !isFinite(dynamicState.travelTime)) {
      return {
        isValid: false,
        reason: `Edge ${edge.roadName} (${fromNode.name} → ${toNode.name}) is blocked in current traffic state`,
        cleanNodeIds,
        validatedSegments: [],
      };
    }

    validatedSegments.push({
      fromNode,
      toNode,
      edge,
      dynamicState,
    });
  }

  return {
    isValid: true,
    cleanNodeIds,
    validatedSegments,
  };
}

/**
 * Evaluates a connected route R under TrafficState t using the core SIH multi-objective formulation:
 *
 *   T(R, t) = sum of dynamic edge travel times
 *   D(R)    = sum of edge distances
 *   C(R, t) = sum of dynamic edge congestion indices
 *
 *   F(R, t) = wT * T_norm(R, t) + wD * D_norm(R) + wC * C_norm(R, t)
 *   where wT + wD + wC = 1
 */
export function evaluateRoutePath(
  rawNodeIds: string[],
  vertices: GraphVertex[],
  edges: GraphEdge[],
  mode: OptimizationMode = 'balanced',
  _vehicle?: VehicleType,
  bounds?: GraphNormalizationBounds,
  trafficState?: TrafficState,
  customWeights?: ObjectiveWeights,
  expectedStartId?: string,
  expectedDestId?: string,
  skipLoopRemoval?: boolean
): EvaluatedRoute {
  const weights = resolveObjectiveWeights(mode, customWeights);
  const normBounds = bounds ?? computeGraphNormalizationBounds(edges, trafficState);

  const validation = validateRouteFeasibility(
    rawNodeIds,
    vertices,
    edges,
    trafficState,
    expectedStartId,
    expectedDestId,
    skipLoopRemoval
  );

  if (!validation.isValid) {
    return {
      nodeIds: validation.cleanNodeIds,
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
      mode,
    };
  }

  const segments: RouteSegment[] = [];
  let totalDistanceKm = 0;      // D(R)
  let totalBaseTimeMin = 0;     // Free-flow time sum
  let totalTravelTimeMin = 0;   // T(R, t)
  let totalCongestionSum = 0;   // C(R, t) = sum of edge congestion costs
  let totalRawFactorSum = 0;
  let totalWeightedRisk = 0;

  const maxCongScale = Math.max(1.0, normBounds.maxCongestion);

  for (const item of validation.validatedSegments) {
    const { fromNode, toNode, edge, dynamicState } = item;

    const segDist = dynamicState.distance;
    const segFreeFlowTime = dynamicState.freeFlowTime;
    const segTravelTime = dynamicState.travelTime;
    const segCongestion = Math.max(0, (dynamicState.congestion - 1.0) * segDist);

    const segNormT = normBounds.maxTime > 0 ? segTravelTime / normBounds.maxTime : 0;
    const segNormD = normBounds.maxDist > 0 ? segDist / normBounds.maxDist : 0;
    const segNormC = segCongestion / maxCongScale;
    const segObjCost =
      weights.wT * segNormT +
      weights.wD * segNormD +
      weights.wC * segNormC;

    const rawRisk = edge.historical_risk ?? edge.riskScore;
    const incRiskAdd = edge.incident ? edge.incident.riskAddition : 0;
    const effectiveRisk = Math.min(10, rawRisk + incRiskAdd);

    segments.push({
      fromNode,
      toNode,
      edge,
      segmentDistanceKm: Number(segDist.toFixed(2)),
      baseTimeMin: Number(segFreeFlowTime.toFixed(2)),
      adjustedTimeMin: Number(segTravelTime.toFixed(2)),
      congestionIndex: Number(segCongestion.toFixed(2)),
      currentSpeedKmH: dynamicState.currentSpeed,
      normalizedTime: Number(segNormT.toFixed(4)),
      normalizedDistance: Number(segNormD.toFixed(4)),
      normalizedCongestion: Number(segNormC.toFixed(4)),
      segmentObjectiveCost: Number(segObjCost.toFixed(4)),
      effectiveRisk,
      isBlocked: false,
    });

    totalDistanceKm += segDist;
    totalBaseTimeMin += segFreeFlowTime;
    totalTravelTimeMin += segTravelTime;
    totalCongestionSum += segCongestion;
    totalRawFactorSum += dynamicState.congestion;
    totalWeightedRisk += effectiveRisk * segDist;
  }

  // Normalized Route Components:
  // T_norm(R, t) = T(R, t) / maxTime
  // D_norm(R)    = D(R) / maxDist
  // C_norm(R, t) = C(R, t) / maxCongestion
  const normalizedTime = normBounds.maxTime > 0 ? totalTravelTimeMin / normBounds.maxTime : 0;
  const normalizedDistance = normBounds.maxDist > 0 ? totalDistanceKm / normBounds.maxDist : 0;
  const normalizedCongestion = totalCongestionSum / maxCongScale;

  // Core Multi-Objective Cost F(R, t) = wT * T_norm(R, t) + wD * D_norm(R) + wC * C_norm(R, t)
  const fitness = Number(
    (
      weights.wT * normalizedTime +
      weights.wD * normalizedDistance +
      weights.wC * normalizedCongestion
    ).toFixed(4)
  );

  const averageTrafficFactor =
    segments.length > 0
      ? Number((totalRawFactorSum / segments.length).toFixed(2))
      : 1.0;
  const averageRisk =
    totalDistanceKm > 0
      ? Number((totalWeightedRisk / totalDistanceKm).toFixed(2))
      : 0;

  const congestionCost = Number(totalCongestionSum.toFixed(2));
  const riskCost = Number((averageRisk * 10).toFixed(1));

  return {
    nodeIds: validation.cleanNodeIds,
    segments,
    totalDistanceKm: Number(totalDistanceKm.toFixed(2)),
    baseTimeMin: Number(totalBaseTimeMin.toFixed(2)),
    totalTimeMin: Number(totalTravelTimeMin.toFixed(2)),
    totalCongestion: Number(totalCongestionSum.toFixed(3)),
    normalizedTime: Number(normalizedTime.toFixed(4)),
    normalizedDistance: Number(normalizedDistance.toFixed(4)),
    normalizedCongestion: Number(normalizedCongestion.toFixed(4)),
    objectiveWeights: weights,
    trafficTimestamp: trafficState?.timestamp,
    averageTrafficFactor,
    averageRisk,
    congestionCost,
    riskCost,
    fitness,
    isFeasible: true,
    mode,
    modeWeights: {
      timeWeight: weights.wT,
      distanceWeight: weights.wD,
      trafficWeight: weights.wC,
      riskWeight: 0,
    },
  };
}

export function formatDurationHuman(minutes: number): string {
  if (minutes < 1) return '< 1 min';
  const hrs = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hrs === 0) return `${mins} min`;
  return `${hrs} hr ${mins} min`;
}

export function getTrafficCategory(factor: number): 'Low' | 'Moderate' | 'Heavy' {
  if (factor <= 1.15) return 'Low';
  if (factor <= 1.45) return 'Moderate';
  return 'Heavy';
}

export function getRiskCategory(riskScore: number): 'Low' | 'Moderate' | 'High' {
  if (riskScore <= 2.5) return 'Low';
  if (riskScore <= 5.0) return 'Moderate';
  return 'High';
}
