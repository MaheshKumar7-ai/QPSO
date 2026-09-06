import React from 'react';
import { OptimizationMode, VehicleType, EvaluatedRoute } from '../types';
import { formatDurationHuman, MODE_WEIGHTS } from '../algorithms/evaluator';
import { Zap, Scale, ShieldAlert, Route as RouteIcon, Info, TrendingDown, ArrowRight } from 'lucide-react';

interface ResultsPanelProps {
  activeRoute: EvaluatedRoute | null;
  shortestRoute: EvaluatedRoute | null;
  optimizationMode: OptimizationMode;
  vehicleType: VehicleType;
  onSelectMode: (mode: OptimizationMode) => void;
  onViewDetails?: () => void;
}

export const ResultsPanel: React.FC<ResultsPanelProps> = ({
  activeRoute,
  shortestRoute,
  optimizationMode,
  vehicleType,
  onSelectMode,
  onViewDetails,
}) => {
  const modes: {
    id: OptimizationMode;
    title: string;
    description: string;
    badge: string;
    icon: React.ReactNode;
    activeBorder: string;
    activeBg: string;
    textColor: string;
    weightsSummary: string;
  }[] = [
    {
      id: 'fastest',
      title: 'Fastest',
      description: 'Route selected by minimum time objective',
      badge: 'Time Optimized',
      icon: <Zap className="w-4 h-4 text-indigo-600" />,
      activeBorder: 'border-indigo-500 ring-2 ring-indigo-500/20',
      activeBg: 'bg-indigo-50/70',
      textColor: 'text-indigo-700',
      weightsSummary: 'Time: 60% • Congestion: 20% • Dist: 15% • Risk: 5%',
    },
    {
      id: 'balanced',
      title: 'Balanced',
      description: 'Route selected by combined objective',
      badge: 'Multi-Factor',
      icon: <Scale className="w-4 h-4 text-blue-600" />,
      activeBorder: 'border-blue-500 ring-2 ring-blue-500/20',
      activeBg: 'bg-blue-50/70',
      textColor: 'text-blue-700',
      weightsSummary: 'Time: 30% • Congestion: 30% • Risk: 25% • Dist: 15%',
    },
    {
      id: 'safer',
      title: 'Safer',
      description: 'Route selected by high risk-avoidance objective',
      badge: 'Safety Priority',
      icon: <ShieldAlert className="w-4 h-4 text-emerald-600" />,
      activeBorder: 'border-emerald-500 ring-2 ring-emerald-500/20',
      activeBg: 'bg-emerald-50/70',
      textColor: 'text-emerald-700',
      weightsSummary: 'Risk: 55% • Congestion: 25% • Time: 10% • Dist: 10%',
    },
  ];

  return (
    <div id="results-recommendation-panel" className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 md:p-5 flex flex-col h-full space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-black tracking-wider text-slate-800 uppercase flex items-center gap-1.5">
              <RouteIcon className="w-4 h-4 text-slate-700" />
              Route Recommendation
            </h2>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 uppercase">
              {vehicleType}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Dynamic multi-objective evaluation based on QPSO optimization
          </p>
        </div>
        {optimizationMode === 'safer' ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            Safer Path Active
          </span>
        ) : optimizationMode === 'fastest' ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-300">
            <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
            Fastest Path Active
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            Balanced Path Active
          </span>
        )}
      </div>

      {/* Mode Selection Cards */}
      <div className="space-y-2.5">
        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
          Optimization Objective
        </label>
        <div className="grid grid-cols-1 gap-2">
          {modes.map((m) => {
            const isSelected = optimizationMode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => onSelectMode(m.id)}
                className={`w-full text-left p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? `${m.activeBorder} ${m.activeBg}`
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/60 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {m.icon}
                    <span className={`text-xs font-black uppercase tracking-wide ${isSelected ? m.textColor : 'text-slate-700'}`}>
                      {m.title}
                    </span>
                  </div>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-md ${
                    isSelected ? 'bg-white/80 font-bold ' + m.textColor : 'bg-slate-100 text-slate-600'
                  }`}>
                    {m.badge}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 mt-1">
                  {m.description}
                </p>
                <div className="text-[10px] text-slate-500 mt-1 font-mono">
                  {m.weightsSummary}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Route Core Metrics */}
      {activeRoute && (
        <div className="space-y-2.5 pt-1">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Selected Route Metrics
            </label>
            <span className="text-[10px] text-slate-400 font-mono">
              Fitness: Σ W(e)
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {/* Distance */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5">
              <span className="text-[10px] font-semibold text-slate-500 uppercase block">Distance</span>
              <div className="text-base font-black text-slate-800 mt-0.5">
                {activeRoute.totalDistanceKm} <span className="text-xs font-normal text-slate-500">km</span>
              </div>
              {shortestRoute && (
                <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
                  Shortest: {shortestRoute.totalDistanceKm} km
                  {activeRoute.totalDistanceKm > shortestRoute.totalDistanceKm && (
                    <span className="text-amber-600 font-semibold">
                      (+{(activeRoute.totalDistanceKm - shortestRoute.totalDistanceKm).toFixed(1)} km)
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Estimated Time */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5">
              <span className="text-[10px] font-semibold text-slate-500 uppercase block">Estimated Time</span>
              <div className="text-base font-black text-slate-800 mt-0.5">
                {formatDurationHuman(activeRoute.totalTimeMin)}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                Avg Flow: {activeRoute.averageTrafficFactor.toFixed(2)}x
              </div>
            </div>

            {/* Congestion Cost */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5">
              <span className="text-[10px] font-semibold text-slate-500 uppercase block">Congestion Cost</span>
              <div className="text-base font-black text-amber-600 mt-0.5">
                {activeRoute.congestionCost} <span className="text-xs font-normal text-slate-500">pts</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                Normalized index
              </div>
            </div>

            {/* Risk Cost */}
            <div className={`border rounded-xl p-2.5 ${
              optimizationMode === 'safer'
                ? 'bg-emerald-50/60 border-emerald-200'
                : 'bg-slate-50 border-slate-200/80'
            }`}>
              <span className="text-[10px] font-semibold text-slate-500 uppercase block">Risk Cost</span>
              <div className={`text-base font-black mt-0.5 ${
                optimizationMode === 'safer' ? 'text-emerald-700' : 'text-slate-800'
              }`}>
                {activeRoute.riskCost} <span className="text-xs font-normal text-slate-500">pts</span>
              </div>
              {shortestRoute && shortestRoute.riskCost > activeRoute.riskCost && (
                <div className="text-[10px] text-emerald-600 font-semibold mt-0.5 flex items-center gap-0.5">
                  <TrendingDown className="w-3 h-3" />
                  -{(shortestRoute.riskCost - activeRoute.riskCost).toFixed(1)} vs Shortest
                </div>
              )}
            </div>

            {/* Total Fitness */}
            <div className="bg-slate-900 text-white rounded-xl p-2.5 col-span-2 sm:col-span-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-slate-300 uppercase block">Total Fitness</span>
                <span className="text-[9px] font-mono text-emerald-400 bg-slate-800 px-1.5 py-0.5 rounded">
                  QPSO Objective: Min
                </span>
              </div>
              <div className="text-lg font-black text-white mt-0.5">
                {activeRoute.fitness}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                W(e) = α D(e) + β T(e) + γ C(e) + δ R(e)
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Comparison with Conventional Shortest Path */}
      {shortestRoute && activeRoute && (
        <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs space-y-1.5">
          <div className="font-bold text-slate-700 flex items-center justify-between">
            <span>Trade-Off vs Conventional Shortest Path</span>
            <span className="font-mono text-[10px] text-slate-500">
              Shortest: {shortestRoute.totalDistanceKm} km
            </span>
          </div>

          <p className="text-[11px] text-slate-600 leading-relaxed">
            {optimizationMode === 'safer' ? (
              <>
                The <strong className="text-emerald-700">Safer route</strong> avoids high-risk accident blackspots (e.g. NH16 coastal stretch) and congested bottlenecks, trading a small distance addition (+{(activeRoute.totalDistanceKm - shortestRoute.totalDistanceKm).toFixed(1)} km) for a{' '}
                <strong className="text-emerald-700">
                  {((1 - activeRoute.riskCost / Math.max(1, shortestRoute.riskCost)) * 100).toFixed(0)}% reduction in accident risk
                </strong>.
              </>
            ) : optimizationMode === 'fastest' ? (
              <>
                The <strong className="text-indigo-700">Fastest route</strong> prioritizes high-speed expressways and low-delay corridors, minimizing estimated travel time to {formatDurationHuman(activeRoute.totalTimeMin)}.
              </>
            ) : (
              <>
                The <strong className="text-blue-700">Balanced route</strong> strikes an equilibrium between travel time, distance, congestion, and safety risks.
              </>
            )}
          </p>
        </div>
      )}

      {/* View Turn-by-Turn Route Breakdown Modal Trigger */}
      {activeRoute && onViewDetails && (
        <button
          type="button"
          onClick={onViewDetails}
          id="btn-view-route-details-top"
          className="w-full py-2.5 px-3 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-xs"
        >
          <span>View Turn-by-Turn Route Breakdown</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Prototype / Simulated Label as strictly requested */}
      <div className="mt-auto pt-2 border-t border-slate-100 flex items-start gap-1.5 text-[10px] text-slate-500 leading-tight">
        <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
        <span>
          <strong>Note:</strong> Prototype / simulated values computed via QPSO multi-objective fitness formulation: W(e) = α D(e) + β T(e) + γ C(e) + δ R(e). Mode-specific weights adapt to vehicle constraints.
        </span>
      </div>
    </div>
  );
};
