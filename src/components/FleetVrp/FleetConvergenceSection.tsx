import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { VrpSolution } from '../../types/vrp';
import { TrendingDown, Activity, Zap, CheckCircle2, Clock, Calculator } from 'lucide-react';

interface FleetConvergenceSectionProps {
  solution: VrpSolution | null;
}

export const FleetConvergenceSection: React.FC<FleetConvergenceSectionProps> = ({ solution }) => {
  if (!solution || !solution.convergenceHistory || solution.convergenceHistory.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-6 text-center space-y-2">
        <Activity className="w-8 h-8 text-slate-400 mx-auto" />
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
          No Fleet VRP Convergence History Available
        </h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Please run "Optimize Fleet" first to record iteration-by-iteration Adaptive QPSO convergence history.
        </p>
      </div>
    );
  }

  const history = solution.convergenceHistory;
  const initialObj = history[0]?.bestFitness || solution.fleetFitness;
  const finalObj = solution.fleetFitness;
  const improvement = Number((initialObj - finalObj).toFixed(4));
  const improvementPct = initialObj > 0 ? Number(((improvement / initialObj) * 100).toFixed(2)) : 0;

  const chartData = history.map(h => ({
    iteration: h.iteration,
    'Best Objective gbest': h.bestFitness,
    'Population Mean mbest': h.meanFitness,
    'Worst Objective': h.worstFitness,
    'Contraction Beta': h.beta,
  }));

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <TrendingDown className="w-4 h-4 text-emerald-600" />
            <span>Adaptive QPSO Convergence Analysis</span>
          </h3>
          <p className="text-xs text-slate-500">
            Real recorded iteration progression, mean swarm behavior, and quantum contraction-expansion parameter $\beta$.
          </p>
        </div>

        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full self-start sm:self-auto">
          Improvement: -{improvementPct}%
        </span>
      </div>

      {/* SUMMARY STATS GRID */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 text-xs tabular-nums">
        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Initial Objective</span>
          <span className="font-bold text-slate-900">{initialObj.toFixed(4)}</span>
        </div>

        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Final Best Objective</span>
          <span className="font-bold text-emerald-700">{finalObj.toFixed(4)}</span>
        </div>

        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Absolute Delta ΔF</span>
          <span className="font-bold text-blue-700">-{improvement.toFixed(4)}</span>
        </div>

        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Iterations</span>
          <span className="font-bold text-slate-900">{solution.iterations}</span>
        </div>

        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Fitness Evaluated</span>
          <span className="font-bold text-slate-900">{solution.fitnessEvaluations}</span>
        </div>

        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Measured Runtime</span>
          <span className="font-bold text-blue-700">{solution.runtimeMs} ms</span>
        </div>

        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Final Feasibility</span>
          <span className="font-bold text-emerald-700">{solution.isFeasible ? 'PASS' : 'FAIL'}</span>
        </div>
      </div>

      {/* RECHARTS LINE CHART */}
      <div className="h-64 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="iteration" label={{ value: 'Swarm Iteration', position: 'insideBottom', offset: -10 }} tick={{ fontSize: 11 }} />
            <YAxis label={{ value: 'Fleet Objective F(R,t)', angle: -90, position: 'insideLeft' }} tick={{ fontSize: 11 }} domain={['auto', 'auto']} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="Best Objective gbest" stroke="#059669" strokeWidth={3} dot={{ r: 2 }} />
            <Line type="monotone" dataKey="Population Mean mbest" stroke="#2563eb" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
            <Line type="monotone" dataKey="Worst Objective" stroke="#e11d48" strokeWidth={1} strokeDasharray="2 2" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
