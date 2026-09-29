import { IncidentType } from './index';

export type DayType = 'weekday' | 'weekend';

export interface ObjectiveWeights {
  wT: number; // Normalized Travel Time weight
  wD: number; // Normalized Distance weight
  wC: number; // Normalized Congestion weight
}

export interface TrafficIncidentState {
  edgeId: string;
  type: IncidentType;
  description: string;
  trafficMultiplier: number;
  riskAddition?: number;
  isBlocked: boolean;
}

export interface EdgeTrafficSnapshot {
  edgeId: string;
  trafficVolume?: number;       // vehicles/hr
  capacity?: number;            // max road capacity (vehicles/hr)
  currentSpeed: number;         // km/h under active traffic state
  currentTravelTime: number;    // minutes (congested travel time for this edge)
  congestionIndex: number;      // dimensionless congestion index (>= 1.0)
  incidentFlag: boolean;
  incidentType?: IncidentType;
  isBlocked: boolean;
}

export interface TrafficState {
  id: string;
  label: string;
  timestamp: string;            // e.g. "08:30", "08:45", "14:00", "18:00", "22:30"
  hour: number;                 // fractional hour e.g. 8.5 for 08:30, 8.75 for 08:45
  dayType: DayType;
  edgeTraffic: Record<string, EdgeTrafficSnapshot>;
  incidents: Record<string, TrafficIncidentState>;
}

export interface DynamicEdgeState {
  edgeId: string;
  distance: number;             // km
  freeFlowTime: number;         // minutes at baseSpeedKmH
  travelTime: number;           // minutes (current travel time under trafficState)
  congestion: number;           // congestion index under trafficState
  currentSpeed: number;         // km/h under trafficState
  trafficVolume?: number;       // vehicles/hr
  capacity?: number;            // vehicles/hr
  incidentFlag: boolean;
  incidentType?: IncidentType;
  isBlocked: boolean;
}
