import React, { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Cell,
  Legend,
  LabelList,
} from 'recharts';
import { AlgorithmBenchmarkResult, QpsoIterationRecord, ObjectiveWeights, TrafficState } from '../types';
import { formatDurationHuman } from '../algorithms/evaluator';
import { BarChart3, Clock, Route, TrendingDown, Calculator } from 'lucide-react';

interface BenchmarkSectionProps {
  benchmarks: AlgorithmBenchmarkResult[];
  convergenceHistory?: QpsoIterationRecord[];
  activeRoutePath?: string[];
  objectiveWeights?: ObjectiveWeights;
  trafficState?: TrafficState;
}

const ALGO_COLORS: Record<string, string> = {
  QPSO: '#059669',
  PSO: '#6366f1',
  GA: '#d97706',
  ACO: '#9333ea',
  Dijkstra: '#2563eb',
  'A*': '#0284c7',
};

const DISPLAY_NAMES: Record<string, string> = {
  QPSO: 'Proposed QPSO',
  PSO: 'Standard PSO',
  GA: 'Genetic Algorithm',
  ACO: 'Ant Colony',
  Dijkstra: 'Dijkstra',
  'A*': 'A* Search',
};

export const BenchmarkSection: React.FC<BenchmarkSectionProps> = ({
  benchmarks,
  convergenceHistory = [],
  objectiveWeights,
  trafficState,
}) => {
  const [activeTab, setActiveTab] = useState<'fitness' | 'time' | 'distance' | 'execution' | 'convergence'>('fitness');

  const feasibleBenchmarks = useMemo(
    () => benchmarks.filter(b => b.status === 'Complete' && isFinite(b.fitness)),
    [benchmarks]
  );

  const bestFitnessVal = useMemo(
    () => (feasibleBenchmarks.length > 0 ? Math.min(...feasibleBenchmarks.map(b => b.fitness)) : 0),
    [feasibleBenchmarks]
  );

  const weights = objectiveWeights ?? {
    wT: 0.4,
    wD: 0.3,
    wC: 0.3,
  };

  const chartData = useMemo(
    () =>
      feasibleBenchmarks.map(b => ({
        name: b.algorithm,
        fullName: DISPLAY_NAMES[b.algorithm] || b.algorithm,
        Fitness: Number(b.fitness.toFixed(4)),
        'Travel Time (min)': Number(b.travelTimeMin.toFixed(2)),
        'Distance (km)': Number(b.distanceKm.toFixed(1)),
        'Congestion Cost': Number((b.totalCongestion ?? 0).toFixed(2)),
        'Solve Time (ms)': Number(b.runtimeMs.toFixed(2)),
        color: ALGO_COLORS[b.algorithm] || '#64748b',
      })),
    [feasibleBenchmarks]
  );

  const convergenceComparisonData = useMemo(() => {
    const qpsoLen = convergenceHistory.length;
    const maxLen = Math.max(qpsoLen, ...feasibleBenchmarks.map(b => b.convergenceCurve?.length ?? 0), 20);
    const rows = [];

    for (let i = 0; i < maxLen; i++) {
      const row: Record<string, number> = { iteration: i };
      feasibleBenchmarks.forEach(b => {
        if (b.convergenceCurve && b.convergenceCurve.length > 0) {
          const idx = Math.min(i, b.convergenceCurve.length - 1);
          row[b.algorithm] = Number(b.convergenceCurve[idx].toFixed(4));
        } else {
          row[b.algorithm] = Number(b.fitness.toFixed(4));
        }
      });
      rows.push(row);
    }
    return rows;
  }, [feasibleBenchmarks, convergenceHistory]);

  if (benchmarks.length === 0) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-5">
      {/* Header & Tabs */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 border-b border-slate-200">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="text-base font-semibold text-slate-900">
            Algorithm Comparison & Mathematical Evaluation
          </h3>
          {trafficState && (
            <span className="text-xs text-slate-500 tabular-nums">
              {trafficState.timestamp} · <span className="capitalize">{trafficState.dayType}</span>
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
          {[
            { id: 'fitness', label: 'Objective Cost', icon: BarChart3 },
            { id: 'time', label: 'Travel Time', icon: Clock },
            { id: 'distance', label: 'Distance', icon: Route },
            { id: 'execution', label: 'Computation Time', icon: Calculator },
            { id: 'convergence', label: 'Convergence', icon: TrendingDown },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Visual Chart Panel */}
      <div className="bg-slate-50/50 border border-slate-200 rounded-lg p-4">
        {activeTab === 'fitness' && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-semibold text-slate-700">
                Multi-Objective Cost F(R, t) (Lower is Better)
              </h4>
              <span className="text-xs font-medium text-emerald-700 tabular-nums">
                Best: {bestFitnessVal.toFixed(4)}
              </span>
            </div>
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#334155', fontWeight: 600 }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} domain={[0, 'auto']} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderColor: '#e2e8f0',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    formatter={(value: any) => [`${Number(value).toFixed(4)}`, 'F(R, t)']}
                  />
                  <Bar dataKey="Fitness" radius={[6, 6, 0, 0]} maxBarSize={52}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-fit-${index}`} fill={entry.color} />
                    ))}
                    <LabelList
                      dataKey="Fitness"
                      position="top"
                      formatter={(v: any) => Number(v).toFixed(4)}
                      style={{ fontSize: '11px', fontWeight: 600, fill: '#334155' }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {activeTab === 'time' && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-semibold text-slate-700">
                Total Travel Time T(R, t) in Minutes (Lower is Faster)
              </h4>
            </div>
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#334155', fontWeight: 600 }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} unit="m" domain={[0, 'auto']} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderColor: '#e2e8f0',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    formatter={(value: any) => [
                      `${Number(value).toFixed(2)} min (${formatDurationHuman(Number(value))})`,
                      'Travel Time',
                    ]}
                  />
                  <Bar dataKey="Travel Time (min)" radius={[6, 6, 0, 0]} maxBarSize={52}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-time-${index}`} fill={entry.color} />
                    ))}
                    <LabelList
                      dataKey="Travel Time (min)"
                      position="top"
                      formatter={(v: any) => `${Number(v).toFixed(1)}m`}
                      style={{ fontSize: '11px', fontWeight: 600, fill: '#334155' }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {activeTab === 'distance' && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-semibold text-slate-700">
                Total Route Distance D(R) in Kilometers (Lower is Shorter)
              </h4>
            </div>
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#334155', fontWeight: 600 }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} unit="km" domain={[0, 'auto']} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderColor: '#e2e8f0',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    formatter={(value: any) => [`${Number(value).toFixed(1)} km`, 'Distance']}
                  />
                  <Bar dataKey="Distance (km)" radius={[6, 6, 0, 0]} maxBarSize={52}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-dist-${index}`} fill={entry.color} />
                    ))}
                    <LabelList
                      dataKey="Distance (km)"
                      position="top"
                      formatter={(v: any) => `${Number(v).toFixed(1)} km`}
                      style={{ fontSize: '11px', fontWeight: 600, fill: '#334155' }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {activeTab === 'execution' && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-semibold text-slate-700">
                Algorithm Computation Time in Milliseconds
              </h4>
            </div>
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#334155', fontWeight: 600 }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} unit="ms" domain={[0, 'auto']} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderColor: '#e2e8f0',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    formatter={(value: any) => [`${Number(value).toFixed(2)} ms`, 'Computation Time']}
                  />
                  <Bar dataKey="Solve Time (ms)" radius={[6, 6, 0, 0]} maxBarSize={52}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-exec-${index}`} fill={entry.color} />
                    ))}
                    <LabelList
                      dataKey="Solve Time (ms)"
                      position="top"
                      formatter={(v: any) => `${Number(v).toFixed(2)} ms`}
                      style={{ fontSize: '11px', fontWeight: 600, fill: '#334155' }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {activeTab === 'convergence' && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-semibold text-slate-700">
                Iterative Convergence Trajectory of Objective Cost F(R, t)
              </h4>
            </div>
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={convergenceComparisonData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="iteration" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} domain={['auto', 'auto']} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderColor: '#e2e8f0',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', fontWeight: 600 }} />
                  <Line type="monotone" dataKey="QPSO" stroke="#059669" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="PSO" stroke="#6366f1" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="GA" stroke="#d97706" strokeWidth={2} dot={false} />
                  <Line type="stepAfter" dataKey="Dijkstra" stroke="#2563eb" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                  <Line type="stepAfter" dataKey="A*" stroke="#0284c7" strokeWidth={1.5} strokeDasharray="2 2" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Algorithm Comparison Table */}
      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs tabular-nums">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="py-2.5 px-4">Algorithm</th>
                <th className="py-2.5 px-4 text-right">Time T(R, t)</th>
                <th className="py-2.5 px-4 text-right">Distance D(R)</th>
                <th className="py-2.5 px-4 text-right">Congestion C(R, t)</th>
                <th className="py-2.5 px-4 text-right">F(R, t)</th>
                <th className="py-2.5 px-4 text-right">Solve Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {benchmarks.map(b => {
                const isBest = Math.abs(b.fitness - bestFitnessVal) < 0.0001;
                const isQpso = b.algorithm === 'QPSO';

                return (
                  <tr
                    key={b.algorithm}
                    className={`transition-colors ${
                      isQpso ? 'bg-emerald-50/40 hover:bg-emerald-50/70' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="py-2.5 px-4 font-semibold text-slate-900 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: ALGO_COLORS[b.algorithm] || '#64748b' }}
                        />
                        <span>{DISPLAY_NAMES[b.algorithm] || b.algorithm}</span>
                        {isBest && (
                          <span className="text-[11px] font-medium text-emerald-700">
                            · Optimal
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-right text-slate-700 whitespace-nowrap">
                      {b.travelTimeMin.toFixed(2)} min
                    </td>
                    <td className="py-2.5 px-4 text-right text-slate-700 whitespace-nowrap">
                      {b.distanceKm.toFixed(1)} km
                    </td>
                    <td className="py-2.5 px-4 text-right text-amber-700 whitespace-nowrap">
                      {(b.totalCongestion ?? 0).toFixed(2)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-semibold text-blue-700 whitespace-nowrap">
                      {b.fitness.toFixed(4)}
                    </td>
                    <td className="py-2.5 px-4 text-right text-slate-600 whitespace-nowrap">
                      {b.runtimeMs.toFixed(2)} ms
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
