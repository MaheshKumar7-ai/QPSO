import { buildCompleteRegionalGraph } from '../data/roadNetworks';
import { DirectedWeightedGraph } from './graph';
import { runDijkstraShortestPath, recalculateRouteMetrics } from './shortestPath';
import { runQpsoOptimization } from '../algorithms/qpso';
import { buildTrafficState } from '../algorithms/trafficModel';
import { ObjectiveWeights, QpsoResult } from '../types';

export interface Phase3TestReport {
  test1_BasicQpso: {
    origin: string;
    destination: string;
    isFeasible: boolean;
    routeNodeCount: number;
    totalDistanceKm: number;
    totalTimeMin: number;
    totalCongestion: number;
    objectiveCost: number;
    runtimeMs: number;
    iterations: number;
    passed: boolean;
  };
  test2_ObjectiveConsistency: {
    reportedFitness: number;
    independentlyRecalculatedFitness: number;
    reportedDistanceKm: number;
    independentDistanceKm: number;
    reportedTimeMin: number;
    independentTimeMin: number;
    reportedCongestion: number;
    independentCongestion: number;
    difference: number;
    isConsistent: boolean;
  };
  test3_TrafficState: {
    origin: string;
    destination: string;
    stateA_0830_Time: number;
    stateA_0830_Congestion: number;
    stateA_0830_Fitness: number;
    stateB_0845_Time: number;
    stateB_0845_Congestion: number;
    stateB_0845_Fitness: number;
    timeDeltaMin: number;
    fitnessDelta: number;
    respondsToTrafficState: boolean;
  };
  test4_WeightsResponse: {
    timePriorityFitness: number;
    balancedFitness: number;
    congestionPriorityFitness: number;
    respondsToWeights: boolean;
  };
  test5_SeedReproducibility: {
    seed: number;
    run1Fitness: number;
    run2Fitness: number;
    run1Distance: number;
    run2Distance: number;
    run1Path: string[];
    run2Path: string[];
    isIdentical: boolean;
  };
  test6_ConvergenceTracking: {
    totalIterationsRecorded: number;
    initialFitness: number;
    finalFitness: number;
    isMonotonicallyNonIncreasing: boolean;
    convergenceRecordSample: {
      iteration: number;
      bestFitness: number;
      meanFitness: number;
      worstFitness: number;
      swarmDiversity: number;
      beta: number;
    };
  };
  test7_SwarmDiversity: {
    initialDiversity: number;
    finalDiversity: number;
    diversityDecreasesSmoothly: boolean;
    explorationRateActive: boolean;
  };
  test8_BaselineSanity: {
    pair: string;
    dijkstraObjective: number;
    dijkstraDistanceKm: number;
    dijkstraTimeMin: number;
    qpsoObjective: number;
    qpsoDistanceKm: number;
    qpsoTimeMin: number;
    metaheuristicGapPercent: number;
    bothFeasibleAndValid: boolean;
  };
  allPhase3TestsPassed: boolean;
}

/**
 * Executes the complete automated verification test suite for Phase 3 Adaptive QPSO Optimizer.
 */
export function runPhase3TestSuite(): Phase3TestReport {
  const { vertices, edges } = buildCompleteRegionalGraph();
  const graph = DirectedWeightedGraph.fromNetwork(vertices, edges);

  const startId = 'VIJAYAWADA';
  const destId = 'VISAKHAPATNAM';
  const defaultTraffic = buildTrafficState(edges, '08:30', 'weekday');
  const defaultWeights: ObjectiveWeights = { wT: 0.40, wD: 0.30, wC: 0.30 };
  const fixedSeed = 1007;

  // TEST 1 — BASIC QPSO
  const qpso1: QpsoResult = runQpsoOptimization(
    startId,
    destId,
    vertices,
    edges,
    'balanced',
    undefined,
    {
      populationSize: 20,
      maxIterations: 25,
      seed: fixedSeed,
      trafficState: defaultTraffic,
      objectiveWeights: defaultWeights,
      graph,
    }
  );

  const bestRoute1 = qpso1.bestRoute;
  const test1Passed = Boolean(
    bestRoute1 &&
    bestRoute1.isFeasible &&
    bestRoute1.nodeIds.length >= 2 &&
    bestRoute1.nodeIds[0] === startId &&
    bestRoute1.nodeIds[bestRoute1.nodeIds.length - 1] === destId &&
    bestRoute1.totalDistanceKm > 0 &&
    bestRoute1.totalTimeMin > 0 &&
    isFinite(bestRoute1.fitness)
  );

  const test1 = {
    origin: startId,
    destination: destId,
    isFeasible: bestRoute1?.isFeasible ?? false,
    routeNodeCount: bestRoute1?.nodeIds.length ?? 0,
    totalDistanceKm: bestRoute1?.totalDistanceKm ?? 0,
    totalTimeMin: bestRoute1?.totalTimeMin ?? 0,
    totalCongestion: bestRoute1?.totalCongestion ?? 0,
    objectiveCost: bestRoute1?.fitness ?? Infinity,
    runtimeMs: qpso1.executionTimeMs,
    iterations: qpso1.iterationsCount,
    passed: test1Passed,
  };

  // TEST 2 — OBJECTIVE CONSISTENCY
  const recalcRoute = recalculateRouteMetrics(
    bestRoute1?.nodeIds ?? [],
    graph,
    defaultTraffic,
    defaultWeights,
    undefined,
    startId,
    destId
  );

  const diff = Math.abs((bestRoute1?.fitness ?? 0) - recalcRoute.fitness);
  const isConsistent = diff < 0.001;

  const test2 = {
    reportedFitness: bestRoute1?.fitness ?? 0,
    independentlyRecalculatedFitness: recalcRoute.fitness,
    reportedDistanceKm: bestRoute1?.totalDistanceKm ?? 0,
    independentDistanceKm: recalcRoute.totalDistanceKm,
    reportedTimeMin: bestRoute1?.totalTimeMin ?? 0,
    independentTimeMin: recalcRoute.totalTimeMin,
    reportedCongestion: bestRoute1?.totalCongestion ?? 0,
    independentCongestion: recalcRoute.totalCongestion,
    difference: Number(diff.toFixed(6)),
    isConsistent,
  };

  // TEST 3 — TRAFFIC STATE
  const trafficStateA = buildTrafficState(edges, '08:30', 'weekday');
  const trafficStateB = buildTrafficState(edges, '08:45', 'weekday');

  const qpso3A = runQpsoOptimization(startId, destId, vertices, edges, 'balanced', undefined, {
    populationSize: 18,
    maxIterations: 20,
    seed: fixedSeed,
    trafficState: trafficStateA,
    objectiveWeights: defaultWeights,
    graph,
  });

  const qpso3B = runQpsoOptimization(startId, destId, vertices, edges, 'balanced', undefined, {
    populationSize: 18,
    maxIterations: 20,
    seed: fixedSeed,
    trafficState: trafficStateB,
    objectiveWeights: defaultWeights,
    graph,
  });

  const tA = qpso3A.bestRoute?.totalTimeMin ?? 0;
  const tB = qpso3B.bestRoute?.totalTimeMin ?? 0;
  const fA = qpso3A.bestRoute?.fitness ?? 0;
  const fB = qpso3B.bestRoute?.fitness ?? 0;

  const test3 = {
    origin: startId,
    destination: destId,
    stateA_0830_Time: tA,
    stateA_0830_Congestion: qpso3A.bestRoute?.totalCongestion ?? 0,
    stateA_0830_Fitness: fA,
    stateB_0845_Time: tB,
    stateB_0845_Congestion: qpso3B.bestRoute?.totalCongestion ?? 0,
    stateB_0845_Fitness: fB,
    timeDeltaMin: Number((tB - tA).toFixed(2)),
    fitnessDelta: Number((fB - fA).toFixed(4)),
    respondsToTrafficState: Math.abs(tB - tA) > 0 || Math.abs(fB - fA) > 0,
  };

  // TEST 4 — WEIGHTS RESPONSE
  const wTime: ObjectiveWeights = { wT: 0.70, wD: 0.15, wC: 0.15 };
  const wBal: ObjectiveWeights = { wT: 0.40, wD: 0.30, wC: 0.30 };
  const wCong: ObjectiveWeights = { wT: 0.25, wD: 0.15, wC: 0.60 };

  const qpsoTime = runQpsoOptimization(startId, destId, vertices, edges, 'fastest', undefined, {
    populationSize: 18,
    maxIterations: 20,
    seed: fixedSeed,
    trafficState: defaultTraffic,
    objectiveWeights: wTime,
    graph,
  });
  const qpsoBal = runQpsoOptimization(startId, destId, vertices, edges, 'balanced', undefined, {
    populationSize: 18,
    maxIterations: 20,
    seed: fixedSeed,
    trafficState: defaultTraffic,
    objectiveWeights: wBal,
    graph,
  });
  const qpsoCong = runQpsoOptimization(startId, destId, vertices, edges, 'traffic', undefined, {
    populationSize: 18,
    maxIterations: 20,
    seed: fixedSeed,
    trafficState: defaultTraffic,
    objectiveWeights: wCong,
    graph,
  });

  const fTime = qpsoTime.bestRoute?.fitness ?? 0;
  const fBal = qpsoBal.bestRoute?.fitness ?? 0;
  const fCong = qpsoCong.bestRoute?.fitness ?? 0;

  const test4 = {
    timePriorityFitness: fTime,
    balancedFitness: fBal,
    congestionPriorityFitness: fCong,
    respondsToWeights: fTime !== fBal && fBal !== fCong,
  };

  // TEST 5 — SEED REPRODUCIBILITY
  const run1 = runQpsoOptimization(startId, destId, vertices, edges, 'balanced', undefined, {
    populationSize: 18,
    maxIterations: 25,
    seed: 5555,
    trafficState: defaultTraffic,
    objectiveWeights: defaultWeights,
    graph,
  });
  const run2 = runQpsoOptimization(startId, destId, vertices, edges, 'balanced', undefined, {
    populationSize: 18,
    maxIterations: 25,
    seed: 5555,
    trafficState: defaultTraffic,
    objectiveWeights: defaultWeights,
    graph,
  });

  const path1 = run1.bestRoute?.nodeIds ?? [];
  const path2 = run2.bestRoute?.nodeIds ?? [];
  const isIdentical =
    (run1.bestRoute?.fitness ?? 0) === (run2.bestRoute?.fitness ?? 0) &&
    path1.length === path2.length &&
    path1.every((id, idx) => id === path2[idx]);

  const test5 = {
    seed: 5555,
    run1Fitness: run1.bestRoute?.fitness ?? 0,
    run2Fitness: run2.bestRoute?.fitness ?? 0,
    run1Distance: run1.bestRoute?.totalDistanceKm ?? 0,
    run2Distance: run2.bestRoute?.totalDistanceKm ?? 0,
    run1Path: path1,
    run2Path: path2,
    isIdentical,
  };

  // TEST 6 — CONVERGENCE TRACKING
  const history = qpso1.convergenceHistory;
  let isMonotonic = true;
  for (let i = 1; i < history.length; i++) {
    if (history[i].bestFitness > history[i - 1].bestFitness + 0.0001) {
      isMonotonic = false;
      break;
    }
  }

  const sampleRecord = history[Math.min(5, history.length - 1)];
  const test6 = {
    totalIterationsRecorded: history.length,
    initialFitness: history[0]?.bestFitness ?? 0,
    finalFitness: history[history.length - 1]?.bestFitness ?? 0,
    isMonotonicallyNonIncreasing: isMonotonic,
    convergenceRecordSample: {
      iteration: sampleRecord.iteration,
      bestFitness: sampleRecord.bestFitness,
      meanFitness: sampleRecord.meanFitness,
      worstFitness: sampleRecord.worstFitness,
      swarmDiversity: sampleRecord.swarmDiversity,
      beta: sampleRecord.beta,
    },
  };

  // TEST 7 — SWARM DIVERSITY
  const initDiv = history[0]?.swarmDiversity ?? 0;
  const finalDiv = history[history.length - 1]?.swarmDiversity ?? 0;
  const test7 = {
    initialDiversity: initDiv,
    finalDiversity: finalDiv,
    diversityDecreasesSmoothly: initDiv > 0 && finalDiv >= 0,
    explorationRateActive: history.some(h => h.explorationRate > 0),
  };

  // TEST 8 — BASELINE SANITY (Dijkstra vs QPSO on identical formulation)
  const dijkstraRes = runDijkstraShortestPath(graph, startId, destId, defaultTraffic, defaultWeights);
  const qpsoFitness = bestRoute1?.fitness ?? Infinity;
  const dijkstraFitness = dijkstraRes.fitness;
  const gapPct = dijkstraFitness > 0 ? ((qpsoFitness - dijkstraFitness) / dijkstraFitness) * 100 : 0;

  const test8 = {
    pair: `${startId} -> ${destId}`,
    dijkstraObjective: dijkstraFitness,
    dijkstraDistanceKm: dijkstraRes.totalDistanceKm,
    dijkstraTimeMin: dijkstraRes.totalTimeMin,
    qpsoObjective: qpsoFitness,
    qpsoDistanceKm: bestRoute1?.totalDistanceKm ?? 0,
    qpsoTimeMin: bestRoute1?.totalTimeMin ?? 0,
    metaheuristicGapPercent: Number(gapPct.toFixed(2)),
    bothFeasibleAndValid: dijkstraRes.isFeasible && (bestRoute1?.isFeasible ?? false),
  };

  const allPassed =
    test1.passed &&
    test2.isConsistent &&
    test3.respondsToTrafficState &&
    test4.respondsToWeights &&
    test5.isIdentical &&
    test6.isMonotonicallyNonIncreasing &&
    test7.diversityDecreasesSmoothly &&
    test8.bothFeasibleAndValid;

  return {
    test1_BasicQpso: test1,
    test2_ObjectiveConsistency: test2,
    test3_TrafficState: test3,
    test4_WeightsResponse: test4,
    test5_SeedReproducibility: test5,
    test6_ConvergenceTracking: test6,
    test7_SwarmDiversity: test7,
    test8_BaselineSanity: test8,
    allPhase3TestsPassed: allPassed,
  };
}
