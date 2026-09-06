import React from 'react';
import {
  Zap,
  ShieldCheck,
  Gauge,
  Ruler,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Info,
  Layers,
  Sparkles,
} from 'lucide-react';
import { EvaluatedRoute, OptimizationMode, VehicleType, GraphVertex } from '../types';

export interface MultiModeRoutes {
  fastest: EvaluatedRoute | null;
  balanced: EvaluatedRoute | null;
  safer: EvaluatedRoute | null;
  shortest: EvaluatedRoute | null;
}

interface OptimizationDebugPanelProps {
  modeRoutes: MultiModeRoutes;
  currentMode: OptimizationMode;
  vehicle: VehicleType;
  vertices: GraphVertex[];
  onSelectMode: (mode: OptimizationMode) => void;
}

export const OptimizationDebugPanel: React.FC<OptimizationDebugPanelProps> = ({
  modeRoutes,
  currentMode,
  vehicle,
  vertices,
  onSelectMode,
}) => {
  const vertexMap = React.useMemo(() => {
    const map = new Map<string, string>();
    vertices.forEach(v => map.set(v.id, v.name));
    return map;
  }, [vertices]);

  const getNodePathString = (route: EvaluatedRoute | null) => {
    if (!route || !route.nodeIds || route.nodeIds.length === 0) return 'No feasible path';
    return route.nodeIds.map(id => vertexMap.get(id) || id).join(' → ');
  };

  const fastestPath = modeRoutes.fastest?.nodeIds?.join('-') || '';
  const balancedPath = modeRoutes.balanced?.nodeIds?.join('-') || '';
  const saferPath = modeRoutes.safer?.nodeIds?.join('-') || '';
  const shortestPath = modeRoutes.shortest?.nodeIds?.join('-') || '';

  const uniquePathsCount = new Set([fastestPath, balancedPath, saferPath, shortestPath].filter(Boolean)).size;
  const hasDistinctRoutes = uniquePathsCount > 1;

  const modeConfigs: {
    mode: OptimizationMode;
    label: string;
    icon: typeof Zap;
    color: string;
    bgBadge: string;
    borderActive: string;
    weights: { time: number; congestion: number; risk: number; distance: number };
    objectiveDesc: string;
  }[] = [
    {
      mode: 'fastest',
      label: 'Fastest Route',
      icon: Zap,
      color: 'text-amber-700 bg-amber-50 border-amber-300',
      bgBadge: 'bg-amber-100 text-amber-900 border-amber-200',
      borderActive: 'ring-2 ring-amber-500 border-amber-500 bg-amber-50/30',
      weights: { time: 0.6, congestion: 0.2, risk: 0.05, distance: 0.15 },
      objectiveDesc: 'Minimizes travel time and congestion delays',
    },
    {
      mode: 'balanced',
      label: 'Balanced Route',
      icon: Gauge,
      color: 'text-blue-700 bg-blue-50 border-blue-300',
      bgBadge: 'bg-blue-100 text-blue-900 border-blue-200',
      borderActive: 'ring-2 ring-blue-500 border-blue-500 bg-blue-50/30',
      weights: { time: 0.3, congestion: 0.3, risk: 0.25, distance: 0.15 },
      objectiveDesc: 'Compromise between time, congestion, and safety',
    },
    {
      mode: 'safer',
      label: 'Safer Route',
      icon: ShieldCheck,
      color: 'text-emerald-700 bg-emerald-50 border-emerald-300',
      bgBadge: 'bg-emerald-100 text-emerald-900 border-emerald-200',
      borderActive: 'ring-2 ring-emerald-500 border-emerald-500 bg-emerald-50/30',
      weights: { time: 0.1, congestion: 0.25, risk: 0.55, distance: 0.1 },
      objectiveDesc: 'Strictly avoids accident blackspots and hazardous roads',
    },
  ];

  return (
    <section
      id="optimization-debug-panel"
      className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4"
    >
      {/* Header & Verification Badge */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-200 pb-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-600" />
              QPSO Multi-Objective Route Verification Panel
            </h3>
            <span className="text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-1 rounded-md bg-amber-100 text-amber-900 border border-amber-300">
              SIMULATED HISTORICAL DATA FOR DEMONSTRATION
            </span>
          </div>
          <p className="text-xs text-slate-600 mt-1">
            Independent QPSO optimizations per mode using edge-level historical congestion, risk, and vehicle suitability.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {hasDistinctRoutes ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-black">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Distinct Routes Verified ({uniquePathsCount} unique paths)</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold">
              <Info className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Corridor Topology Optimal for all modes</span>
            </div>
          )}
        </div>
      </div>

      {/* Grid of 3 Independent Modes + 1 Shortest Baseline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
        {modeConfigs.map(cfg => {
          const route = modeRoutes[cfg.mode];
          const isSelected = currentMode === cfg.mode;
          const Icon = cfg.icon;

          return (
            <div
              key={cfg.mode}
              className={`border rounded-xl p-4 transition-all flex flex-col justify-between ${
                isSelected
                  ? cfg.borderActive
                  : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/60'
              }`}
            >
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg ${cfg.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-black text-slate-900">{cfg.label}</span>
                  </div>
                  {isSelected && (
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-600 text-white">
                      ACTIVE ON MAP
                    </span>
                  )}
                </div>

                {/* Weights formula */}
                <div className="text-[11px] bg-white border border-slate-200 rounded-lg p-2 font-mono space-y-1">
                  <div className="text-slate-500 font-bold uppercase text-[9px]">Mode Objective Weights:</div>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-slate-700">
                    <span>Time (α): <b>{cfg.weights.time}</b></span>
                    <span>Congestion (β): <b>{cfg.weights.congestion}</b></span>
                    <span>Risk (γ): <b>{cfg.weights.risk}</b></span>
                    <span>Distance (δ): <b>{cfg.weights.distance}</b></span>
                  </div>
                </div>

                {/* Metrics Table */}
                {route && route.isFeasible ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-white p-2 rounded-lg border border-slate-200">
                        <div className="text-[10px] text-slate-500 uppercase font-semibold">Distance</div>
                        <div className="text-sm font-black text-slate-900">{route.totalDistanceKm} km</div>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-slate-200">
                        <div className="text-[10px] text-slate-500 uppercase font-semibold">Travel Time</div>
                        <div className="text-sm font-black text-slate-900">{Math.round(route.totalTimeMin)} min</div>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-slate-200">
                        <div className="text-[10px] text-slate-500 uppercase font-semibold">Avg Congestion</div>
                        <div className="text-sm font-black text-amber-700">
                          {route.averageTrafficFactor.toFixed(2)}x
                        </div>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-slate-200">
                        <div className="text-[10px] text-slate-500 uppercase font-semibold">Avg Risk Score</div>
                        <div className="text-sm font-black text-rose-700">
                          {route.averageRisk.toFixed(2)} / 10
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-900 text-white p-2.5 rounded-lg flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-300">Objective Fitness F(P):</span>
                      <span className="font-mono font-black text-emerald-400 text-sm">
                        {route.fitness.toFixed(3)}
                      </span>
                    </div>

                    {/* Route Nodes */}
                    <div className="text-[11px] text-slate-700 bg-white border border-slate-200 rounded-lg p-2 leading-relaxed">
                      <span className="font-bold text-slate-900 block text-[10px] uppercase mb-0.5">
                        Selected Route Path:
                      </span>
                      <span className="font-medium text-slate-800">{getNodePathString(route)}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-rose-600 bg-rose-50 border border-rose-200 p-2.5 rounded-lg">
                    No feasible route found for vehicle {vehicle.toUpperCase()}.
                  </div>
                )}
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={() => onSelectMode(cfg.mode)}
                className={`mt-3 w-full py-2 px-3 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  isSelected
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                <span>{isSelected ? 'Currently Displayed' : `Select ${cfg.label}`}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Shortest Distance Baseline Row */}
      {modeRoutes.shortest && (
        <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-blue-600 text-white font-black text-[10px] uppercase tracking-wider">
                Blue Baseline
              </span>
              <span className="font-black text-slate-900">Conventional Shortest Distance Path (Dijkstra)</span>
            </div>
            <div className="text-slate-600 font-medium">
              Path: <span className="font-semibold text-slate-800">{getNodePathString(modeRoutes.shortest)}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4 flex-wrap font-mono text-slate-800">
            <div>
              <span className="text-slate-500 block text-[10px] font-sans uppercase">Distance</span>
              <b>{modeRoutes.shortest.totalDistanceKm} km</b>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] font-sans uppercase">Time</span>
              <b>{Math.round(modeRoutes.shortest.totalTimeMin)} min</b>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] font-sans uppercase">Congestion</span>
              <b className="text-amber-700">{modeRoutes.shortest.averageTrafficFactor.toFixed(2)}x</b>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] font-sans uppercase">Risk</span>
              <b className="text-rose-700">{modeRoutes.shortest.averageRisk.toFixed(2)}/10</b>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
