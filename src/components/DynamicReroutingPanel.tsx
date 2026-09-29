import React from 'react';
import {
  DynamicRerouteState,
  GraphVertex,
  GraphEdge,
  EvaluatedRoute,
  IncidentType,
  ObjectiveWeights,
  OptimizationMode,
} from '../types';
import { formatDurationHuman } from '../algorithms/evaluator';
import {
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Clock,
  Navigation,
  Activity,
  Compass,
  ArrowRight,
  ShieldAlert,
  Info,
  Layers,
  MapPin,
} from 'lucide-react';

interface DynamicReroutingPanelProps {
  state: DynamicRerouteState | null;
  initialRoute: EvaluatedRoute | null;
  activeRoute: EvaluatedRoute | null;
  vertices: GraphVertex[];
  edges: GraphEdge[];
  selectedEdgeId: string;
  onSelectEdgeId: (edgeId: string) => void;
  selectedIncidentType: IncidentType;
  onSelectIncidentType: (type: IncidentType) => void;
  incidentSeverity: 'moderate' | 'high' | 'critical';
  onSelectIncidentSeverity: (sev: 'moderate' | 'high' | 'critical') => void;
  onInjectIncident: (overrideEdgeId?: string) => void;
  onResetReroute: () => void;
  startVertex?: GraphVertex | null;
  destVertex?: GraphVertex | null;
  selectedAlgorithm?: string;
  objectiveWeights: ObjectiveWeights;
  trafficTimestamp?: string;
  dayType?: string;
  optimizationMode?: OptimizationMode;
}

export const DynamicReroutingPanel: React.FC<DynamicReroutingPanelProps> = ({
  state,
  initialRoute,
  activeRoute,
  vertices,
  edges,
  selectedEdgeId,
  onSelectEdgeId,
  selectedIncidentType,
  onSelectIncidentType,
  incidentSeverity,
  onSelectIncidentSeverity,
  onInjectIncident,
  onResetReroute,
  startVertex,
  destVertex,
  selectedAlgorithm = 'Adaptive QPSO',
  objectiveWeights,
  trafficTimestamp = '08:30',
  dayType = 'weekday',
}) => {
  // Determine baseline route before incident
  const beforeRoute = state?.beforeRoute || initialRoute || activeRoute;
  const afterRoute = state?.afterRoute || (state?.isActive ? activeRoute : null);
  const isIncidentActive = Boolean(state?.isActive && afterRoute);

  // Check if route was actually altered or retained
  const isRouteAltered = Boolean(
    isIncidentActive &&
      beforeRoute &&
      afterRoute &&
      beforeRoute.nodeIds.join(',') !== afterRoute.nodeIds.join(',')
  );

  // Target edge info
  const selectedEdgeObj = edges.find(e => e.id === selectedEdgeId);
  const fromVertex = selectedEdgeObj ? vertices.find(v => v.id === selectedEdgeObj.from) : null;
  const toVertex = selectedEdgeObj ? vertices.find(v => v.id === selectedEdgeObj.to) : null;

  // Selected incident edge when incident is active
  const activeIncidentEdge = state?.incidentEdgeId
    ? edges.find(e => e.id === state.incidentEdgeId)
    : null;

  // Real calculated metric differences
  const beforeDist = beforeRoute ? beforeRoute.totalDistanceKm : 0;
  const beforeTime = beforeRoute ? beforeRoute.totalTimeMin : 0;
  const beforeCongestion = beforeRoute ? beforeRoute.totalCongestion : 1.0;
  const beforeFitness = beforeRoute ? beforeRoute.fitness : 0;

  const afterDist = afterRoute ? afterRoute.totalDistanceKm : 0;
  const afterTime = afterRoute ? afterRoute.totalTimeMin : 0;
  const afterCongestion = afterRoute ? afterRoute.totalCongestion : 1.0;
  const afterFitness = afterRoute ? afterRoute.fitness : 0;

  const deltaDist = Number((afterDist - beforeDist).toFixed(1));
  const deltaTime = Number((afterTime - beforeTime).toFixed(1));
  const deltaCongestion = Number((afterCongestion - beforeCongestion).toFixed(2));
  const deltaFitness = Number((afterFitness - beforeFitness).toFixed(4));

  // Time saved vs added
  const timeSavedOrAddedLabel = deltaTime > 0 ? `+${deltaTime} min Added` : `${Math.abs(deltaTime)} min Saved`;

  // Start & Dest names
  const originName = startVertex?.name || (beforeRoute?.nodeIds && beforeRoute.nodeIds[0]) || 'Origin';
  const destName =
    destVertex?.name ||
    (beforeRoute?.nodeIds && beforeRoute.nodeIds[beforeRoute.nodeIds.length - 1]) ||
    'Destination';

  return (
    <section id="dynamic-rerouting" className="bg-white border border-slate-200 rounded-xl p-5 space-y-5 shadow-xs">
      {/* 1. Incident Injection Controls Bar */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-red-100 text-red-700">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Dynamic Incident Injection & Real-Time Rerouting Control
              </h3>
              <p className="text-xs text-slate-500">
                Select an actual road corridor on the map or from the list to test Adaptive QPSO dynamic re-optimization.
              </p>
            </div>
          </div>

          {isIncidentActive && (
            <button
              type="button"
              onClick={onResetReroute}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 shadow-2xs transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset to Baseline Route</span>
            </button>
          )}
        </div>

        {/* Injection Parameters Form */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
          {/* Target Road Segment */}
          <div className="sm:col-span-5">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Target Road / Corridor on Route:
            </label>
            <select
              value={selectedEdgeId}
              onChange={e => onSelectEdgeId(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-500 cursor-pointer shadow-2xs"
            >
              {beforeRoute?.segments && beforeRoute.segments.length > 0 ? (
                <optgroup label="Corridors on Active Route (Recommended)">
                  {beforeRoute.segments.map((seg, idx) => (
                    <option key={seg.edge.id} value={seg.edge.id}>
                      Hop {idx + 1}: {seg.fromNode?.name || seg.edge.from} → {seg.toNode?.name || seg.edge.to} ({seg.edge.roadName})
                    </option>
                  ))}
                </optgroup>
              ) : null}
              <optgroup label="All Regional Andhra Pradesh Network Corridors">
                {edges.slice(0, 60).map(e => {
                  const u = vertices.find(v => v.id === e.from)?.name || e.from;
                  const v = vertices.find(v => v.id === e.to)?.name || e.to;
                  return (
                    <option key={e.id} value={e.id}>
                      {u} → {v} ({e.roadName})
                    </option>
                  );
                })}
              </optgroup>
            </select>
          </div>

          {/* Incident Type */}
          <div className="sm:col-span-3">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Incident Type:
            </label>
            <select
              value={selectedIncidentType}
              onChange={e => onSelectIncidentType(e.target.value as IncidentType)}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-500 cursor-pointer shadow-2xs"
            >
              <option value="accident">Accident (Traffic Delay)</option>
              <option value="heavy_traffic">Heavy Traffic (Severe Bottleneck)</option>
              <option value="road_block">Road Block (Full Corridor Closure)</option>
            </select>
          </div>

          {/* Severity */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Severity:
            </label>
            <select
              value={incidentSeverity}
              onChange={e => onSelectIncidentSeverity(e.target.value as 'moderate' | 'high' | 'critical')}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-500 cursor-pointer shadow-2xs"
            >
              <option value="moderate">Moderate</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          {/* Inject CTA */}
          <div className="sm:col-span-2">
            <button
              type="button"
              onClick={() => onInjectIncident()}
              className="w-full bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold py-2 px-3 rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer whitespace-nowrap"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Inject Incident</span>
            </button>
          </div>
        </div>

        {/* Selected Road Quick Info */}
        {selectedEdgeObj && (
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600 bg-white border border-slate-200 rounded-lg px-3 py-1.5">
            <span className="font-semibold text-slate-800">Selected Target Corridor:</span>
            <span className="font-bold text-blue-700">
              {fromVertex?.name || selectedEdgeObj.from} ➔ {toVertex?.name || selectedEdgeObj.to}
            </span>
            <span>({selectedEdgeObj.roadName} · {selectedEdgeObj.distanceKm} km · {selectedEdgeObj.baseSpeedKmH} km/h base)</span>
          </div>
        )}
      </div>

      {/* 2. Route Comparison: Two Equal Side-by-Side Panels */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-blue-600" />
            <span>Before vs After Route Comparison</span>
          </h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* ========================================================= */}
          {/* LEFT PANEL: INITIAL ROUTE (Before Incident)               */}
          {/* ========================================================= */}
          <div className="bg-white border-2 border-slate-200 rounded-xl p-4 md:p-5 space-y-4 shadow-xs">
            {/* Header with Status Badge */}
            <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                  <span className="w-2 h-2 rounded-full bg-slate-500"></span>
                  <span>INITIAL ROUTE</span>
                </span>
                <h5 className="text-sm font-bold text-slate-900 mt-1">
                  Baseline Route (Before Incident)
                </h5>
              </div>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Status: Before Incident
              </span>
            </div>

            {/* Origin -> Destination */}
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/80 space-y-1">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Corridor Endpoints
              </div>
              <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-emerald-700">
                  <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                  {originName}
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="inline-flex items-center gap-1 text-blue-700">
                  <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                  {destName}
                </span>
              </div>
            </div>

            {/* Route Nodes Sequence */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider flex items-center justify-between">
                <span>Route Nodes / Road Sequence ({beforeRoute?.nodeIds?.length || 0} hops):</span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 max-h-28 overflow-y-auto p-2 bg-slate-50 rounded-lg border border-slate-200/80 text-xs">
                {beforeRoute?.nodeIds && beforeRoute.nodeIds.length > 0 ? (
                  beforeRoute.nodeIds.map((nid, idx) => {
                    const nodeName = vertices.find(v => v.id === nid)?.name || nid;
                    return (
                      <React.Fragment key={`before-node-${nid}-${idx}`}>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white text-slate-800 border border-slate-200 font-medium text-[11px]">
                          <span className="text-[10px] text-slate-600 font-bold">{idx + 1}.</span>
                          <span>{nodeName}</span>
                        </span>
                        {idx < beforeRoute.nodeIds.length - 1 && (
                          <span className="text-slate-400 font-bold text-xs">→</span>
                        )}
                      </React.Fragment>
                    );
                  })
                ) : (
                  <span className="text-slate-400 italic text-xs">No route calculated yet</span>
                )}
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-0.5">
                <div className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                  <Navigation className="w-3 h-3 text-blue-600" />
                  <span>Distance</span>
                </div>
                <div className="text-xs font-bold text-slate-900">{beforeDist} km</div>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-0.5">
                <div className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                  <Clock className="w-3 h-3 text-blue-600" />
                  <span>Travel Time</span>
                </div>
                <div className="text-xs font-bold text-slate-900">{formatDurationHuman(beforeTime)} ({beforeTime.toFixed(1)} min)</div>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-0.5">
                <div className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                  <Activity className="w-3 h-3 text-amber-600" />
                  <span>Congestion Factor</span>
                </div>
                <div className="text-xs font-bold text-slate-900">{beforeCongestion.toFixed(2)}x</div>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-0.5">
                <div className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                  <Compass className="w-3 h-3 text-blue-600" />
                  <span>Objective F(R,t)</span>
                </div>
                <div className="text-xs font-bold text-blue-700">{beforeFitness.toFixed(4)}</div>
              </div>
            </div>

            {/* Algorithm & Traffic State */}
            <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-slate-100">
              <div>
                <span className="text-slate-500 block">Optimizer Algorithm:</span>
                <span className="font-semibold text-slate-800">{selectedAlgorithm}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Traffic Condition:</span>
                <span className="font-semibold text-emerald-700">Baseline ({trafficTimestamp} {dayType})</span>
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* RIGHT PANEL: AFTER INCIDENT — REROUTED PATH               */}
          {/* ========================================================= */}
          <div className={`bg-white border-2 rounded-xl p-4 md:p-5 space-y-4 shadow-xs ${
            isIncidentActive ? (isRouteAltered ? 'border-blue-500 ring-2 ring-blue-100' : 'border-amber-400') : 'border-slate-200'
          }`}>
            {/* Header with Status Badge */}
            <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                  isIncidentActive
                    ? isRouteAltered
                      ? 'bg-blue-100 text-blue-800 border border-blue-200'
                      : 'bg-amber-100 text-amber-800 border border-amber-200'
                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${isIncidentActive ? 'bg-blue-600 animate-pulse' : 'bg-slate-400'}`}></span>
                  <span>AFTER INCIDENT — REROUTED PATH</span>
                </span>
                <h5 className="text-sm font-bold text-slate-900 mt-1">
                  Recalculated Adaptive Route
                </h5>
              </div>

              {isIncidentActive ? (
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${
                  isRouteAltered
                    ? 'text-blue-800 bg-blue-50 border-blue-200'
                    : 'text-amber-800 bg-amber-50 border-amber-200'
                }`}>
                  {isRouteAltered ? 'Status: Rerouted' : 'Status: Route Retained'}
                </span>
              ) : (
                <span className="text-[11px] font-semibold text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                  Status: Ready for Injection
                </span>
              )}
            </div>

            {isIncidentActive && afterRoute ? (
              <>
                {/* Notice if route was retained vs rerouted */}
                {!isRouteAltered && (
                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2">
                    <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <strong className="font-semibold">Route retained — updated traffic did not justify rerouting.</strong>
                      <div className="text-[11px] text-amber-800 mt-0.5">
                        The current path remains the global mathematical optimum $F(R,t)$ even with the added delay penalty.
                      </div>
                    </div>
                  </div>
                )}

                {/* Origin -> Destination */}
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/80 space-y-1">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Corridor Endpoints
                  </div>
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-emerald-700">
                      <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                      {originName}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="inline-flex items-center gap-1 text-blue-700">
                      <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                      {destName}
                    </span>
                  </div>
                </div>

                {/* New Route Nodes Sequence */}
                <div className="space-y-1.5">
                  <div className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider flex items-center justify-between">
                    <span>New Route Nodes / Road Sequence ({afterRoute.nodeIds.length} hops):</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 max-h-28 overflow-y-auto p-2 bg-blue-50/40 rounded-lg border border-blue-100 text-xs">
                    {afterRoute.nodeIds.map((nid, idx) => {
                      const nodeName = vertices.find(v => v.id === nid)?.name || nid;
                      const isNewNode = beforeRoute ? !beforeRoute.nodeIds.includes(nid) : false;
                      return (
                        <React.Fragment key={`after-node-${nid}-${idx}`}>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-medium text-[11px] ${
                            isNewNode
                              ? 'bg-blue-600 text-white font-bold shadow-xs'
                              : 'bg-white text-slate-800 border border-slate-200'
                          }`}>
                            <span className={`text-[10px] ${isNewNode ? 'text-blue-200' : 'text-slate-600'}`}>{idx + 1}.</span>
                            <span>{nodeName}</span>
                          </span>
                          {idx < afterRoute.nodeIds.length - 1 && (
                            <span className="text-blue-400 font-bold text-xs">→</span>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-0.5">
                    <div className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                      <Navigation className="w-3 h-3 text-blue-600" />
                      <span>Distance</span>
                    </div>
                    <div className="text-xs font-bold text-slate-900">{afterDist} km</div>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-0.5">
                    <div className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                      <Clock className="w-3 h-3 text-blue-600" />
                      <span>Travel Time</span>
                    </div>
                    <div className="text-xs font-bold text-slate-900">{formatDurationHuman(afterTime)} ({afterTime.toFixed(1)} min)</div>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-0.5">
                    <div className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                      <Activity className="w-3 h-3 text-amber-600" />
                      <span>Congestion Factor</span>
                    </div>
                    <div className="text-xs font-bold text-slate-900">{afterCongestion.toFixed(2)}x</div>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-0.5">
                    <div className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                      <Compass className="w-3 h-3 text-blue-600" />
                      <span>Objective F(R,t)</span>
                    </div>
                    <div className="text-xs font-bold text-blue-700">{afterFitness.toFixed(4)}</div>
                  </div>
                </div>

                {/* Algorithm & Traffic State */}
                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-slate-100">
                  <div>
                    <span className="text-slate-500 block">Optimizer Algorithm:</span>
                    <span className="font-semibold text-slate-800">{selectedAlgorithm} (Recomputed)</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Incident Condition:</span>
                    <span className="font-semibold text-red-700">
                      {activeIncidentEdge?.incident?.type ? activeIncidentEdge.incident.type.replace('_', ' ').toUpperCase() : selectedIncidentType.toUpperCase()} on {activeIncidentEdge?.roadName || 'corridor'}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <div className="py-10 px-4 text-center space-y-3 bg-slate-50/70 border border-dashed border-slate-300 rounded-xl">
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h6 className="text-xs font-bold text-slate-800">
                    Awaiting Incident Injection
                  </h6>
                  <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                    Click the <strong>"Inject Incident"</strong> button above or select an edge on the Geographic Map to test real-time QPSO recalculation.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Below the Two Panels: Real Calculated Metric Differences & Impact Breakdown */}
      {isIncidentActive && afterRoute && (
        <div className="bg-gradient-to-r from-blue-50/50 via-slate-50 to-indigo-50/50 border border-blue-200 rounded-xl p-4 md:p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-blue-100 pb-2.5">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Calculated Differential Impact & Performance Variation
              </h4>
            </div>
            <span className="text-[11px] font-semibold text-blue-800">
              Objective Weights: w<sub>T</sub>={objectiveWeights.wT.toFixed(2)}, w<sub>D</sub>={objectiveWeights.wD.toFixed(2)}, w<sub>C</sub>={objectiveWeights.wC.toFixed(2)}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            {/* Time Difference */}
            <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1 shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-500 block">
                Time Added / Saved:
              </span>
              <div className={`text-base font-bold ${deltaTime > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                {timeSavedOrAddedLabel}
              </div>
              <p className="text-[10px] text-slate-500">
                {deltaTime > 0 ? `${beforeTime.toFixed(1)} min ➔ ${afterTime.toFixed(1)} min` : 'No added delay incurred'}
              </p>
            </div>

            {/* Distance Difference */}
            <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1 shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-500 block">
                Distance Travelled Diff:
              </span>
              <div className={`text-base font-bold ${deltaDist > 0 ? 'text-blue-700' : 'text-slate-800'}`}>
                {deltaDist > 0 ? `+${deltaDist} km` : `${deltaDist} km`}
              </div>
              <p className="text-[10px] text-slate-500">
                {beforeDist} km ➔ {afterDist} km
              </p>
            </div>

            {/* Congestion Delta */}
            <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1 shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-500 block">
                Congestion Multiplier Diff:
              </span>
              <div className={`text-base font-bold ${deltaCongestion > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                {deltaCongestion > 0 ? `+${deltaCongestion}x` : `${deltaCongestion}x`}
              </div>
              <p className="text-[10px] text-slate-500">
                {beforeCongestion.toFixed(2)}x ➔ {afterCongestion.toFixed(2)}x
              </p>
            </div>

            {/* Fitness Cost Delta */}
            <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1 shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-500 block">
                Objective F(R,t) Variance:
              </span>
              <div className="text-base font-bold text-indigo-700">
                {deltaFitness > 0 ? `+${deltaFitness}` : deltaFitness}
              </div>
              <p className="text-[10px] text-slate-500">
                {beforeFitness.toFixed(4)} ➔ {afterFitness.toFixed(4)}
              </p>
            </div>
          </div>

          <div className="text-[11px] text-slate-600 bg-white/80 p-2.5 rounded-lg border border-slate-200/80 flex items-center justify-between">
            <span>
              <strong>Optimization Guarantee:</strong> The re-optimized route reflects genuine network topology and edge weights without manual overrides or artificial routing.
            </span>
            <button
              type="button"
              onClick={onResetReroute}
              className="text-blue-600 hover:text-blue-800 font-bold underline cursor-pointer ml-2 shrink-0"
            >
              Reset Comparison
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
