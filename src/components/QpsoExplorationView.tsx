import React, { useState } from 'react';
import {
  OptimizationMode,
  EvaluatedRoute,
  QpsoResult,
  GraphVertex,
  GraphEdge,
  ObjectiveWeights,
  TrafficState,
} from '../types';

interface QpsoExplorationViewProps {
  mode: OptimizationMode;
  optimalRoute: EvaluatedRoute | null;
  qpsoResult: QpsoResult | null;
  vertices: GraphVertex[];
  edges: GraphEdge[];
  objectiveWeights?: ObjectiveWeights;
  trafficState?: TrafficState;
}

export const QpsoExplorationView: React.FC<QpsoExplorationViewProps> = ({
  optimalRoute,
  qpsoResult,
  objectiveWeights,
  trafficState,
}) => {
  const [activeTab, setActiveTab] = useState<'objective' | 'quantum'>('objective');

  const weights =
    objectiveWeights ??
    optimalRoute?.objectiveWeights ??
    qpsoResult?.objectiveWeights ?? {
      wT: 0.4,
      wD: 0.3,
      wC: 0.3,
    };

  const wT = weights.wT;
  const wD = weights.wD;
  const wC = weights.wC;

  const totalDist = optimalRoute?.totalDistanceKm ?? 0;
  const totalTime = optimalRoute?.totalTimeMin ?? 0;
  const totalCong = optimalRoute?.totalCongestion ?? 0;

  const normT = optimalRoute?.normalizedTime ?? 0;
  const normD = optimalRoute?.normalizedDistance ?? 0;
  const normC = optimalRoute?.normalizedCongestion ?? 0;

  const termT = Number((wT * normT).toFixed(4));
  const termD = Number((wD * normD).toFixed(4));
  const termC = Number((wC * normC).toFixed(4));
  const totalFitness = optimalRoute?.fitness ?? Number((termT + termD + termC).toFixed(4));

  const calc = qpsoResult?.sampleCalculation ?? {
    particleIndex: 1,
    iteration: 15,
    dimension: 3,
    dimensionName: 'RAJAHMUNDRY',
    x_current: 0.4215,
    pbest_val: 0.784,
    gbest_val: 0.912,
    mbest_val: 0.653,
    phi: 0.625,
    p_attractor: 0.832,
    beta: 0.75,
    u: 0.3679,
    delta: 0.1736,
    sign: 1,
    x_next: 1.0,
  };

  const activeTimeLabel = trafficState?.timestamp ?? optimalRoute?.trafficTimestamp ?? '08:30';
  const activeDayLabel = trafficState?.dayType ?? 'weekday';

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      {/* Header & Clean Segmented Switch */}
      <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-white">
        <div className="flex items-center gap-3">
          <h3 className="text-base font-semibold text-slate-900">
            Mathematical Formulation & Step-by-Step Calculation
          </h3>
          <span className="text-xs text-slate-500 tabular-nums">
            {activeTimeLabel} · <span className="capitalize">{activeDayLabel}</span>
          </span>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab('objective')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'objective'
                ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            1. Multi-Objective Cost
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('quantum')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'quantum'
                ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            2. Quantum Position Update
          </button>
        </div>
      </div>

      <div className="p-5">
        {activeTab === 'objective' && (
          <div className="space-y-5">
            {/* Formula Summary Box (Light Surface, Standard Math Notation) */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                <span className="font-semibold text-slate-800">Multi-Objective Route Cost Formula</span>
                <span className="tabular-nums">
                  Weight Constraint: {wT.toFixed(2)} + {wD.toFixed(2)} + {wC.toFixed(2)} = {(wT + wD + wC).toFixed(2)}
                </span>
              </div>

              <div className="p-3.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 font-medium">
                F(R, t) = w<sub>T</sub> × T<sub>norm</sub>(R, t) + w<sub>D</sub> × D<sub>norm</sub>(R) + w<sub>C</sub> × C<sub>norm</sub>(R, t)
              </div>

              {/* Three Metric Calculation Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs tabular-nums">
                <div className="p-3.5 bg-white border border-slate-200 rounded-lg space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800">Travel Time Term</span>
                    <span className="text-blue-700 font-semibold">w<sub>T</sub> = {wT.toFixed(2)}</span>
                  </div>
                  <div className="text-slate-600">
                    Total Time T(R, t) = <span className="font-semibold text-slate-900">{totalTime.toFixed(2)} min</span>
                  </div>
                  <div className="text-slate-600">
                    Normalized Time T<sub>norm</sub> = <span className="font-semibold text-slate-900">{normT.toFixed(4)}</span>
                  </div>
                  <div className="pt-1.5 border-t border-slate-100 font-semibold text-blue-700">
                    {wT.toFixed(2)} × {normT.toFixed(4)} = {termT.toFixed(4)}
                  </div>
                </div>

                <div className="p-3.5 bg-white border border-slate-200 rounded-lg space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800">Distance Term</span>
                    <span className="text-emerald-700 font-semibold">w<sub>D</sub> = {wD.toFixed(2)}</span>
                  </div>
                  <div className="text-slate-600">
                    Total Distance D(R) = <span className="font-semibold text-slate-900">{totalDist.toFixed(2)} km</span>
                  </div>
                  <div className="text-slate-600">
                    Normalized Distance D<sub>norm</sub> = <span className="font-semibold text-slate-900">{normD.toFixed(4)}</span>
                  </div>
                  <div className="pt-1.5 border-t border-slate-100 font-semibold text-emerald-700">
                    {wD.toFixed(2)} × {normD.toFixed(4)} = {termD.toFixed(4)}
                  </div>
                </div>

                <div className="p-3.5 bg-white border border-slate-200 rounded-lg space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800">Congestion Term</span>
                    <span className="text-amber-700 font-semibold">w<sub>C</sub> = {wC.toFixed(2)}</span>
                  </div>
                  <div className="text-slate-600">
                    Total Congestion C(R, t) = <span className="font-semibold text-slate-900">{totalCong.toFixed(3)}</span>
                  </div>
                  <div className="text-slate-600">
                    Normalized Congestion C<sub>norm</sub> = <span className="font-semibold text-slate-900">{normC.toFixed(4)}</span>
                  </div>
                  <div className="pt-1.5 border-t border-slate-100 font-semibold text-amber-700">
                    {wC.toFixed(2)} × {normC.toFixed(4)} = {termC.toFixed(4)}
                  </div>
                </div>
              </div>

              {/* Final Substitution Bar (Clean Light Blue Surface) */}
              <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-lg flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm tabular-nums">
                <div className="text-slate-800">
                  <span className="font-semibold">F(R, t)</span> = ({wT.toFixed(2)} × {normT.toFixed(4)}) + ({wD.toFixed(2)} × {normD.toFixed(4)}) + ({wC.toFixed(2)} × {normC.toFixed(4)}) = {termT.toFixed(4)} + {termD.toFixed(4)} + {termC.toFixed(4)}
                </div>
                <div className="text-base font-semibold text-blue-800">
                  F(R, t) = {totalFitness.toFixed(4)}
                </div>
              </div>
            </div>

            {/* Segment-by-Segment Calculation Table */}
            {optimalRoute && optimalRoute.segments.length > 0 && (
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800">
                    Segment-by-Segment Mathematical Breakdown ({optimalRoute.segments.length} edges)
                  </span>
                  <span className="text-slate-500 tabular-nums">
                    Time State: {activeTimeLabel}
                  </span>
                </div>
                <div className="overflow-x-auto max-h-72 overflow-y-auto">
                  <table className="w-full text-left border-collapse text-xs tabular-nums">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold">
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">Directed Segment</th>
                        <th className="py-2.5 px-3 text-right">Distance (km)</th>
                        <th className="py-2.5 px-3 text-right">Speed (km/h)</th>
                        <th className="py-2.5 px-3 text-right">Time (min)</th>
                        <th className="py-2.5 px-3 text-right">Congestion</th>
                        <th className="py-2.5 px-3 text-right">T<sub>norm</sub></th>
                        <th className="py-2.5 px-3 text-right">D<sub>norm</sub></th>
                        <th className="py-2.5 px-3 text-right">C<sub>norm</sub></th>
                        <th className="py-2.5 px-3 text-right text-blue-700">Segment Cost</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {optimalRoute.segments.map((seg, idx) => (
                        <tr key={seg.edge.id + idx} className="hover:bg-slate-50/80">
                          <td className="py-2 px-3 text-slate-400">{idx + 1}</td>
                          <td className="py-2 px-3 font-medium text-slate-800">
                            {seg.fromNode.name} → {seg.toNode.name}
                          </td>
                          <td className="py-2 px-3 text-right text-slate-700">
                            {seg.segmentDistanceKm.toFixed(1)}
                          </td>
                          <td className="py-2 px-3 text-right text-slate-600">
                            {(seg.currentSpeedKmH ?? seg.edge.baseSpeedKmH).toFixed(1)}
                          </td>
                          <td className="py-2 px-3 text-right text-blue-700 font-medium">
                            {seg.adjustedTimeMin.toFixed(2)}
                          </td>
                          <td className="py-2 px-3 text-right text-amber-700">
                            {(seg.congestionIndex ?? seg.edge.trafficFactor).toFixed(2)}×
                          </td>
                          <td className="py-2 px-3 text-right text-slate-600">
                            {(seg.normalizedTime ?? 0).toFixed(4)}
                          </td>
                          <td className="py-2 px-3 text-right text-slate-600">
                            {(seg.normalizedDistance ?? 0).toFixed(4)}
                          </td>
                          <td className="py-2 px-3 text-right text-slate-600">
                            {(seg.normalizedCongestion ?? 0).toFixed(4)}
                          </td>
                          <td className="py-2 px-3 text-right font-semibold text-blue-700">
                            {(seg.segmentObjectiveCost ?? 0).toFixed(4)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-50 border-t border-slate-200 font-semibold text-slate-900">
                        <td colSpan={2} className="py-2.5 px-3">
                          Route Total
                        </td>
                        <td className="py-2.5 px-3 text-right">{totalDist.toFixed(1)} km</td>
                        <td className="py-2.5 px-3 text-right">—</td>
                        <td className="py-2.5 px-3 text-right text-blue-700">{totalTime.toFixed(2)} min</td>
                        <td className="py-2.5 px-3 text-right text-amber-700">{totalCong.toFixed(2)}</td>
                        <td className="py-2.5 px-3 text-right">{normT.toFixed(4)}</td>
                        <td className="py-2.5 px-3 text-right">{normD.toFixed(4)}</td>
                        <td className="py-2.5 px-3 text-right">{normC.toFixed(4)}</td>
                        <td className="py-2.5 px-3 text-right text-blue-700">{totalFitness.toFixed(4)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'quantum' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 tabular-nums">
              {/* Step 1: Mean Best Position */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                <div className="text-xs font-semibold text-slate-800">
                  Step 1: Mean Personal Best (m<sub>best</sub>)
                </div>
                <div className="p-2.5 bg-white border border-slate-200 rounded-md text-xs text-slate-800">
                  m<sub>best</sub> = (1 ÷ M) × ∑ p<sub>best, i</sub>
                </div>
                <div className="text-xs text-slate-600 pt-1">
                  For node <span className="font-semibold text-slate-900">{calc.dimensionName}</span> across M = {qpsoResult?.particlesCount ?? 18} particles:
                </div>
                <div className="text-xs font-semibold text-blue-700">
                  m<sub>best</sub> = {calc.mbest_val.toFixed(4)}
                </div>
              </div>

              {/* Step 2: Local Attractor */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                <div className="text-xs font-semibold text-slate-800">
                  Step 2: Local Attractor (p<sub>i</sub>)
                </div>
                <div className="p-2.5 bg-white border border-slate-200 rounded-md text-xs text-slate-800">
                  p<sub>i</sub> = φ × p<sub>best, i</sub> + (1 − φ) × g<sub>best</sub>
                </div>
                <div className="text-xs text-slate-600 pt-1">
                  ({calc.phi.toFixed(4)} × {calc.pbest_val.toFixed(4)}) + ({(1 - calc.phi).toFixed(4)} × {calc.gbest_val.toFixed(4)})
                </div>
                <div className="text-xs font-semibold text-blue-700">
                  p<sub>i</sub> = {calc.p_attractor.toFixed(4)}
                </div>
              </div>

              {/* Step 3: Contraction-Expansion */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                <div className="text-xs font-semibold text-slate-800">
                  Step 3: Contraction–Expansion Coefficient (β)
                </div>
                <div className="p-2.5 bg-white border border-slate-200 rounded-md text-xs text-slate-800">
                  β(t) = β<sub>max</sub> − (β<sub>max</sub> − β<sub>min</sub>) × (t ÷ T<sub>max</sub>)
                </div>
                <div className="text-xs text-slate-600 pt-1">
                  1.00 − (1.00 − 0.50) × ({calc.iteration} ÷ {qpsoResult?.iterationsCount ?? 30})
                </div>
                <div className="text-xs font-semibold text-blue-700">
                  β = {calc.beta.toFixed(4)}
                </div>
              </div>

              {/* Step 4: Quantum Position Update */}
              <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-lg space-y-2">
                <div className="text-xs font-semibold text-blue-900">
                  Step 4: Updated Particle Priority (x<sub>next</sub>)
                </div>
                <div className="p-2.5 bg-white border border-blue-200 rounded-md text-xs text-slate-800">
                  x(t + 1) = p<sub>i</sub> ± β × |m<sub>best</sub> − x(t)| × ln(1 ÷ u)
                </div>
                <div className="text-xs text-slate-700 pt-1">
                  {calc.p_attractor.toFixed(4)} {calc.sign >= 0 ? '+' : '−'} {calc.beta.toFixed(4)} × |{calc.mbest_val.toFixed(4)} − {calc.x_current.toFixed(4)}| × ln(1 ÷ {calc.u.toFixed(4)})
                </div>
                <div className="text-xs font-semibold text-blue-800">
                  Clamped to [0, 1] → x(t + 1) = {calc.x_next.toFixed(4)}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
