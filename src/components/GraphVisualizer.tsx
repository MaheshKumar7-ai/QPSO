import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { GraphVertex, GraphEdge, EvaluatedRoute, OptimizationMode, VehicleType, DynamicRerouteState } from '../types';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  MapPin,
  Layers,
  Target,
  Move,
  ChevronRight,
  ChevronLeft,
  Flag,
  Maximize2,
  Navigation,
  Scale,
  Sparkles,
  X,
  Info,
  GitBranch,
} from 'lucide-react';

/**
 * Computes composite edge weight combining Distance, Travel Time, Congestion, and Risk attributes into a single numeric value.
 */
export function getEdgeCombinedWeight(
  edge: GraphEdge,
  _mode?: OptimizationMode | string,
  _vehicle?: VehicleType | string
) {
  const dist = Number(edge.distanceKm.toFixed(1));
  const speedMult = edge.roadType === 'expressway' ? 1.0 : (edge.roadType === 'national_highway' ? 0.95 : 0.85);
  const effectiveSpeed = Math.max(15, (edge.baseSpeedKmH || 60) * speedMult);
  const timeMin = Number(((dist / effectiveSpeed) * 60 * (edge.trafficFactor || 1.0)).toFixed(1));
  const congestion = Number(((edge.historical_congestion ?? edge.trafficFactor) || 1.0).toFixed(1));
  const risk = Number(((edge.historical_risk ?? edge.riskScore) || 0).toFixed(1));
  const combined = Number((dist + timeMin + congestion + risk).toFixed(1));
  return { dist, timeMin, congestion, risk, combined };
}

interface GraphVisualizerProps {
  vertices: GraphVertex[];
  edges: GraphEdge[];
  optimalRoute: EvaluatedRoute | null;
  dynamicReroute?: DynamicRerouteState | null;
  startVertex?: GraphVertex;
  destVertex?: GraphVertex;
  optimizationMode?: OptimizationMode;
  vehicleType?: VehicleType;
  currentLocationNodeId?: string;
  onSelectEdge?: (edge: GraphEdge) => void;
  onSelectNode?: (vertex: GraphVertex) => void;
}

export const GraphVisualizer: React.FC<GraphVisualizerProps> = ({
  vertices,
  edges,
  optimalRoute,
  dynamicReroute,
  startVertex,
  destVertex,
  optimizationMode = 'fastest',
  vehicleType = 'car',
  currentLocationNodeId,
  onSelectEdge,
  onSelectNode,
}) => {
  const [weightDisplayMode, setWeightDisplayMode] = useState<'combined' | 'distance' | 'time' | 'congestion' | 'risk'>('combined');
  const [showOnlyTopological, setShowOnlyTopological] = useState<boolean>(true);
  const [inspectedEdge, setInspectedEdge] = useState<GraphEdge | null>(null);
  // SVG Canvas World dimensions (spacious continuous canvas for all cities & corridors)
  const svgWidth = 1600;
  const svgHeight = 900;
  const centerX = svgWidth / 2;
  const centerY = svgHeight / 2;

  // Active Start & Destination IDs
  const currentStartId = useMemo(() => {
    return startVertex?.id || (optimalRoute?.nodeIds && optimalRoute.nodeIds[0]) || vertices[0]?.id;
  }, [startVertex, optimalRoute, vertices]);

  const currentDestId = useMemo(() => {
    return (
      destVertex?.id ||
      (optimalRoute?.nodeIds && optimalRoute.nodeIds[optimalRoute.nodeIds.length - 1]) ||
      vertices[vertices.length - 1]?.id
    );
  }, [destVertex, optimalRoute, vertices]);

  const activeStartNode = useMemo(() => {
    return vertices.find(v => v.id === currentStartId) || vertices[0];
  }, [vertices, currentStartId]);

  const activeDestNode = useMemo(() => {
    return vertices.find(v => v.id === currentDestId) || vertices[vertices.length - 1];
  }, [vertices, currentDestId]);

  // Topological Sort Sequence along active optimal route (or Start -> Dest)
  const topologicalSequence = useMemo(() => {
    if (optimalRoute?.nodeIds && optimalRoute.nodeIds.length > 0) {
      return optimalRoute.nodeIds
        .map(id => vertices.find(v => v.id === id))
        .filter((v): v is GraphVertex => v !== undefined);
    }
    const startV = vertices.find(v => v.id === currentStartId);
    const destV = vertices.find(v => v.id === currentDestId);
    return [startV, destV].filter((v): v is GraphVertex => v !== undefined);
  }, [optimalRoute, currentStartId, currentDestId, vertices]);

  // Direct 1-hop road neighbors & prominent adjacent hubs
  const prominentNeighborSet = useMemo(() => {
    const set = new Set<string>();
    const routeNodeSet = new Set(topologicalSequence.map(v => v.id));

    edges.forEach(e => {
      // 1-hop road neighbors of Start and Dest
      if (e.from === currentStartId || e.from === currentDestId) set.add(e.to);
      if (e.to === currentStartId || e.to === currentDestId) set.add(e.from);

      // Direct prominent city/town/junction neighbors connected to any node on the route
      if (routeNodeSet.has(e.from) || routeNodeSet.has(e.to)) {
        const neighborId = routeNodeSet.has(e.from) ? e.to : e.from;
        const neighborV = vertices.find(v => v.id === neighborId);
        if (
          neighborV &&
          (neighborV.type === 'city' ||
            neighborV.type === 'metro' ||
            neighborV.type === 'junction' ||
            neighborV.type === 'town')
        ) {
          set.add(neighborId);
        }
      }
    });
    return set;
  }, [edges, currentStartId, currentDestId, topologicalSequence, vertices]);

  // Filter vertices & edges based on showOnlyTopological toggle
  const displayVertices = useMemo(() => {
    if (!showOnlyTopological) return vertices;
    const allowed = new Set<string>([
      currentStartId,
      currentDestId,
      ...topologicalSequence.map(v => v.id),
      ...Array.from(prominentNeighborSet),
    ]);
    return vertices.filter(v => allowed.has(v.id));
  }, [vertices, showOnlyTopological, currentStartId, currentDestId, topologicalSequence, prominentNeighborSet]);

  // Set of exact adjacent pairs in the active route sequence
  const routeSequencePairSet = useMemo(() => {
    const set = new Set<string>();
    for (let i = 0; i < topologicalSequence.length - 1; i++) {
      const u = topologicalSequence[i].id;
      const v = topologicalSequence[i + 1].id;
      set.add(`${u}__${v}`);
      set.add(`${v}__${u}`);
    }
    return set;
  }, [topologicalSequence]);

  const displayEdges = useMemo(() => {
    if (!showOnlyTopological) return edges;

    const routeNodeSet = new Set(topologicalSequence.map(v => v.id));

    return edges.filter(e => {
      // 1. Exact edge along the topological route sequence
      if (routeSequencePairSet.has(`${e.from}__${e.to}`)) return true;

      // 2. Direct 1-hop edge connecting a route node to a prominent neighbor (never between neighbor and neighbor)
      const fromIsRoute = routeNodeSet.has(e.from);
      const toIsRoute = routeNodeSet.has(e.to);

      if (fromIsRoute && prominentNeighborSet.has(e.to)) return true;
      if (toIsRoute && prominentNeighborSet.has(e.from)) return true;

      // 3. Direct 1-hop edge connecting start or dest to their direct neighbors
      if (e.from === currentStartId || e.to === currentStartId) return true;
      if (e.from === currentDestId || e.to === currentDestId) return true;

      return false;
    });
  }, [edges, showOnlyTopological, routeSequencePairSet, topologicalSequence, prominentNeighborSet, currentStartId, currentDestId]);

  // Set of 1-hop direct road neighbors of start node
  const startNeighborIdSet = useMemo(() => {
    const set = new Set<string>();
    edges.forEach(e => {
      if (e.from === currentStartId) set.add(e.to);
      if (e.to === currentStartId) set.add(e.from);
    });
    return set;
  }, [edges, currentStartId]);

  // Set of edge pairs in active optimal route
  const activeEdgePairs = useMemo(() => {
    const set = new Set<string>();
    if (!optimalRoute || !optimalRoute.nodeIds) return set;
    for (let i = 0; i < optimalRoute.nodeIds.length - 1; i++) {
      const u = optimalRoute.nodeIds[i];
      const v = optimalRoute.nodeIds[i + 1];
      set.add(`${u}__${v}`);
      set.add(`${v}__${u}`);
    }
    return set;
  }, [optimalRoute]);

  // Set of edge pairs in previous route before dynamic rerouting
  const beforeEdgePairs = useMemo(() => {
    const set = new Set<string>();
    if (!dynamicReroute?.beforeRoute?.nodeIds) return set;
    const nodeIds = dynamicReroute.beforeRoute.nodeIds;
    for (let i = 0; i < nodeIds.length - 1; i++) {
      const u = nodeIds[i];
      const v = nodeIds[i + 1];
      set.add(`${u}__${v}`);
      set.add(`${v}__${u}`);
    }
    return set;
  }, [dynamicReroute]);

  // Route nodes array for step-by-step corridor navigation
  const routeNodes = useMemo(() => {
    if (!optimalRoute?.nodeIds || optimalRoute.nodeIds.length === 0) return [];
    return optimalRoute.nodeIds
      .map(id => vertices.find(v => v.id === id))
      .filter((v): v is GraphVertex => v !== undefined);
  }, [optimalRoute, vertices]);

  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);

  // Sync step index when route changes
  useEffect(() => {
    setCurrentStepIndex(0);
  }, [optimalRoute]);

  // Continuous Topological 2D Projection with Force-Relaxation Anti-Overlap Algorithm
  // ALL vertices in the network exist in this continuous world space!
  const nodePositions = useMemo(() => {
    const paddingX = 140;
    const paddingY = 120;

    let minLat = Infinity,
      maxLat = -Infinity,
      minLng = Infinity,
      maxLng = -Infinity;
    vertices.forEach(v => {
      if (v.coords.lat < minLat) minLat = v.coords.lat;
      if (v.coords.lat > maxLat) maxLat = v.coords.lat;
      if (v.coords.lng < minLng) minLng = v.coords.lng;
      if (v.coords.lng > maxLng) maxLng = v.coords.lng;
    });

    const latRange = Math.max(maxLat - minLat, 1.0);
    const lngRange = Math.max(maxLng - minLng, 1.0);

    const positions = new Map<string, { x: number; y: number }>();
    vertices.forEach(v => {
      // Invert Y for latitude (North is UP)
      const rawX = paddingX + ((v.coords.lng - minLng) / lngRange) * (svgWidth - paddingX * 2);
      const rawY = svgHeight - paddingY - ((v.coords.lat - minLat) / latRange) * (svgHeight - paddingY * 2);
      positions.set(v.id, { x: Number(rawX.toFixed(1)), y: Number(rawY.toFixed(1)) });
    });

    // Multi-pass Anti-Collision Force Relaxation:
    // Pushes dense regional clusters (e.g. Amaravati, Vijayawada, Mangalagiri, Guntur, Tenali)
    // apart so they have at least 95px clearance, completely eliminating overlapping!
    const minDistanceThreshold = 95;
    const nodeArray = Array.from(positions.entries());

    for (let iter = 0; iter < 12; iter++) {
      for (let i = 0; i < nodeArray.length; i++) {
        for (let j = i + 1; j < nodeArray.length; j++) {
          const [idA, posA] = nodeArray[i];
          const [idB, posB] = nodeArray[j];
          const dx = posB.x - posA.x;
          const dy = posB.y - posA.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;

          if (dist < minDistanceThreshold) {
            const overlap = (minDistanceThreshold - dist) / 2;
            const nx = (dx / dist) * overlap;
            const ny = (dy / dist) * overlap;

            posA.x = Math.max(paddingX / 2, Math.min(svgWidth - paddingX / 2, posA.x - nx));
            posA.y = Math.max(paddingY / 2, Math.min(svgHeight - paddingY / 2, posA.y - ny));
            posB.x = Math.max(paddingX / 2, Math.min(svgWidth - paddingX / 2, posB.x + nx));
            posB.y = Math.max(paddingY / 2, Math.min(svgHeight - paddingY / 2, posB.y + ny));

            positions.set(idA, { x: Number(posA.x.toFixed(1)), y: Number(posA.y.toFixed(1)) });
            positions.set(idB, { x: Number(posB.x.toFixed(1)), y: Number(posB.y.toFixed(1)) });
          }
        }
      }
    }

    return positions;
  }, [vertices, svgWidth, svgHeight]);

  // Camera Zoom & Pan State
  const [zoom, setZoom] = useState<number>(1.85);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Helper: center camera on a specific SVG coordinate (x, y) at zoom Z
  const focusOnPoint = useCallback(
    (targetX: number, targetY: number, targetZoom: number) => {
      setZoom(targetZoom);
      setPan({
        x: Number((-targetZoom * (targetX - centerX)).toFixed(1)),
        y: Number((-targetZoom * (targetY - centerY)).toFixed(1)),
      });
    },
    [centerX, centerY]
  );

  // Helper: Focus on Start Node & its 1-hop connected road neighbors (Default view!)
  const focusOnStartAndNeighbors = useCallback(() => {
    const startPos = nodePositions.get(currentStartId);
    if (!startPos) return;

    // Gather bounding box of start node + direct road neighbors
    let minX = startPos.x;
    let maxX = startPos.x;
    let minY = startPos.y;
    let maxY = startPos.y;

    startNeighborIdSet.forEach(neighborId => {
      const nPos = nodePositions.get(neighborId);
      if (nPos) {
        minX = Math.min(minX, nPos.x);
        maxX = Math.max(maxX, nPos.x);
        minY = Math.min(minY, nPos.y);
        maxY = Math.max(maxY, nPos.y);
      }
    });

    const boxW = Math.max(maxX - minX, 180);
    const boxH = Math.max(maxY - minY, 140);
    const targetCenterX = (minX + maxX) / 2;
    const targetCenterY = (minY + maxY) / 2;

    // Determine zoom that comfortably fits Start and its neighbors with breathing space
    const targetZoom = Math.min(2.4, Math.max(1.5, Number((svgHeight / (boxH * 2.2)).toFixed(2))));
    focusOnPoint(targetCenterX, targetCenterY, targetZoom);
  }, [currentStartId, nodePositions, startNeighborIdSet, focusOnPoint, svgHeight]);

  // Helper: Fit Whole Route from Start to Destination
  const fitWholeRoute = useCallback(() => {
    if (!optimalRoute?.nodeIds || optimalRoute.nodeIds.length === 0) {
      focusOnStartAndNeighbors();
      return;
    }

    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;
    optimalRoute.nodeIds.forEach(id => {
      const pos = nodePositions.get(id);
      if (pos) {
        minX = Math.min(minX, pos.x);
        maxX = Math.max(maxX, pos.x);
        minY = Math.min(minY, pos.y);
        maxY = Math.max(maxY, pos.y);
      }
    });

    if (minX === Infinity) {
      focusOnStartAndNeighbors();
      return;
    }

    const boxW = Math.max(maxX - minX, 220);
    const boxH = Math.max(maxY - minY, 180);
    const targetCenterX = (minX + maxX) / 2;
    const targetCenterY = (minY + maxY) / 2;

    // Fit route with generous margin
    const targetZoom = Math.min(
      2.2,
      Math.max(0.65, Number(Math.min(svgWidth / (boxW * 1.5), svgHeight / (boxH * 1.5)).toFixed(2)))
    );
    focusOnPoint(targetCenterX, targetCenterY, targetZoom);
  }, [optimalRoute, nodePositions, focusOnStartAndNeighbors, focusOnPoint, svgWidth, svgHeight]);

  // Helper: Focus on Destination
  const focusOnDestination = useCallback(() => {
    const destPos = nodePositions.get(currentDestId);
    if (!destPos) return;
    focusOnPoint(destPos.x, destPos.y, 2.0);
  }, [currentDestId, nodePositions, focusOnPoint]);

  // Helper: Reset to Full National Overview
  const resetToFullMap = useCallback(() => {
    setZoom(0.85);
    setPan({ x: 0, y: 0 });
  }, []);

  // Initial & Start/Dest change effect:
  // "by default start vertex and it neighbours will appear"
  useEffect(() => {
    focusOnStartAndNeighbors();
  }, [currentStartId, focusOnStartAndNeighbors]);

  // Step-by-step route navigator: Jump to next / prev hub along the path to destination
  const handleJumpToStep = (index: number) => {
    if (!routeNodes || index < 0 || index >= routeNodes.length) return;
    setCurrentStepIndex(index);
    const targetNode = routeNodes[index];
    const pos = nodePositions.get(targetNode.id);
    if (pos) {
      focusOnPoint(pos.x, pos.y, 2.2);
    }
  };

  // Zoom Button Handlers
  const handleZoomIn = () => {
    setZoom(prev => Math.min(4.5, Number((prev + 0.3).toFixed(2))));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(0.5, Number((prev - 0.3).toFixed(2))));
  };

  // Drag Panning Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).tagName === 'BUTTON' || (e.target as HTMLElement).closest('button')) return;
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Mouse wheel zoom centered smoothly at cursor position
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Scale factor
      const zoomFactor = e.deltaY < 0 ? 1.18 : 1 / 1.18;

      setZoom(prevZoom => {
        const newZoom = Math.max(0.5, Math.min(4.5, Number((prevZoom * zoomFactor).toFixed(2))));

        // Adjust pan so point under cursor remains stable
        setPan(prevPan => {
          // World point before zoom
          const worldX = centerX + (mouseX - centerX - prevPan.x) / prevZoom;
          const worldY = centerY + (mouseY - centerY - prevPan.y) / prevZoom;

          // New pan to keep world point at mouse position
          const newPanX = mouseX - centerX - newZoom * (worldX - centerX);
          const newPanY = mouseY - centerY - newZoom * (worldY - centerY);
          return { x: Number(newPanX.toFixed(1)), y: Number(newPanY.toFixed(1)) };
        });

        return newZoom;
      });
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [centerX, centerY]);

  // Final SVG transform string
  const transformString = `translate(${pan.x}, ${pan.y}) translate(${centerX}, ${centerY}) scale(${zoom}) translate(${-centerX}, ${-centerY})`;

  return (
    <div className="w-full bg-white border-2 border-slate-300 rounded-xl p-6 shadow-sm space-y-4">
      {/* Header with Title and Status */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between border-b-2 border-slate-200 pb-4 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-600 inline-block shadow-xs"></span>
            <h3 className="text-xl font-black text-slate-900 tracking-tight">
              TOPOLOGICAL WEIGHTED ROAD GRAPH G = (V, E)
            </h3>
          </div>
          <p className="text-sm text-slate-600 font-medium mt-1">
            Continuous road network showing all cities, multi-objective metaheuristic cost edge weights <strong className="text-blue-700">w(e)</strong>, and incident blocks. By default centered on Start (<strong className="text-emerald-700">{activeStartNode.name}</strong>) & its connected neighbors. Zoom or drag in any direction to follow the road path to Destination (<strong className="text-red-700">{activeDestNode.name}</strong>).
          </p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-bold shrink-0">
          <span className="flex items-center gap-1.5 text-slate-900 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-300 font-black">
            <span className="w-3.5 h-3.5 rounded-full bg-emerald-600 inline-block shadow-xs"></span>
            Start Vertex
          </span>
          <span className="flex items-center gap-1.5 text-slate-900 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-300 font-black">
            <span className="w-3.5 h-3.5 rounded-full bg-blue-600 inline-block shadow-xs"></span>
            Optimal Path
          </span>
          {dynamicReroute?.isActive && (
            <span className="flex items-center gap-1.5 text-red-900 bg-red-50 px-2.5 py-1 rounded-md border border-red-300 font-black animate-pulse">
              <span className="w-4 h-1 bg-red-500 inline-block rounded-xs border border-dashed border-red-700"></span>
              Bypassed Old Path
            </span>
          )}
          <span className="flex items-center gap-1.5 text-slate-900 bg-red-50 px-2.5 py-1 rounded-md border border-red-300 font-black">
            <span className="w-3.5 h-3.5 rounded-full bg-red-600 inline-block shadow-xs"></span>
            Incident Blocked
          </span>
          <span className="flex items-center gap-1.5 text-slate-800 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
            <span className="w-4 h-1 bg-slate-400 inline-block rounded-xs"></span>
            Road Link
          </span>
        </div>
      </div>

      {/* Navigation & Edge Weight Toggle Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-slate-100 p-2.5 rounded-xl border border-slate-300">
        {/* Edge Weight Value Mode Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-black uppercase text-slate-800 tracking-wide flex items-center gap-1">
            <Scale className="w-4 h-4 text-blue-700" />
            <span>EDGE WEIGHT METRIC:</span>
          </span>
          <div className="flex items-center bg-white p-1 rounded-lg border border-slate-300 shadow-xs text-xs font-bold">
            <button
              type="button"
              onClick={() => setWeightDisplayMode('combined')}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                weightDisplayMode === 'combined'
                  ? 'bg-blue-700 text-white font-black shadow-xs'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Combined (Distance + Time + Congestion + Risk)</span>
            </button>
            <button
              type="button"
              onClick={() => setWeightDisplayMode('distance')}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                weightDisplayMode === 'distance'
                  ? 'bg-blue-700 text-white font-black shadow-xs'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              Distance
            </button>
            <button
              type="button"
              onClick={() => setWeightDisplayMode('time')}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                weightDisplayMode === 'time'
                  ? 'bg-blue-700 text-white font-black shadow-xs'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              Time
            </button>
            <button
              type="button"
              onClick={() => setWeightDisplayMode('congestion')}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                weightDisplayMode === 'congestion'
                  ? 'bg-blue-700 text-white font-black shadow-xs'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              Congestion
            </button>
            <button
              type="button"
              onClick={() => setWeightDisplayMode('risk')}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                weightDisplayMode === 'risk'
                  ? 'bg-blue-700 text-white font-black shadow-xs'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              Risk
            </button>
          </div>
        </div>

        {/* Quick Camera Jump Buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-black uppercase text-slate-700 tracking-wide mr-1 flex items-center gap-1">
            <Navigation className="w-3.5 h-3.5 text-blue-700" />
            <span>CAMERA FOCUS:</span>
          </span>

          <button
            type="button"
            onClick={focusOnStartAndNeighbors}
            className="px-3 py-1.5 bg-white border border-slate-300 hover:border-emerald-600 hover:bg-emerald-50 rounded-lg text-xs font-black text-emerald-800 transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
            title="By default: Centers on Start Vertex and its direct road neighbors"
          >
            <Target className="w-3.5 h-3.5 text-emerald-600" />
            <span>Start & Neighbors</span>
          </button>

          <button
            type="button"
            onClick={fitWholeRoute}
            className="px-3 py-1.5 bg-white border border-slate-300 hover:border-blue-600 hover:bg-blue-50 rounded-lg text-xs font-black text-blue-800 transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
            title="Fit whole path from Start to Destination on screen"
          >
            <Maximize2 className="w-3.5 h-3.5 text-blue-600" />
            <span>Fit Whole Route</span>
          </button>

          <button
            type="button"
            onClick={focusOnDestination}
            className="px-3 py-1.5 bg-white border border-slate-300 hover:border-red-600 hover:bg-red-50 rounded-lg text-xs font-black text-red-800 transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
            title="Jump to Destination Vertex"
          >
            <Flag className="w-3.5 h-3.5 text-red-600" />
            <span>Destination</span>
          </button>
        </div>

        {/* Zoom In/Out & Percentage Readout */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-black uppercase text-slate-600 tracking-wide">ZOOM:</span>
          <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-300 shadow-xs">
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={zoom <= 0.5}
              title="Zoom Out (-)"
              className="p-1.5 hover:bg-slate-100 rounded-md text-slate-700 hover:text-slate-900 disabled:opacity-30 cursor-pointer"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="px-2 text-xs font-mono font-black text-slate-800 min-w-[52px] text-center select-none">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={handleZoomIn}
              disabled={zoom >= 4.5}
              title="Zoom In (+)"
              className="p-1.5 hover:bg-slate-100 rounded-md text-slate-700 hover:text-slate-900 disabled:opacity-30 cursor-pointer"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={focusOnStartAndNeighbors}
              title="Reset View to Start Vertex (Default)"
              className="p-1.5 hover:bg-slate-100 rounded-md text-slate-600 hover:text-emerald-700 ml-1 border-l border-slate-200 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Step-by-Step Road Route Corridor Navigator (Follow the path to destination while zoomed in!) */}
      {routeNodes.length > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-2.5 bg-blue-50 border-2 border-blue-200 p-2.5 rounded-xl">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-ping"></span>
            <span className="text-xs font-black text-blue-950 uppercase tracking-wide">
              FOLLOW ROAD PATH TO DESTINATION:
            </span>
            <span className="text-xs font-bold text-blue-900 bg-white px-2 py-0.5 rounded-md border border-blue-200 shadow-2xs">
              Hub {currentStepIndex + 1} of {routeNodes.length}:{' '}
              <strong className="text-blue-700">{routeNodes[currentStepIndex]?.name}</strong>
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={currentStepIndex <= 0}
              onClick={() => handleJumpToStep(currentStepIndex - 1)}
              className="px-2.5 py-1 bg-white border border-blue-300 hover:bg-blue-100 rounded-lg text-xs font-black text-blue-900 disabled:opacity-40 disabled:hover:bg-white cursor-pointer shadow-2xs flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Prev Hub</span>
            </button>

            <button
              type="button"
              disabled={currentStepIndex >= routeNodes.length - 1}
              onClick={() => handleJumpToStep(currentStepIndex + 1)}
              className="px-2.5 py-1 bg-blue-700 hover:bg-blue-800 rounded-lg text-xs font-black text-white disabled:opacity-40 disabled:hover:bg-blue-700 cursor-pointer shadow-2xs flex items-center gap-1"
            >
              <span>Next Hub Along Route</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Edge Weight Calculation Note */}
      <div className="flex items-center gap-2 px-3.5 py-2.5 bg-blue-50/90 border border-blue-200 rounded-xl text-xs text-blue-950 font-medium shadow-2xs">
        <Info className="w-4 h-4 text-blue-700 shrink-0" />
        <div>
          <span className="font-black text-blue-900 mr-1.5">Note:</span>
          <span>
            Edge weight = combining these values (<strong>Distance + Time + Congestion + Risk</strong>). In graph, <strong>only numeric values</strong> are displayed.
          </span>
        </div>
      </div>

      {/* Inspected Road Segment Info HUD */}
      {inspectedEdge && (() => {
        const { dist, timeMin, congestion, risk, combined } = getEdgeCombinedWeight(inspectedEdge, optimizationMode, vehicleType);
        return (
          <div className="flex items-center justify-between gap-3 bg-white border-2 border-blue-400 p-3 rounded-xl shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-50 text-blue-700 rounded-lg border border-blue-200 shrink-0">
                <Navigation className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-slate-900">{inspectedEdge.roadName}</span>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded bg-blue-100 text-blue-900 border border-blue-300 font-mono">
                    Edge Weight: {combined}
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 uppercase">
                    {inspectedEdge.roadType}
                  </span>
                </div>
                <div className="text-[11px] text-slate-600 font-semibold mt-0.5">
                  {vertices.find(v => v.id === inspectedEdge.from)?.name || inspectedEdge.from} ↔ {vertices.find(v => v.id === inspectedEdge.to)?.name || inspectedEdge.to} • Distance: {dist} km + Travel Time: {timeMin} min + Congestion: {congestion}x + Risk: {risk} = <strong className="text-blue-900 font-black">{combined}</strong>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setInspectedEdge(null)}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })()}

      {/* Topological Sort Order & Prominent Neighbor Visibility Banner */}
      <div className="bg-white text-slate-900 p-3 rounded-xl border-2 border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="p-2 bg-blue-50 rounded-lg border border-blue-200 text-blue-700">
            <GitBranch className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-blue-700 flex items-center gap-1.5">
              <span>Topological Sort Order</span>
              <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-mono font-bold">FLOW SEQUENCE</span>
            </div>
            <div className="text-xs font-medium text-slate-600">
              Source to Destination Node Sequence
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 max-w-2xl overflow-x-auto py-1">
          {topologicalSequence.map((node, idx) => (
            <React.Fragment key={node.id}>
              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold shadow-xs transition-all ${
                  node.id === currentStartId
                    ? 'bg-emerald-600 text-white ring-2 ring-emerald-400'
                    : node.id === currentDestId
                    ? 'bg-rose-600 text-white ring-2 ring-rose-400'
                    : 'bg-blue-50 text-blue-900 border border-blue-200 hover:bg-blue-100'
                }`}
              >
                {node.name}
              </span>
              {idx < topologicalSequence.length - 1 && (
                <ChevronRight className="w-4 h-4 text-blue-500 flex-shrink-0" />
              )}
            </React.Fragment>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setShowOnlyTopological(!showOnlyTopological)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 transition-colors cursor-pointer shrink-0"
        >
          {showOnlyTopological ? '🌐 Show All Network Nodes' : '⚡ Show Topological & Prominent Only'}
        </button>
      </div>

      {/* SVG Canvas Area */}
      <div className="relative">
        {/* Floating Zoom & Pan HUD in Canvas Top Right */}
        <div className="absolute top-3 right-3 z-10 flex flex-col gap-1.5 bg-white/95 backdrop-blur-xs p-1.5 rounded-xl border-2 border-slate-300 shadow-md">
          <button
            type="button"
            onClick={handleZoomIn}
            title="Zoom In (+)"
            className="p-2 hover:bg-blue-50 text-slate-800 hover:text-blue-700 rounded-lg font-black transition-colors cursor-pointer"
          >
            <ZoomIn className="w-5 h-5" />
          </button>
          <div className="text-[11px] font-mono font-black text-center text-slate-700 select-none py-0.5 border-y border-slate-200">
            {Math.round(zoom * 100)}%
          </div>
          <button
            type="button"
            onClick={handleZoomOut}
            title="Zoom Out (-)"
            className="p-2 hover:bg-blue-50 text-slate-800 hover:text-blue-700 rounded-lg font-black transition-colors cursor-pointer"
          >
            <ZoomOut className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={focusOnStartAndNeighbors}
            title="Center on Start & Neighbors (Default)"
            className="p-2 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 rounded-lg transition-colors cursor-pointer border-t border-slate-200"
          >
            <Target className="w-5 h-5" />
          </button>
        </div>

        {/* Floating Direction Hint HUD Bottom Left */}
        <div className="absolute bottom-3 left-3 z-10 flex items-center gap-2 bg-white/95 backdrop-blur-xs px-3 py-1.5 rounded-lg border border-slate-300 shadow-sm text-xs font-bold text-slate-700 select-none">
          <Move className="w-4 h-4 text-blue-600 animate-pulse" />
          <span>Click & Drag to travel in any direction • Scroll wheel zooms into cursor • Double-click node to center</span>
        </div>

        {/* The SVG Container */}
        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className={`w-full overflow-hidden bg-slate-50 border-2 border-slate-300 rounded-xl select-none relative ${
            isDragging ? 'cursor-grabbing' : 'cursor-grab'
          }`}
          style={{ height: '520px' }}
        >
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-full"
          >
            <defs>
              <linearGradient id="routeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#2563eb" />
                <stop offset="100%" stopColor="#1d4ed8" />
              </linearGradient>
              <filter id="badgeShadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="1.5" stdDeviation="2" floodColor="#000000" floodOpacity="0.2" />
              </filter>
              <filter id="haloGlow" x="-30%" y="-30%" width="160%" height="160%">
                <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#22c55e" floodOpacity="0.5" />
              </filter>
            </defs>

            {/* Root Transform Group for Continuous Zoom & Pan */}
            <g transform={transformString}>
              {/* Subtle Grid Lines */}
              <g stroke="#e2e8f0" strokeWidth="1" strokeDasharray="6 10">
                {[150, 300, 450, 600, 750].map(y => (
                  <line key={`grid-y-${y}`} x1="0" y1={y} x2={svgWidth} y2={y} />
                ))}
                {[200, 400, 600, 800, 1000, 1200, 1400].map(x => (
                  <line key={`grid-x-${x}`} x1={x} y1="0" x2={x} y2={svgHeight} />
                ))}
              </g>

              {/* Road Edges (EVERY connected road link is present in the continuous graph!) */}
              {displayEdges.filter(e => e.from < e.to || e.incident || activeEdgePairs.has(`${e.from}__${e.to}`) || activeEdgePairs.has(`${e.to}__${e.from}`) || beforeEdgePairs.has(`${e.from}__${e.to}`)).map(edge => {
                const p1 = nodePositions.get(edge.from);
                const p2 = nodePositions.get(edge.to);
                if (!p1 || !p2) return null;

                const isRouteEdge = activeEdgePairs.has(`${edge.from}__${edge.to}`) || activeEdgePairs.has(`${edge.to}__${edge.from}`);
                const isBypassedEdge = !isRouteEdge && (beforeEdgePairs.has(`${edge.from}__${edge.to}`) || beforeEdgePairs.has(`${edge.to}__${edge.from}`));
                const incident = edge.incident;
                const isBlocked = incident?.isBlocked;
                const isConnectedToStart = edge.from === currentStartId || edge.to === currentStartId;
                const midX = (p1.x + p2.x) / 2;
                const midY = (p1.y + p2.y) / 2;

                // Color calculation based on state
                let strokeColor = '#94a3b8';
                let strokeWidth = 2.4;
                let strokeDasharray: string | undefined = undefined;

                if (isBlocked) {
                  strokeColor = '#dc2626';
                  strokeWidth = 6.0;
                  strokeDasharray = '8, 6';
                } else if (incident) {
                  strokeWidth = 5.5;
                  strokeDasharray = '6, 4';
                  switch (incident.type) {
                    case 'heavy_traffic':
                      strokeColor = '#ea580c'; // Orange
                      break;
                    case 'accident':
                      strokeColor = '#ef4444'; // Bright Red
                      break;
                    case 'flood':
                      strokeColor = '#0284c7'; // Sky/Cyan
                      break;
                    case 'hazardous_road':
                      strokeColor = '#d97706'; // Amber
                      break;
                    default:
                      strokeColor = '#f59e0b';
                  }
                } else if (isRouteEdge) {
                  strokeColor = '#2563eb';
                  strokeWidth = 7.0;
                } else if (isBypassedEdge) {
                  strokeColor = '#ef4444';
                  strokeWidth = 4.5;
                  strokeDasharray = '6, 4';
                } else if (isConnectedToStart) {
                  strokeColor = '#10b981';
                  strokeWidth = 3.5;
                }

                const { dist, timeMin, congestion, risk, combined } = getEdgeCombinedWeight(
                  edge,
                  (optimizationMode || 'fastest') as OptimizationMode,
                  (vehicleType || 'car') as VehicleType
                );

                return (
                  <g
                    key={edge.id}
                    className="cursor-pointer group"
                    onClick={() => {
                      setInspectedEdge(prev => (prev?.id === edge.id ? null : edge));
                      if (onSelectEdge) onSelectEdge(edge);
                    }}
                  >
                    <title>{`${edge.roadName} | Edge Weight: ${combined} (Distance: ${dist} km + Time: ${timeMin} min + Congestion: ${congestion}x + Risk: ${risk})`}</title>
                    {/* Transparent Click Target */}
                    <line
                      x1={p1.x}
                      y1={p1.y}
                      x2={p2.x}
                      y2={p2.y}
                      stroke="transparent"
                      strokeWidth="26"
                    />

                    {/* Inspected Road Selection Glow */}
                    {inspectedEdge?.id === edge.id && (
                      <line
                        x1={p1.x}
                        y1={p1.y}
                        x2={p2.x}
                        y2={p2.y}
                        stroke="#2563eb"
                        strokeWidth="14"
                        strokeOpacity="0.5"
                      />
                    )}

                    {/* Active Route Outer Glow */}
                    {isRouteEdge && !isBlocked && (
                      <line
                        x1={p1.x}
                        y1={p1.y}
                        x2={p2.x}
                        y2={p2.y}
                        stroke="#93c5fd"
                        strokeWidth="13"
                        strokeOpacity="0.6"
                      />
                    )}

                    {/* Incident Pulsing Glow */}
                    {incident && (
                      <line
                        x1={p1.x}
                        y1={p1.y}
                        x2={p2.x}
                        y2={p2.y}
                        stroke={isBlocked ? '#fca5a5' : '#fed7aa'}
                        strokeWidth="12"
                        strokeOpacity="0.8"
                        strokeDasharray="6 4"
                      />
                    )}

                    {/* Main Edge Line */}
                    <line
                      x1={p1.x}
                      y1={p1.y}
                      x2={p2.x}
                      y2={p2.y}
                      stroke={strokeColor}
                      strokeWidth={strokeWidth}
                      strokeDasharray={strokeDasharray}
                      className="transition-all duration-150 group-hover:stroke-blue-500"
                    />

                    {/* Edge Weight or Incident Badge */}
                    {incident ? (
                      <g transform={`translate(${midX}, ${midY})`}>
                        {isBlocked ? (
                          <>
                            <rect
                              x="-48"
                              y="-13"
                              width="96"
                              height="26"
                              rx="6"
                              fill="#dc2626"
                              stroke="#991b1b"
                              strokeWidth="2"
                              filter="url(#badgeShadow)"
                            />
                            <text
                              textAnchor="middle"
                              dy="5"
                              fill="#ffffff"
                              fontSize="11"
                              fontWeight="900"
                              fontFamily="Arial, sans-serif"
                            >
                              ⛔ BLOCKED
                            </text>
                          </>
                        ) : incident.type === 'heavy_traffic' ? (
                          <>
                            <rect
                              x="-56"
                              y="-13"
                              width="112"
                              height="26"
                              rx="6"
                              fill="#ea580c"
                              stroke="#c2410c"
                              strokeWidth="2"
                              filter="url(#badgeShadow)"
                            />
                            <text
                              textAnchor="middle"
                              dy="5"
                              fill="#ffffff"
                              fontSize="10.5"
                              fontWeight="900"
                              fontFamily="Arial, sans-serif"
                            >
                              🚗 TRAFFIC ({edge.trafficFactor.toFixed(1)}x)
                            </text>
                          </>
                        ) : incident.type === 'accident' ? (
                          <>
                            <rect
                              x="-52"
                              y="-13"
                              width="104"
                              height="26"
                              rx="6"
                              fill="#ef4444"
                              stroke="#b91c1c"
                              strokeWidth="2"
                              filter="url(#badgeShadow)"
                            />
                            <text
                              textAnchor="middle"
                              dy="5"
                              fill="#ffffff"
                              fontSize="10.5"
                              fontWeight="900"
                              fontFamily="Arial, sans-serif"
                            >
                              ⚠️ ACCIDENT
                            </text>
                          </>
                        ) : incident.type === 'flood' ? (
                          <>
                            <rect
                              x="-48"
                              y="-13"
                              width="96"
                              height="26"
                              rx="6"
                              fill="#0284c7"
                              stroke="#0369a1"
                              strokeWidth="2"
                              filter="url(#badgeShadow)"
                            />
                            <text
                              textAnchor="middle"
                              dy="5"
                              fill="#ffffff"
                              fontSize="11"
                              fontWeight="900"
                              fontFamily="Arial, sans-serif"
                            >
                              🌊 FLOOD
                            </text>
                          </>
                        ) : (
                          <>
                            <rect
                              x="-50"
                              y="-13"
                              width="100"
                              height="26"
                              rx="6"
                              fill="#d97706"
                              stroke="#b45309"
                              strokeWidth="2"
                              filter="url(#badgeShadow)"
                            />
                            <text
                              textAnchor="middle"
                              dy="5"
                              fill="#ffffff"
                              fontSize="10.5"
                              fontWeight="900"
                              fontFamily="Arial, sans-serif"
                            >
                              ⚠️ HAZARD
                            </text>
                          </>
                        )}
                      </g>
                    ) : (
                      (() => {
                        let numericValue: number;
                        if (weightDisplayMode === 'time') {
                          numericValue = timeMin;
                        } else if (weightDisplayMode === 'distance') {
                          numericValue = dist;
                        } else if (weightDisplayMode === 'congestion') {
                          numericValue = congestion;
                        } else if (weightDisplayMode === 'risk') {
                          numericValue = risk;
                        } else {
                          // 'combined' (Distance + Time + Congestion + Risk)
                          numericValue = combined;
                        }

                        // Display only numeric values in the graph badge
                        const badgeText = `${numericValue}`;
                        const badgeWidth = Math.max(38, badgeText.length * 8.5 + 14);

                        return (
                          <g transform={`translate(${midX}, ${midY})`}>
                            <rect
                              x={-badgeWidth / 2}
                              y="-11"
                              width={badgeWidth}
                              height="22"
                              rx="5"
                              fill={isRouteEdge ? '#1d4ed8' : isConnectedToStart ? '#065f46' : '#ffffff'}
                              stroke={isRouteEdge ? '#1e40af' : isConnectedToStart ? '#047857' : '#94a3b8'}
                              strokeWidth={isRouteEdge || isConnectedToStart ? '2' : '1.2'}
                              filter="url(#badgeShadow)"
                            />
                            <text
                              textAnchor="middle"
                              dy="4"
                              fill={isRouteEdge || isConnectedToStart ? '#ffffff' : '#0f172a'}
                              fontSize="11"
                              fontWeight="900"
                              fontFamily="Arial, sans-serif"
                            >
                              {badgeText}
                            </text>
                          </g>
                        );
                      })()
                    )}
                  </g>
                );
              })}

              {/* Vertices (ALL network cities & hubs are continuously rendered in their topological space!) */}
              {displayVertices.map(vertex => {
                const pos = nodePositions.get(vertex.id);
                if (!pos) return null;

                const isStart = currentStartId === vertex.id;
                const isDest = currentDestId === vertex.id;
                const isStartNeighbor = startNeighborIdSet.has(vertex.id);
                const isInRoute = optimalRoute?.nodeIds?.includes(vertex.id);
                const isMetro = vertex.type === 'metro';

                let fillColor = isMetro ? '#dbeafe' : '#ffffff';
                let strokeColor = isMetro ? '#2563eb' : '#64748b';
                let radius = isMetro ? 9.5 : 8;

                if (isStart) {
                  fillColor = '#16a34a';
                  strokeColor = '#14532d';
                  radius = 14;
                } else if (isDest) {
                  fillColor = '#dc2626';
                  strokeColor = '#7f1d1d';
                  radius = 13;
                } else if (isInRoute) {
                  fillColor = '#2563eb';
                  strokeColor = '#1e3a8a';
                  radius = 10.5;
                } else if (isStartNeighbor) {
                  fillColor = '#ecfdf5';
                  strokeColor = '#059669';
                  radius = 9.5;
                }

                const labelYOffset = pos.y > svgHeight - 65 ? -22 : 26;

                return (
                  <g
                    key={vertex.id}
                    transform={`translate(${pos.x}, ${pos.y})`}
                    className="cursor-pointer group"
                    onClick={() => onSelectNode && onSelectNode(vertex)}
                    onDoubleClick={() => focusOnPoint(pos.x, pos.y, 2.8)}
                  >
                    {/* Pulsing Aura on Start Vertex */}
                    {isStart && (
                      <circle
                        r="24"
                        fill="none"
                        stroke="#22c55e"
                        strokeWidth="3.5"
                        strokeDasharray="5 4"
                        className="animate-pulse"
                      />
                    )}

                    {/* Moving Vehicle Aura during Journey Simulation */}
                    {currentLocationNodeId === vertex.id && (
                      <g transform="translate(0, -28)">
                        <circle r="16" fill="#1e40af" stroke="#ffffff" strokeWidth="2" filter="url(#badgeShadow)" />
                        <text textAnchor="middle" dy="5" fontSize="13">🚗</text>
                      </g>
                    )}

                    {/* Destination Pulsing Ring */}
                    {isDest && (
                      <circle
                        r="22"
                        fill="none"
                        stroke="#ef4444"
                        strokeWidth="3"
                        strokeDasharray="4 4"
                        className="animate-pulse"
                      />
                    )}

                    {/* Main Node Circle */}
                    <circle
                      r={radius}
                      fill={fillColor}
                      stroke={strokeColor}
                      strokeWidth={isStart || isDest ? 3.5 : isStartNeighbor || isInRoute ? 2.5 : 2}
                      filter="url(#badgeShadow)"
                      className="transition-transform duration-150 group-hover:scale-125"
                    />

                    {/* Start Role Pill */}
                    {isStart && (
                      <g transform="translate(0, -26)">
                        <rect
                          x="-36"
                          y="-11"
                          width="72"
                          height="20"
                          rx="5"
                          fill="#15803d"
                          stroke="#166534"
                          strokeWidth="1.2"
                          filter="url(#badgeShadow)"
                        />
                        <text
                          textAnchor="middle"
                          dy="3.5"
                          fill="#ffffff"
                          fontSize="10"
                          fontWeight="900"
                          fontFamily="Arial, sans-serif"
                        >
                          START HUB
                        </text>
                      </g>
                    )}

                    {/* Destination Role Pill */}
                    {isDest && (
                      <g transform="translate(0, -26)">
                        <rect
                          x="-34"
                          y="-11"
                          width="68"
                          height="20"
                          rx="5"
                          fill="#b91c1c"
                          stroke="#991b1b"
                          strokeWidth="1.2"
                          filter="url(#badgeShadow)"
                        />
                        <text
                          textAnchor="middle"
                          dy="3.5"
                          fill="#ffffff"
                          fontSize="10"
                          fontWeight="900"
                          fontFamily="Arial, sans-serif"
                        >
                          DESTINATION
                        </text>
                      </g>
                    )}

                    {/* Direct Neighbor of Start Tag (so default neighborhood is highlighted) */}
                    {isStartNeighbor && !isInRoute && !isDest && (
                      <g transform="translate(0, -22)">
                        <rect
                          x="-28"
                          y="-9"
                          width="56"
                          height="16"
                          rx="4"
                          fill="#059669"
                          opacity="0.9"
                          filter="url(#badgeShadow)"
                        />
                        <text
                          textAnchor="middle"
                          dy="3"
                          fill="#ffffff"
                          fontSize="8.5"
                          fontWeight="900"
                          fontFamily="Arial, sans-serif"
                        >
                          NEIGHBOR
                        </text>
                      </g>
                    )}

                    {/* High-Contrast Non-Overlapping Label with Thick White Outline */}
                    <text
                      x="0"
                      y={labelYOffset}
                      textAnchor="middle"
                      stroke="#ffffff"
                      strokeWidth="5.5"
                      strokeLinejoin="round"
                      fontSize="13"
                      fontWeight={isStart || isDest || isInRoute ? '900' : '700'}
                      fontFamily="Arial, sans-serif"
                    >
                      {vertex.name}
                    </text>
                    <text
                      x="0"
                      y={labelYOffset}
                      textAnchor="middle"
                      fill={
                        isStart
                          ? '#15803d'
                          : isDest
                          ? '#b91c1c'
                          : isInRoute
                          ? '#1d4ed8'
                          : isStartNeighbor
                          ? '#047857'
                          : '#0f172a'
                      }
                      fontSize="13"
                      fontWeight={isStart || isDest || isInRoute ? '900' : '700'}
                      fontFamily="Arial, sans-serif"
                    >
                      {vertex.name}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>
        </div>
      </div>

      {/* Footer Info & Instructions */}
      <div className="flex flex-col gap-2.5 border-t border-slate-200 pt-3">
        <div className="flex items-center gap-2 text-xs text-slate-800 bg-slate-50 px-3.5 py-2.5 rounded-lg border border-slate-200">
          <Info className="w-4 h-4 text-blue-700 shrink-0" />
          <span>
            <strong className="text-slate-900 font-black">Note:</strong> Edge weight = combining these values (<strong>Distance + Time + Risk</strong>). In graph, only numeric values are displayed.
          </span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-600 font-medium gap-2">
          <p>
            💡 <strong className="text-slate-800">By default:</strong> Centered on Start (<span className="text-emerald-700 font-black">{activeStartNode.name}</span>) and its direct road neighbors. When zooming in or dragging along the highway towards Destination (<span className="text-red-700 font-black">{activeDestNode.name}</span>), all intermediate towns, road distances, and route segments are continuously visible.
          </p>
          <p className="text-slate-500 font-bold shrink-0">
            Showing {displayVertices.length} of {vertices.length} nodes • {displayEdges.length} road links • Zoom: {Math.round(zoom * 100)}%
          </p>
        </div>
      </div>
    </div>
  );
};
