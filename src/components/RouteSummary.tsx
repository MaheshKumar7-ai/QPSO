import React from 'react';
import { EvaluatedRoute, VehicleType, OptimizationMode, TrafficState, ObjectiveWeights } from '../types';
import { formatDurationHuman, getTrafficCategory } from '../algorithms/evaluator';
import { ArrowRight, Clock, Gauge, Route, Activity } from 'lucide-react';

interface RouteSummaryProps {
  route: EvaluatedRoute | null;
  vehicle?: VehicleType;
  mode?: OptimizationMode;
  executionTimeMs?: number;
  trafficState?: TrafficState;
  objectiveWeights?: ObjectiveWeights;
}

export const RouteSummary: React.FC<RouteSummaryProps> = ({
  route,
  executionTimeMs,
  trafficState,
  objectiveWeights,
}) => {
  if (!route || !route.isFeasible) {
    return (
      <div className="p-5 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm">
        <p className="font-semibold">No Feasible Path Found</p>
        {route?.infeasibilityReason && (
          <p className="text-xs text-red-600 mt-1">{route.infeasibilityReason}</p>
        )}
      </div>
    );
  }

  const startNode = route.segments[0]?.fromNode;
  const endNode = route.segments[route.segments.length - 1]?.toNode;
  const trafficStatus = getTrafficCategory(route.averageTrafficFactor);
  const weights = objectiveWeights ?? route.objectiveWeights ?? { wT: 0.4, wD: 0.3, wC: 0.3 };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-5">
      {/* Route Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5 text-slate-900 font-semibold text-base">
          <span>{startNode?.name}</span>
          <ArrowRight className="w-4 h-4 text-blue-600 shrink-0" />
          <span>{endNode?.name}</span>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 tabular-nums">
          <span>Departure {trafficState?.timestamp ?? route.trafficTimestamp ?? '08:30'}</span>
          <span aria-hidden="true">·</span>
          <span className="capitalize">{trafficState?.dayType ?? 'weekday'}</span>
          {executionTimeMs !== undefined && (
            <>
              <span aria-hidden="true">·</span>
              <span>Solved in {executionTimeMs.toFixed(1)} ms</span>
            </>
          )}
        </div>
      </div>

      {/* Primary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200/80">
          <div className="flex items-center gap-1.5 text-slate-500 text-xs font-medium mb-1">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            <span>Travel Time</span>
          </div>
          <div className="text-lg font-semibold text-slate-900 tabular-nums">
            {formatDurationHuman(route.totalTimeMin)}
          </div>
          <div className="text-xs text-slate-500 mt-0.5 tabular-nums">
            {route.totalTimeMin.toFixed(1)} min
          </div>
        </div>

        <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200/80">
          <div className="flex items-center gap-1.5 text-slate-500 text-xs font-medium mb-1">
            <Route className="w-3.5 h-3.5 text-emerald-600" />
            <span>Total Distance</span>
          </div>
          <div className="text-lg font-semibold text-slate-900 tabular-nums">
            {route.totalDistanceKm.toFixed(1)} km
          </div>
          <div className="text-xs text-slate-500 mt-0.5 tabular-nums">
            {route.segments.length} road segments
          </div>
        </div>

        <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200/80">
          <div className="flex items-center gap-1.5 text-slate-500 text-xs font-medium mb-1">
            <Gauge className="w-3.5 h-3.5 text-amber-600" />
            <span>Congestion Cost</span>
          </div>
          <div className="text-lg font-semibold text-slate-900 tabular-nums">
            {route.totalCongestion.toFixed(2)}
          </div>
          <div className="text-xs text-slate-500 mt-0.5 tabular-nums">
            Avg {route.averageTrafficFactor.toFixed(2)}× ({trafficStatus})
          </div>
        </div>

        <div className="p-3.5 bg-blue-50/60 rounded-lg border border-blue-200">
          <div className="flex items-center gap-1.5 text-blue-700 text-xs font-medium mb-1">
            <Activity className="w-3.5 h-3.5 text-blue-600" />
            <span>Objective Cost</span>
          </div>
          <div className="text-lg font-semibold text-blue-900 tabular-nums">
            {route.fitness.toFixed(4)}
          </div>
          <div className="text-xs text-blue-700 mt-0.5 tabular-nums">
            Weights {(weights.wT * 100).toFixed(0)}% / {(weights.wC * 100).toFixed(0)}% / {(weights.wD * 100).toFixed(0)}%
          </div>
        </div>
      </div>

      {/* Connected Node Path */}
      <div className="pt-1">
        <div className="text-xs font-medium text-slate-500 mb-2">
          Connected Corridor ({route.nodeIds.length} cities)
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-800">
          {route.segments.map((seg, i) => (
            <React.Fragment key={seg.edge.id + i}>
              <span className="font-medium text-slate-900">{seg.fromNode.name}</span>
              <span className="text-slate-400">→</span>
              {i === route.segments.length - 1 && (
                <span className="font-semibold text-blue-700">{seg.toNode.name}</span>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};
