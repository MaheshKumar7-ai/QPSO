import {
  GraphVertex,
  GraphEdge,
  TrafficState,
  ObjectiveWeights,
  DynamicEdgeState,
} from '../types';
import { getDynamicEdgeState } from '../algorithms/trafficModel';
import { calculateHaversineKm } from '../data/indiaLocations';

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

export interface GraphIntegrityReport {
  isValid: boolean;
  nodesCount: number;
  directedEdgesCount: number;
  connectedComponentsCount: number;
  componentSizes: number[];
  isolatedNodes: string[];
  invalidEdges: string[];
  invalidCoordinates: string[];
  bounds: GraphNormalizationBounds;
  warnings: string[];
}

/**
 * Core Directed Weighted Graph Abstraction for Transportation Route Optimization.
 * Encapsulates the Andhra Pradesh road network G = (V, E), supporting time-dependent
 * dynamic edge weights and multi-objective routing.
 */
export class DirectedWeightedGraph {
  private readonly verticesMap = new Map<string, GraphVertex>();
  private readonly outgoingMap = new Map<string, GraphEdge[]>();
  private readonly incomingMap = new Map<string, GraphEdge[]>();
  private readonly edgeByIdMap = new Map<string, GraphEdge>();
  private readonly edgeByPairMap = new Map<string, GraphEdge>();
  private readonly vertexList: GraphVertex[] = [];
  private readonly edgeList: GraphEdge[] = [];
  private cachedBounds: GraphNormalizationBounds | null = null;
  private maxSpeed: number = 85;

  constructor(vertices: GraphVertex[] = [], edges: GraphEdge[] = []) {
    this.buildFromData(vertices, edges);
  }

  public static fromNetwork(vertices: GraphVertex[], edges: GraphEdge[]): DirectedWeightedGraph {
    return new DirectedWeightedGraph(vertices, edges);
  }

  private buildFromData(vertices: GraphVertex[], edges: GraphEdge[]): void {
    this.verticesMap.clear();
    this.outgoingMap.clear();
    this.incomingMap.clear();
    this.edgeByIdMap.clear();
    this.edgeByPairMap.clear();
    this.vertexList.length = 0;
    this.edgeList.length = 0;
    this.cachedBounds = null;

    for (const v of vertices) {
      this.verticesMap.set(v.id, v);
      this.outgoingMap.set(v.id, []);
      this.incomingMap.set(v.id, []);
      this.vertexList.push(v);
    }

    for (const e of edges) {
      if (!this.verticesMap.has(e.from) || !this.verticesMap.has(e.to)) {
        continue;
      }
      this.edgeList.push(e);
      this.edgeByIdMap.set(e.id, e);
      this.edgeByPairMap.set(`${e.from}__${e.to}`, e);

      this.outgoingMap.get(e.from)?.push(e);
      this.incomingMap.get(e.to)?.push(e);

      if (e.baseSpeedKmH > this.maxSpeed) {
        this.maxSpeed = e.baseSpeedKmH;
      }
    }
  }

  public getVertices(): GraphVertex[] {
    return this.vertexList;
  }

  public getEdges(): GraphEdge[] {
    return this.edgeList;
  }

  public getVertex(id: string): GraphVertex | undefined {
    return this.verticesMap.get(id);
  }

  public hasVertex(id: string): boolean {
    return this.verticesMap.has(id);
  }

  public getOutgoingEdges(vertexId: string): GraphEdge[] {
    return this.outgoingMap.get(vertexId) ?? [];
  }

  public getIncomingEdges(vertexId: string): GraphEdge[] {
    return this.incomingMap.get(vertexId) ?? [];
  }

  public getEdge(fromId: string, toId: string): GraphEdge | undefined {
    return this.edgeByPairMap.get(`${fromId}__${toId}`);
  }

  public getEdgeById(edgeId: string): GraphEdge | undefined {
    return this.edgeByIdMap.get(edgeId);
  }

  /**
   * Computes network-level normalization bounds across the active traffic state.
   */
  public computeNormalizationBounds(trafficState?: TrafficState): GraphNormalizationBounds {
    if (!trafficState && this.cachedBounds) {
      return this.cachedBounds;
    }

    let minDist = Infinity, maxDist = -Infinity;
    let minTime = Infinity, maxTime = -Infinity;
    let minCongestion = Infinity, maxCongestion = -Infinity;
    let minRisk = Infinity, maxRisk = -Infinity;
    let maxSpeedFound = 85;

    for (const edge of this.edgeList) {
      const dyn = getDynamicEdgeState(edge, trafficState);
      if (dyn.isBlocked || !isFinite(dyn.travelTime)) continue;

      const d = dyn.distance;
      const t = dyn.travelTime;
      const c = Math.max(0, (dyn.congestion - 1.0) * dyn.distance);
      const r = edge.historical_risk ?? edge.riskScore ?? 2.0;

      if (d < minDist) minDist = d;
      if (d > maxDist) maxDist = d;
      if (t < minTime) minTime = t;
      if (t > maxTime) maxTime = t;
      if (c < minCongestion) minCongestion = c;
      if (c > maxCongestion) maxCongestion = c;
      if (r < minRisk) minRisk = r;
      if (r > maxRisk) maxRisk = r;
      if (edge.baseSpeedKmH > maxSpeedFound) maxSpeedFound = edge.baseSpeedKmH;
    }

    const bounds: GraphNormalizationBounds = {
      minDist: minDist === Infinity ? 3.5 : minDist,
      maxDist: maxDist === -Infinity || maxDist <= 0 ? 96.0 : maxDist,
      minTime: minTime === Infinity ? 2.5 : minTime,
      maxTime: maxTime === -Infinity || maxTime <= 0 ? 110.0 : maxTime,
      minCongestion: minCongestion === Infinity ? 0.0 : minCongestion,
      maxCongestion: maxCongestion === -Infinity || maxCongestion <= 0 ? 45.0 : maxCongestion,
      minRisk: minRisk === Infinity ? 1.0 : minRisk,
      maxRisk: maxRisk === -Infinity || maxRisk <= 0 ? 8.5 : maxRisk,
      maxSpeedKmH: maxSpeedFound,
    };

    if (!trafficState) {
      this.cachedBounds = bounds;
    }
    return bounds;
  }

  /**
   * Central dynamic edge weight calculation:
   * f(e, t) = wT * T_norm(e, t) + wD * D_norm(e) + wC * C_norm(e, t)
   *
   * where:
   * T_norm = travelTime(e, t) / maxTime
   * D_norm = distance(e) / maxDist
   * C_norm = ((congestion(e, t) - 1.0) * distance(e)) / maxCongestion
   * wT + wD + wC = 1.0
   */
  public getDynamicEdgeWeight(
    edge: GraphEdge,
    trafficState?: TrafficState,
    objectiveWeights?: ObjectiveWeights,
    bounds?: GraphNormalizationBounds
  ): number {
    const dyn = getDynamicEdgeState(edge, trafficState);
    if (dyn.isBlocked || !isFinite(dyn.travelTime)) {
      return Infinity;
    }

    const b = bounds ?? this.computeNormalizationBounds(trafficState);
    const weights = objectiveWeights ?? { wT: 0.40, wD: 0.30, wC: 0.30 };

    const normT = b.maxTime > 0 ? dyn.travelTime / b.maxTime : 0;
    const normD = b.maxDist > 0 ? dyn.distance / b.maxDist : 0;
    const congCost = Math.max(0, (dyn.congestion - 1.0) * dyn.distance);
    const normC = b.maxCongestion > 0 ? congCost / b.maxCongestion : 0;

    const w = weights.wT * normT + weights.wD * normD + weights.wC * normC;
    return Number(w.toFixed(6));
  }

  /**
   * Validates graph topology, edge endpoints, distance/speed positivity, and connectivity.
   */
  public validateIntegrity(): GraphIntegrityReport {
    const invalidEdges: string[] = [];
    const invalidCoordinates: string[] = [];
    const isolatedNodes: string[] = [];
    const warnings: string[] = [];

    // Check vertex coordinates
    for (const v of this.vertexList) {
      if (
        typeof v.coords.lat !== 'number' ||
        typeof v.coords.lng !== 'number' ||
        isNaN(v.coords.lat) ||
        isNaN(v.coords.lng) ||
        v.coords.lat < 12 || v.coords.lat > 22 ||
        v.coords.lng < 75 || v.coords.lng > 86
      ) {
        invalidCoordinates.push(`${v.id} (lat: ${v.coords.lat}, lng: ${v.coords.lng})`);
      }

      const outCount = this.getOutgoingEdges(v.id).length;
      const inCount = this.getIncomingEdges(v.id).length;
      if (outCount === 0 && inCount === 0) {
        isolatedNodes.push(v.id);
      }
    }

    // Check edges
    for (const e of this.edgeList) {
      if (!this.verticesMap.has(e.from) || !this.verticesMap.has(e.to)) {
        invalidEdges.push(`Edge ${e.id}: Missing vertex endpoint (${e.from} -> ${e.to})`);
      }
      if (e.distanceKm <= 0) {
        invalidEdges.push(`Edge ${e.id}: Non-positive distance (${e.distanceKm})`);
      }
      if (e.baseSpeedKmH <= 0) {
        invalidEdges.push(`Edge ${e.id}: Non-positive base speed (${e.baseSpeedKmH})`);
      }
    }

    // Connected components using BFS
    const components = this.findConnectedComponents();
    const bounds = this.computeNormalizationBounds();

    const isValid =
      invalidEdges.length === 0 &&
      invalidCoordinates.length === 0 &&
      isolatedNodes.length === 0 &&
      components.length === 1;

    return {
      isValid,
      nodesCount: this.vertexList.length,
      directedEdgesCount: this.edgeList.length,
      connectedComponentsCount: components.length,
      componentSizes: components.map(c => c.length),
      isolatedNodes,
      invalidEdges,
      invalidCoordinates,
      bounds,
      warnings,
    };
  }

  /**
   * Identifies weakly connected components in the graph.
   */
  public findConnectedComponents(): string[][] {
    const visited = new Set<string>();
    const components: string[][] = [];

    for (const v of this.vertexList) {
      if (visited.has(v.id)) continue;

      const comp: string[] = [];
      const queue: string[] = [v.id];
      visited.add(v.id);

      while (queue.length > 0) {
        const curr = queue.shift()!;
        comp.push(curr);

        const neighbors: string[] = [];
        this.getOutgoingEdges(curr).forEach(e => neighbors.push(e.to));
        this.getIncomingEdges(curr).forEach(e => neighbors.push(e.from));

        for (const n of neighbors) {
          if (!visited.has(n) && this.verticesMap.has(n)) {
            visited.add(n);
            queue.push(n);
          }
        }
      }
      components.push(comp);
    }

    return components;
  }
}
