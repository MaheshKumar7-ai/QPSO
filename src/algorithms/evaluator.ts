import {
  GraphVertex,
  GraphEdge,
  VehicleType,
  OptimizationMode,
  ModeWeights,
  EvaluatedRoute,
  RouteSegment,
} from '../types';

export const MODE_WEIGHTS: Record<OptimizationMode, ModeWeights> = {
  shortest: {
    distanceWeight: 0.82, // Distance dominant
    timeWeight: 0.0,      // Pure travel distance focus
    trafficWeight: 0.18,  // Congestion weight included: avoids heavily bottlenecked corridors
    riskWeight: 0.0,      // Zero risk aversion
  },
  fastest: {
    distanceWeight: 0.06, // alpha: Distance = 0.06
    timeWeight: 0.70,     // beta: Time = 0.70 (speed & high flow priority)
    trafficWeight: 0.20,  // gamma: Congestion = 0.20
    riskWeight: 0.04,     // delta: Risk = 0.04
  },
  balanced: {
    distanceWeight: 0.22, // alpha: Distance = 0.22
    timeWeight: 0.35,     // beta: Time = 0.35
    trafficWeight: 0.23,  // gamma: Congestion = 0.23
    riskWeight: 0.20,     // delta: Risk = 0.20
  },
  safer: {
    distanceWeight: 0.08, // alpha: Distance = 0.08
    timeWeight: 0.08,     // beta: Time = 0.08
    trafficWeight: 0.16,  // gamma: Congestion = 0.16
    riskWeight: 0.68,     // delta: Risk = 0.68 (maximum accident aversion)
  },
};

// Vehicle modifier rules:
// - Truck: Loves Expressways / National Highways; strongly penalized on narrow local/rural roads
// - Bike: Bypasses town traffic easily; penalized on high-speed truck expressways
// - Bus: Prefers intercity National/State Highways; avoids village interiors
// - Emergency: High-speed priority with siren traffic bypass
// - Car: Balanced default passenger vehicle profile
export function getVehicleSpeedMultiplier(vehicle: VehicleType, roadType: GraphEdge['roadType']): number {
  if (vehicle === 'truck') {
    return roadType === 'expressway' ? 0.95 : roadType === 'national_highway' ? 0.88 : 0.75;
  }
  if (vehicle === 'bus') {
    return roadType === 'expressway' ? 0.90 : 0.85;
  }
  if (vehicle === 'bike') {
    return roadType === 'expressway' ? 0.60 : 0.95;
  }
  if (vehicle === 'emergency') {
    return 1.25; // Fast priority response
  }
  return 1.0; // Car
}

export function getVehicleTrafficSensitivity(vehicle: VehicleType): number {
  if (vehicle === 'emergency') return 0.25; // Siren priority cuts congestion delays by 75%
  if (vehicle === 'bike') return 0.50; // Lane filtering through jams
  if (vehicle === 'truck') return 1.60; // Hard to maneuver in heavy traffic
  if (vehicle === 'bus') return 1.30;
  return 1.0;
}

export function getVehicleRoadPreferenceMultiplier(vehicle: VehicleType, roadType: GraphEdge['roadType']): number {
  switch (vehicle) {
    case 'truck':
      // Freight trucks strongly prefer wide multilane corridors (NH/Expressway) over narrow arterial/rural streets
      if (roadType === 'expressway') return 0.65;
      if (roadType === 'national_highway') return 0.75;
      if (roadType === 'state_highway') return 1.10;
      if (roadType === 'arterial') return 2.20;
      if (roadType === 'rural') return 4.50;
      return 1.0;

    case 'bike':
      // Two-wheelers love town shortcuts & rural roads, but face danger/speed caps on high-speed expressways
      if (roadType === 'rural') return 0.70;
      if (roadType === 'arterial') return 0.80;
      if (roadType === 'state_highway') return 1.00;
      if (roadType === 'national_highway') return 1.15;
      if (roadType === 'expressway') return 1.85;
      return 1.0;

    case 'bus':
      // Buses stick to high-capacity passenger transit corridors (State/National Highways)
      if (roadType === 'national_highway') return 0.75;
      if (roadType === 'state_highway') return 0.80;
      if (roadType === 'expressway') return 0.90;
      if (roadType === 'arterial') return 1.35;
      if (roadType === 'rural') return 3.20;
      return 1.0;

    case 'emergency':
      // Emergency response vehicles take direct express/highway corridors
      if (roadType === 'expressway') return 0.60;
      if (roadType === 'national_highway') return 0.70;
      if (roadType === 'arterial') return 0.80;
      if (roadType === 'state_highway') return 0.85;
      return 1.0;

    case 'car':
    default:
      if (roadType === 'expressway') return 0.75;
      if (roadType === 'national_highway') return 0.85;
      if (roadType === 'state_highway') return 1.00;
      if (roadType === 'arterial') return 1.15;
      if (roadType === 'rural') return 1.35;
      return 1.0;
  }
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
}

export const DEFAULT_BOUNDS: GraphNormalizationBounds = {
  minDist: 3.5,
  maxDist: 65.0,
  minTime: 2.5,
  maxTime: 75.0,
  minCongestion: 1.05,
  maxCongestion: 1.80,
  minRisk: 1.0,
  maxRisk: 8.5,
};

export function computeGraphNormalizationBounds(edges: GraphEdge[]): GraphNormalizationBounds {
  let minDist = Infinity, maxDist = -Infinity;
  let minTime = Infinity, maxTime = -Infinity;
  let minCongestion = Infinity, maxCongestion = -Infinity;
  let minRisk = Infinity, maxRisk = -Infinity;

  for (const e of edges) {
    const d = e.distance ?? e.distanceKm;
    const t = e.travel_time ?? (e.distanceKm / Math.max(15, e.baseSpeedKmH)) * 60;
    const c = e.historical_congestion ?? e.trafficFactor;
    const r = e.historical_risk ?? e.riskScore;

    if (d < minDist) minDist = d;
    if (d > maxDist) maxDist = d;
    if (t < minTime) minTime = t;
    if (t > maxTime) maxTime = t;
    if (c < minCongestion) minCongestion = c;
    if (c > maxCongestion) maxCongestion = c;
    if (r < minRisk) minRisk = r;
    if (r > maxRisk) maxRisk = r;
  }

  return {
    minDist: minDist === Infinity ? 3.5 : minDist,
    maxDist: maxDist === -Infinity ? 65.0 : maxDist,
    minTime: minTime === Infinity ? 2.5 : minTime,
    maxTime: maxTime === -Infinity ? 75.0 : maxTime,
    minCongestion: minCongestion === Infinity ? 1.05 : minCongestion,
    maxCongestion: maxCongestion === -Infinity ? 1.80 : maxCongestion,
    minRisk: minRisk === Infinity ? 1.0 : minRisk,
    maxRisk: maxRisk === -Infinity ? 8.5 : maxRisk,
  };
}

export function getNormalizedEdgeMetrics(edge: GraphEdge, bounds: GraphNormalizationBounds = DEFAULT_BOUNDS) {
  const d = edge.distance ?? edge.distanceKm;
  const t = edge.travel_time ?? (edge.distanceKm / Math.max(15, edge.baseSpeedKmH)) * 60;
  const c = edge.historical_congestion ?? edge.trafficFactor;
  const r = edge.historical_risk ?? edge.riskScore;

  // normalized_value = (value - min) / (max - min)
  const normD = bounds.maxDist > bounds.minDist ? (d - bounds.minDist) / (bounds.maxDist - bounds.minDist) : 0;
  const normT = bounds.maxTime > bounds.minTime ? (t - bounds.minTime) / (bounds.maxTime - bounds.minTime) : 0;
  const normC = bounds.maxCongestion > bounds.minCongestion ? (c - bounds.minCongestion) / (bounds.maxCongestion - bounds.minCongestion) : 0;
  const normR = bounds.maxRisk > bounds.minRisk ? (r - bounds.minRisk) / (bounds.maxRisk - bounds.minRisk) : 0;

  return {
    normD: Math.max(0, Math.min(1, normD)),
    normT: Math.max(0, Math.min(1, normT)),
    normC: Math.max(0, Math.min(1, normC)),
    normR: Math.max(0, Math.min(1, normR)),
  };
}

export function computeEdgeMetaheuristicWeight(
  edge: GraphEdge,
  mode: OptimizationMode = 'balanced',
  vehicle: VehicleType = 'car',
  bounds: GraphNormalizationBounds = DEFAULT_BOUNDS
): number {
  if (edge.incident && edge.incident.isBlocked) return Infinity;

  // Check VRO restrictions
  const allowed = edge.vehicle_allowed ?? edge.allowedVehicles;
  if (allowed && !allowed.includes(vehicle)) return Infinity;

  // Calculate speed and travel time under vehicle modifiers & incidents
  const speedMult = getVehicleSpeedMultiplier(vehicle, edge.roadType);
  const effectiveSpeed = Math.max(15, edge.baseSpeedKmH * speedMult);
  const segBaseTimeMin = (edge.distanceKm / effectiveSpeed) * 60;

  const incTrafficMult = edge.incident ? edge.incident.trafficMultiplier : 1.0;
  const vehicleSensitivity = getVehicleTrafficSensitivity(vehicle);
  const rawCongestion = edge.historical_congestion ?? edge.trafficFactor;
  const effectiveTrafficFactor = 1.0 + (rawCongestion * incTrafficMult - 1.0) * vehicleSensitivity;
  const segAdjustedTimeMin = segBaseTimeMin * effectiveTrafficFactor;

  const incRiskAdd = edge.incident ? edge.incident.riskAddition : 0;
  const rawRisk = edge.historical_risk ?? edge.riskScore;
  let effectiveRisk = Math.min(10, rawRisk + incRiskAdd);
  if (vehicle === 'truck' && effectiveRisk >= 4) {
    effectiveRisk *= 1.35;
  } else if (vehicle === 'bike' && edge.baseSpeedKmH >= 80) {
    effectiveRisk *= 1.30;
  }

  // T = normalized travel time
  // C = normalized historical congestion
  // R = normalized historical risk
  // D = normalized distance
  const normD = bounds.maxDist > bounds.minDist ? (edge.distanceKm - bounds.minDist) / (bounds.maxDist - bounds.minDist) : 0;
  const normT = bounds.maxTime > bounds.minTime ? (segAdjustedTimeMin - bounds.minTime) / (bounds.maxTime - bounds.minTime) : 0;
  const normC = bounds.maxCongestion > bounds.minCongestion ? (effectiveTrafficFactor - bounds.minCongestion) / (bounds.maxCongestion - bounds.minCongestion) : 0;
  const normR = bounds.maxRisk > bounds.minRisk ? (effectiveRisk - bounds.minRisk) / (bounds.maxRisk - bounds.minRisk) : 0;

  const clampedD = Math.max(0, Math.min(1, normD));
  const clampedT = Math.max(0, Math.min(1, normT));
  const clampedC = Math.max(0, Math.min(1, normC));
  const clampedR = Math.max(0, Math.min(1, normR));

  // Mode-specific cost landscape calculation (strictly physically additive along route length):
  // 1. SHORTEST: Pure physical distance dominant
  if (mode === 'shortest') {
    const roadPref = getVehicleRoadPreferenceMultiplier(vehicle, edge.roadType);
    return Number((edge.distanceKm * roadPref).toFixed(3));
  }

  // 2. FASTEST: Travel time dominant with heavy speed/expressway preference
  if (mode === 'fastest') {
    let modeRoadBias = 1.0;
    if (edge.roadType === 'expressway') modeRoadBias = 0.75;
    else if (edge.roadType === 'national_highway') modeRoadBias = 0.88;
    else if (edge.roadType === 'state_highway') modeRoadBias = 1.05;
    else if (edge.roadType === 'arterial') modeRoadBias = 1.25;
    else modeRoadBias = 1.60; // Rural village roads heavily penalized for fastest routing

    const roadPref = getVehicleRoadPreferenceMultiplier(vehicle, edge.roadType);
    const fastCost = segAdjustedTimeMin * modeRoadBias + edge.distanceKm * 0.1;
    return Number((fastCost * roadPref).toFixed(3));
  }

  // 3. SAFER: Safety/hazard risk dominant with penalty on high-risk bottlenecks
  if (mode === 'safer') {
    const riskPenalty = effectiveRisk >= 4.0 ? Math.pow(effectiveRisk, 1.8) * edge.distanceKm * 0.5 : effectiveRisk * edge.distanceKm * 0.2;
    const roadPref = getVehicleRoadPreferenceMultiplier(vehicle, edge.roadType);
    const safeCost = segAdjustedTimeMin * 0.3 + edge.distanceKm * 0.2 + riskPenalty;
    return Number((safeCost * roadPref).toFixed(3));
  }

  // 4. BALANCED: Multi-objective weighted blend of time, distance, traffic, and risk
  const roadPref = getVehicleRoadPreferenceMultiplier(vehicle, edge.roadType);
  const trafficPenalty = Math.max(0, effectiveTrafficFactor - 1.0) * edge.distanceKm * 0.8;
  const riskPenalty = (effectiveRisk / 10) * edge.distanceKm * 0.6;
  const cost = segAdjustedTimeMin * 0.5 + edge.distanceKm * 0.3 + trafficPenalty + riskPenalty;
  return Number((cost * roadPref).toFixed(3));
}

export function removeLoopsFromPath(rawNodeIds: string[]): string[] {
  if (rawNodeIds.length <= 2) return rawNodeIds;
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

  return clean;
}

export function evaluateRoutePath(
  rawNodeIds: string[],
  vertices: GraphVertex[],
  edges: GraphEdge[],
  mode: OptimizationMode,
  vehicle: VehicleType,
  bounds?: GraphNormalizationBounds
): EvaluatedRoute {
  const nodeIds = removeLoopsFromPath(rawNodeIds);
  if (nodeIds.length < 2) {
    return {
      nodeIds,
      segments: [],
      totalDistanceKm: 0,
      baseTimeMin: 0,
      totalTimeMin: 0,
      averageTrafficFactor: 1.0,
      averageRisk: 0,
      congestionCost: 0,
      riskCost: 0,
      fitness: Infinity,
      isFeasible: false,
      infeasibilityReason: 'Route contains fewer than 2 nodes',
    };
  }

  const vertexMap = new Map<string, GraphVertex>();
  vertices.forEach(v => vertexMap.set(v.id, v));

  const segments: RouteSegment[] = [];
  let totalDistanceKm = 0;
  let totalBaseTimeMin = 0;
  let totalAdjustedTimeMin = 0;
  let totalWeightedRisk = 0;
  let totalTrafficFactorSum = 0;

  for (let i = 0; i < nodeIds.length - 1; i++) {
    const fromId = nodeIds[i];
    const toId = nodeIds[i + 1];
    const fromNode = vertexMap.get(fromId);
    const toNode = vertexMap.get(toId);

    if (!fromNode || !toNode) {
      return {
        nodeIds,
        segments: [],
        totalDistanceKm: 0,
        baseTimeMin: 0,
        totalTimeMin: 0,
        averageTrafficFactor: 1.0,
        averageRisk: 0,
        congestionCost: 0,
        riskCost: 0,
        fitness: Infinity,
        isFeasible: false,
        infeasibilityReason: `Node ${fromId} or ${toId} does not exist`,
      };
    }

    // Find directed edge
    const edge = edges.find(e => e.from === fromId && e.to === toId);
    if (!edge) {
      return {
        nodeIds,
        segments: [],
        totalDistanceKm: 0,
        baseTimeMin: 0,
        totalTimeMin: 0,
        averageTrafficFactor: 1.0,
        averageRisk: 0,
        congestionCost: 0,
        riskCost: 0,
        fitness: Infinity,
        isFeasible: false,
        infeasibilityReason: `No connected road segment between ${fromNode.name} and ${toNode.name}`,
      };
    }

    // Check blocked status
    if (edge.incident && edge.incident.isBlocked) {
      return {
        nodeIds,
        segments: [],
        totalDistanceKm: 0,
        baseTimeMin: 0,
        totalTimeMin: 0,
        averageTrafficFactor: 1.0,
        averageRisk: 0,
        congestionCost: 0,
        riskCost: 0,
        fitness: Infinity,
        isFeasible: false,
        infeasibilityReason: `Road segment ${edge.roadName} (${fromNode.name} → ${toNode.name}) is blocked by incident`,
      };
    }

    // Check vehicle restriction
    const allowed = edge.vehicle_allowed ?? edge.allowedVehicles;
    if (allowed && !allowed.includes(vehicle)) {
      return {
        nodeIds,
        segments: [],
        totalDistanceKm: 0,
        baseTimeMin: 0,
        totalTimeMin: 0,
        averageTrafficFactor: 1.0,
        averageRisk: 0,
        congestionCost: 0,
        riskCost: 0,
        fitness: Infinity,
        isFeasible: false,
        infeasibilityReason: `${vehicle.toUpperCase()} not allowed on ${edge.roadName}`,
      };
    }

    // Calculate segment metrics
    const speedMult = getVehicleSpeedMultiplier(vehicle, edge.roadType);
    const effectiveSpeed = Math.max(20, edge.baseSpeedKmH * speedMult);
    const segBaseTimeMin = (edge.distanceKm / effectiveSpeed) * 60;

    // Traffic calculation with incident multiplier & vehicle sensitivity
    const incTrafficMult = edge.incident ? edge.incident.trafficMultiplier : 1.0;
    const vehicleSensitivity = getVehicleTrafficSensitivity(vehicle);
    const rawCongestion = edge.historical_congestion ?? edge.trafficFactor;
    const effectiveTrafficFactor = 1.0 + (rawCongestion * incTrafficMult - 1.0) * vehicleSensitivity;
    const segAdjustedTimeMin = segBaseTimeMin * effectiveTrafficFactor;

    // Risk calculation
    const incRiskAdd = edge.incident ? edge.incident.riskAddition : 0;
    const rawRisk = edge.historical_risk ?? edge.riskScore;
    const effectiveRisk = Math.min(10, rawRisk + incRiskAdd);

    segments.push({
      fromNode,
      toNode,
      edge,
      segmentDistanceKm: edge.distanceKm,
      baseTimeMin: Number(segBaseTimeMin.toFixed(2)),
      adjustedTimeMin: Number(segAdjustedTimeMin.toFixed(2)),
      effectiveRisk,
      isBlocked: false,
    });

    totalDistanceKm += edge.distanceKm;
    totalBaseTimeMin += segBaseTimeMin;
    totalAdjustedTimeMin += segAdjustedTimeMin;
    totalWeightedRisk += effectiveRisk * edge.distanceKm;
    totalTrafficFactorSum += effectiveTrafficFactor * edge.distanceKm;
  }

  const averageRisk = totalDistanceKm > 0 ? Number((totalWeightedRisk / totalDistanceKm).toFixed(2)) : 0;
  const averageTrafficFactor = totalDistanceKm > 0 ? Number((totalTrafficFactorSum / totalDistanceKm).toFixed(2)) : 1.0;

  const congestionCost = Number(Math.max(0, (averageTrafficFactor - 1.0) * 100).toFixed(1));
  const riskCost = Number((averageRisk * 10).toFixed(1));

  const normBounds = bounds ?? computeGraphNormalizationBounds(edges);

  // Fitness(P) = Σ W(e), for every edge e ∈ P
  let totalEdgeWeights = 0;
  for (const seg of segments) {
    totalEdgeWeights += computeEdgeMetaheuristicWeight(seg.edge, mode, vehicle, normBounds);
  }
  const fitness = Number(totalEdgeWeights.toFixed(2));

  return {
    nodeIds,
    segments,
    totalDistanceKm: Number(totalDistanceKm.toFixed(2)),
    baseTimeMin: Number(totalBaseTimeMin.toFixed(2)),
    totalTimeMin: Number(totalAdjustedTimeMin.toFixed(2)),
    averageTrafficFactor,
    averageRisk,
    congestionCost,
    riskCost,
    fitness,
    isFeasible: true,
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
