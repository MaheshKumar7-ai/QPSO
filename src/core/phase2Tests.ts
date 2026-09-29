import { buildCompleteRegionalGraph } from '../data/roadNetworks';
import { DirectedWeightedGraph, GraphIntegrityReport } from './graph';
import { runDijkstraShortestPath, runAStarShortestPath, recalculateRouteMetrics } from './shortestPath';
import { buildTrafficState } from '../algorithms/trafficModel';
import { ObjectiveWeights } from '../types';

export interface Phase2TestReport {
  testA_GraphIntegrity: GraphIntegrityReport;
  testB_Dijkstra: Array<{
    pair: string;
    origin: string;
    destination: string;
    feasible: boolean;
    nodesCount: number;
    distanceKm: number;
    travelTimeMin: number;
    congestionCost: number;
    objectiveCost: number;
    nodesEvaluated: number;
    runtimeMs: number;
  }>;
  testC_AStar: Array<{
    pair: string;
    origin: string;
    destination: string;
    feasible: boolean;
    nodesCount: number;
    distanceKm: number;
    travelTimeMin: number;
    congestionCost: number;
    objectiveCost: number;
    nodesEvaluated: number;
    runtimeMs: number;
    matchesDijkstraObjective: boolean;
  }>;
  testD_TrafficState: {
    origin: string;
    destination: string;
    stateA_0830: {
      travelTimeMin: number;
      congestionCost: number;
      objectiveCost: number;
    };
    stateB_0845: {
      travelTimeMin: number;
      congestionCost: number;
      objectiveCost: number;
    };
    travelTimeDeltaMin: number;
    congestionDelta: number;
    objectiveDelta: number;
    respondsToTrafficState: boolean;
  };
  testE_ObjectiveWeights: {
    origin: string;
    destination: string;
    timePriority: { weights: ObjectiveWeights; objectiveCost: number; travelTimeMin: number; distanceKm: number };
    balanced: { weights: ObjectiveWeights; objectiveCost: number; travelTimeMin: number; distanceKm: number };
    congestionPriority: { weights: ObjectiveWeights; objectiveCost: number; travelTimeMin: number; distanceKm: number };
    respondsToWeights: boolean;
  };
  testF_RouteValidation: {
    verifiedNodeSequence: string[];
    edgesCount: number;
    independentDistanceKm: number;
    optimizerDistanceKm: number;
    independentTimeMin: number;
    optimizerTimeMin: number;
    independentCongestion: number;
    optimizerCongestion: number;
    metricsMatchExactly: boolean;
  };
  testG_MapFidelity: {
    totalRouteSegments: number;
    allSegmentsHaveValidGeometry: boolean;
    allPointsInAndhraPradesh: boolean;
    consecutiveEndpointsMatch: boolean;
  };
  allTestsPassed: boolean;
}

/**
 * Runs the full Phase 2 automated test suite on the Andhra Pradesh road network graph.
 */
export function runPhase2TestSuite(): Phase2TestReport {
  const { vertices, edges } = buildCompleteRegionalGraph();
  const graph = DirectedWeightedGraph.fromNetwork(vertices, edges);

  // TEST A — GRAPH INTEGRITY
  const testA = graph.validateIntegrity();

  // Test OD Pairs
  const odPairs = [
    { from: 'VIJAYAWADA', to: 'VISAKHAPATNAM', label: 'Vijayawada -> Visakhapatnam (NH-16 Coastal Trunk)' },
    { from: 'TIRUPATI', to: 'KURNOOL', label: 'Tirupati -> Kurnool (Rayalaseema Spine)' },
    { from: 'GUNTUR', to: 'RAJAHMUNDRY', label: 'Guntur -> Rajahmundry (Delta Corridor)' },
  ];

  const defaultTraffic = buildTrafficState(edges, '08:30', 'weekday');
  const defaultWeights: ObjectiveWeights = { wT: 0.40, wD: 0.30, wC: 0.30 };

  // TEST B — DIJKSTRA
  const testB = odPairs.map(p => {
    const res = runDijkstraShortestPath(graph, p.from, p.to, defaultTraffic, defaultWeights);
    return {
      pair: p.label,
      origin: p.from,
      destination: p.to,
      feasible: res.isFeasible,
      nodesCount: res.nodeIds.length,
      distanceKm: res.totalDistanceKm,
      travelTimeMin: res.totalTimeMin,
      congestionCost: res.totalCongestion,
      objectiveCost: res.fitness,
      nodesEvaluated: res.nodesEvaluated,
      runtimeMs: res.runtimeMs,
    };
  });

  // TEST C — A*
  const testC = odPairs.map((p, idx) => {
    const resAStar = runAStarShortestPath(graph, p.from, p.to, defaultTraffic, defaultWeights);
    const dijkstraObj = testB[idx].objectiveCost;
    const matches = Math.abs(resAStar.fitness - dijkstraObj) < 0.001;
    return {
      pair: p.label,
      origin: p.from,
      destination: p.to,
      feasible: resAStar.isFeasible,
      nodesCount: resAStar.nodeIds.length,
      distanceKm: resAStar.totalDistanceKm,
      travelTimeMin: resAStar.totalTimeMin,
      congestionCost: resAStar.totalCongestion,
      objectiveCost: resAStar.fitness,
      nodesEvaluated: resAStar.nodesEvaluated,
      runtimeMs: resAStar.runtimeMs,
      matchesDijkstraObjective: matches,
    };
  });

  // TEST D — TRAFFIC STATE (08:30 vs 08:45)
  const trafficStateA = buildTrafficState(edges, '08:30', 'weekday');
  const trafficStateB = buildTrafficState(edges, '08:45', 'weekday');
  const resStateA = runDijkstraShortestPath(graph, 'VIJAYAWADA', 'VISAKHAPATNAM', trafficStateA, defaultWeights);
  const resStateB = runDijkstraShortestPath(graph, 'VIJAYAWADA', 'VISAKHAPATNAM', trafficStateB, defaultWeights);

  const timeDelta = Number((resStateB.totalTimeMin - resStateA.totalTimeMin).toFixed(2));
  const congDelta = Number((resStateB.totalCongestion - resStateA.totalCongestion).toFixed(2));
  const objDelta = Number((resStateB.fitness - resStateA.fitness).toFixed(4));

  const testD = {
    origin: 'VIJAYAWADA',
    destination: 'VISAKHAPATNAM',
    stateA_0830: {
      travelTimeMin: resStateA.totalTimeMin,
      congestionCost: resStateA.totalCongestion,
      objectiveCost: resStateA.fitness,
    },
    stateB_0845: {
      travelTimeMin: resStateB.totalTimeMin,
      congestionCost: resStateB.totalCongestion,
      objectiveCost: resStateB.fitness,
    },
    travelTimeDeltaMin: timeDelta,
    congestionDelta: congDelta,
    objectiveDelta: objDelta,
    respondsToTrafficState: Math.abs(timeDelta) > 0 || Math.abs(congDelta) > 0,
  };

  // TEST E — OBJECTIVE WEIGHTS
  const wTime: ObjectiveWeights = { wT: 0.70, wD: 0.15, wC: 0.15 };
  const wBal: ObjectiveWeights = { wT: 0.40, wD: 0.30, wC: 0.30 };
  const wCong: ObjectiveWeights = { wT: 0.25, wD: 0.15, wC: 0.60 };

  const resTime = runDijkstraShortestPath(graph, 'VIJAYAWADA', 'VISAKHAPATNAM', defaultTraffic, wTime);
  const resBal = runDijkstraShortestPath(graph, 'VIJAYAWADA', 'VISAKHAPATNAM', defaultTraffic, wBal);
  const resCong = runDijkstraShortestPath(graph, 'VIJAYAWADA', 'VISAKHAPATNAM', defaultTraffic, wCong);

  const testE = {
    origin: 'VIJAYAWADA',
    destination: 'VISAKHAPATNAM',
    timePriority: { weights: wTime, objectiveCost: resTime.fitness, travelTimeMin: resTime.totalTimeMin, distanceKm: resTime.totalDistanceKm },
    balanced: { weights: wBal, objectiveCost: resBal.fitness, travelTimeMin: resBal.totalTimeMin, distanceKm: resBal.totalDistanceKm },
    congestionPriority: { weights: wCong, objectiveCost: resCong.fitness, travelTimeMin: resCong.totalTimeMin, distanceKm: resCong.totalDistanceKm },
    respondsToWeights: resTime.fitness !== resBal.fitness && resBal.fitness !== resCong.fitness,
  };

  // TEST F — ROUTE VALIDATION
  const testRoute = resBal;
  const independentRecalc = recalculateRouteMetrics(testRoute.nodeIds, graph, defaultTraffic, defaultWeights);
  const matchD = Math.abs(testRoute.totalDistanceKm - independentRecalc.totalDistanceKm) < 0.01;
  const matchT = Math.abs(testRoute.totalTimeMin - independentRecalc.totalTimeMin) < 0.01;
  const matchC = Math.abs(testRoute.totalCongestion - independentRecalc.totalCongestion) < 0.01;
  const matchFit = Math.abs(testRoute.fitness - independentRecalc.fitness) < 0.001;

  const testF = {
    verifiedNodeSequence: testRoute.nodeIds,
    edgesCount: testRoute.segments.length,
    independentDistanceKm: independentRecalc.totalDistanceKm,
    optimizerDistanceKm: testRoute.totalDistanceKm,
    independentTimeMin: independentRecalc.totalTimeMin,
    optimizerTimeMin: testRoute.totalTimeMin,
    independentCongestion: independentRecalc.totalCongestion,
    optimizerCongestion: testRoute.totalCongestion,
    metricsMatchExactly: matchD && matchT && matchC && matchFit,
  };

  // TEST G — MAP INTEGRATION
  let allValidGeom = true;
  let allInAP = true;
  let consecMatch = true;

  testRoute.segments.forEach((seg, i) => {
    if (!seg.edge.geometry || seg.edge.geometry.length === 0) allValidGeom = false;
    seg.edge.geometry.forEach(p => {
      if (p.lat < 12 || p.lat > 22 || p.lng < 75 || p.lng > 86) allInAP = false;
    });
    if (i < testRoute.segments.length - 1) {
      const nextSeg = testRoute.segments[i + 1];
      if (seg.toNode.id !== nextSeg.fromNode.id) consecMatch = false;
    }
  });

  const testG = {
    totalRouteSegments: testRoute.segments.length,
    allSegmentsHaveValidGeometry: allValidGeom,
    allInAP,
    allPointsInAndhraPradesh: allInAP,
    consecutiveEndpointsMatch: consecMatch,
  };

  const allTestsPassed =
    testA.isValid &&
    testB.every(r => r.feasible) &&
    testC.every(r => r.feasible && r.matchesDijkstraObjective) &&
    testD.respondsToTrafficState &&
    testE.respondsToWeights &&
    testF.metricsMatchExactly &&
    testG.allSegmentsHaveValidGeometry &&
    testG.allPointsInAndhraPradesh &&
    testG.consecutiveEndpointsMatch;

  return {
    testA_GraphIntegrity: testA,
    testB_Dijkstra: testB,
    testC_AStar: testC,
    testD_TrafficState: testD,
    testE_ObjectiveWeights: testE,
    testF_RouteValidation: testF,
    testG_MapFidelity: testG,
    allTestsPassed,
  };
}
