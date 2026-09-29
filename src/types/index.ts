import {
  DayType,
  ObjectiveWeights,
  TrafficIncidentState,
  EdgeTrafficSnapshot,
  TrafficState,
  DynamicEdgeState,
} from './traffic';

export type {
  DayType,
  ObjectiveWeights,
  TrafficIncidentState,
  EdgeTrafficSnapshot,
  TrafficState,
  DynamicEdgeState,
};

export type VehicleType = 'car' | 'bike' | 'bus' | 'truck' | 'emergency';

export type OptimizationMode = 'traffic' | 'shortest' | 'fastest' | 'balanced' | 'safer';

export type IncidentType = 'road_block' | 'heavy_traffic' | 'accident';

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface GraphVertex {
  id: string;
  name: string;
  type: 'metro' | 'city' | 'town' | 'junction' | 'village';
  coords: GeoPoint;
  tier?: 'metro' | 'city' | 'town' | 'junction' | 'village';
  state?: string;
}

export interface GraphEdge {
  id: string;
  from: string;
  to: string;
  roadName: string;
  roadType: 'expressway' | 'national_highway' | 'state_highway' | 'arterial' | 'rural';
  distanceKm: number;
  baseSpeedKmH: number;
  geometry: GeoPoint[];
  trafficFactor: number; // 1.0 = free-flow, 1.5 = moderate, 2.5 = heavy
  riskScore: number; // 1 (safest) to 10 (hazardous)
  distance: number; // km
  travel_time: number; // minutes (free-flow base travel time)
  historical_congestion: number; // historical congestion factor (e.g. 1.05 to 1.85)
  historical_risk: number; // historical risk/accident index (1.0 to 10.0)
  road_condition: 'excellent' | 'good' | 'fair' | 'poor';
  vehicle_allowed?: VehicleType[];
  vehicle_suitability?: Record<VehicleType, number>;
  incident?: {
    type: IncidentType;
    description: string;
    trafficMultiplier: number;
    riskAddition: number;
    isBlocked: boolean;
  };
  allowedVehicles: VehicleType[];
}

export interface NormalizedEdgeMetrics {
  edgeId: string;
  normalizedDistance: number; // D_norm(e)
  normalizedTravelTime: number; // T_norm(e, t)
  normalizedCongestion: number; // C_norm(e, t)
  normalizedRisk: number;
  dynamicWeight: number; // f(e, t) = wT*T_norm + wD*D_norm + wC*C_norm
}

export interface RouteSegment {
  fromNode: GraphVertex;
  toNode: GraphVertex;
  edge: GraphEdge;
  segmentDistanceKm: number;
  baseTimeMin: number;
  adjustedTimeMin: number; // dynamic travelTime(e, t)
  congestionIndex?: number; // dynamic congestion(e, t)
  currentSpeedKmH?: number; // dynamic currentSpeed(e, t)
  normalizedTime?: number;
  normalizedDistance?: number;
  normalizedCongestion?: number;
  segmentObjectiveCost?: number;
  effectiveRisk: number;
  isBlocked: boolean;
}

export interface EvaluatedRoute {
  nodeIds: string[];
  segments: RouteSegment[];
  totalDistanceKm: number;        // D(R) = sum of edge distances
  baseTimeMin: number;            // sum of free-flow travel times
  totalTimeMin: number;           // T(R, t) = sum of dynamic edge travel times
  totalCongestion: number;        // C(R, t) = sum of dynamic edge congestion indices
  normalizedTime: number;         // T_norm(R, t)
  normalizedDistance: number;     // D_norm(R)
  normalizedCongestion: number;   // C_norm(R, t)
  objectiveWeights: ObjectiveWeights; // { wT, wD, wC } with wT + wD + wC = 1
  trafficTimestamp?: string;
  averageTrafficFactor: number;
  averageRisk: number;
  avgHistoricalCongestion?: number;
  avgHistoricalRisk?: number;
  congestionCost: number;
  riskCost: number;
  fitness: number;                // F(R, t) = wT*T_norm(R,t) + wD*D_norm(R) + wC*C_norm(R,t)
  isFeasible: boolean;
  infeasibilityReason?: string;
  mode?: OptimizationMode;
  modeWeights?: ModeWeights;
  qpsoIterations?: number;
}

export interface ModeWeights {
  timeWeight: number;     // wT
  distanceWeight: number; // wD
  trafficWeight: number;  // wC
  riskWeight: number;     // isolated (0 in core SIH objective)
}

export interface QpsoIterationRecord {
  iteration: number;
  bestFitness: number;
  meanFitness: number;
  worstFitness: number;
  fitnessStdDev: number;
  swarmDiversity: number; // Spatial dispersion S(t)
  beta: number; // Contraction-Expansion parameter
  deltaFitness: number; // Instantaneous improvement |F(t) - F(t-1)|
  explorationRate: number; // Percentage of particles exploring outside pbest basin
}

export interface QpsoParticleCalculationState {
  particleIndex: number;
  iteration: number;
  dimension: number;
  dimensionName: string;
  x_current: number;
  pbest_val: number;
  gbest_val: number;
  mbest_val: number;
  phi: number;
  p_attractor: number;
  beta: number;
  u: number;
  delta: number;
  sign: number;
  x_next: number;
  isModelGuided?: boolean;
  modelPredictedCongestion?: number;
  modelPredictedRisk?: number;
  modelConfidence?: number;
  modelPriorDesirability?: number;
  modelFeatureContribution?: string;
}

export interface QpsoResult {
  bestRoute: EvaluatedRoute | null;
  convergenceHistory: QpsoIterationRecord[];
  executionTimeMs: number;
  particlesCount: number;
  iterationsCount: number;
  allCandidateRoutesEvaluated: number;
  sampleCalculation?: QpsoParticleCalculationState;
  trafficState?: TrafficState;
  objectiveWeights?: ObjectiveWeights;
  seed?: number;
  repairCount?: number;
  feasibleSolutionCount?: number;
  trainedModelMetrics?: {
    modelType: string;
    r2Score: number;
    meanAbsoluteError: number;
    trainingSamples: number;
    trainingEpochs: number;
    topFeatures: { name: string; importancePercent: number }[];
  };
}

export interface AlgorithmBenchmarkResult {
  algorithm: 'Dijkstra' | 'A*' | 'GA' | 'PSO' | 'QPSO' | 'ACO' | string;
  fullName?: string;
  distanceKm: number;
  baseTimeMin?: number;
  travelTimeMin: number;
  totalCongestion?: number;
  normalizedTime?: number;
  normalizedDistance?: number;
  normalizedCongestion?: number;
  congestionDelayMin?: number;
  fitness: number;
  runtimeMs: number;
  nodesEvaluated: number;
  iterations: number;
  searchStrategy: string;
  status: 'Complete' | 'Infeasible';
  routeNodeIds: string[];
  convergenceCurve?: number[];
  isBest?: boolean;
}

export interface ScalabilityResult {
  networkName: string;
  verticesCount: number;
  edgesCount: number;
  particles: number;
  runtimeMs: number;
  bestFitness: number;
  iterationsToConverge: number;
}

export interface DynamicRerouteState {
  isActive: boolean;
  currentLocationNodeId: string;
  incidentEdgeId: string;
  incidentType: IncidentType;
  beforeRoute: EvaluatedRoute;
  afterRoute: EvaluatedRoute;
  alreadyTraveledRoute: EvaluatedRoute;
  additionalDistanceKm: number;
  additionalTimeMin: number;
  additionalFitness: number;
}

export interface MultiModeRoutes {
  traffic?: EvaluatedRoute | null;
  fastest?: EvaluatedRoute | null;
  balanced?: EvaluatedRoute | null;
  safer?: EvaluatedRoute | null;
  shortest?: EvaluatedRoute | null;
}
