import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import {
  GraphVertex,
  GraphEdge,
  EvaluatedRoute,
  OptimizationMode,
  VehicleType,
  DynamicRerouteState,
  TrafficState,
  ObjectiveWeights,
} from '../types';
import {
  getDynamicEdgeState,
  computeEdgeMetaheuristicWeight,
  DEFAULT_BOUNDS,
} from '../algorithms/evaluator';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Navigation,
  X,
  Clock,
  Activity,
  Maximize2,
  Compass,
  Info,
  Route,
  ShieldAlert,
} from 'lucide-react';

/**
 * Computes dynamic time-dependent edge metrics and normalized multi-objective weight f(e, t).
 */
export function getEdgeCombinedWeight(
  edge: GraphEdge,
  mode: OptimizationMode | string = 'balanced',
  _vehicle?: VehicleType | string,
  trafficState?: TrafficState,
  objectiveWeights?: ObjectiveWeights
) {
  const dyn = getDynamicEdgeState(edge, trafficState);
  const dist = Number(dyn.distance.toFixed(1));
  const timeMin = isFinite(dyn.travelTime) ? Number(dyn.travelTime.toFixed(1)) : 999;
  const congestion = Number(dyn.congestion.toFixed(2));
  const currentSpeed = Number(dyn.currentSpeed.toFixed(1));
  const risk = Number(((edge.historical_risk ?? edge.riskScore) || 0).toFixed(1));
  const combined = Number(
    computeEdgeMetaheuristicWeight(
      edge,
      (mode as OptimizationMode) || 'balanced',
      undefined,
      DEFAULT_BOUNDS,
      trafficState,
      objectiveWeights
    ).toFixed(3)
  );

  let trafficLabel = 'Free Flow';
  if (dyn.isBlocked) trafficLabel = 'Road Blocked';
  else if (dyn.incidentFlag) trafficLabel = 'Incident Active';
  else if (congestion >= 1.4) trafficLabel = 'Heavy Congestion';
  else if (congestion >= 1.15) trafficLabel = 'Moderate Traffic';

  return { dist, timeMin, congestion, currentSpeed, risk, combined, isBlocked: dyn.isBlocked, trafficLabel };
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
  trafficState?: TrafficState;
  objectiveWeights?: ObjectiveWeights;
  currentLocationNodeId?: string;
  onSelectEdge?: (edge: GraphEdge) => void;
  onSelectNode?: (vertex: GraphVertex) => void;
  onInjectIncidentOnEdge?: (edgeId: string) => void;
  onClearIncidentOnEdge?: (edgeId: string) => void;
}

export const GraphVisualizer: React.FC<GraphVisualizerProps> = ({
  vertices,
  edges,
  optimalRoute,
  dynamicReroute,
  startVertex,
  destVertex,
  optimizationMode = 'balanced',
  vehicleType = 'car',
  trafficState,
  objectiveWeights,
  currentLocationNodeId,
  onSelectEdge,
  onSelectNode,
  onClearIncidentOnEdge,
}) => {
  // Selected edge state for click inspection
  const [selectedEdge, setSelectedEdge] = useState<GraphEdge | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<GraphEdge | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphVertex | null>(null);

  // Connected/adjacent edges to the currently selected edge
  const connectedEdges = useMemo(() => {
    if (!selectedEdge) return [];
    const fromNode = selectedEdge.from;
    const toNode = selectedEdge.to;
    return edges.filter(
      e => e.id !== selectedEdge.id && (e.from === fromNode || e.to === fromNode || e.from === toNode || e.to === toNode)
    );
  }, [selectedEdge, edges]);

  const connectedEdgeIdSet = useMemo(() => {
    return new Set(connectedEdges.map(e => e.id));
  }, [connectedEdges]);

  const svgWidth = 1600;
  const svgHeight = 820;
  const centerX = svgWidth / 2;
  const centerY = svgHeight / 2;

  // 1. Exact Node Sequence from Optimizer (matching Geographic Map 100%)
  const routeNodeSequence = useMemo(() => {
    if (optimalRoute?.nodeIds && optimalRoute.nodeIds.length > 0) {
      return optimalRoute.nodeIds;
    }
    return [];
  }, [optimalRoute]);

  const currentStartId = useMemo(() => {
    return routeNodeSequence[0] || startVertex?.id || vertices[0]?.id;
  }, [routeNodeSequence, startVertex, vertices]);

  const currentDestId = useMemo(() => {
    return (
      routeNodeSequence[routeNodeSequence.length - 1] ||
      destVertex?.id ||
      vertices[vertices.length - 1]?.id
    );
  }, [routeNodeSequence, destVertex, vertices]);

  const routeNodeIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    routeNodeSequence.forEach((id, idx) => map.set(id, idx));
    return map;
  }, [routeNodeSequence]);

  // Directed route segments from optimalRoute
  const pathSegments = useMemo(() => {
    if (!optimalRoute || routeNodeSequence.length < 2) return [];

    const segments: Array<{
      from: string;
      to: string;
      edge: GraphEdge;
      stepIndex: number;
    }> = [];

    const nodeMap = new Map<string, GraphVertex>();
    vertices.forEach(v => nodeMap.set(v.id, v));

    for (let i = 0; i < routeNodeSequence.length - 1; i++) {
      const u = routeNodeSequence[i];
      const v = routeNodeSequence[i + 1];

      let matchedEdge: GraphEdge | undefined;

      // 1. First check optimalRoute.segments specifically for (from=u, to=v)
      if (optimalRoute.segments) {
        const seg = optimalRoute.segments.find(
          s => (s.fromNode?.id === u && s.toNode?.id === v) || (s.edge?.from === u && s.edge?.to === v)
        );
        if (seg?.edge) matchedEdge = seg.edge;
      }

      // 2. Check edges for exact directed match (u -> v)
      if (!matchedEdge) {
        matchedEdge = edges.find(e => e.from === u && e.to === v);
      }

      // 3. Check edges for bidirectional match
      if (!matchedEdge) {
        matchedEdge = edges.find(e => (e.from === u && e.to === v) || (e.from === v && e.to === u));
      }

      // 4. Guaranteed fallback edge if not in static list
      if (!matchedEdge) {
        const uNode = nodeMap.get(u);
        const vNode = nodeMap.get(v);
        const dHav =
          uNode && vNode
            ? Number(
                (
                  6371 *
                  2 *
                  Math.atan2(
                    Math.sqrt(
                      Math.sin(((vNode.coords.lat - uNode.coords.lat) * Math.PI) / 360) ** 2 +
                        Math.cos((uNode.coords.lat * Math.PI) / 180) *
                          Math.cos((vNode.coords.lat * Math.PI) / 180) *
                          Math.sin(((vNode.coords.lng - uNode.coords.lng) * Math.PI) / 360) ** 2
                    ),
                    Math.sqrt(
                      1 -
                        (Math.sin(((vNode.coords.lat - uNode.coords.lat) * Math.PI) / 360) ** 2 +
                          Math.cos((uNode.coords.lat * Math.PI) / 180) *
                            Math.cos((vNode.coords.lat * Math.PI) / 180) *
                            Math.sin(((vNode.coords.lng - uNode.coords.lng) * Math.PI) / 360) ** 2)
                    )
                  )
                ).toFixed(1)
              )
            : 15.0;

        matchedEdge = {
          id: `opt_path_${u}_${v}_${i}`,
          from: u,
          to: v,
          roadName: `${uNode?.name || u} - ${vNode?.name || v} Corridor`,
          roadType: 'national_highway',
          distanceKm: dHav,
          baseSpeedKmH: 70,
          geometry: [],
          trafficFactor: 1.1,
          riskScore: 2,
          allowedVehicles: ['car', 'bike', 'bus', 'truck', 'emergency'],
          distance: dHav,
          travel_time: Number(((dHav / 70) * 60).toFixed(1)),
          historical_congestion: 1.1,
          historical_risk: 2,
          road_condition: 'good',
          vehicle_allowed: ['car', 'bike', 'bus', 'truck', 'emergency'],
          vehicle_suitability: { car: 1.0, bike: 1.0, bus: 1.0, truck: 1.0, emergency: 1.0 },
        };
      }

      segments.push({
        from: u,
        to: v,
        edge: matchedEdge,
        stepIndex: i + 1,
      });
    }

    return segments;
  }, [optimalRoute, routeNodeSequence, edges, vertices]);

  // Set of edge IDs and node pairs in active path
  const activePathEdgeIdSet = useMemo(() => {
    const set = new Set<string>();
    pathSegments.forEach(s => set.add(s.edge.id));
    return set;
  }, [pathSegments]);

  const activePathPairMap = useMemo(() => {
    const map = new Map<string, { from: string; to: string; stepIndex: number }>();
    pathSegments.forEach(s => {
      const pairKey = [s.from, s.to].sort().join('__');
      map.set(pairKey, { from: s.from, to: s.to, stepIndex: s.stepIndex });
    });
    return map;
  }, [pathSegments]);

  // Bypassed path edges (if dynamic detour active)
  const bypassedEdgePairSet = useMemo(() => {
    const set = new Set<string>();
    if (!dynamicReroute?.beforeRoute?.nodeIds) return set;
    const nodeIds = dynamicReroute.beforeRoute.nodeIds;
    for (let i = 0; i < nodeIds.length - 1; i++) {
      const pairKey = [nodeIds[i], nodeIds[i + 1]].sort().join('__');
      set.add(pairKey);
    }
    return set;
  }, [dynamicReroute]);

  // 2. Exact Conformal Geographic Projection (Matching Geographic Map 100%)
  const nodePositions = useMemo(() => {
    const positions = new Map<string, { x: number; y: number }>();

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

    const meanLatRad = ((minLat + maxLat) / 2) * (Math.PI / 180);
    const cosLat = Math.cos(meanLatRad) || 0.96;

    const geoWidth = Math.max((maxLng - minLng) * cosLat, 0.12);
    const geoHeight = Math.max(maxLat - minLat, 0.12);

    const padX = 100;
    const padY = 80;
    const availW = svgWidth - padX * 2;
    const availH = svgHeight - padY * 2;

    const scale = Math.min(availW / geoWidth, availH / geoHeight);
    const centerLng = (minLng + maxLng) / 2;
    const centerLat = (minLat + maxLat) / 2;

    vertices.forEach(v => {
      // True Mercator-scaled projection preserving exact geographic orientation and angles
      const x = centerX + (v.coords.lng - centerLng) * cosLat * scale;
      const y = centerY - (v.coords.lat - centerLat) * scale;
      positions.set(v.id, { x: Number(x.toFixed(1)), y: Number(y.toFixed(1)) });
    });

    return positions;
  }, [vertices, svgWidth, svgHeight, centerX, centerY]);

  // 3. Controlled Smooth Zoom (0.6x to 3.5x max, auto-fits to active route)
  const minZoomAllowed = 0.6;
  const maxZoomAllowed = 3.5;
  const defaultZoom = 1.0;

  const [zoom, setZoom] = useState<number>(defaultZoom);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const resetView = useCallback(() => {
    setZoom(defaultZoom);
    setPan({ x: 0, y: 0 });
  }, [defaultZoom]);

  // Fit active path inside comfortable zoom bounds
  const fitToActivePath = useCallback(() => {
    if (routeNodeSequence.length < 2) {
      resetView();
      return;
    }

    const pts = routeNodeSequence
      .map(id => nodePositions.get(id))
      .filter((p): p is { x: number; y: number } => p !== undefined);

    if (pts.length < 2) {
      resetView();
      return;
    }

    const minX = Math.min(...pts.map(p => p.x));
    const maxX = Math.max(...pts.map(p => p.x));
    const minY = Math.min(...pts.map(p => p.y));
    const maxY = Math.max(...pts.map(p => p.y));

    const targetX = (minX + maxX) / 2;
    const targetY = (minY + maxY) / 2;
    const spanX = Math.max(180, maxX - minX);
    const spanY = Math.max(140, maxY - minY);

    const fitZoom = Math.min(
      2.4,
      Math.max(1.0, Math.min((svgWidth * 0.68) / spanX, (svgHeight * 0.68) / spanY))
    );
    const targetZoom = Number(fitZoom.toFixed(2));

    setZoom(targetZoom);
    setPan({
      x: Number(((centerX - targetX) * targetZoom).toFixed(1)),
      y: Number(((centerY - targetY) * targetZoom).toFixed(1)),
    });
  }, [routeNodeSequence, nodePositions, centerX, centerY, svgWidth, svgHeight, resetView]);

  // Auto-fit to active route whenever route sequence or endpoints change
  const routeKey = routeNodeSequence.join('->');
  useEffect(() => {
    if (routeNodeSequence.length >= 2 && nodePositions.size > 0) {
      fitToActivePath();
    }
  }, [routeKey, nodePositions.size, fitToActivePath, routeNodeSequence.length]);

  // Focus on edge
  const focusOnEdge = useCallback((edge: GraphEdge) => {
    const p1 = nodePositions.get(edge.from);
    const p2 = nodePositions.get(edge.to);
    if (!p1 || !p2) return;

    const midX = (p1.x + p2.x) / 2;
    const midY = (p1.y + p2.y) / 2;
    const targetZoom = Math.min(maxZoomAllowed, 2.2);
    setZoom(targetZoom);
    setPan({
      x: Number(((centerX - midX) * targetZoom).toFixed(1)),
      y: Number(((centerY - midY) * targetZoom).toFixed(1)),
    });
  }, [nodePositions, centerX, centerY, maxZoomAllowed]);

  // Zoom around current viewport center (used by +, -, and slider)
  const applyZoomToCenter = useCallback((rawNextZoom: number) => {
    const clamped = Math.min(maxZoomAllowed, Math.max(minZoomAllowed, Number(rawNextZoom.toFixed(2))));
    setZoom(prevZoom => {
      const ratio = clamped / (prevZoom || 1);
      setPan(prevPan => ({
        x: Number((prevPan.x * ratio).toFixed(1)),
        y: Number((prevPan.y * ratio).toFixed(1)),
      }));
      return clamped;
    });
  }, [maxZoomAllowed, minZoomAllowed]);

  // Smooth wheel zoom clamped to [0.6x, 3.5x]
  const handleWheel = useCallback((e: WheelEvent | React.WheelEvent) => {
    e.preventDefault();
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const mouseClientX = e.clientX - rect.left;
    const mouseClientY = e.clientY - rect.top;

    const svgRelX = (mouseClientX / rect.width) * svgWidth;
    const svgRelY = (mouseClientY / rect.height) * svgHeight;

    const currentOriginX = pan.x + centerX * (1 - zoom);
    const currentOriginY = pan.y + centerY * (1 - zoom);

    const worldX = (svgRelX - currentOriginX) / zoom;
    const worldY = (svgRelY - currentOriginY) / zoom;

    const zoomDelta = e.deltaY < 0 ? 0.18 : -0.18;
    const nextZoom = Math.min(maxZoomAllowed, Math.max(minZoomAllowed, Number((zoom + zoomDelta).toFixed(2))));

    const nextOriginX = svgRelX - worldX * nextZoom;
    const nextOriginY = svgRelY - worldY * nextZoom;

    const nextPanX = nextOriginX - centerX * (1 - nextZoom);
    const nextPanY = nextOriginY - centerY * (1 - nextZoom);

    setZoom(nextZoom);
    setPan({ x: Number(nextPanX.toFixed(1)), y: Number(nextPanY.toFixed(1)) });
  }, [pan, zoom, centerX, centerY, svgWidth, svgHeight, maxZoomAllowed, minZoomAllowed]);

  // Attach non-passive wheel listener so wheel zooming never scrolls the page
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheelNative = (ev: WheelEvent) => handleWheel(ev);
    el.addEventListener('wheel', onWheelNative, { passive: false });
    return () => el.removeEventListener('wheel', onWheelNative);
  }, [handleWheel]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseClientX = e.clientX - rect.left;
    const mouseClientY = e.clientY - rect.top;

    const svgRelX = (mouseClientX / rect.width) * svgWidth;
    const svgRelY = (mouseClientY / rect.height) * svgHeight;

    const currentOriginX = pan.x + centerX * (1 - zoom);
    const currentOriginY = pan.y + centerY * (1 - zoom);

    const worldX = (svgRelX - currentOriginX) / zoom;
    const worldY = (svgRelY - currentOriginY) / zoom;

    const nextZoom = Math.min(maxZoomAllowed, Number((zoom * 1.35).toFixed(2)));
    const nextOriginX = svgRelX - worldX * nextZoom;
    const nextOriginY = svgRelY - worldY * nextZoom;

    const nextPanX = nextOriginX - centerX * (1 - nextZoom);
    const nextPanY = nextOriginY - centerY * (1 - nextZoom);

    setZoom(nextZoom);
    setPan({ x: Number(nextPanX.toFixed(1)), y: Number(nextPanY.toFixed(1)) });
  };

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

  const handleMouseUp = () => setIsDragging(false);

  const handleZoomIn = () => applyZoomToCenter(zoom + 0.25);
  const handleZoomOut = () => applyZoomToCenter(zoom - 0.25);

  // Deduplicated Background Network Edges
  const deduplicatedEdges = useMemo(() => {
    const pairMap = new Map<string, GraphEdge>();

    edges.forEach(e => {
      const pairKey = [e.from, e.to].sort().join('__');
      const isPathEdge = activePathEdgeIdSet.has(e.id) || activePathPairMap.has(pairKey);

      const existing = pairMap.get(pairKey);
      if (!existing) {
        pairMap.set(pairKey, e);
      } else {
        if (isPathEdge) {
          pairMap.set(pairKey, e);
        } else if (e.incident && !existing.incident) {
          pairMap.set(pairKey, e);
        }
      }
    });

    return Array.from(pairMap.values()).sort((a, b) => {
      const aKey = [a.from, a.to].sort().join('__');
      const bKey = [b.from, b.to].sort().join('__');

      const aIsPath = activePathEdgeIdSet.has(a.id) || activePathPairMap.has(aKey);
      const bIsPath = activePathEdgeIdSet.has(b.id) || activePathPairMap.has(bKey);

      const aIsSel = selectedEdge?.id === a.id;
      const bIsSel = selectedEdge?.id === b.id;

      const aScore = aIsSel ? 5 : aIsPath ? 4 : a.incident ? 3 : bypassedEdgePairSet.has(aKey) ? 2 : 1;
      const bScore = bIsSel ? 5 : bIsPath ? 4 : b.incident ? 3 : bypassedEdgePairSet.has(bKey) ? 2 : 1;
      return aScore - bScore;
    });
  }, [edges, activePathEdgeIdSet, activePathPairMap, bypassedEdgePairSet, selectedEdge]);

  const transformString = `translate(${pan.x + centerX * (1 - zoom)}, ${pan.y + centerY * (1 - zoom)}) scale(${zoom})`;

  const startVertexObj = vertices.find(v => v.id === currentStartId);
  const destVertexObj = vertices.find(v => v.id === currentDestId);

  // Selected edge endpoint node objects
  const selectedFromVertex = selectedEdge ? vertices.find(v => v.id === selectedEdge.from) : null;
  const selectedToVertex = selectedEdge ? vertices.find(v => v.id === selectedEdge.to) : null;

  return (
    <div className="w-full bg-white border border-slate-200 rounded-xl p-4 md:p-5 space-y-3 relative">
      {/* Top Header & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-slate-700" />
            <h3 className="text-sm font-bold text-slate-900">
              Weighted Graph View
            </h3>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-slate-600">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block"></span>
              <span>Start: <b>{startVertexObj?.name || currentStartId}</b></span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-4 h-1.5 rounded-xs bg-blue-600 inline-block"></span>
              <span className="text-blue-900 font-semibold">Optimized Path</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600 inline-block"></span>
              <span>End: <b>{destVertexObj?.name || currentDestId}</b></span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-4 h-0.5 bg-slate-300 inline-block"></span>
              <span className="text-slate-400">Road Grid</span>
            </span>
            {selectedEdge && (
              <span className="inline-flex items-center gap-1.5 text-amber-800 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                <span>Selected: {selectedFromVertex?.name || selectedEdge.from} ➔ {selectedToVertex?.name || selectedEdge.to}</span>
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fitToActivePath}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer"
            title="Fit view to current path"
          >
            <Route className="w-3.5 h-3.5 text-blue-600" />
            <span>Fit Path</span>
          </button>

          <button
            type="button"
            onClick={resetView}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 transition-colors cursor-pointer"
            title="Reset view to 100%"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Ordered Path Sequence Bar from Optimizer */}
      {routeNodeSequence.length >= 2 && (
        <div className="flex items-center gap-1.5 overflow-x-auto py-1.5 px-3 bg-blue-50/40 border border-blue-100 rounded-xl text-xs">
          <span className="font-semibold text-blue-950 uppercase tracking-wider mr-1 shrink-0 text-[11px]">
            Optimized Route ({routeNodeSequence.length} nodes):
          </span>
          {routeNodeSequence.map((nodeId, idx) => {
            const node = vertices.find(v => v.id === nodeId);
            const nodeName = node?.name || nodeId;
            const isEndpointOfSelected = selectedEdge && (selectedEdge.from === nodeId || selectedEdge.to === nodeId);
            return (
              <React.Fragment key={nodeId}>
                <span
                  onClick={() => {
                    if (node && onSelectNode) onSelectNode(node);
                  }}
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md font-medium shrink-0 cursor-pointer transition-all ${
                    idx === 0
                      ? 'bg-emerald-600 text-white font-bold'
                      : idx === routeNodeSequence.length - 1
                      ? 'bg-rose-600 text-white font-bold'
                      : isEndpointOfSelected
                      ? 'bg-amber-500 text-white font-bold shadow-xs'
                      : 'bg-white text-blue-950 border border-blue-200 hover:border-blue-400 font-semibold'
                  }`}
                >
                  <span className="text-[10px] opacity-75">{idx + 1}.</span>
                  <span>{nodeName}</span>
                </span>
                {idx < routeNodeSequence.length - 1 && (
                  <span className="text-blue-400 font-bold shrink-0">→</span>
                )}
              </React.Fragment>
            );
          })}
        </div>
      )}

      {/* Main Graph SVG Canvas */}
      <div className="relative">
        {/* Floating Zoom Controls (Up to 350%) */}
        <div className="absolute top-3 right-3 z-20 flex items-center gap-1 bg-white/95 backdrop-blur-xs px-2 py-1 rounded-xl border border-slate-300 shadow-sm">
          <button
            type="button"
            onClick={handleZoomOut}
            className="p-1.5 hover:bg-slate-100 text-slate-700 rounded-lg cursor-pointer transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <input
            type="range"
            min={minZoomAllowed}
            max={maxZoomAllowed}
            step={0.05}
            value={zoom}
            onChange={e => applyZoomToCenter(Number(e.target.value))}
            className="w-20 accent-blue-600 cursor-pointer h-1.5 mx-1"
            title="Zoom (60% to 350%)"
          />
          <span className="px-1 text-xs font-mono font-semibold text-slate-800 select-none min-w-[42px] text-right">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={handleZoomIn}
            className="p-1.5 hover:bg-slate-100 text-slate-700 rounded-lg cursor-pointer transition-colors"
            title="Zoom In (Max 350%)"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>

        {/* Hover Hint Info */}
        <div className="absolute bottom-3 left-3 z-10 pointer-events-none bg-slate-900/80 backdrop-blur-xs text-white px-3 py-1.5 rounded-lg text-xs font-medium shadow-sm flex items-center gap-2">
          <Info className="w-3.5 h-3.5 text-blue-300 shrink-0" />
          <span>Scroll or use +/- to zoom · Drag to pan · Click any road edge for metrics</span>
        </div>

        {/* SVG Container */}
        <div
          ref={containerRef}
          onDoubleClick={handleDoubleClick}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onClick={() => {
            // Clicking empty canvas space clears the edge selection
            setSelectedEdge(null);
          }}
          className={`w-full overflow-hidden bg-slate-50/70 border border-slate-200 rounded-xl select-none relative ${
            isDragging ? 'cursor-grabbing' : 'cursor-grab'
          }`}
          style={{ height: '620px' }}
        >
          <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-full">
            <defs>
              <filter id="badgeShadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="1" stdDeviation="1.2" floodColor="#000000" floodOpacity="0.1" />
              </filter>
              <filter id="selectedGlow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="3.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <g transform={transformString}>
              {/* Subtle Coordinate Grid */}
              <g stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 6">
                {[140, 280, 420, 560, 700].map(y => (
                  <line key={`gy-${y}`} x1="0" y1={y} x2={svgWidth} y2={y} />
                ))}
                {[200, 400, 600, 800, 1000, 1200, 1400].map(x => (
                  <line key={`gx-${x}`} x1={x} y1="0" x2={x} y2={svgHeight} />
                ))}
              </g>

              {/* 1. Road Network Background Edges (Light Subtle Gray) */}
              {deduplicatedEdges.map(edge => {
                const pairKey = [edge.from, edge.to].sort().join('__');
                const isPathEdge = activePathEdgeIdSet.has(edge.id) || activePathPairMap.has(pairKey);
                const isBypassedEdge = !isPathEdge && bypassedEdgePairSet.has(pairKey);
                const isSelected = selectedEdge?.id === edge.id;
                const isHovered = hoveredEdge?.id === edge.id;
                const isConnectedToSelected = connectedEdgeIdSet.has(edge.id);

                const p1 = nodePositions.get(edge.from);
                const p2 = nodePositions.get(edge.to);
                if (!p1 || !p2) return null;

                const incident = edge.incident;
                const isBlocked = incident?.isBlocked;
                const midX = (p1.x + p2.x) / 2;
                const midY = (p1.y + p2.y) / 2;

                const { dist, timeMin, combined } = getEdgeCombinedWeight(
                  edge,
                  optimizationMode,
                  vehicleType,
                  trafficState,
                  objectiveWeights
                );

                // Non-path background edges stay very light unless selected or connected to selected
                let strokeColor = '#e2e8f0';
                let strokeWidth = 0.8;
                let strokeDasharray: string | undefined = undefined;
                let strokeOpacity = 0.6;

                if (isBlocked) {
                  strokeColor = '#dc2626';
                  strokeWidth = 3.0;
                  strokeDasharray = '5, 4';
                  strokeOpacity = 1.0;
                } else if (incident) {
                  strokeColor = '#ea580c';
                  strokeWidth = 3.0;
                  strokeDasharray = '5, 4';
                  strokeOpacity = 1.0;
                } else if (isSelected) {
                  strokeColor = '#f59e0b';
                  strokeWidth = 4.5;
                  strokeOpacity = 1.0;
                } else if (isConnectedToSelected) {
                  strokeColor = '#a855f7';
                  strokeWidth = 2.5;
                  strokeDasharray = '5, 3';
                  strokeOpacity = 0.95;
                } else if (isPathEdge) {
                  // Handled separately by dedicated overlay for crisp rendering
                  strokeColor = '#bfdbfe';
                  strokeWidth = 1.2;
                  strokeOpacity = 0.35;
                } else if (isBypassedEdge) {
                  strokeColor = '#f59e0b';
                  strokeWidth = 1.8;
                  strokeDasharray = '5, 3';
                  strokeOpacity = 0.8;
                } else if (isHovered) {
                  strokeColor = '#60a5fa';
                  strokeWidth = 2.0;
                  strokeOpacity = 1.0;
                }

                return (
                  <g
                    key={`bg-${pairKey}`}
                    className="cursor-pointer group"
                    onMouseEnter={() => setHoveredEdge(edge)}
                    onMouseLeave={() => setHoveredEdge(null)}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedEdge(prev => (prev?.id === edge.id ? null : edge));
                      if (onSelectEdge) onSelectEdge(edge);
                    }}
                  >
                    {/* Generous hit area for easy clicking */}
                    <line
                      x1={p1.x}
                      y1={p1.y}
                      x2={p2.x}
                      y2={p2.y}
                      stroke="transparent"
                      strokeWidth="22"
                    />

                    {/* Edge Main Line */}
                    <line
                      x1={p1.x}
                      y1={p1.y}
                      x2={p2.x}
                      y2={p2.y}
                      stroke={strokeColor}
                      strokeWidth={strokeWidth}
                      strokeOpacity={strokeOpacity}
                      strokeDasharray={strokeDasharray}
                      strokeLinecap="round"
                      className="transition-colors duration-150"
                    />

                    {/* Cost Badge for Selected or Connected/Adjacent Edges */}
                    {(isSelected || isConnectedToSelected || isHovered) && !incident && (
                      <g transform={`translate(${midX}, ${midY})`}>
                        <rect
                          x={isPathEdge ? "-30" : "-24"}
                          y="-8"
                          width={isPathEdge ? "60" : "48"}
                          height="16"
                          rx="4"
                          fill={isSelected ? '#fef3c7' : isConnectedToSelected ? '#f3e8ff' : '#ffffff'}
                          stroke={isSelected ? '#d97706' : isConnectedToSelected ? '#9333ea' : '#3b82f6'}
                          strokeWidth="1.2"
                          filter="url(#badgeShadow)"
                        />
                        <text
                          textAnchor="middle"
                          dy="3"
                          fill={isSelected ? '#92400e' : isConnectedToSelected ? '#6b21a8' : '#1e3a8a'}
                          fontSize="7.5"
                          fontWeight="800"
                        >
                          {isPathEdge ? `${dist}k · f=${combined}` : `f=${combined}`}
                        </text>
                      </g>
                    )}

                    {/* Incident Badge */}
                    {incident && (
                      <g transform={`translate(${midX}, ${midY})`}>
                        <rect
                          x="-36"
                          y="-9"
                          width="72"
                          height="18"
                          rx="4"
                          fill={isBlocked ? '#dc2626' : '#ea580c'}
                          filter="url(#badgeShadow)"
                        />
                        <text
                          textAnchor="middle"
                          dy="3.5"
                          fill="#ffffff"
                          fontSize="9"
                          fontWeight="800"
                        >
                          {isBlocked ? '⛔ BLOCKED' : '⚠️ INCIDENT'}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}

              {/* 2. DEDICATED OPTIMIZED ROUTE PATH OVERLAY (100% Exact to Geographic Map, Clean Blue Color) */}
              {pathSegments.map(segment => {
                const p1 = nodePositions.get(segment.from);
                const p2 = nodePositions.get(segment.to);
                if (!p1 || !p2) return null;

                const isSelected = selectedEdge?.id === segment.edge.id;
                const isHovered = hoveredEdge?.id === segment.edge.id;
                const isBlocked = segment.edge.incident?.isBlocked;
                const strokeColor = isSelected ? '#f59e0b' : isBlocked ? '#dc2626' : '#2563eb';
                const midX = (p1.x + p2.x) / 2;
                const midY = (p1.y + p2.y) / 2;
                const segLengthPx = Math.hypot(p2.x - p1.x, p2.y - p1.y);
                const distLabel = `${Number(segment.edge.distanceKm.toFixed(0))} km`;

                return (
                  <g
                    key={`path-seg-${segment.from}-${segment.to}-${segment.stepIndex}`}
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredEdge(segment.edge)}
                    onMouseLeave={() => setHoveredEdge(null)}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedEdge(prev => (prev?.id === segment.edge.id ? null : segment.edge));
                      if (onSelectEdge) onSelectEdge(segment.edge);
                    }}
                  >
                    {/* Click Hitbox */}
                    <line
                      x1={p1.x}
                      y1={p1.y}
                      x2={p2.x}
                      y2={p2.y}
                      stroke="transparent"
                      strokeWidth="24"
                    />

                    {/* Soft Backing Glow for Active Path */}
                    <line
                      x1={p1.x}
                      y1={p1.y}
                      x2={p2.x}
                      y2={p2.y}
                      stroke={isSelected ? '#fde68a' : '#dbeafe'}
                      strokeWidth="9"
                      strokeLinecap="round"
                      strokeOpacity="0.85"
                    />

                    {/* Core Crisp Path Line */}
                    <line
                      x1={p1.x}
                      y1={p1.y}
                      x2={p2.x}
                      y2={p2.y}
                      stroke={strokeColor}
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    />

                    {/* Clean Edge Distance Pill on Selected / Hovered / Blocked Route Segment */}
                    {(isSelected || isHovered || isBlocked) && segLengthPx * zoom >= 36 && (
                      <g transform={`translate(${midX}, ${midY})`}>
                        <rect
                          x="-20"
                          y="-7.5"
                          width="40"
                          height="15"
                          rx="4"
                          fill="#ffffff"
                          stroke={isSelected ? '#f59e0b' : '#93c5fd'}
                          strokeWidth="1"
                          filter="url(#badgeShadow)"
                        />
                        <text
                          textAnchor="middle"
                          dy="3"
                          fill={isSelected ? '#b45309' : '#1e40af'}
                          fontSize="7.5"
                          fontWeight="700"
                        >
                          {distLabel}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}

              {/* 3. Vertices (Nodes): Sorted so Active Route & Start/End render cleanly on top */}
              {[...vertices]
                .sort((a, b) => {
                  const aPriority =
                    a.id === currentStartId || a.id === currentDestId
                      ? 3
                      : routeNodeIndexMap.has(a.id)
                      ? 2
                      : 1;
                  const bPriority =
                    b.id === currentStartId || b.id === currentDestId
                      ? 3
                      : routeNodeIndexMap.has(b.id)
                      ? 2
                      : 1;
                  return aPriority - bPriority;
                })
                .map(vertex => {
                  const pos = nodePositions.get(vertex.id);
                  if (!pos) return null;

                  const isStart = currentStartId === vertex.id;
                  const isDest = currentDestId === vertex.id;
                  const routeStepIdx = routeNodeIndexMap.get(vertex.id);
                  const isInRoute = routeStepIdx !== undefined;
                  const isSelectedEndpoint = selectedEdge && (selectedEdge.from === vertex.id || selectedEdge.to === vertex.id);
                  const isHovered = hoveredNode?.id === vertex.id;

                  let radius = 3.0;
                  let fillColor = '#f8fafc';
                  let strokeColor = '#cbd5e1';
                  let strokeWidth = 1.0;

                  if (isStart) {
                    fillColor = '#10b981';
                    strokeColor = '#047857';
                    radius = 8.5;
                    strokeWidth = 2.2;
                  } else if (isDest) {
                    fillColor = '#dc2626';
                    strokeColor = '#991b1b';
                    radius = 8.5;
                    strokeWidth = 2.2;
                  } else if (isSelectedEndpoint) {
                    fillColor = '#f59e0b';
                    strokeColor = '#d97706';
                    radius = 7.0;
                    strokeWidth = 2.0;
                  } else if (isInRoute) {
                    fillColor = '#2563eb';
                    strokeColor = '#1d4ed8';
                    radius = 6.5;
                    strokeWidth = 1.8;
                  } else if (isHovered) {
                    fillColor = '#60a5fa';
                    strokeColor = '#2563eb';
                    radius = 5.5;
                    strokeWidth = 1.5;
                  }

                  // Show badge label on Start, Destination, Selected Endpoint, or Hovered Node ONLY (prevents label clutter)
                  const showBadgeLabel = isStart || isDest || isSelectedEndpoint || isHovered;
                  const labelText = isStart
                    ? `Start: ${vertex.name}`
                    : isDest
                    ? `End: ${vertex.name}`
                    : vertex.name;

                  return (
                    <g
                      key={vertex.id}
                      transform={`translate(${pos.x}, ${pos.y})`}
                      className="cursor-pointer group"
                      onMouseEnter={() => setHoveredNode(vertex)}
                      onMouseLeave={() => setHoveredNode(null)}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onSelectNode) onSelectNode(vertex);
                      }}
                    >
                      {/* Start / Dest / Selected Endpoint Outer Ring */}
                      {(isStart || isDest || isSelectedEndpoint) && (
                        <circle
                          r={radius + 4}
                          fill="none"
                          stroke={isStart ? '#10b981' : isDest ? '#f87171' : '#f59e0b'}
                          strokeWidth="1.4"
                          strokeDasharray="3 3"
                        />
                      )}

                      {/* Active Simulation Vehicle Indicator */}
                      {currentLocationNodeId === vertex.id && (
                        <g transform="translate(0, -18)">
                          <circle r="9" fill="#2563eb" stroke="#ffffff" strokeWidth="1.5" filter="url(#badgeShadow)" />
                          <text textAnchor="middle" dy="3" fontSize="9">🚗</text>
                        </g>
                      )}

                      {/* Node Circle Marker */}
                      <circle
                        r={radius}
                        fill={fillColor}
                        stroke={strokeColor}
                        strokeWidth={strokeWidth}
                        filter={isInRoute || isStart || isDest ? 'url(#badgeShadow)' : undefined}
                        className="transition-transform duration-150 group-hover:scale-125"
                      />

                      {/* Step Number on Active Path Nodes */}
                      {isInRoute && !isStart && !isDest && (
                        <text
                          textAnchor="middle"
                          dy="2.8"
                          fill="#ffffff"
                          fontSize="7"
                          fontWeight="900"
                        >
                          {routeStepIdx + 1}
                        </text>
                      )}

                      {/* Clean Pill Badge for Start/End/Route/Selected/Hovered Node */}
                      {showBadgeLabel && (
                        <g transform={`translate(0, ${isStart || isDest ? -16 : 14})`}>
                          <rect
                            x={-((labelText.length * 5.6 + 10) / 2)}
                            y="-7.5"
                            width={labelText.length * 5.6 + 10}
                            height="15"
                            rx="3.5"
                            fill={
                              isStart
                                ? '#10b981'
                                : isDest
                                ? '#dc2626'
                                : isSelectedEndpoint
                                ? '#d97706'
                                : isInRoute
                                ? '#1e40af'
                                : '#334155'
                            }
                            filter="url(#badgeShadow)"
                          />
                          <text
                            textAnchor="middle"
                            dy="3"
                            fill="#ffffff"
                            fontSize="8.5"
                            fontWeight="700"
                          >
                            {labelText}
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })}
            </g>
          </svg>
        </div>

        {/* Compact Edge Details Floating Panel (when edge is clicked) */}
        {selectedEdge && (() => {
          const { dist, timeMin, congestion, currentSpeed, combined, isBlocked, trafficLabel } = getEdgeCombinedWeight(
            selectedEdge,
            optimizationMode,
            vehicleType,
            trafficState,
            objectiveWeights
          );
          const fromVertex = vertices.find(v => v.id === selectedEdge.from);
          const toVertex = vertices.find(v => v.id === selectedEdge.to);
          const fromName = fromVertex?.name || selectedEdge.from;
          const toName = toVertex?.name || selectedEdge.to;
          const incident = selectedEdge.incident;

          const pairKey = [selectedEdge.from, selectedEdge.to].sort().join('__');
          const isRouteEdge = activePathEdgeIdSet.has(selectedEdge.id) || activePathPairMap.has(pairKey);

          return (
            <div
              onClick={e => e.stopPropagation()}
              className="absolute top-4 left-4 z-30 max-w-sm w-full bg-white/95 backdrop-blur-md border border-slate-300 rounded-2xl shadow-xl p-4 space-y-3 animate-in fade-in zoom-in-95 duration-150"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-800">
                      {selectedEdge.roadType.replace('_', ' ')}
                    </span>
                    {isRouteEdge && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                        Optimized Path
                      </span>
                    )}
                    {isBlocked && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800">
                        Blocked
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <span>{fromName}</span>
                    <span className="text-slate-400 font-bold">➔</span>
                    <span>{toName}</span>
                  </h4>
                  <p className="text-xs text-slate-500 font-medium">{selectedEdge.roadName}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedEdge(null)}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded-lg bg-slate-100 hover:bg-slate-200 cursor-pointer"
                  title="Close Details"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Path Edges Display Full Detailed Info, Non-Path Edges Display ONLY Cost Score */}
              {isRouteEdge ? (
                <>
                  {/* Full Detailed Edge Metrics Grid for Optimized Path Edges */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-blue-50/60 p-2 rounded-lg border border-blue-200 space-y-0.5">
                      <div className="text-[10px] text-blue-700 font-medium flex items-center gap-1">
                        <Navigation className="w-3 h-3 text-blue-600" />
                        <span>Distance</span>
                      </div>
                      <div className="text-xs font-bold text-slate-900">{dist} km</div>
                    </div>

                    <div className="bg-blue-50/60 p-2 rounded-lg border border-blue-200 space-y-0.5">
                      <div className="text-[10px] text-blue-700 font-medium flex items-center gap-1">
                        <Clock className="w-3 h-3 text-blue-600" />
                        <span>Travel Time</span>
                      </div>
                      <div className="text-xs font-bold text-slate-900">{timeMin} min</div>
                    </div>

                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-200 space-y-0.5">
                      <div className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                        <Activity className="w-3 h-3 text-amber-600" />
                        <span>Speed</span>
                      </div>
                      <div className="text-xs font-bold text-slate-900">
                        {currentSpeed} km/h <span className="text-[10px] text-slate-500 font-normal">({selectedEdge.baseSpeedKmH} max)</span>
                      </div>
                    </div>

                    <div className="bg-blue-100/70 p-2 rounded-lg border border-blue-300 space-y-0.5">
                      <div className="text-[10px] text-blue-800 font-medium flex items-center gap-1">
                        <Compass className="w-3 h-3 text-blue-700" />
                        <span>Edge Cost f(e,t)</span>
                      </div>
                      <div className="text-xs font-black text-blue-900">{combined}</div>
                    </div>
                  </div>

                  {/* Traffic State Info */}
                  <div className="flex items-center justify-between px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700">
                    <span className="font-medium">Traffic State:</span>
                    <span className={`font-bold ${isBlocked ? 'text-red-700' : congestion >= 1.4 ? 'text-amber-700' : 'text-blue-700'}`}>
                      {trafficLabel} ({congestion.toFixed(2)}x)
                    </span>
                  </div>
                </>
              ) : (
                /* Prominent ONLY COST SCORE Card for Non-Path Edges */
                <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-3.5 text-center space-y-1 shadow-2xs">
                  <div className="text-[11px] font-extrabold text-amber-900 uppercase tracking-wider flex items-center justify-center gap-1">
                    <Compass className="w-4 h-4 text-amber-600" />
                    <span>Edge Cost Score f(e,t)</span>
                  </div>
                  <div className="text-3xl font-black text-amber-950 tabular-nums tracking-tight">
                    {combined}
                  </div>
                  <p className="text-[10px] text-amber-700 font-semibold">
                    Multi-objective weight formulation score
                  </p>
                </div>
              )}

              {/* Step-by-Step Mathematical Calculation Breakdown (in clear human text format) */}
              {(() => {
                const normT = Number((timeMin / 110.0).toFixed(4));
                const normD = Number((dist / 96.0).toFixed(4));
                const congCost = Math.max(0, (congestion - 1.0) * dist);
                const normC = Number((congCost / 45.0).toFixed(4));
                const wT = objectiveWeights?.wT ?? 0.40;
                const wD = objectiveWeights?.wD ?? 0.30;
                const wC = objectiveWeights?.wC ?? 0.30;
                const termT = Number((wT * normT).toFixed(4));
                const termD = Number((wD * normD).toFixed(4));
                const termC = Number((wC * normC).toFixed(4));

                return (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2 text-xs">
                    <div className="font-bold text-slate-800 text-[11px] uppercase tracking-wider flex items-center justify-between border-b border-slate-200 pb-1">
                      <span>Mathematical Calculation</span>
                      <span className="text-[10px] text-blue-700 font-extrabold bg-blue-50 px-1.5 py-0.5 rounded">
                        f(e,t) = {combined}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-600 leading-snug">
                      The edge cost score <strong>f(e, t)</strong> is computed using the multi-objective weighted sum formula:
                    </p>

                    <div className="bg-white p-2 rounded-lg border border-slate-200 text-center font-semibold text-slate-900 text-[11px]">
                      f(e, t) = (wT × Normalized Time) + (wD × Normalized Distance) + (wC × Normalized Congestion)
                    </div>

                    <div className="space-y-1 text-[11px] text-slate-700">
                      <div className="font-semibold text-slate-900">Step 1: Normalization</div>
                      <ul className="list-disc list-inside space-y-0.5 text-slate-600 pl-1 text-[10px]">
                        <li><strong>Time:</strong> {timeMin} min ÷ 110 min = <strong>{normT}</strong></li>
                        <li><strong>Distance:</strong> {dist} km ÷ 96 km = <strong>{normD}</strong></li>
                        <li><strong>Congestion:</strong> {congCost.toFixed(1)} penalty ÷ 45 = <strong>{normC}</strong></li>
                      </ul>

                      <div className="font-semibold text-slate-900 pt-1">Step 2: Weight Multiplication</div>
                      <div className="bg-slate-100/80 p-2.5 rounded-md font-mono text-[10.5px] text-slate-800 space-y-0.5">
                        <div>= ({wT} × {normT}) + ({wD} × {normD}) + ({wC} × {normC})</div>
                        <div>= {termT} + {termD} + {termC}</div>
                        <div className="font-bold text-blue-800 pt-0.5 border-t border-slate-200">
                          = {combined} Final Edge Cost Score
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Adjacent / Connected Edges Cost Comparison Table */}
              {connectedEdges.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between text-[11px] font-bold text-purple-900">
                    <span className="flex items-center gap-1 uppercase tracking-wider">
                      <Route className="w-3.5 h-3.5 text-purple-600" />
                      Adjacent Connected Edges ({connectedEdges.length})
                    </span>
                    <span className="text-[10px] text-slate-500 font-normal">Click row to inspect</span>
                  </div>

                  <div className="max-h-36 overflow-y-auto border border-purple-200 rounded-lg bg-purple-50/40">
                    <table className="w-full text-left text-[11px] tabular-nums">
                      <thead className="bg-purple-100/80 text-purple-950 font-bold sticky top-0">
                        <tr>
                          <th className="p-1.5">Connected Edge</th>
                          <th className="p-1.5">Dist</th>
                          <th className="p-1.5">Time</th>
                          <th className="p-1.5 text-right">Edge Cost f(e,t)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-purple-100">
                        {connectedEdges.map(adjEdge => {
                          const adjMetrics = getEdgeCombinedWeight(
                            adjEdge,
                            optimizationMode,
                            vehicleType,
                            trafficState,
                            objectiveWeights
                          );
                          const adjFrom = vertices.find(v => v.id === adjEdge.from)?.name || adjEdge.from;
                          const adjTo = vertices.find(v => v.id === adjEdge.to)?.name || adjEdge.to;
                          const adjPairKey = [adjEdge.from, adjEdge.to].sort().join('__');
                          const isAdjPathEdge = activePathEdgeIdSet.has(adjEdge.id) || activePathPairMap.has(adjPairKey);

                          return (
                            <tr
                              key={adjEdge.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedEdge(adjEdge);
                                if (onSelectEdge) onSelectEdge(adjEdge);
                              }}
                              className="hover:bg-purple-100/90 cursor-pointer transition-colors text-slate-800"
                            >
                              <td className="p-1.5 font-semibold whitespace-nowrap flex items-center gap-1">
                                <span>{adjFrom} ➔ {adjTo}</span>
                                {isAdjPathEdge && (
                                  <span className="px-1 py-0.2 bg-blue-100 text-blue-800 text-[9px] font-extrabold rounded">PATH</span>
                                )}
                              </td>
                              <td className="p-1.5 whitespace-nowrap text-slate-600">
                                {isAdjPathEdge ? `${adjMetrics.dist} km` : '—'}
                              </td>
                              <td className="p-1.5 whitespace-nowrap text-slate-600">
                                {isAdjPathEdge ? `${adjMetrics.timeMin} m` : '—'}
                              </td>
                              <td className="p-1.5 text-right font-bold text-purple-900 whitespace-nowrap">
                                {adjMetrics.combined}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Incident Box (if affected) */}
              {incident && (
                <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-900 space-y-1">
                  <div className="font-bold flex items-center gap-1 text-red-700">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Incident: {incident.type.replace('_', ' ').toUpperCase()}</span>
                  </div>
                  <p className="text-[11px] text-red-800">{incident.description}</p>
                </div>
              )}

              {/* Action Buttons (Clean view with Zoom To Edge and optional Clear Incident) */}
              <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => focusOnEdge(selectedEdge)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 cursor-pointer transition-colors"
                >
                  <Maximize2 className="w-3.5 h-3.5 text-blue-600" />
                  <span>Zoom To Edge</span>
                </button>

                {incident && (
                  <button
                    type="button"
                    onClick={() => {
                      if (onClearIncidentOnEdge) onClearIncidentOnEdge(selectedEdge.id);
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer transition-colors"
                  >
                    <span>Clear Incident</span>
                  </button>
                )}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};
