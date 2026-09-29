/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, startTransition } from 'react';
import {
  OptimizationMode,
  ObjectiveWeights,
  DayType,
  TrafficState,
  GraphVertex,
  GraphEdge,
  QpsoResult,
  AlgorithmBenchmarkResult,
  DynamicRerouteState,
  IncidentType,
  EvaluatedRoute,
  VehicleType,
} from './types';
import { buildCompleteRegionalGraph } from './data/roadNetworks';
import { runQpsoOptimization, findShortestDijkstraPath } from './algorithms/qpso';
import { runSystematicBenchmark } from './algorithms/benchmarks';
import {
  DirectedWeightedGraph,
  runDijkstraShortestPath,
  runAStarShortestPath,
} from './core';
import {
  evaluateRoutePath,
  formatDurationHuman,
  OBJECTIVE_WEIGHT_PRESETS,
  normalizeObjectiveWeights,
  computeGraphNormalizationBounds,
} from './algorithms/evaluator';
import {
  buildTrafficState,
  TRAFFIC_TIME_PRESETS,
  GLOBAL_TRAINED_TRAFFIC_MODEL,
} from './algorithms/trafficModel';
import { MapComponent } from './components/MapComponent';
import { GraphVisualizer } from './components/GraphVisualizer';
import { RouteSummary } from './components/RouteSummary';
import { BenchmarkSection } from './components/BenchmarkSection';
import { DynamicReroutingPanel } from './components/DynamicReroutingPanel';
import { FleetVrpPage } from './components/FleetVrp/FleetVrpPage';
import {
  Play,
  RotateCcw,
  AlertTriangle,
  Sliders,
  CheckCircle2,
  MapPin,
  Network,
  ArrowUpDown,
  ShieldAlert,
  Car,
  Truck,
} from 'lucide-react';

export function App() {
  // Navigation Page View State
  const [activeView, setActiveView] = useState<'optimizer' | 'vrp'>('optimizer');

  // 1. Core Network Graph State (Andhra Pradesh Road Network)
  const [vertices, setVertices] = useState<GraphVertex[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [startNodeId, setStartNodeId] = useState<string>('VIJAYAWADA');
  const [destNodeId, setDestNodeId] = useState<string>('VISAKHAPATNAM');

  // 2. Time-Dependent Traffic State & Multi-Objective Weights
  const [trafficTimestamp, setTrafficTimestamp] = useState<string>('08:30');
  const [dayType, setDayType] = useState<DayType>('weekday');
  const [optimizationMode] = useState<OptimizationMode>('balanced');
  const [objectiveWeights, setObjectiveWeights] = useState<ObjectiveWeights>(
    OBJECTIVE_WEIGHT_PRESETS.balanced
  );
  const [trafficState, setTrafficState] = useState<TrafficState | null>(null);

  // Isolated legacy vehicle state (isolated from core route optimization)
  const [vehicleType] = useState<VehicleType>('car');

  // 3. QPSO Hyperparameters
  const [swarmSize, setSwarmSize] = useState<number>(18);
  const [maxIterations, setMaxIterations] = useState<number>(30);
  const [showAdvancedParams, setShowAdvancedParams] = useState<boolean>(false);

  // 4. Execution & Results State
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<'QPSO' | 'Dijkstra' | 'A*'>('QPSO');
  const [isOptimizing, setIsOptimizing] = useState<boolean>(false);
  const [qpsoResult, setQpsoResult] = useState<QpsoResult | null>(null);
  const [initialBaselineRoute, setInitialBaselineRoute] = useState<EvaluatedRoute | null>(null);
  const [dijkstraResult, setDijkstraResult] = useState<EvaluatedRoute | null>(null);
  const [aStarResult, setAStarResult] = useState<EvaluatedRoute | null>(null);
  const [shortestPathRoute, setShortestPathRoute] = useState<EvaluatedRoute | null>(null);
  const [benchmarks, setBenchmarks] = useState<AlgorithmBenchmarkResult[]>([]);
  const [dynamicReroute, setDynamicReroute] = useState<DynamicRerouteState | null>(null);

  // 5. En-Route Simulation & Isolated Incident Testing State
  const [simProgressIndex, setSimProgressIndex] = useState<number>(0);
  const [isSimulatingDrive, setIsSimulatingDrive] = useState<boolean>(false);
  const [selectedIncidentEdgeId, setSelectedIncidentEdgeId] = useState<string>('');
  const [selectedIncidentType, setSelectedIncidentType] = useState<IncidentType>('accident');
  const [incidentSeverity, setIncidentSeverity] = useState<'moderate' | 'high' | 'critical'>('high');
  const [showIncidentDrawer, setShowIncidentDrawer] = useState<boolean>(false);
  const [mapViewTab, setMapViewTab] = useState<'map' | 'graph'>('map');
  const [selectedNodeOnMap, setSelectedNodeOnMap] = useState<GraphVertex | null>(null);

  // Initialize Andhra Pradesh Road Network
  useEffect(() => {
    const { vertices: vList, edges: eList } = buildCompleteRegionalGraph();
    GLOBAL_TRAINED_TRAFFIC_MODEL.trainModel();

    const enrichedEdges = eList.map(e => {
      const pred = GLOBAL_TRAINED_TRAFFIC_MODEL.predictEdge(e, 8.5);
      return {
        ...e,
        historical_congestion: pred.predictedCongestion,
        historical_risk: pred.predictedRiskScore,
      };
    });

    setVertices(vList);
    setEdges(enrichedEdges);
  }, []);

  // Adjust Custom Weight Slider while keeping wT + wD + wC = 1
  const handleWeightChange = (changedKey: keyof ObjectiveWeights, rawValue: number) => {
    const clamped = Math.max(0, Math.min(1, rawValue));
    const remaining = Math.max(0, 1 - clamped);
    const otherKeys = (['wT', 'wD', 'wC'] as const).filter(k => k !== changedKey);
    const otherSum = otherKeys.reduce((acc, k) => acc + objectiveWeights[k], 0);

    const next: ObjectiveWeights = { ...objectiveWeights, [changedKey]: Number(clamped.toFixed(2)) };
    if (otherSum > 1e-6) {
      otherKeys.forEach(k => {
        next[k] = Number(((objectiveWeights[k] / otherSum) * remaining).toFixed(2));
      });
    } else {
      otherKeys.forEach(k => {
        next[k] = Number((remaining / otherKeys.length).toFixed(2));
      });
    }
    setObjectiveWeights(normalizeObjectiveWeights(next));
  };

  // Execute Optimization Pipeline
  const executeOptimization = useCallback(
    (
      currentVertices: GraphVertex[],
      currentEdges: GraphEdge[],
      startId: string,
      destId: string,
      mode: OptimizationMode,
      weights: ObjectiveWeights,
      timestamp: string,
      currentDayType: DayType,
      particles: number,
      iterations: number
    ) => {
      if (currentVertices.length === 0 || currentEdges.length === 0) return;

      const currentTrafficState = buildTrafficState(
        currentEdges,
        timestamp,
        currentDayType
      );
      const normalizedWeights = normalizeObjectiveWeights(weights);
      const graph = DirectedWeightedGraph.fromNetwork(currentVertices, currentEdges);
      const normBounds = graph.computeNormalizationBounds(currentTrafficState);

      // 1. Quantum Swarm Optimization
      const qpso = runQpsoOptimization(
        startId,
        destId,
        currentVertices,
        currentEdges,
        mode,
        undefined,
        {
          swarmSize: particles,
          maxIterations: iterations,
          trafficState: currentTrafficState,
          objectiveWeights: normalizedWeights,
        }
      );

      // 2. Exact Dijkstra Shortest Path on Directed Weighted Graph
      const dijkstraRoute = runDijkstraShortestPath(
        graph,
        startId,
        destId,
        currentTrafficState,
        normalizedWeights,
        normBounds
      );

      // 3. Exact A* Shortest Path with Multi-Objective Admissible Heuristic
      const aStarRoute = runAStarShortestPath(
        graph,
        startId,
        destId,
        currentTrafficState,
        normalizedWeights,
        normBounds
      );

      // 4. Comparative Metaheuristic & Exact Benchmarks
      const bench = runSystematicBenchmark(
        startId,
        destId,
        currentVertices,
        currentEdges,
        mode,
        undefined,
        iterations,
        currentTrafficState,
        normalizedWeights
      );

      const shortestNodes = findShortestDijkstraPath(
        startId,
        destId,
        currentVertices,
        currentEdges,
        undefined,
        undefined,
        'shortest',
        normBounds,
        currentTrafficState,
        { wT: 0, wD: 1, wC: 0 }
      );

      const shortestEval =
        shortestNodes.length > 0
          ? evaluateRoutePath(
              shortestNodes,
              currentVertices,
              currentEdges,
              mode,
              undefined,
              normBounds,
              currentTrafficState,
              normalizedWeights,
              startId,
              destId
            )
          : null;

      startTransition(() => {
        setTrafficState(currentTrafficState);
        setQpsoResult(qpso);
        setInitialBaselineRoute(prev => (dynamicReroute ? prev : qpso.bestRoute));
        setDijkstraResult(dijkstraRoute);
        setAStarResult(aStarRoute);
        setShortestPathRoute(shortestEval);
        setBenchmarks(bench);
      });

      if (qpso.bestRoute && qpso.bestRoute.segments.length > 0 && !selectedIncidentEdgeId) {
        const midIdx = Math.floor(qpso.bestRoute.segments.length / 2);
        setSelectedIncidentEdgeId(qpso.bestRoute.segments[midIdx].edge.id);
      }
    },
    [selectedIncidentEdgeId, dynamicReroute]
  );

  // Trigger optimization when core parameters change
  useEffect(() => {
    if (vertices.length > 0 && edges.length > 0) {
      const timer = setTimeout(() => {
        executeOptimization(
          vertices,
          edges,
          startNodeId,
          destNodeId,
          optimizationMode,
          objectiveWeights,
          trafficTimestamp,
          dayType,
          swarmSize,
          maxIterations
        );
      }, 15);
      return () => clearTimeout(timer);
    }
  }, [
    vertices,
    edges,
    startNodeId,
    destNodeId,
    optimizationMode,
    objectiveWeights,
    trafficTimestamp,
    dayType,
    swarmSize,
    maxIterations,
    executeOptimization,
  ]);

  // Swap Start & Destination
  const handleSwapLocations = () => {
    setDynamicReroute(null);
    setSimProgressIndex(0);
    setIsSimulatingDrive(false);
    const temp = startNodeId;
    setStartNodeId(destNodeId);
    setDestNodeId(temp);
  };

  // En-Route Progression Timer
  useEffect(() => {
    if (!isSimulatingDrive || !qpsoResult?.bestRoute) return;
    const routeNodes = qpsoResult.bestRoute.nodeIds;
    if (simProgressIndex >= routeNodes.length - 1) {
      setIsSimulatingDrive(false);
      return;
    }
    const timer = setTimeout(() => {
      setSimProgressIndex(prev => Math.min(prev + 1, routeNodes.length - 1));
    }, 1800);
    return () => clearTimeout(timer);
  }, [isSimulatingDrive, simProgressIndex, qpsoResult]);

  // Isolated Incident Injection & Rerouting
  const handleInjectIncident = (overrideEdgeId?: string) => {
    const targetEdgeId = overrideEdgeId || selectedIncidentEdgeId;
    const currentBest = qpsoResult?.bestRoute || activeRoute;
    if (!targetEdgeId || !currentBest) return;

    const beforeRoute = initialBaselineRoute || currentBest;
    const targetEdge = edges.find(e => e.id === targetEdgeId);
    if (!targetEdge) return;

    const isBlocked = selectedIncidentType === 'road_block';
    const trafficMultiplier =
      selectedIncidentType === 'road_block'
        ? 999
        : selectedIncidentType === 'heavy_traffic'
        ? incidentSeverity === 'critical'
          ? 3.8
          : incidentSeverity === 'high'
          ? 2.9
          : 1.9
        : incidentSeverity === 'critical'
        ? 4.5
        : incidentSeverity === 'high'
        ? 3.2
        : 2.2;

    const riskAddition =
      selectedIncidentType === 'road_block'
        ? 9.9
        : incidentSeverity === 'critical'
        ? 6
        : incidentSeverity === 'high'
        ? 4
        : 2;

    const reducedSpeedKmH =
      selectedIncidentType === 'road_block'
        ? 0
        : Math.max(10, Number((targetEdge.baseSpeedKmH / trafficMultiplier).toFixed(0)));

    const descriptions: Record<IncidentType, string> = {
      accident: `Traffic accident reported on ${targetEdge.roadName}`,
      road_block: `Full corridor closure and blockade on ${targetEdge.roadName}`,
      heavy_traffic: `Severe congestion bottleneck on ${targetEdge.roadName}`,
    };

    const updatedEdges = edges.map(edge => {
      const isTarget =
        edge.id === targetEdgeId ||
        (edge.from === targetEdge.to && edge.to === targetEdge.from);
      if (isTarget) {
        return {
          ...edge,
          incident: {
            type: selectedIncidentType,
            description: descriptions[selectedIncidentType],
            trafficMultiplier,
            riskAddition,
            reducedSpeedKmH,
            isBlocked,
          },
        };
      }
      return edge;
    });

    const updatedTrafficState = buildTrafficState(
      updatedEdges,
      trafficTimestamp,
      dayType
    );
    const normBounds = computeGraphNormalizationBounds(updatedEdges, updatedTrafficState);

    const reoptimizedQpso = runQpsoOptimization(
      startNodeId,
      destNodeId,
      vertices,
      updatedEdges,
      optimizationMode,
      undefined,
      {
        swarmSize: Math.max(22, swarmSize),
        maxIterations: Math.max(35, maxIterations),
        trafficState: updatedTrafficState,
        objectiveWeights,
      }
    );

    const afterRoute =
      reoptimizedQpso.bestRoute && reoptimizedQpso.bestRoute.isFeasible
        ? reoptimizedQpso.bestRoute
        : evaluateRoutePath(
            beforeRoute.nodeIds,
            vertices,
            updatedEdges,
            optimizationMode,
            undefined,
            normBounds,
            updatedTrafficState,
            objectiveWeights,
            startNodeId,
            destNodeId
          );

    const newBenchmarks = runSystematicBenchmark(
      startNodeId,
      destNodeId,
      vertices,
      updatedEdges,
      optimizationMode,
      undefined,
      maxIterations,
      updatedTrafficState,
      objectiveWeights
    );

    setEdges(updatedEdges);
    setTrafficState(updatedTrafficState);
    setQpsoResult(reoptimizedQpso);
    setBenchmarks(newBenchmarks);

    setDynamicReroute({
      isActive: true,
      currentLocationNodeId: startNodeId,
      incidentEdgeId: targetEdge.id,
      incidentType: selectedIncidentType,
      beforeRoute,
      afterRoute,
      alreadyTraveledRoute: {
        nodeIds: [startNodeId],
        edges: [],
        segments: [],
        totalDistanceKm: 0,
        totalTimeMin: 0,
        totalCongestion: 1.0,
        totalRisk: 0,
        normalizedTime: 0,
        normalizedDistance: 0,
        normalizedCongestion: 0,
        fitness: 0,
        isFeasible: true,
      },
      additionalDistanceKm: Number(
        (afterRoute.totalDistanceKm - beforeRoute.totalDistanceKm).toFixed(1)
      ),
      additionalTimeMin: Number(
        (afterRoute.totalTimeMin - beforeRoute.totalTimeMin).toFixed(1)
      ),
      additionalFitness: Number(
        (afterRoute.fitness - beforeRoute.fitness).toFixed(4)
      ),
    });
  };

  // Clear All Incidents and restore baseline
  const handleClearIncidents = () => {
    const cleanEdges = edges.map(edge => ({
      ...edge,
      incident: undefined,
    }));
    const cleanTrafficState = buildTrafficState(cleanEdges, trafficTimestamp, dayType);
    setDynamicReroute(null);
    setSimProgressIndex(0);
    setIsSimulatingDrive(false);
    setEdges(cleanEdges);
    setTrafficState(cleanTrafficState);
    executeOptimization(
      vertices,
      cleanEdges,
      startNodeId,
      destNodeId,
      optimizationMode,
      objectiveWeights,
      trafficTimestamp,
      dayType,
      swarmSize,
      maxIterations
    );
  };

  const startVertex = vertices.find(v => v.id === startNodeId) || null;
  const destVertex = vertices.find(v => v.id === destNodeId) || null;
  const activeIncidentEdges = edges.filter(e => e.incident !== undefined);

  const activeRoute: EvaluatedRoute | null =
    selectedAlgorithm === 'Dijkstra'
      ? dijkstraResult
      : selectedAlgorithm === 'A*'
      ? aStarResult
      : qpsoResult?.bestRoute || null;

  const currentRouteNodes = activeRoute?.nodeIds || [];
  const currentSimNodeId =
    currentRouteNodes[Math.min(simProgressIndex, Math.max(0, currentRouteNodes.length - 1))] ||
    startNodeId;
  const currentSimVertex = vertices.find(v => v.id === currentSimNodeId) || startVertex;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Top Navigation Bar (Strict 3-Zone Contract, Pure Light Surface) */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          {/* Zone 1: Brand Wordmark */}
          <a href="#top" className="text-base font-bold tracking-tight text-slate-900 whitespace-nowrap">
            AP Traffic Route Optimizer
          </a>

          {/* Zone 2: Navigation Page Switcher */}
          <nav className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveView('optimizer')}
              className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                activeView === 'optimizer'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Route Optimizer
            </button>
            <button
              type="button"
              onClick={() => setActiveView('vrp')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                activeView === 'vrp'
                  ? 'bg-blue-600 text-white shadow-2xs font-bold'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Fleet VRP</span>
            </button>
          </nav>

          {/* Zone 3: Primary Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAdvancedParams(!showAdvancedParams)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer whitespace-nowrap ${
                showAdvancedParams
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Swarm Settings</span>
            </button>
          </div>
        </div>
      </header>

      <main id="top" className="max-w-[1440px] w-full mx-auto px-4 sm:px-6 py-5 space-y-5 flex-1">
        {activeView === 'vrp' ? (
          <FleetVrpPage
            vertices={vertices}
            edges={edges}
            objectiveWeights={objectiveWeights}
            onNavigateToScalability={() => {
              setActiveView('optimizer');
              setTimeout(() => {
                const el = document.getElementById('benchmarks');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }, 100);
            }}
          />
        ) : (
          <>
            {/* Control Panel: Origin/Destination, Traffic State, and Multi-Objective Weights */}
        <section
          id="corridor-controls"
          className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-2xs"
        >
          {/* Row 1: Origin, Destination, Time State, Day Type */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            {/* Origin */}
            <div className="md:col-span-3">
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Origin City
              </label>
              <select
                value={startNodeId}
                onChange={e => {
                  const val = e.target.value;
                  if (val === destNodeId) {
                    const fallback = vertices.find(v => v.id !== val)?.id || destNodeId;
                    setDestNodeId(fallback);
                  }
                  setDynamicReroute(null);
                  setStartNodeId(val);
                }}
                className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                {vertices.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.type})
                  </option>
                ))}
              </select>
            </div>

            {/* Swap Button */}
            <div className="md:col-span-1 flex justify-center">
              <button
                type="button"
                onClick={handleSwapLocations}
                title="Swap Origin and Destination"
                className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
              >
                <ArrowUpDown className="w-4 h-4 rotate-90" />
              </button>
            </div>

            {/* Destination */}
            <div className="md:col-span-3">
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Destination City
              </label>
              <select
                value={destNodeId}
                onChange={e => {
                  const val = e.target.value;
                  if (val === startNodeId) {
                    const fallback = vertices.find(v => v.id !== val)?.id || startNodeId;
                    setStartNodeId(fallback);
                  }
                  setDynamicReroute(null);
                  setDestNodeId(val);
                }}
                className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                {vertices.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.type})
                  </option>
                ))}
              </select>
            </div>

            {/* Time State */}
            <div className="md:col-span-5">
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Traffic Time State
              </label>
              <div className="flex items-center gap-1.5">
                <select
                  value={trafficTimestamp}
                  onChange={e => setTrafficTimestamp(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-200 text-slate-900 rounded-lg px-2.5 py-2 text-xs font-medium focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  {TRAFFIC_TIME_PRESETS.map(p => (
                    <option key={p.timestamp} value={p.timestamp}>
                      {p.label}
                    </option>
                  ))}
                </select>
                <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-medium shrink-0">
                  {(['weekday', 'weekend'] as DayType[]).map(d => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDayType(d)}
                      className={`px-2 py-1.5 rounded-md capitalize transition-colors cursor-pointer whitespace-nowrap ${
                        dayType === d
                          ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: Interactive Weight Scroll Bars for Time, Congestion, and Distance */}
          <div className="pt-3 border-t border-slate-100">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-3.5 rounded-lg border border-slate-200/80 tabular-nums">
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="font-medium text-slate-700">Time Weight (w<sub>T</sub>)</span>
                  <span className="font-semibold text-blue-700">{objectiveWeights.wT.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={objectiveWeights.wT}
                  onChange={e => handleWeightChange('wT', Number(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer h-1.5"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="font-medium text-slate-700">Congestion Weight (w<sub>C</sub>)</span>
                  <span className="font-semibold text-amber-700">{objectiveWeights.wC.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={objectiveWeights.wC}
                  onChange={e => handleWeightChange('wC', Number(e.target.value))}
                  className="w-full accent-amber-600 cursor-pointer h-1.5"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="font-medium text-slate-700">Distance Weight (w<sub>D</sub>)</span>
                  <span className="font-semibold text-emerald-700">{objectiveWeights.wD.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={objectiveWeights.wD}
                  onChange={e => handleWeightChange('wD', Number(e.target.value))}
                  className="w-full accent-emerald-600 cursor-pointer h-1.5"
                />
              </div>
            </div>
          </div>

          {/* Action Row: Prominent Separated CTA Button + Algorithm Badges */}
          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <span className="font-semibold text-slate-700">Algorithm:</span>
              <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md border border-blue-200 font-bold">
                Adaptive QPSO (Quantum-Inspired)
              </span>
              <span className="text-slate-300">|</span>
              <span className="text-slate-500">{swarmSize} Particles · {maxIterations} Iterations</span>
            </div>

            <button
              type="button"
              disabled={isOptimizing}
              onClick={async () => {
                setIsOptimizing(true);
                await new Promise(r => setTimeout(r, 40));
                executeOptimization(
                  vertices,
                  edges,
                  startNodeId,
                  destNodeId,
                  optimizationMode,
                  objectiveWeights,
                  trafficTimestamp,
                  dayType,
                  swarmSize,
                  maxIterations
                );
                setIsOptimizing(false);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-xl transition-all shadow-2xs hover:shadow-md flex items-center justify-center gap-2 text-xs uppercase tracking-wider cursor-pointer disabled:opacity-60 whitespace-nowrap"
            >
              {isOptimizing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                  <span>CALCULATING OPTIMAL ROUTE...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current shrink-0" />
                  <span>OPTIMIZE ROUTE</span>
                </>
              )}
            </button>
          </div>

          {/* Collapsible QPSO Hyperparameters */}
          {showAdvancedParams && (
            <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-3.5 rounded-lg border border-slate-200 tabular-nums">
              <div>
                <div className="flex justify-between text-xs font-medium mb-1">
                  <span className="text-slate-600">Quantum Swarm Population (M)</span>
                  <span className="font-semibold text-blue-700">{swarmSize} Particles</span>
                </div>
                <input
                  type="range"
                  min={8}
                  max={40}
                  step={2}
                  value={swarmSize}
                  onChange={e => setSwarmSize(Number(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>
              <div>
                <div className="flex justify-between text-xs font-medium mb-1">
                  <span className="text-slate-600">Max Iterations (T<sub>max</sub>)</span>
                  <span className="font-semibold text-blue-700">{maxIterations} Generations</span>
                </div>
                <input
                  type="range"
                  min={15}
                  max={80}
                  step={5}
                  value={maxIterations}
                  onChange={e => setMaxIterations(Number(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>
              <div className="flex items-center text-xs text-slate-600">
                Contraction–Expansion β decays linearly from 1.00 to 0.50 across {maxIterations} iterations.
              </div>
            </div>
          )}

          {/* Collapsible Isolated Incident Drawer */}
          {showIncidentDrawer && (
            <div className="pt-3 border-t border-amber-200 bg-amber-50/50 p-4 rounded-lg border space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                  <span className="text-xs font-semibold text-slate-900">
                    Dynamic Incident & Rerouting Test
                  </span>
                </div>

                {currentRouteNodes.length > 1 && (
                  <div className="flex items-center gap-2 bg-white px-2.5 py-1 rounded-md border border-amber-200 text-xs tabular-nums">
                    <Car className="w-3.5 h-3.5 text-blue-600" />
                    <span className="text-slate-700">
                      Position: <strong className="text-blue-700">{currentSimVertex?.name}</strong> ({simProgressIndex + 1}/{currentRouteNodes.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (simProgressIndex >= currentRouteNodes.length - 1) setSimProgressIndex(0);
                        setIsSimulatingDrive(!isSimulatingDrive);
                      }}
                      className={`px-2 py-0.5 rounded font-medium text-[11px] cursor-pointer ${
                        isSimulatingDrive
                          ? 'bg-amber-600 text-white'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {isSimulatingDrive ? 'Pause' : 'Step Forward'}
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Target Road Segment
                  </label>
                  <select
                    value={selectedIncidentEdgeId}
                    onChange={e => setSelectedIncidentEdgeId(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:outline-none"
                  >
                    {qpsoResult?.bestRoute && qpsoResult.bestRoute.segments.length > 0 && (
                      <optgroup label="Active Optimal Route Segments">
                        {qpsoResult.bestRoute.segments.map((seg, idx) => (
                          <option key={seg.edge.id} value={seg.edge.id}>
                            Step {idx + 1}: {seg.fromNode.name} → {seg.toNode.name}
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Incident Type
                  </label>
                  <select
                    value={selectedIncidentType}
                    onChange={e => setSelectedIncidentType(e.target.value as IncidentType)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:outline-none"
                  >
                    <option value="accident">Traffic Accident</option>
                    <option value="road_block">Full Road Blockade</option>
                    <option value="heavy_traffic">Severe Bottleneck</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Severity
                  </label>
                  <div className="grid grid-cols-3 gap-1 bg-white p-0.5 rounded-lg border border-slate-200">
                    {(['moderate', 'high', 'critical'] as const).map(sev => (
                      <button
                        key={sev}
                        type="button"
                        onClick={() => setIncidentSeverity(sev)}
                        className={`py-1 rounded text-[11px] font-medium capitalize transition-colors cursor-pointer ${
                          incidentSeverity === sev
                            ? 'bg-red-600 text-white font-semibold'
                            : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {sev}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleInjectIncident()}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-1.5 px-3 rounded-lg text-xs transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Inject & Reroute
                  </button>
                  {activeIncidentEdges.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearIncidents}
                      className="bg-white hover:bg-slate-50 text-slate-700 font-medium py-1.5 px-2.5 rounded-lg text-xs border border-slate-200 transition-colors cursor-pointer"
                      title="Clear Incidents"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Dynamic Rerouting Banner (Clean Light Emerald Surface) */}
        {dynamicReroute && dynamicReroute.isActive && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-xs text-slate-800 space-y-1">
                <div className="font-semibold text-emerald-900">
                  Dynamic Reroute Active — Rerouted from {dynamicReroute.currentLocationNodeId}
                </div>
                <div>
                  Updated Path: <span className="font-medium">{dynamicReroute.afterRoute.segments.map(s => s.fromNode.name).concat(dynamicReroute.afterRoute.segments.slice(-1)[0]?.toNode.name || '').join(' → ')}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0 text-xs tabular-nums">
              <span className="font-semibold text-emerald-800">
                Δ Distance: {dynamicReroute.additionalDistanceKm >= 0 ? '+' : ''}{dynamicReroute.additionalDistanceKm} km
              </span>
              <button
                type="button"
                onClick={handleClearIncidents}
                className="px-2.5 py-1 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-md font-medium cursor-pointer"
              >
                Reset
              </button>
            </div>
          </div>
        )}

        {/* Map & Topological Graph Section */}
        <section id="network-workspace" className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white px-4 py-2.5 rounded-xl border border-slate-200">
            <div className="flex flex-wrap items-center gap-3">
              {/* Map vs Graph Tab */}
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200">
                <button
                  type="button"
                  onClick={() => setMapViewTab('map')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    mapViewTab === 'map'
                      ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <MapPin className="w-3.5 h-3.5 text-blue-600" />
                  <span>Geographic Map</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMapViewTab('graph')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    mapViewTab === 'graph'
                      ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Network className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Weighted Graph</span>
                </button>
              </div>
            </div>

            {activeRoute && (
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 tabular-nums">
                <span>
                  Algorithm: <strong className="text-blue-700">{selectedAlgorithm}</strong>
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  Time: <strong className="text-slate-900">{formatDurationHuman(activeRoute.totalTimeMin)}</strong>
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  Distance: <strong className="text-slate-900">{activeRoute.totalDistanceKm.toFixed(1)} km</strong>
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  Congestion: <strong className="text-amber-700">{activeRoute.totalCongestion.toFixed(2)}</strong>
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  Objective F(R, t): <strong className="text-blue-700">{activeRoute.fitness.toFixed(4)}</strong>
                </span>
              </div>
            )}
          </div>

          {mapViewTab === 'map' ? (
            <div className="relative">
              <MapComponent
                vertices={vertices}
                edges={edges}
                optimalRoute={activeRoute}
                shortestRoute={shortestPathRoute}
                startNode={startVertex}
                destNode={destVertex}
                dynamicReroute={dynamicReroute}
                vehicleType={vehicleType}
                optimizationMode={optimizationMode}
                simCoords={currentSimVertex?.coords || null}
                onEdgeClick={edge => {
                  setSelectedIncidentEdgeId(edge.id);
                  handleInjectIncident(edge.id);
                }}
                onNodeClick={node => {
                  setSelectedNodeOnMap(node);
                }}
              />

              {selectedNodeOnMap && (
                <div className="mt-2 bg-white border border-slate-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs">
                    <MapPin className="w-4 h-4 text-blue-600" />
                    <span className="font-semibold text-slate-900">{selectedNodeOnMap.name}</span>
                    <span className="text-slate-500">({selectedNodeOnMap.type})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={selectedNodeOnMap.id === startNodeId}
                      onClick={() => {
                        if (selectedNodeOnMap.id === destNodeId) setDestNodeId(startNodeId);
                        setStartNodeId(selectedNodeOnMap.id);
                        setDynamicReroute(null);
                        setSelectedNodeOnMap(null);
                      }}
                      className="px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white cursor-pointer"
                    >
                      Set as Origin
                    </button>
                    <button
                      type="button"
                      disabled={selectedNodeOnMap.id === destNodeId}
                      onClick={() => {
                        if (selectedNodeOnMap.id === startNodeId) setStartNodeId(destNodeId);
                        setDestNodeId(selectedNodeOnMap.id);
                        setDynamicReroute(null);
                        setSelectedNodeOnMap(null);
                      }}
                      className="px-2.5 py-1 rounded-md text-xs font-medium bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white cursor-pointer"
                    >
                      Set as Destination
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedNodeOnMap(null)}
                      className="px-2 py-1 rounded-md text-xs text-slate-500 hover:bg-slate-100 cursor-pointer"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <GraphVisualizer
              vertices={vertices}
              edges={edges}
              optimalRoute={activeRoute}
              startVertex={startVertex || undefined}
              destVertex={destVertex || undefined}
              optimizationMode={optimizationMode}
              vehicleType={vehicleType}
              dynamicReroute={dynamicReroute}
              trafficState={trafficState ?? undefined}
              objectiveWeights={objectiveWeights}
              currentLocationNodeId={currentSimNodeId}
              onSelectEdge={edge => {
                setSelectedIncidentEdgeId(edge.id);
              }}
              onInjectIncidentOnEdge={edgeId => {
                setSelectedIncidentEdgeId(edgeId);
                handleInjectIncident(edgeId);
              }}
              onClearIncidentOnEdge={() => {
                handleClearIncidents();
              }}
            />
          )}
        </section>

        {/* Dynamic Rerouting View: Side-by-Side Before vs After Route Comparison & Calculated Impact Metrics */}
        <DynamicReroutingPanel
          state={dynamicReroute}
          initialRoute={initialBaselineRoute}
          activeRoute={activeRoute}
          vertices={vertices}
          edges={edges}
          selectedEdgeId={selectedIncidentEdgeId}
          onSelectEdgeId={setSelectedIncidentEdgeId}
          selectedIncidentType={selectedIncidentType}
          onSelectIncidentType={setSelectedIncidentType}
          incidentSeverity={incidentSeverity}
          onSelectIncidentSeverity={setIncidentSeverity}
          onInjectIncident={handleInjectIncident}
          onResetReroute={handleClearIncidents}
          startVertex={startVertex}
          destVertex={destVertex}
          selectedAlgorithm={selectedAlgorithm}
          objectiveWeights={objectiveWeights}
          trafficTimestamp={trafficTimestamp}
          dayType={dayType}
          optimizationMode={optimizationMode}
        />

        {/* Route Summary Card */}
        <RouteSummary
          route={activeRoute}
          mode={optimizationMode}
          executionTimeMs={qpsoResult?.executionTimeMs}
          trafficState={trafficState ?? undefined}
          objectiveWeights={objectiveWeights}
        />

        {/* Multi-Algorithm Benchmark Comparison */}
        <section id="benchmarks">
          <BenchmarkSection
            benchmarks={benchmarks}
            convergenceHistory={qpsoResult?.convergenceHistory}
            activeRoutePath={activeRoute?.nodeIds}
            objectiveWeights={objectiveWeights}
            trafficState={trafficState ?? undefined}
          />
        </section>
          </>
        )}
      </main>
    </div>
  );
}

export default App;
