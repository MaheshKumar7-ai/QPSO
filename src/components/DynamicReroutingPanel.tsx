import React from 'react';
import { DynamicRerouteState, GraphVertex } from '../types';
import { formatDurationHuman } from '../algorithms/evaluator';
import { AlertCircle, ArrowRight, RotateCcw, ShieldCheck } from 'lucide-react';

interface DynamicReroutingPanelProps {
  state: DynamicRerouteState;
  vertices: GraphVertex[];
  onResetReroute: () => void;
}

export const DynamicReroutingPanel: React.FC<DynamicReroutingPanelProps> = ({
  state,
  vertices,
  onResetReroute,
}) => {
  if (!state.isActive) return null;

  const currNode = vertices.find(v => v.id === state.currentLocationNodeId);
  const beforeDist = state.beforeRoute.totalDistanceKm;
  const beforeTime = state.beforeRoute.totalTimeMin;
  const beforeFit = state.beforeRoute.fitness;

  const afterDist = state.afterRoute.totalDistanceKm;
  const afterTime = state.afterRoute.totalTimeMin;
  const afterFit = state.afterRoute.fitness;

  const deltaDist = Number((afterDist - beforeDist).toFixed(1));
  const deltaTime = Number((afterTime - beforeTime).toFixed(1));

  const incidentLabel = state.incidentType.replace('_', ' ').toUpperCase();

  return (
    <div className="w-full bg-white border-2 border-red-500 rounded-lg p-5 shadow-sm space-y-4">
      {/* Alert Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-red-100 gap-2">
        <div className="flex items-center gap-2">
          <span className="p-1.5 bg-red-100 rounded text-red-700">
            <AlertCircle className="w-5 h-5" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-red-600 text-white">
                DYNAMIC REROUTE ACTIVE
              </span>
              <span className="text-xs font-semibold text-slate-700">
                Incident: 🚧 {incidentLabel}
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900 mt-0.5">
              Live In-Transit Rerouting from Current Position
            </h3>
          </div>
        </div>

        <button
          onClick={onResetReroute}
          className="flex items-center gap-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded border border-slate-300 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset to Baseline
        </button>
      </div>

      {/* Transit State Narrative */}
      <div className="bg-slate-50 border border-slate-200 rounded p-3 text-xs font-mono text-slate-800 space-y-1">
        <div className="flex items-center gap-1.5 text-slate-900 font-sans font-bold">
          <ShieldCheck className="w-4 h-4 text-blue-600" />
          <span>IN-FLIGHT POSITION PRESERVATION:</span>
        </div>
        <div>
          Current Location Junction: <span className="font-bold text-blue-700">{currNode?.name || state.currentLocationNodeId}</span>
        </div>
        <div className="text-slate-600">
          Already Travelled Path: [ {state.alreadyTraveledRoute.nodeIds.join(' → ')} ] (Preserved & Fixed)
        </div>
        <div className="text-slate-900 font-semibold">
          Re-Optimized Leg from Current Location: [ {state.afterRoute.nodeIds.slice(state.alreadyTraveledRoute.nodeIds.length - 1).join(' → ')} ]
        </div>
      </div>

      {/* Before vs After Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        {/* Before */}
        <div className="bg-slate-50 border border-slate-200 rounded p-3.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
            BEFORE INCIDENT
          </span>
          <div className="space-y-1 font-mono text-slate-800">
            <div>Distance = <span className="font-bold">{beforeDist} km</span></div>
            <div>Travel Time = <span className="font-bold">{formatDurationHuman(beforeTime)}</span></div>
            <div>Fitness Cost = <span className="font-bold">{beforeFit}</span></div>
            <div className="text-[11px] text-emerald-700 pt-1 font-sans">Status: Unobstructed</div>
          </div>
        </div>

        {/* After */}
        <div className="bg-blue-50/60 border border-blue-200 rounded p-3.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-blue-800 block mb-1">
            AFTER REROUTING (QPSO)
          </span>
          <div className="space-y-1 font-mono text-slate-800">
            <div>Distance = <span className="font-bold text-slate-900">{afterDist} km</span></div>
            <div>Travel Time = <span className="font-bold text-blue-800">{formatDurationHuman(afterTime)}</span></div>
            <div>Fitness Cost = <span className="font-bold text-slate-900">{afterFit}</span></div>
            <div className="text-[11px] text-blue-700 pt-1 font-sans">Status: Feasible Detour Computed</div>
          </div>
        </div>

        {/* Impact Delta */}
        <div className="bg-amber-50/60 border border-amber-200 rounded p-3.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900 block mb-1">
            MEASURED IMPACT DELTA
          </span>
          <div className="space-y-1 font-mono text-slate-800">
            <div>
              Additional Distance = <span className={`font-bold ${deltaDist > 0 ? 'text-amber-700' : 'text-slate-900'}`}>
                {deltaDist > 0 ? `+${deltaDist}` : deltaDist} km
              </span>
            </div>
            <div>
              Additional Travel Time = <span className={`font-bold ${deltaTime > 0 ? 'text-amber-700' : 'text-slate-900'}`}>
                {deltaTime > 0 ? `+${deltaTime} min` : `${deltaTime} min`}
              </span>
            </div>
            <div>
              Fitness Variation = <span className="font-bold">
                {Number((afterFit - beforeFit).toFixed(2))}
              </span>
            </div>
            <div className="text-[10px] text-slate-500 pt-1 font-sans">
              Computed strictly from network edge differential.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
