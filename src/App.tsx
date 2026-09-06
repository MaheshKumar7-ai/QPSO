/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, startTransition } from 'react';
import {
  VehicleType,
  OptimizationMode,
  GraphVertex,
  GraphEdge,
  EvaluatedRoute,
  QpsoResult,
  AlgorithmBenchmarkResult,
  DynamicRerouteState,
  IncidentType,
  MultiModeRoutes,
} from './types';
import {
  buildCompleteRegionalGraph,
  resolveLocationToNode,
  findNearestNode,
  REGIONAL_NODES,
} from './data/roadNetworks';
import { runQpsoOptimization, findShortestDijkstraPath } from './algorithms/qpso';
import { runSystematicBenchmark } from './algorithms/benchmarks';
import { evaluateRoutePath } from './algorithms/evaluator';

// Components
import { MapComponent } from './components/MapComponent';
import { GraphVisualizer } from './components/GraphVisualizer';
import { RouteSummary } from './components/RouteSummary';
import { QpsoExplorationView } from './components/QpsoExplorationView';
import { BenchmarkSection } from './components/BenchmarkSection';
import { IncidentModal } from './components/IncidentModal';
import { DynamicReroutingPanel } from './components/DynamicReroutingPanel';
import { RouteDetailsModal } from './components/RouteDetailsModal';
import { LocationInput } from './components/LocationInput';
import { JourneyController, JourneySimulationState } from './components/JourneyController';

// Clean helper icons
import {
  ArrowLeftRight,
  Car,
  Bike,
  Bus,
  Truck,
  ShieldAlert,
  Map,
  Network,
  BarChart3,
  Zap,
  Gauge,
  ShieldCheck,
  Loader2,
  CheckCircle2,
  X,
  Sparkles,
} from 'lucide-react';

export default function App() {
  // Master graph state
  const [graphData, setGraphData] = useState<{ vertices: GraphVertex[]; edges: GraphEdge[] }>(
    () => buildCompleteRegionalGraph()
  );

  // User Pending Inputs (Form controls)
  const [startNode, setStartNode] = useState<GraphVertex>(() =>
    resolveLocationToNode('Vijayawada', REGIONAL_NODES).vertex
  );
  const [destNode, setDestNode] = useState<GraphVertex>(() =>
    resolveLocationToNode('Visakhapatnam', REGIONAL_NODES).vertex
  );
  const [startQuery, setStartQuery] = useState<string>('Vijayawada');
  const [destQuery, setDestQuery] = useState<string>('Visakhapatnam');
  const [startDistanceKm, setStartDistanceKm] = useState<number>(0);
  const [destDistanceKm, setDestDistanceKm] = useState<number>(0);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleType>('car');
  const [optimizationMode, setOptimizationMode] = useState<OptimizationMode>('safer');
  const [isCalculating, setIsCalculating] = useState<boolean>(false);

  // Applied / Active Calculated Settings (Only updated upon clicking "Calculate Route")
  const [appliedVehicle, setAppliedVehicle] = useState<VehicleType>('car');
  const [appliedMode, setAppliedMode] = useState<OptimizationMode>('safer');
  const [appliedStartNode, setAppliedStartNode] = useState<GraphVertex>(() =>
    resolveLocationToNode('Vijayawada', REGIONAL_NODES).vertex
  );
  const [appliedDestNode, setAppliedDestNode] = useState<GraphVertex>(() =>
    resolveLocationToNode('Visakhapatnam', REGIONAL_NODES).vertex
  );

  // Success Notification Toast
  const [notification, setNotification] = useState<{ show: boolean; message: string } | null>(null);

  // Active UI View Tab
  const [activeTab, setActiveTab] = useState<'map' | 'graph' | 'benchmarks'>('map');

  // Outputs
  const [qpsoResult, setQpsoResult] = useState<QpsoResult | null>(null);
  const [benchmarkResults, setBenchmarkResults] = useState<AlgorithmBenchmarkResult[]>([]);
  const [activeRoute, setActiveRoute] = useState<EvaluatedRoute | null>(null);
  const [shortestRoute, setShortestRoute] = useState<EvaluatedRoute | null>(null);
  const [multiModeRoutes, setMultiModeRoutes] = useState<MultiModeRoutes>({
    fastest: null,
    balanced: null,
    safer: null,
    shortest: null,
  });

  // Dynamic Reroute & Incidents
  const [dynamicReroute, setDynamicReroute] = useState<DynamicRerouteState | null>(null);
  const [isIncidentModalOpen, setIsIncidentModalOpen] = useState<boolean>(false);
  const [selectedEdgeForIncident, setSelectedEdgeForIncident] = useState<string | undefined>(undefined);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState<boolean>(false);

  // Live Journey Simulation Engine State
  const [simState, setSimState] = useState<JourneySimulationState>({
    isSimulating: false,
    isPaused: false,
    speedMultiplier: 1,
    currentNodeIndex: 0,
    subStepIndex: 0,
    currentNodeId: '',
    nextNodeId: null,
    currentCoords: null,
    traveledNodeIds: [],
    traveledDistanceKm: 0,
    traveledTimeMin: 0,
    progressPercent: 0,
    hasArrived: false,
  });

  const handleStartJourney = useCallback(() => {
    if (!activeRoute || activeRoute.nodeIds.length < 2) return;
    const startId = activeRoute.nodeIds[0];
    const startV = graphData.vertices.find(v => v.id === startId);
    setSimState({
      isSimulating: true,
      isPaused: false,
      speedMultiplier: 1,
      currentNodeIndex: 0,
      subStepIndex: 0,
      currentNodeId: startId,
      nextNodeId: activeRoute.nodeIds[1] || null,
      currentCoords: startV ? startV.coords : null,
      traveledNodeIds: [startId],
      traveledDistanceKm: 0,
      traveledTimeMin: 0,
      progressPercent: 0,
      hasArrived: false,
    });
    setNotification({ show: true, message: '🚀 Journey started! Vehicle moving slowly en-route...' });
  }, [activeRoute, graphData.vertices]);

  const handlePauseJourney = useCallback(() => {
    setSimState(prev => ({ ...prev, isPaused: true }));
  }, []);

  const handleResumeJourney = useCallback(() => {
    setSimState(prev => ({ ...prev, isPaused: false }));
  }, []);

  const handleResetJourney = useCallback(() => {
    setSimState({
      isSimulating: false,
      isPaused: false,
      speedMultiplier: 1,
      currentNodeIndex: 0,
      subStepIndex: 0,
      currentNodeId: '',
      nextNodeId: null,
      currentCoords: null,
      traveledNodeIds: [],
      traveledDistanceKm: 0,
      traveledTimeMin: 0,
      progressPercent: 0,
      hasArrived: false,
    });
  }, []);

  const handleChangeSimSpeed = useCallback((speed: number) => {
    setSimState(prev => ({ ...prev, speedMultiplier: speed }));
  }, []);

  // Live Time
  const [currentTimeString, setCurrentTimeString] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTimeString(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Auto-dismiss notification after 3.5 seconds
  useEffect(() => {
    if (notification?.show) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Vehicle Journey Simulation Timer Effect (Slow & Smooth Interpolated Motion Engine)
  useEffect(() => {
    if (!simState.isSimulating || simState.isPaused || !activeRoute || activeRoute.segments.length === 0) {
      return;
    }

    // 35 smooth steps per highway segment
    const SUB_STEPS_PER_SEGMENT = 35;
    // 250ms at 1x speed = ~8.75s per road segment (very slow, calm, realistic motion)
    const tickIntervalMs = Math.max(50, Math.round(250 / simState.speedMultiplier));

    const timer = setInterval(() => {
      setSimState(prev => {
        if (!prev.isSimulating || prev.isPaused) return prev;

        const totalSegs = activeRoute.segments.length;
        const currentSegIdx = prev.currentNodeIndex;

        if (currentSegIdx >= totalSegs) {
          setNotification({ show: true, message: '🏁 Journey completed! Arrived at destination.' });
          return { ...prev, isSimulating: false, hasArrived: true, progressPercent: 100 };
        }

        const currentSeg = activeRoute.segments[currentSegIdx];
        const startCoords = currentSeg.fromNode.coords;
        const endCoords = currentSeg.toNode.coords;

        // Cumulative distance & time for prior completed segments
        let baseDistKm = 0;
        let baseTimeMin = 0;
        for (let i = 0; i < currentSegIdx; i++) {
          baseDistKm += activeRoute.segments[i].segmentDistanceKm;
          baseTimeMin += activeRoute.segments[i].adjustedTimeMin;
        }

        const currentSubStep = (prev.subStepIndex || 0) + 1;

        if (currentSubStep <= SUB_STEPS_PER_SEGMENT) {
          // Smooth coordinate interpolation along the road line
          const frac = currentSubStep / SUB_STEPS_PER_SEGMENT;
          const lat = startCoords.lat + (endCoords.lat - startCoords.lat) * frac;
          const lng = startCoords.lng + (endCoords.lng - startCoords.lng) * frac;

          const segDistCovered = currentSeg.segmentDistanceKm * frac;
          const segTimeCovered = currentSeg.adjustedTimeMin * frac;

          const totalTraveledDist = Number((baseDistKm + segDistCovered).toFixed(1));
          const totalTraveledTime = Number((baseTimeMin + segTimeCovered).toFixed(1));
          const progressPct = Math.min(100, Math.round((totalTraveledDist / activeRoute.totalDistanceKm) * 100));

          return {
            ...prev,
            subStepIndex: currentSubStep,
            currentCoords: { lat, lng },
            traveledDistanceKm: totalTraveledDist,
            traveledTimeMin: totalTraveledTime,
            progressPercent: progressPct,
          };
        } else {
          // Advance to next segment junction
          const nextSegIdx = currentSegIdx + 1;
          const nextNodeId = activeRoute.nodeIds[nextSegIdx] || prev.currentNodeId;
          const nextV = graphData.vertices.find(v => v.id === nextNodeId);

          const visitedNodes = [...prev.traveledNodeIds];
          if (nextNodeId && !visitedNodes.includes(nextNodeId)) {
            visitedNodes.push(nextNodeId);
          }

          const isFinished = nextSegIdx >= totalSegs;

          return {
            ...prev,
            currentNodeIndex: nextSegIdx,
            subStepIndex: 0,
            currentNodeId: nextNodeId,
            nextNodeId: activeRoute.nodeIds[nextSegIdx + 1] || null,
            currentCoords: nextV ? nextV.coords : prev.currentCoords,
            traveledNodeIds: visitedNodes,
            hasArrived: isFinished,
            isSimulating: !isFinished,
            progressPercent: isFinished ? 100 : prev.progressPercent,
          };
        }
      });
    }, tickIntervalMs);

    return () => clearInterval(timer);
  }, [simState.isSimulating, simState.isPaused, simState.speedMultiplier, activeRoute, graphData.vertices]);

  // Primary Optimization Routine: Runs QPSO independently for each mode
  const executeOptimization = useCallback(
    (
      sNode: GraphVertex,
      dNode: GraphVertex,
      mode: OptimizationMode,
      vehicle: VehicleType,
      currentEdges: GraphEdge[]
    ) => {
      // 1. Run QPSO independently for all 3 modes using mode-specific objective weights on subgraph
      const qpsoFastest = runQpsoOptimization(
        sNode.id,
        dNode.id,
        graphData.vertices,
        currentEdges,
        'fastest',
        vehicle,
        { swarmSize: 18, maxIterations: 30 }
      );

      const qpsoBalanced = runQpsoOptimization(
        sNode.id,
        dNode.id,
        graphData.vertices,
        currentEdges,
        'balanced',
        vehicle,
        { swarmSize: 18, maxIterations: 30 }
      );

      const qpsoSafer = runQpsoOptimization(
        sNode.id,
        dNode.id,
        graphData.vertices,
        currentEdges,
        'safer',
        vehicle,
        { swarmSize: 18, maxIterations: 30 }
      );

      const qpsoShortest = runQpsoOptimization(
        sNode.id,
        dNode.id,
        graphData.vertices,
        currentEdges,
        'shortest',
        vehicle,
        { swarmSize: 18, maxIterations: 30 }
      );

      // 2. Pure Shortest Path (geometric distance) for baseline overlay (Blue)
      const shortestNodeIds = findShortestDijkstraPath(
        sNode.id,
        dNode.id,
        graphData.vertices,
        currentEdges,
        vehicle,
        undefined,
        'shortest'
      );
      const pureShortestRoute = shortestNodeIds.length >= 2
        ? evaluateRoutePath(shortestNodeIds, graphData.vertices, currentEdges, 'shortest', vehicle)
        : null;

      // 3. Systematic Algorithm Benchmarks (Dijkstra, A*, PSO, GA, ACO, QPSO)
      const bench = runSystematicBenchmark(
        sNode.id,
        dNode.id,
        graphData.vertices,
        currentEdges,
        mode,
        vehicle
      );

      const computedMultiModes: MultiModeRoutes = {
        fastest: qpsoFastest.bestRoute,
        balanced: qpsoBalanced.bestRoute,
        safer: qpsoSafer.bestRoute,
        shortest: qpsoShortest.bestRoute,
      };

      const selectedQpso =
        mode === 'fastest' ? qpsoFastest :
        mode === 'safer' ? qpsoSafer :
        mode === 'shortest' ? qpsoShortest : qpsoBalanced;
      const selectedRoute = computedMultiModes[mode] || qpsoBalanced.bestRoute;

      startTransition(() => {
        setMultiModeRoutes(computedMultiModes);
        setQpsoResult(selectedQpso);
        setActiveRoute(selectedRoute);
        setShortestRoute(pureShortestRoute);
        setBenchmarkResults(bench);
      });
    },
    [graphData.vertices]
  );

  // Initial Run on Mount
  useEffect(() => {
    const timer = setTimeout(() => {
      executeOptimization(appliedStartNode, appliedDestNode, appliedMode, appliedVehicle, graphData.edges);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // User Selection Handlers (State changes in form only; calculation triggered on Calculate Route)
  const handleStartSelect = (vertex: GraphVertex, customQueryName?: string, distanceKm: number = 0) => {
    setStartNode(vertex);
    setStartQuery(customQueryName || vertex.name);
    setStartDistanceKm(distanceKm);
  };

  const handleDestSelect = (vertex: GraphVertex, customQueryName?: string, distanceKm: number = 0) => {
    setDestNode(vertex);
    setDestQuery(customQueryName || vertex.name);
    setDestDistanceKm(distanceKm);
  };

  const handleSwapStartAndDest = () => {
    const newStart = destNode;
    const newDest = startNode;
    const newStartQuery = destQuery;
    const newDestQuery = startQuery;
    const newStartDist = destDistanceKm;
    const newDestDist = startDistanceKm;

    setStartNode(newStart);
    setStartQuery(newStartQuery);
    setStartDistanceKm(newStartDist);

    setDestNode(newDest);
    setDestQuery(newDestQuery);
    setDestDistanceKm(newDestDist);
  };

  const handleOptimizeClick = () => {
    setIsCalculating(true);

    const sResolved = resolveLocationToNode(startQuery, graphData.vertices);
    const dResolved = resolveLocationToNode(destQuery, graphData.vertices);

    setStartNode(sResolved.vertex);
    setStartDistanceKm(sResolved.distanceKm);
    setDestNode(dResolved.vertex);
    setDestDistanceKm(dResolved.distanceKm);
    setDynamicReroute(null);

    // Provide visible rotating process animation feedback
    setTimeout(() => {
      executeOptimization(
        sResolved.vertex,
        dResolved.vertex,
        optimizationMode,
        selectedVehicle,
        graphData.edges
      );

      // Lock in active applied settings
      setAppliedVehicle(selectedVehicle);
      setAppliedMode(optimizationMode);
      setAppliedStartNode(sResolved.vertex);
      setAppliedDestNode(dResolved.vertex);

      setIsCalculating(false);
      setNotification({ show: true, message: 'Changes successfully updated' });
    }, 450);
  };

  const handleVehicleSelect = (vehicle: VehicleType) => {
    setSelectedVehicle(vehicle);
  };

  const handleModeSelect = (mode: OptimizationMode) => {
    setOptimizationMode(mode);
    setAppliedMode(mode);
    executeOptimization(appliedStartNode, appliedDestNode, mode, appliedVehicle, graphData.edges);
    setNotification({ show: true, message: `Switched to ${mode.toUpperCase()} route` });
  };

  // Check if user has chosen settings that haven't been calculated yet
  const hasPendingChanges =
    selectedVehicle !== appliedVehicle ||
    optimizationMode !== appliedMode ||
    startNode.id !== appliedStartNode.id ||
    destNode.id !== appliedDestNode.id ||
    startQuery !== appliedStartNode.name ||
    destQuery !== appliedDestNode.name;

  // "Use Current Location" handler
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      pos => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        const nearest = findNearestNode(coords, graphData.vertices);
        setStartNode(nearest);
        setStartQuery(nearest.name);
        setDynamicReroute(null);
      },
      err => {
        console.warn('Geolocation fallback:', err);
      }
    );
  };

  // Incident Simulation Handlers
  const handleApplyIncident = (
    edgeId: string,
    incidentType: string,
    description: string
  ) => {
    // 1. Find targeted edge and determine endpoints
    const targetEdge = graphData.edges.find(e => e.id === edgeId);
    if (!targetEdge) return;

    const fromNodeId = targetEdge.from;
    const toNodeId = targetEdge.to;

    // 2. Set realistic mathematical factors based on incident type
    let isBlocked = incidentType === 'road_block';
    let trafficMultiplier = 1.0;
    let riskAddition = 0;

    switch (incidentType) {
      case 'road_block':
        isBlocked = true;
        trafficMultiplier = 99.0;
        riskAddition = 10.0;
        break;
      case 'heavy_traffic':
        isBlocked = false;
        trafficMultiplier = 4.0;
        riskAddition = 3.0;
        break;
      case 'accident':
        isBlocked = false;
        trafficMultiplier = 3.5;
        riskAddition = 7.0;
        break;
      case 'flood':
        isBlocked = false;
        trafficMultiplier = 4.5;
        riskAddition = 8.5;
        break;
      case 'hazardous_road':
        isBlocked = false;
        trafficMultiplier = 3.0;
        riskAddition = 6.5;
        break;
      default:
        isBlocked = false;
        trafficMultiplier = 3.0;
        riskAddition = 4.0;
    }

    // 3. Update BOTH directions of this physical road segment in the network
    const updatedEdges = graphData.edges.map(edge => {
      const isMatchingRoad =
        (edge.from === fromNodeId && edge.to === toNodeId) ||
        (edge.from === toNodeId && edge.to === fromNodeId) ||
        edge.id === edgeId;

      if (isMatchingRoad) {
        return {
          ...edge,
          incident: {
            type: incidentType as any,
            description: description || incidentType.replace('_', ' '),
            trafficMultiplier,
            riskAddition,
            isBlocked,
          },
          trafficFactor: isBlocked ? 99 : Math.max(edge.trafficFactor, trafficMultiplier),
          riskScore: Math.min(10, edge.riskScore + riskAddition),
        };
      }
      return edge;
    });

    setGraphData(prev => ({ ...prev, edges: updatedEdges }));

    // 4. Capture baseline route before reroute
    const beforeRoute = activeRoute;

    // Determine vehicle's current en-route node position
    const rerouteStartNodeId = simState.currentNodeId || appliedStartNode.id;

    // Identify already traveled node sequence
    let alreadyTraveledNodeIds: string[] = [appliedStartNode.id];
    if (simState.traveledNodeIds && simState.traveledNodeIds.length > 0) {
      alreadyTraveledNodeIds = simState.traveledNodeIds;
    }

    const traveledRouteObj = evaluateRoutePath(
      alreadyTraveledNodeIds,
      graphData.vertices,
      graphData.edges,
      appliedMode,
      appliedVehicle
    );

    // 5. Run QPSO & Dijkstra optimization from CURRENT VEHICLE LOCATION to DESTINATION
    const qpso = runQpsoOptimization(
      rerouteStartNodeId,
      appliedDestNode.id,
      graphData.vertices,
      updatedEdges,
      appliedMode,
      appliedVehicle,
      { swarmSize: 25, maxIterations: 1000 }
    );

    const bench = runSystematicBenchmark(
      rerouteStartNodeId,
      appliedDestNode.id,
      graphData.vertices,
      updatedEdges,
      appliedMode,
      appliedVehicle
    );

    let newLegRoute = qpso.bestRoute;
    const dijkstraBench = bench.find(b => b.algorithm === 'Dijkstra');
    if (dijkstraBench && dijkstraBench.routeNodeIds.length > 0) {
      const dijkstraRoute = evaluateRoutePath(
        dijkstraBench.routeNodeIds,
        graphData.vertices,
        updatedEdges,
        appliedMode,
        appliedVehicle
      );
      if (dijkstraRoute.isFeasible) {
        if (!newLegRoute || dijkstraRoute.fitness <= (newLegRoute.fitness || Infinity)) {
          newLegRoute = dijkstraRoute;
        }
      }
    }

    // Combine traveled route + remaining re-optimized route
    let combinedNodeIds = alreadyTraveledNodeIds;
    if (newLegRoute && newLegRoute.isFeasible) {
      // Avoid duplicate junction node
      const remainingNodes = newLegRoute.nodeIds[0] === rerouteStartNodeId
        ? newLegRoute.nodeIds.slice(1)
        : newLegRoute.nodeIds;
      combinedNodeIds = [...alreadyTraveledNodeIds, ...remainingNodes];
    }

    const combinedRoute = evaluateRoutePath(
      combinedNodeIds,
      graphData.vertices,
      updatedEdges,
      appliedMode,
      appliedVehicle
    );

    // Find matching segment index in combinedRoute where fromNode.id === rerouteStartNodeId
    let newSegIdx = 0;
    if (combinedRoute && combinedRoute.segments.length > 0) {
      const matchIdx = combinedRoute.segments.findIndex(s => s.fromNode.id === rerouteStartNodeId);
      if (matchIdx !== -1) {
        newSegIdx = matchIdx;
      }
    }

    // Calculate traveled distance and time up to rerouteStartNodeId along combinedRoute
    let baseDistKm = 0;
    let baseTimeMin = 0;
    for (let i = 0; i < newSegIdx; i++) {
      baseDistKm += combinedRoute.segments[i].segmentDistanceKm;
      baseTimeMin += combinedRoute.segments[i].adjustedTimeMin;
    }

    const currentV = graphData.vertices.find(v => v.id === rerouteStartNodeId);
    const progressPct = combinedRoute.totalDistanceKm > 0
      ? Math.min(100, Math.round((baseDistKm / combinedRoute.totalDistanceKm) * 100))
      : 0;

    startTransition(() => {
      setQpsoResult(qpso);
      setActiveRoute(combinedRoute);
      setBenchmarkResults(bench);

      // Keep vehicle at current location in pause position on the new route
      setSimState(prev => {
        const vehicleCoords = currentV ? currentV.coords : (prev.currentCoords || (appliedStartNode ? appliedStartNode.coords : null));
        return {
          ...prev,
          isSimulating: true,
          isPaused: true, // Pauses vehicle at current position on new route
          currentNodeIndex: newSegIdx,
          subStepIndex: 0,
          currentNodeId: rerouteStartNodeId,
          nextNodeId: combinedRoute.nodeIds[newSegIdx + 1] || null,
          currentCoords: vehicleCoords,
          traveledNodeIds: alreadyTraveledNodeIds,
          traveledDistanceKm: Number(baseDistKm.toFixed(1)),
          traveledTimeMin: Number(baseTimeMin.toFixed(1)),
          progressPercent: progressPct,
          hasArrived: false,
        };
      });

      if (beforeRoute && combinedRoute && combinedRoute.isFeasible) {
        setDynamicReroute({
          isActive: true,
          currentLocationNodeId: rerouteStartNodeId,
          incidentEdgeId: edgeId,
          incidentType: incidentType as any,
          beforeRoute,
          afterRoute: combinedRoute,
          alreadyTraveledRoute: traveledRouteObj,
          additionalDistanceKm: Math.max(0, Number((combinedRoute.totalDistanceKm - beforeRoute.totalDistanceKm).toFixed(1))),
          additionalTimeMin: Math.max(0, Number((combinedRoute.totalTimeMin - beforeRoute.totalTimeMin).toFixed(1))),
          additionalFitness: Math.max(0, Number((combinedRoute.fitness - beforeRoute.fitness).toFixed(2))),
        });

        // Scroll smoothly to calculations breakdown section
        setTimeout(() => {
          document.getElementById('dynamic-reroute-breakdown')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 150);
      }
    });

    setNotification({
      show: true,
      message: `⚠️ Incident reported! Path rerouted from ${rerouteStartNodeId} onward.`,
    });
  };

  const handleTriggerEnRouteIncident = (type: IncidentType = 'road_block') => {
    if (!activeRoute || activeRoute.segments.length === 0) return;
    const currentLoc = simState.currentNodeId || appliedStartNode.id;
    // Target the upcoming road segment ahead of vehicle
    const upcomingSeg = activeRoute.segments.find(s => s.fromNode.id === currentLoc) || activeRoute.segments[0];
    if (upcomingSeg) {
      const typeLabels: Record<IncidentType, string> = {
        road_block: 'Road Block / Closure',
        heavy_traffic: 'Heavy Traffic Bottleneck',
        accident: 'Vehicle Collision / Accident',
        flood: 'Seasonal Flash Flood / Waterlogging',
        hazardous_road: 'Hazardous Road Conditions / Debris',
      };
      handleApplyIncident(
        upcomingSeg.edge.id,
        type,
        `${typeLabels[type] || 'Incident'} en-route near ${upcomingSeg.fromNode.name}`
      );
    }
  };

  const handleClearIncidents = () => {
    const cleanedEdges = graphData.edges.map(edge => ({
      ...edge,
      incident: undefined,
      trafficFactor: 1.0,
    }));
    setGraphData(prev => ({ ...prev, edges: cleanedEdges }));
    setDynamicReroute(null);
    executeOptimization(appliedStartNode, appliedDestNode, appliedMode, appliedVehicle, cleanedEdges);
  };

  const handleEdgeSelectedForIncident = (edge: GraphEdge) => {
    setSelectedEdgeForIncident(edge.id);
    setIsIncidentModalOpen(true);
  };

  const activeIncidentsCount = graphData.edges.filter(e => e.incident).length;

  const handleSelectRouteForMap = (nodeIds: string[]) => {
    const evalRoute = evaluateRoutePath(
      nodeIds,
      graphData.vertices,
      graphData.edges,
      appliedMode,
      appliedVehicle
    );
    if (evalRoute.isFeasible) {
      setActiveRoute(evalRoute);
      setActiveTab('map');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased pb-16">
      {/* Floating Success Notification Toast */}
      {notification && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-18 right-4 sm:right-8 z-50 bg-emerald-700 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 border border-emerald-500 animate-in fade-in slide-in-from-top-4 duration-300"
        >
          <CheckCircle2 className="w-5 h-5 text-emerald-200 shrink-0" />
          <div className="text-sm font-black tracking-wide">
            {notification.message}
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-emerald-200 hover:text-white ml-2 p-1 rounded-md transition-colors cursor-pointer"
            aria-label="Close notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Sleek, Clean App Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-lg md:text-xl font-black tracking-tight text-slate-900">
              Quantum Route Optimizer
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Intelligent Road Routing & Traffic Optimization
            </p>
          </div>

          <div className="flex items-center gap-2">
            {activeIncidentsCount > 0 && (
              <button
                onClick={handleClearIncidents}
                id="btn-clear-incidents"
                className="text-xs font-bold px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 cursor-pointer transition-colors"
              >
                Reset Incidents ({activeIncidentsCount})
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-5 space-y-5">
        {/* Route Search & Control Card */}
        <section className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          {/* Start & Destination Search Bar */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center">
            <div className="lg:col-span-5">
              <LocationInput
                id="input-start-location"
                label="START LOCATION"
                selectedVertex={startNode}
                userQuery={startQuery}
                nearbyDistanceKm={startDistanceKm}
                graphVertices={graphData.vertices}
                excludeVertexId={destNode.id}
                onSelectNode={handleStartSelect}
                onUseGps={handleUseCurrentLocation}
              />
            </div>

            <div className="lg:col-span-2 flex justify-center">
              <button
                type="button"
                onClick={handleSwapStartAndDest}
                id="btn-swap-locations"
                title="Swap Start & Destination"
                className="p-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl text-slate-700 font-bold transition-all cursor-pointer shadow-xs flex items-center justify-center gap-1.5 text-xs"
              >
                <ArrowLeftRight className="w-4 h-4 text-blue-600" />
                <span className="hidden sm:inline">Swap</span>
              </button>
            </div>

            <div className="lg:col-span-5">
              <LocationInput
                id="input-dest-location"
                label="DESTINATION LOCATION"
                selectedVertex={destNode}
                userQuery={destQuery}
                nearbyDistanceKm={destDistanceKm}
                graphVertices={graphData.vertices}
                excludeVertexId={startNode.id}
                onSelectNode={handleDestSelect}
              />
            </div>
          </div>

          {/* VRO – Vehicle & Route Optimization Section */}
          <div className="space-y-4 pt-3 border-t border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-200 pb-2">
              <div>
                <h2 className="text-sm font-black uppercase text-slate-900 tracking-wide flex items-center gap-2">
                  <span className="inline-block w-2.5 h-2.5 rounded-xs bg-blue-600"></span>
                  VRO – Vehicle & Route Optimization
                </h2>
                <p className="text-[11px] text-slate-500 font-medium">
                  VRO Filters: Road Suitability • Dimensional / Access Restrictions • Dynamic Congestion • Safety Constraints → Feasible Subgraph → QPSO
                </p>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 w-fit">
                VRO Constraints → QPSO
              </span>
            </div>

            {/* 1. Vehicle Selection - Full Width High Visibility */}
            <div className="space-y-1.5">
              <span className="text-xs font-black uppercase text-slate-700 tracking-wide">Select Vehicle</span>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 bg-slate-100 p-2.5 rounded-xl border border-slate-200">
                {(
                  [
                    { type: 'car', label: 'Car', icon: Car, suitability: 'All paved roads & expressways' },
                    { type: 'bike', label: 'Bike', icon: Bike, suitability: 'Narrow roads & arterial links' },
                    { type: 'bus', label: 'Bus', icon: Bus, suitability: 'Major transit corridors & NH' },
                    { type: 'truck', label: 'Heavy Vehicle', icon: Truck, suitability: 'Heavy freight & bypass routes' },
                    { type: 'emergency', label: 'Emergency', icon: ShieldAlert, suitability: 'Priority signalized corridors' },
                  ] as const
                ).map(v => {
                  const Icon = v.icon;
                  const isSelected = selectedVehicle === v.type;
                  return (
                    <button
                      key={v.type}
                      type="button"
                      onClick={() => handleVehicleSelect(v.type)}
                      className={`py-3 px-3 text-center rounded-xl text-xs font-black transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 shadow-2xs ${
                        isSelected
                          ? 'bg-blue-100 text-blue-950 border-2 border-blue-600 shadow-md scale-[1.02]'
                          : 'text-slate-700 hover:bg-slate-200 hover:text-slate-900 bg-white/80 border border-slate-200'
                      }`}
                    >
                      <Icon className={`w-6 h-6 stroke-[2.2] ${isSelected ? 'text-blue-700' : ''}`} />
                      <span className="text-xs font-black">{v.label}</span>
                      <span className={`text-[9px] text-center line-clamp-1 ${isSelected ? 'text-blue-900 font-semibold' : 'text-slate-500'}`}>
                        {v.suitability}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Route Goal Section (Positioned Directly Below Vehicle Type) */}
            <div className="space-y-1.5">
              <span className="text-xs font-black uppercase text-slate-700 tracking-wide">Route Goal</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-slate-100 p-2.5 rounded-xl border border-slate-200">
                {(
                  [
                    { mode: 'fastest', label: 'Fastest', icon: Zap, desc: 'Prioritize lowest travel time (β=0.60)' },
                    { mode: 'balanced', label: 'Balanced', icon: Gauge, desc: 'Balanced time, distance & risk (β=0.30, δ=0.25)' },
                    { mode: 'safer', label: 'Safer', icon: ShieldCheck, desc: 'Strictly avoid blackspots & risk (δ=0.55)' },
                  ] as const
                ).map(m => {
                  const Icon = m.icon;
                  const isSelected = optimizationMode === m.mode;
                  return (
                    <button
                      key={m.mode}
                      type="button"
                      onClick={() => handleModeSelect(m.mode)}
                      className={`py-3 px-3 text-center text-xs sm:text-sm font-black rounded-xl cursor-pointer transition-all flex flex-col items-center justify-center gap-1 shadow-2xs ${
                        isSelected
                          ? 'bg-blue-100 text-blue-950 border-2 border-blue-600 shadow-md scale-[1.02]'
                          : 'text-slate-700 hover:bg-slate-200 hover:text-slate-900 bg-white/80 border border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <Icon className={`w-5 h-5 stroke-[2.2] ${isSelected ? 'text-blue-700' : ''}`} />
                        <span>{m.label}</span>
                      </div>
                      <span className={`text-[10px] ${isSelected ? 'text-blue-800 font-bold' : 'text-slate-500 font-medium'}`}>
                        {m.desc}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Calculate Route Action Button with Rotating Circle Spinner */}
            <div className="pt-1 space-y-2">
              {hasPendingChanges && (
                <div className="flex flex-wrap items-center justify-between text-xs text-amber-900 bg-amber-50 border border-amber-300 px-3.5 py-2 rounded-xl font-bold shadow-2xs">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                    Pending inputs modified (Vehicle, Goal, or Location)
                  </span>
                  <span className="text-[11px] font-extrabold text-blue-700">
                    Click Calculate Route below to apply
                  </span>
                </div>
              )}

              <button
                type="button"
                onClick={handleOptimizeClick}
                disabled={isCalculating}
                id="btn-optimize-route"
                className={`w-full py-4 px-6 rounded-xl text-white font-black text-sm shadow-md text-center transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  isCalculating
                    ? 'bg-blue-500 cursor-not-allowed opacity-90'
                    : hasPendingChanges
                    ? 'bg-blue-600 hover:bg-blue-700 ring-4 ring-blue-200 ring-offset-1 hover:scale-[1.005] active:scale-[0.99]'
                    : 'bg-blue-600 hover:bg-blue-700 hover:scale-[1.005] active:scale-[0.99]'
                }`}
              >
                {isCalculating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Processing Route Calculation...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5" />
                    <span>Calculate Route {hasPendingChanges ? '• Apply Changes' : ''}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </section>

        {/* Dynamic Reroute Alert Banner (if incident active) */}
        {dynamicReroute && (
          <div id="dynamic-reroute-breakdown">
            <DynamicReroutingPanel
              state={dynamicReroute}
              vertices={graphData.vertices}
              onResetReroute={handleClearIncidents}
            />
          </div>
        )}

        {/* Large View Tabs with Icons */}
        <div className="flex flex-wrap items-center gap-2.5 border-b border-slate-200 pb-3">
          <button
            type="button"
            onClick={() => setActiveTab('map')}
            className={`px-5 py-3 rounded-xl text-sm font-black transition-all cursor-pointer flex items-center gap-2 shadow-2xs ${
              activeTab === 'map'
                ? 'bg-blue-600 text-white shadow-md scale-[1.02]'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Map className="w-5 h-5 stroke-[2.2]" />
            <span>Map & Route</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('graph')}
            className={`px-5 py-3 rounded-xl text-sm font-black transition-all cursor-pointer flex items-center gap-2 shadow-2xs ${
              activeTab === 'graph'
                ? 'bg-blue-600 text-white shadow-md scale-[1.02]'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Network className="w-5 h-5 stroke-[2.2]" />
            <span>Road Graph</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('benchmarks')}
            className={`px-5 py-3 rounded-xl text-sm font-black transition-all cursor-pointer flex items-center gap-2 shadow-2xs ${
              activeTab === 'benchmarks'
                ? 'bg-blue-600 text-white shadow-md scale-[1.02]'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-5 h-5 stroke-[2.2]" />
            <span>QPSO Benchmarks &amp; Formulation</span>
          </button>
        </div>

        {/* Tab 1: Live Map & Summary */}
        {activeTab === 'map' && (
          <div className="space-y-4">
            {/* Real-time AP Road Network Map */}
            <div className="w-full">
              <MapComponent
                vertices={graphData.vertices}
                edges={graphData.edges}
                optimalRoute={activeRoute}
                shortestRoute={shortestRoute}
                startNode={appliedStartNode}
                destNode={appliedDestNode}
                dynamicReroute={dynamicReroute}
                vehicleType={appliedVehicle}
                optimizationMode={appliedMode}
                simCoords={simState.currentCoords}
              />
            </div>

            {/* Live Interactive Journey Controller */}
            <JourneyController
              simState={simState}
              activeRoute={activeRoute}
              startNode={appliedStartNode}
              destNode={appliedDestNode}
              vehicleType={appliedVehicle}
              onStart={handleStartJourney}
              onPause={handlePauseJourney}
              onResume={handleResumeJourney}
              onReset={handleResetJourney}
              onSpeedChange={handleChangeSimSpeed}
              onTriggerIncident={handleTriggerEnRouteIncident}
            />

            <RouteSummary
              route={activeRoute}
              shortestRoute={shortestRoute}
              vehicle={appliedVehicle}
              mode={appliedMode}
              currentTimeString={currentTimeString}
              isSimulatedTraffic={true}
              onViewDetails={() => setIsDetailsModalOpen(true)}
            />
          </div>
        )}

        {/* Tab 2: Graph Visualizer */}
        {activeTab === 'graph' && (
          <div className="space-y-4">
            <GraphVisualizer
              vertices={graphData.vertices}
              edges={graphData.edges}
              optimalRoute={activeRoute}
              dynamicReroute={dynamicReroute}
              startVertex={appliedStartNode}
              destVertex={appliedDestNode}
              optimizationMode={appliedMode}
              vehicleType={appliedVehicle}
              currentLocationNodeId={simState.currentNodeId}
              onSelectNode={node => handleStartSelect(node)}
            />
          </div>
        )}

        {/* Tab 3: Systematic Benchmark */}
        {activeTab === 'benchmarks' && (
          <div className="space-y-4">
            <BenchmarkSection
              results={benchmarkResults}
              onSelectRouteForMap={handleSelectRouteForMap}
            />
            <QpsoExplorationView
              mode={appliedMode}
              route={activeRoute}
              qpsoResult={qpsoResult}
              vertices={graphData.vertices}
              edges={graphData.edges}
            />
          </div>
        )}
      </main>

      {/* Incident Modal */}
      <IncidentModal
        isOpen={isIncidentModalOpen}
        onClose={() => setIsIncidentModalOpen(false)}
        edges={graphData.edges}
        currentRoute={activeRoute}
        selectedEdgeId={selectedEdgeForIncident}
        onApplyIncident={handleApplyIncident}
        onClearIncidents={handleClearIncidents}
        activeIncidentsCount={activeIncidentsCount}
      />

      {/* Turn-by-Turn Route Details Modal */}
      <RouteDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        route={activeRoute}
      />
    </div>
  );
}
