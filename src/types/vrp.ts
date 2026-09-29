import { GeoPoint, GraphVertex, EvaluatedRoute, DayType, QpsoIterationRecord, IncidentType } from './index';

export interface VrpCustomer {
  id: string; // e.g. "C01"
  nodeId: string; // Graph node ID e.g. "GUNTUR"
  nodeName: string; // City/Junction name
  coords: GeoPoint;
  demand: number; // Simulated capacity demand (units)
}

export interface VrpVehicle {
  id: string; // e.g. "V01"
  capacity: number; // e.g. 100
  startDepotId: string;
  endDepotId: string;
  color: string;
}

export interface VrpVehicleRoute {
  vehicleId: string;
  assignedCustomers: VrpCustomer[];
  customerNodeIds: string[]; // [DepotId, C1, C2, ..., DepotId]
  load: number;
  capacity: number;
  route: EvaluatedRoute | null; // Evaluated route following AP road graph edges
  totalDistanceKm: number;
  totalTimeMin: number;
  totalCongestion: number;
  isFeasible: boolean;
  infeasibilityReason?: string;
}

export interface VrpConstraintChecks {
  allServed: boolean;
  noDuplicates: boolean;
  capacitySatisfied: boolean;
  depotStartEnd: boolean;
  allRoutesConnected: boolean;
  fleetSizeSatisfied: boolean;
}

export interface VrpSolution {
  depotId: string;
  depotNode: GraphVertex;
  customers: VrpCustomer[];
  vehicles: VrpVehicle[];
  vehicleRoutes: VrpVehicleRoute[];
  totalServedCount: number;
  totalCustomerCount: number;
  totalDistanceKm: number;
  totalTimeMin: number;
  totalCongestion: number;
  fleetFitness: number; // Combined multi-objective F(R, t)
  isFeasible: boolean;
  constraintChecks: VrpConstraintChecks;
  iterations: number;
  fitnessEvaluations: number;
  runtimeMs: number;
  trafficTimestamp: string;
  dayType: DayType;
  convergenceHistory?: QpsoIterationRecord[];
  convergenceCurve?: number[];
}

export interface VrpConfig {
  depotId: string;
  customerCount: number;
  vehicleCount: number;
  vehicleCapacity: number;
  trafficTimestamp: string;
  dayType: DayType;
  seed: number;
}

export type VrpAlgorithmType =
  | 'Adaptive QPSO'
  | 'Standard PSO'
  | 'Genetic Algorithm (GA)'
  | 'Ant Colony Optimization (ACO)';

export interface VrpBenchmarkResult {
  algorithm: VrpAlgorithmType;
  solution: VrpSolution;
  status: 'Completed' | 'Failed' | 'Infeasible';
  distanceKm: number;
  travelTimeMin: number;
  totalCongestion: number;
  fleetFitness: number;
  runtimeMs: number;
  iterations: number;
  fitnessEvaluations: number;
  isFeasible: boolean;
  convergenceCurve?: number[];
  convergenceHistory?: QpsoIterationRecord[];
  bestObjective?: number;
  meanObjective?: number;
  worstObjective?: number;
  meanRuntimeMs?: number;
  trialCount?: number;
}

export interface VrpVehicleImpact {
  vehicleId: string;
  isAffected: boolean;
  initialRoute: VrpVehicleRoute;
  updatedRoute: VrpVehicleRoute;
  distanceDeltaKm: number;
  timeDeltaMin: number;
  congestionDelta: number;
  fitnessDelta: number;
  status: 'Rerouted' | 'Route Retained' | 'Unchanged' | 'No Feasible Reroute';
}

export interface VrpDynamicRerouteState {
  isActive: boolean;
  disruptedEdgeId: string;
  incidentType: IncidentType;
  initialSolution: VrpSolution;
  updatedSolution: VrpSolution;
  vehicleImpacts: VrpVehicleImpact[];
  affectedVehicleCount: number;
  reroutedVehicleCount: number;
  totalDistanceDeltaKm: number;
  totalTimeDeltaMin: number;
  totalCongestionDelta: number;
  totalFitnessDelta: number;
}

