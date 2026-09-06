export type VehicleType = 'car' | 'bike' | 'bus' | 'truck' | 'emergency';

export type OptimizationMode = 'shortest' | 'fastest' | 'balanced' | 'safer';

export type IncidentType = 'road_block' | 'heavy_traffic' | 'accident' | 'flood' | 'hazardous_road';

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
  // Standardized Edge-Level Historical Attributes (Simulated Historical Data for Demonstration)
  distance: number; // km
  travel_time: number; // minutes
  historical_congestion: number; // historical congestion delay factor (e.g. 1.05 to 1.85)
  historical_risk: number; // historical risk/accident index (1.0 to 10.0)
  road_condition: 'excellent' | 'good' | 'fair' | 'poor';
  vehicle_allowed: VehicleType[];
  vehicle_suitability: Record<VehicleType, number>; // 0.0 (unsuitable) to 1.0 (ideal)
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
  normalizedDistance: number; // D(e) in [0, 1]
  normalizedTravelTime: number; // T(e) in [0, 1]
  normalizedCongestion: number; // C(e) in [0, 1]
  normalizedRisk: number; // R(e) in [0, 1]
  dynamicWeight: number; // W(e) = αT + βC + γR + δD
}

export interface RouteSegment {
  fromNode: GraphVertex;
  toNode: GraphVertex;
  edge: GraphEdge;
  segmentDistanceKm: number;
  baseTimeMin: number;
  adjustedTimeMin: number;
  effectiveRisk: number;
  isBlocked: boolean;
}

export interface EvaluatedRoute {
  nodeIds: string[];
  segments: RouteSegment[];
  totalDistanceKm: number;
  baseTimeMin: number;
  totalTimeMin: number;
  averageTrafficFactor: number;
  averageRisk: number;
  avgHistoricalCongestion?: number;
  avgHistoricalRisk?: number;
  congestionCost: number;
  riskCost: number;
  fitness: number;
  isFeasible: boolean;
  infeasibilityReason?: string;
  mode?: OptimizationMode;
  modeWeights?: ModeWeights;
  qpsoIterations?: number;
}

export interface ModeWeights {
  timeWeight: number;     // w1
  distanceWeight: number; // w2
  trafficWeight: number;  // w3
  riskWeight: number;     // w4
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
  // Trained Traffic Model Guided Fields
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
  travelTimeMin: number;
  fitness: number;
  runtimeMs: number;
  nodesEvaluated: number;
  iterations: number;
  searchStrategy: string;
  status: 'Complete' | 'Infeasible';
  routeNodeIds: string[];
  convergenceCurve?: number[]; // fitness over iterations
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
  fastest: EvaluatedRoute | null;
  balanced: EvaluatedRoute | null;
  safer: EvaluatedRoute | null;
  shortest: EvaluatedRoute | null;
}
