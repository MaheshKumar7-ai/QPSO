import React, { useState } from 'react';
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
} from 'recharts';
import { VrpBenchmarkResult, VrpConfig, VrpSolution } from '../../types/vrp';
import { runFleetVrpBenchmark } from '../../algorithms/vrpOptimizer';
import { GraphVertex, GraphEdge, TrafficState, ObjectiveWeights } from '../../types';
import {
  BarChart3,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingDown,
  Activity,
  Layers,
  Sparkles,
} from 'lucide-react';
import { formatDurationHuman } from '../../algorithms/evaluator';

interface FleetBenchmarkSectionProps {
  vertices: GraphVertex[];
  edges: GraphEdge[];
  config: VrpConfig;
  trafficState?: TrafficState;
  objectiveWeights?: ObjectiveWeights;
  onSelectConvergence?: (result: VrpBenchmarkResult) => void;
}

const ALGO_COLORS: Record<string, string> = {
  'Adaptive QPSO': '#059669',
  'Standard PSO': '#2563eb',
  'Genetic Algorithm (GA)': '#d97706',
  'Ant Colony Optimization (ACO)': '#7c3aed',
};

export const FleetBenchmarkSection: React.FC<FleetBenchmarkSectionProps> = ({
  vertices,
  edges,
  config,
  trafficState,
  objectiveWeights,
  onSelectConvergence,
}) => {
  const [trialCount, setTrialCount] = useState<number>(1);
  const [isBenchmarking, setIsSimulating] = useState<boolean>(false);
  const [statusText, setStatusText] = useState<string>('');
  const [benchmarkResults, setBenchmarkResults] = useState<VrpBenchmarkResult[]>([]);
  const [activeTab, setActiveTab] = useState<'table' | 'fitness' | 'time' | 'distance' | 'convergence'>('table');

  const handleRunBenchmark = async () => {
    setIsSimulating(true);
    setStatusText('Preparing VRP problem instance...');
    await new Promise(r => setTimeout(r, 20));

    try {
      setStatusText('Running Standard PSO...');
      await new Promise(r => setTimeout(r, 20));

      setStatusText('Running Genetic Algorithm (GA)...');
      await new Promise(r => setTimeout(r, 20));

      setStatusText('Running Ant Colony Optimization (ACO)...');
      await new Promise(r => setTimeout(r, 20));

      setStatusText('Running Adaptive QPSO...');
      await new Promise(r => setTimeout(r, 20));

      const results = runFleetVrpBenchmark(
        vertices,
        edges,
        config,
        trafficState,
        objectiveWeights,
        trialCount
      );

      setBenchmarkResults(results);
    } catch (err) {
      console.error('Fleet Benchmark Error:', err);
    } finally {
      setIsSimulating(false);
      setStatusText('');
    }
  };

  const chartData = benchmarkResults.map(res => ({
    name: res.algorithm.replace(' (GA)', '').replace(' (ACO)', ''),
    fullName: res.algorithm,
    Objective: res.fleetFitness,
    'Distance (km)': res.distanceKm,
    'Travel Time (min)': res.travelTimeMin,
    'Runtime (ms)': res.runtimeMs,
    color: ALGO_COLORS[res.algorithm] || '#2563eb',
  }));

  // Max iterations across algorithms
  const maxIters = Math.max(20, ...benchmarkResults.map(r => r.convergenceCurve?.length || 0));
  const convergenceChartData = Array.from({ length: maxIters }, (_, i) => {
    const row: Record<string, number> = { iteration: i };
    benchmarkResults.forEach(res => {
      if (res.convergenceCurve && res.convergenceCurve.length > 0) {
        const idx = Math.min(i, res.convergenceCurve.length - 1);
        row[res.algorithm] = res.convergenceCurve[idx];
      }
    });
    return row;
  });

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <BarChart3 className="w-4 h-4 text-blue-600" />
            <span>Fleet VRP Metaheuristic Benchmark Lab</span>
          </h3>
          <p className="text-xs text-slate-500">
            Fair comparative benchmark comparing Adaptive QPSO, Standard PSO, Genetic Algorithm (GA), and Ant Colony Optimization (ACO) on the exact same problem instance.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200">
            <span className="font-semibold">Trials:</span>
            <select
              value={trialCount}
              onChange={e => setTrialCount(Number(e.target.value))}
              className="bg-white border border-slate-200 rounded px-1.5 py-0.5 font-semibold text-slate-900 focus:outline-none"
            >
              <option value={1}>Single Run (1 Trial)</option>
              <option value={3}>3 Repeated Trials</option>
              <option value={5}>5 Repeated Trials</option>
            </select>
          </div>

          <button
            type="button"
            disabled={isBenchmarking}
            onClick={handleRunBenchmark}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-1.5 px-4 rounded-lg transition-colors text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isBenchmarking ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>{statusText || 'Benchmarking...'}</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>RUN FLEET BENCHMARK</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* VIEW TABS */}
      {benchmarkResults.length > 0 && (
        <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-semibold self-start w-fit">
          <button
            type="button"
            onClick={() => setActiveTab('table')}
            className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
              activeTab === 'table' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Results Table
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('fitness')}
            className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
              activeTab === 'fitness' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Fleet Objective F(R,t)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('time')}
            className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
              activeTab === 'time' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Travel Time & Distance
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('convergence')}
            className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
              activeTab === 'convergence' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Convergence Progression
          </button>
        </div>
      )}

      {/* BENCHMARK TABLE */}
      {benchmarkResults.length > 0 && activeTab === 'table' && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs tabular-nums border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50/80">
                <th className="py-2.5 px-3">Algorithm</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Feasible</th>
                <th className="py-2.5 px-3">Fleet Objective F(R,t)</th>
                <th className="py-2.5 px-3">Distance</th>
                <th className="py-2.5 px-3">Travel Time</th>
                <th className="py-2.5 px-3">Congestion</th>
                <th className="py-2.5 px-3">Runtime</th>
                <th className="py-2.5 px-3">Evaluations</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {benchmarkResults.map(res => {
                const isWinner = res.algorithm === 'Adaptive QPSO';
                return (
                  <tr
                    key={res.algorithm}
                    className={`transition-colors ${isWinner ? 'bg-emerald-50/60 font-semibold text-slate-900' : 'hover:bg-slate-50'}`}
                  >
                    <td className="py-2.5 px-3 font-bold whitespace-nowrap flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: ALGO_COLORS[res.algorithm] }} />
                      <span>{res.algorithm}</span>
                      {isWinner && (
                        <span className="bg-emerald-600 text-white text-[10px] px-1.5 py-0.2 rounded font-bold">
                          PROPOSED BEST
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="text-slate-700">{res.status}</span>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {res.isFeasible ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5" /> YES
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-700 font-bold">
                          <XCircle className="w-3.5 h-3.5" /> NO
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-blue-900 whitespace-nowrap">
                      {res.fleetFitness.toFixed(4)}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {res.distanceKm.toFixed(1)} km
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {formatDurationHuman(res.travelTimeMin)}
                    </td>
                    <td className="py-2.5 px-3 text-amber-800 whitespace-nowrap">
                      {res.totalCongestion.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-900 whitespace-nowrap">
                      {res.runtimeMs.toFixed(1)} ms
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                      {res.fitnessEvaluations}
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      {res.convergenceHistory && onSelectConvergence && (
                        <button
                          type="button"
                          onClick={() => onSelectConvergence(res)}
                          className="px-2 py-1 rounded bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 font-semibold cursor-pointer text-[11px]"
                        >
                          View Convergence →
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* OBJECTIVE BAR CHART */}
      {benchmarkResults.length > 0 && activeTab === 'fitness' && (
        <div className="h-64 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} domain={['auto', 'auto']} />
              <Tooltip formatter={(val: any) => [val, 'Fleet Objective F(R,t)']} />
              <Bar dataKey="Objective" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* TIME & DISTANCE BAR CHART */}
      {benchmarkResults.length > 0 && activeTab === 'time' && (
        <div className="h-64 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="left" orientation="left" stroke="#2563eb" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="right" orientation="right" stroke="#059669" tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="Travel Time (min)" fill="#2563eb" name="Travel Time (min)" radius={[4, 4, 0, 0]} />
              <Bar yAxisId="right" dataKey="Distance (km)" fill="#059669" name="Distance (km)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* CONVERGENCE PROGRESSION LINE CHART */}
      {benchmarkResults.length > 0 && activeTab === 'convergence' && (
        <div className="h-64 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={convergenceChartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="iteration" label={{ value: 'Iteration', position: 'insideBottom', offset: -10 }} tick={{ fontSize: 11 }} />
              <YAxis label={{ value: 'Fleet Objective', angle: -90, position: 'insideLeft' }} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              {benchmarkResults.map(res => (
                <Line
                  key={res.algorithm}
                  type="monotone"
                  dataKey={res.algorithm}
                  stroke={ALGO_COLORS[res.algorithm]}
                  strokeWidth={res.algorithm === 'Adaptive QPSO' ? 3 : 1.5}
                  dot={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {benchmarkResults.length === 0 && !isBenchmarking && (
        <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-6 text-center text-xs text-slate-500">
          Click <strong className="text-slate-800">"RUN FLEET BENCHMARK"</strong> to execute a fair comparative evaluation across Adaptive QPSO, Standard PSO, Genetic Algorithm (GA), and Ant Colony Optimization (ACO) on the current Fleet VRP instance.
        </div>
      )}
    </div>
  );
};
