import React, { useState } from 'react';
import {
  OptimizationMode,
  EvaluatedRoute,
  QpsoResult,
  GraphVertex,
  GraphEdge,
} from '../types';
import { MODE_WEIGHTS } from '../algorithms/evaluator';
import {
  Calculator,
  Cpu,
  Sparkles,
} from 'lucide-react';

interface QpsoExplorationViewProps {
  mode: OptimizationMode;
  route?: EvaluatedRoute | null;
  qpsoResult?: QpsoResult | null;
  vertices?: GraphVertex[];
  edges?: GraphEdge[];
}

export const QpsoExplorationView: React.FC<QpsoExplorationViewProps> = ({
  mode,
  route,
  qpsoResult,
  vertices = [],
}) => {
  const [activeTab, setActiveTab] = useState<'math_calc' | 'quantum_rules'>('math_calc');
  const weights = MODE_WEIGHTS[mode];

  // Route numbers for live calculation
  const distance = route?.totalDistanceKm ?? 45.2;
  const baseTimeMin = route?.baseTimeMin ?? 48.5;
  const avgSpeed = baseTimeMin > 0 ? Number(((distance / (baseTimeMin / 60))).toFixed(1)) : 56;
  const trafficFactor = route?.averageTrafficFactor ?? 1.25;
  const adjustedTimeMin = route?.totalTimeMin ?? 60.6;
  const risk = route?.averageRisk ?? 1.4;

  const timeTerm = Number((weights.timeWeight * adjustedTimeMin).toFixed(1));
  const distTerm = Number((weights.distanceWeight * distance).toFixed(1));
  const congestionPenalty = Number(((trafficFactor - 1.0) * 15).toFixed(1));
  const congTerm = Number((weights.trafficWeight * congestionPenalty).toFixed(1));
  const riskPenalty = Number((risk * 2.5).toFixed(1));
  const riskTerm = Number((weights.riskWeight * riskPenalty).toFixed(1));
  const totalCost = Number((timeTerm + distTerm + congTerm + riskTerm).toFixed(1));

  // Sample quantum calculation parameters from live run
  const sample = qpsoResult?.sampleCalculation ?? {
    particleIndex: 1,
    iteration: 8,
    dimension: 0,
    dimensionName: vertices[0]?.name || 'Vijayawada Junction',
    x_current: 0.642,
    pbest_val: 0.385,
    gbest_val: 0.291,
    mbest_val: 0.352,
    phi: 0.584,
    p_attractor: 0.346,
    beta: 0.886,
    u: 0.432,
    delta: 0.053,
    sign: 1,
    x_next: 0.399,
    isModelGuided: true,
    modelPredictedCongestion: 1.22,
    modelPredictedRisk: 2.1,
    modelConfidence: 0.94,
    modelPriorDesirability: 0.76,
    modelFeatureContribution: 'Trained Supervised Traffic Model (Historical Congestion & Risk Weights)',
  };

  // Step-by-step arithmetic for textbook explanation
  const attractorP = Number((sample.phi * sample.pbest_val + (1 - sample.phi) * sample.gbest_val).toFixed(3));
  const charDistance = Number(Math.abs(sample.mbest_val - sample.x_current).toFixed(3));
  const lnU = Number(Math.log(1 / Math.max(0.001, sample.u)).toFixed(3));
  const deltaCalc = Number((sample.beta * charDistance * lnU).toFixed(3));

  return (
    <section className="w-full bg-white border-2 border-slate-300 rounded-xl p-6 md:p-8 shadow-sm space-y-6">
      {/* Header */}
      <div className="border-b-2 border-slate-200 pb-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs uppercase font-extrabold tracking-wider px-3.5 py-1.5 rounded-md bg-blue-100 text-blue-900 border border-blue-300 flex items-center gap-2">
                <Calculator className="w-4 h-4 text-blue-700" />
                ROUTE COST EVALUATION &amp; MODEL-GUIDED QPSO MECHANICS
              </span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
              Route Cost Evaluation &amp; Model-Guided QPSO Mechanics
            </h2>
            <p className="text-base text-slate-700 mt-1 max-w-4xl leading-relaxed">
              Step-by-step mathematical formulation of the multi-objective routing objective function <i>J</i>(<i>R</i>) and the Schrödinger quantum delta-potential wave-packet state equations governing particle movements.
            </p>
          </div>

          {/* Mode Weights Indicator */}
          <div className="bg-white border-2 border-blue-200 shadow-xs px-5 py-3 rounded-xl flex items-center gap-4 text-base font-bold text-slate-800 shrink-0">
            <div>
              <span className="text-xs text-blue-800 block uppercase font-extrabold tracking-wider">
                Optimization Mode ({mode.toUpperCase()})
              </span>
              <span className="font-serif text-slate-900 text-base">
                &alpha; ({weights.timeWeight}) | &beta; ({weights.distanceWeight}) | &gamma; ({weights.trafficWeight}) | &delta; ({weights.riskWeight})
              </span>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-3 mt-6 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('math_calc')}
            className={`px-5 py-3 text-base font-extrabold rounded-xl cursor-pointer transition-all flex items-center gap-2.5 ${
              activeTab === 'math_calc'
                ? 'bg-blue-700 text-white shadow-sm ring-2 ring-blue-700 ring-offset-2'
                : 'bg-white text-slate-700 hover:bg-slate-100 border-2 border-slate-300'
            }`}
          >
            <Calculator className="w-5 h-5" />
            Route Cost Evaluation &amp; Formula
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('quantum_rules')}
            className={`px-5 py-3 text-base font-extrabold rounded-xl cursor-pointer transition-all flex items-center gap-2.5 ${
              activeTab === 'quantum_rules'
                ? 'bg-blue-700 text-white shadow-sm ring-2 ring-blue-700 ring-offset-2'
                : 'bg-white text-slate-700 hover:bg-slate-100 border-2 border-slate-300'
            }`}
          >
            <Cpu className="w-5 h-5" />
            Model-Guided QPSO Mechanics
          </button>
        </div>
      </div>

      {/* TAB 1: LIVE ROUTE COST CALCULATION */}
      {activeTab === 'math_calc' && (
        <div className="space-y-6">
          {/* Main Formula Card */}
          <div className="bg-white p-6 rounded-xl border-2 border-blue-400 shadow-xs space-y-3">
            <div className="text-xs font-black text-blue-900 uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block"></span>
                QPSO Objective Function Formula:
              </span>
              <span className="text-slate-500 font-sans font-bold">Multi-Objective Cost Formulation</span>
            </div>

            <div className="text-2xl md:text-3xl font-serif font-black text-blue-950 py-3.5 border-y-2 border-blue-100 text-center tracking-wide bg-blue-50/50 rounded-lg">
              Minimize <i>J</i> = &alpha; &middot; <i>T</i> + &beta; &middot; <i>C</i> + &gamma; &middot; <i>R</i> + &delta; &middot; <i>D</i>
            </div>

            {/* Variable definitions */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs md:text-sm font-medium pt-1">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-center">
                <span className="font-black text-blue-900 block text-base font-serif"><i>T</i></span>
                <span className="text-slate-700 font-bold">Travel Time</span>
                <span className="text-[11px] text-slate-500 block">Evaluated from travel speeds &amp; time multipliers</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-center">
                <span className="font-black text-amber-900 block text-base font-serif"><i>C</i></span>
                <span className="text-slate-700 font-bold">Congestion Cost</span>
                <span className="text-[11px] text-slate-500 block">Derived from peak bottleneck factors</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-center">
                <span className="font-black text-emerald-900 block text-base font-serif"><i>R</i></span>
                <span className="text-slate-700 font-bold">Safety / Risk Score</span>
                <span className="text-[11px] text-slate-500 block">Historical accident rates &amp; hazard ratings</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-center">
                <span className="font-black text-purple-900 block text-base font-serif"><i>D</i></span>
                <span className="text-slate-700 font-bold">Distance</span>
                <span className="text-[11px] text-slate-500 block">Total physical path length in kilometers</span>
              </div>
            </div>

            <p className="text-sm text-slate-700 leading-relaxed font-medium pt-2">
              <strong>Brief Description:</strong> Quantum-behaved Particle Swarm Optimization (QPSO) simulates a swarm of quantum particles traversing a delta potential well to solve the multi-objective routing problem across Andhra Pradesh (including free-flow travel speeds, peak-hour delay multipliers, recurring congestion points, and road safety risk indices).
            </p>
          </div>

          {/* Objective Cost Components */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Travel Time Component */}
            <div className="bg-white border-2 border-slate-300 rounded-xl p-5 space-y-3 shadow-xs">
              <div className="flex items-center justify-between border-b-2 border-slate-200 pb-2.5">
                <span className="font-black text-lg text-slate-900">Travel Time Component</span>
                <span className="text-xs bg-blue-100 text-blue-900 font-extrabold px-2.5 py-1 rounded border border-blue-300">Physics</span>
              </div>
              <div className="text-base text-slate-800 space-y-2 font-serif">
                <div>Distance (<i>D</i>): <strong className="text-slate-900 text-lg font-sans">{distance} km</strong></div>
                <div>Average Velocity (<i>v</i>): <strong className="text-slate-900 font-sans">{avgSpeed} km/h</strong></div>
                <div>Free-flow Time (<i>t</i>₀): {distance} &divide; {avgSpeed} = <strong className="font-sans">{baseTimeMin} min</strong></div>
                <div>Traffic Friction (&tau;): <strong className="text-amber-700 font-sans">{trafficFactor}&times;</strong></div>
                <div className="pt-2 text-blue-950 font-black border-t-2 border-slate-200 text-base">
                  Adjusted Time <i>T</i>(<i>R</i>) = {baseTimeMin} &times; {trafficFactor} = <span className="text-blue-700 text-lg font-sans">{adjustedTimeMin} min</span>
                </div>
              </div>
              <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-3 text-base text-blue-950 font-bold">
                Time Term: {weights.timeWeight} &times; {adjustedTimeMin} = <span className="text-xl text-blue-800 font-black font-sans">{timeTerm}</span>
              </div>
            </div>

            {/* Distance & Congestion Component */}
            <div className="bg-white border-2 border-slate-300 rounded-xl p-5 space-y-3 shadow-xs">
              <div className="flex items-center justify-between border-b-2 border-slate-200 pb-2.5">
                <span className="font-black text-lg text-slate-900">Distance &amp; Traffic Friction</span>
                <span className="text-xs bg-amber-100 text-amber-900 font-extrabold px-2.5 py-1 rounded border border-amber-300">Friction</span>
              </div>
              <div className="text-base text-slate-800 space-y-2 font-serif">
                <div>Distance Weight (<i>w</i>₂): <strong className="text-slate-900 font-sans">{weights.distanceWeight}</strong></div>
                <div>Distance Term: {weights.distanceWeight} &times; {distance} = <strong className="font-sans">{distTerm}</strong></div>
                <div>Traffic Delay Penalty: <strong className="text-amber-700 font-sans">+{congestionPenalty} min</strong></div>
                <div className="pt-2 text-amber-950 font-black border-t-2 border-slate-200 text-base">
                  Congestion Term = {weights.trafficWeight} &times; {congestionPenalty} = <span className="text-amber-800 text-lg font-sans">{congTerm}</span>
                </div>
              </div>
              <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-3 text-base text-amber-950 font-bold">
                Distance &amp; Delay Cost: <span className="text-xl text-amber-800 font-black font-sans">{(distTerm + congTerm).toFixed(1)}</span>
              </div>
            </div>

            {/* Hazard Risk & Total Cost Component */}
            <div className="bg-white border-2 border-slate-300 rounded-xl p-5 space-y-3 shadow-xs">
              <div className="flex items-center justify-between border-b-2 border-slate-200 pb-2.5">
                <span className="font-black text-lg text-slate-900">Hazard Risk &amp; Net Cost</span>
                <span className="text-xs bg-emerald-100 text-emerald-900 font-extrabold px-2.5 py-1 rounded border border-emerald-300">Safety</span>
              </div>
              <div className="text-base text-slate-800 space-y-2 font-serif">
                <div>Road Risk Rating: <strong className="text-slate-900 font-sans">{risk} / 5.0</strong></div>
                <div>Risk Penalty: {risk} &times; 2.5 = <strong className="font-sans">{riskPenalty}</strong></div>
                <div>Risk Term: {weights.riskWeight} &times; {riskPenalty} = <strong className="font-sans">{riskTerm}</strong></div>
                <div className="pt-2 text-emerald-950 font-black border-t-2 border-slate-200 text-base">
                  Total Cost = {timeTerm} + {distTerm} + {congTerm} + {riskTerm}
                </div>
              </div>
              <div className="bg-emerald-50 border-2 border-emerald-400 rounded-lg p-3 text-base text-emerald-950 font-extrabold flex items-center justify-between">
                <span>Calculated Route Score:</span>
                <span className="text-2xl text-emerald-900 font-black font-sans">{totalCost}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: QUANTUM SWARM UPDATE DYNAMICS (MODEL-GUIDED FORMULATION) */}
      {activeTab === 'quantum_rules' && (
        <div className="space-y-6">
          {/* Theoretical Equations */}
          <div className="bg-white border-2 border-slate-300 rounded-xl p-6 md:p-8 space-y-6 shadow-xs">
            <div className="border-b-2 border-slate-200 pb-4">
              <div className="text-xs font-black text-blue-900 uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600" />
                Model-Guided Quantum Delta Potential Well Formulation (Sun &amp; Xu Model + ML Prior)
              </div>
              <h3 className="text-xl md:text-2xl font-black text-slate-900 mt-1">
                Governing State Equations of Quantum Particles
              </h3>
              <p className="text-slate-700 text-sm md:text-base mt-1">
                In Classical PSO, particles follow deterministic Newtonian trajectories with velocity vectors. In Quantum PSO (QPSO), particles exist in a quantum state described by a Schrödinger wave equation centered at a delta potential well. Our system calculates prior flow potentials and scales wavefunction dispersion by prediction uncertainty.
              </p>
            </div>

            {/* Equation 1: Mean Best Position */}
            <div className="bg-slate-50 border-2 border-slate-200 rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-blue-800 bg-blue-100 px-3 py-1 rounded-md border border-blue-200">
                  Equation (1) &mdash; Mean Best Position (Swarm Center)
                </span>
                <span className="text-xs font-bold text-slate-500">Dimension <i>d</i></span>
              </div>
              
              <div className="py-3 px-4 bg-white border border-slate-300 rounded-lg flex items-center justify-center text-center overflow-x-auto">
                <div className="font-serif text-lg md:text-2xl text-slate-900 flex items-center gap-3">
                  <span><i>m</i><sub>best, <i>d</i></sub></span>
                  <span>=</span>
                  <div className="inline-flex flex-col items-center justify-center text-center">
                    <span className="border-b-2 border-slate-800 px-2 pb-0.5 leading-none">1</span>
                    <span className="pt-0.5 leading-none"><i>M</i></span>
                  </div>
                  <div className="inline-flex items-center gap-1">
                    <span className="text-2xl md:text-3xl">&sum;</span>
                    <div className="inline-flex flex-col text-xs font-sans">
                      <span className="text-[11px] font-bold leading-none"><i>M</i></span>
                      <span className="text-[11px] font-bold leading-none mt-3"><i>i</i>=1</span>
                    </div>
                  </div>
                  <span><i>P</i><sub><i>i</i>, <i>d</i></sub>(<i>t</i>)</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-white p-3 rounded-lg border border-slate-200">
                <div>
                  <span className="font-bold text-slate-900 block font-sans">What it is:</span>
                  <span className="text-slate-700">Swarm Center-of-Mass (Collective centroid of all particles)</span>
                </div>
                <div>
                  <span className="font-bold text-slate-900 block font-sans">How it&apos;s calculated:</span>
                  <span className="text-slate-700">Summing individual personal bests <i>P<sub>i</sub></i> and dividing by total swarm size <i>M</i></span>
                </div>
              </div>
            </div>

            {/* Equation 2: Model-Guided Local Attractor */}
            <div className="bg-slate-50 border-2 border-slate-200 rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-3 py-1 rounded-md border border-emerald-200">
                  Equation (2) &mdash; Model-Guided Local Attractor
                </span>
                <span className="text-xs font-bold text-slate-500">Cognitive &amp; Social Balance</span>
              </div>

              <div className="py-3 px-4 bg-white border border-slate-300 rounded-lg flex items-center justify-center text-center overflow-x-auto">
                <div className="font-serif text-lg md:text-2xl text-slate-900 flex items-center gap-3">
                  <span><i>p</i><sub><i>i</i>, <i>d</i></sub>(<i>t</i>)</span>
                  <span>=</span>
                  <span>&phi;<sub>model</sub> &middot; <i>P</i><sub><i>i</i>, <i>d</i></sub>(<i>t</i>)</span>
                  <span>+</span>
                  <span>(1 &minus; &phi;<sub>model</sub>) &middot; <i>G</i><sub><i>d</i></sub>(<i>t</i>)</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-white p-3 rounded-lg border border-slate-200">
                <div>
                  <span className="font-bold text-slate-900 block font-sans">What it is:</span>
                  <span className="text-slate-700">Potential Well Center (Target waypoint coordinate)</span>
                </div>
                <div>
                  <span className="font-bold text-slate-900 block font-sans">How it&apos;s calculated:</span>
                  <span className="text-slate-700">&phi;<sub>model</sub> is derived from confidence &amp; flow desirability rather than unguided random numbers.</span>
                </div>
              </div>
            </div>

            {/* Equation 3: Quantum Delta-Well Position State Equation */}
            <div className="bg-slate-50 border-2 border-slate-200 rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-purple-800 bg-purple-100 px-3 py-1 rounded-md border border-purple-200">
                  Equation (3) &mdash; Quantum Wave Function State Update
                </span>
                <span className="text-xs font-bold text-slate-500">Non-local Tunneling</span>
              </div>

              <div className="py-4 px-4 bg-white border border-slate-300 rounded-lg flex items-center justify-center text-center overflow-x-auto">
                <div className="font-serif text-lg md:text-2xl text-slate-900 flex items-center gap-2 md:gap-3 flex-wrap justify-center">
                  <span><i>X</i><sub><i>i</i>, <i>d</i></sub>(<i>t</i> + 1)</span>
                  <span>=</span>
                  <span><i>p</i><sub><i>i</i>, <i>d</i></sub>(<i>t</i>)</span>
                  <span>&plusmn;</span>
                  <span>&beta;(<i>t</i>) &middot;</span>
                  <span>|<i>m</i><sub>best, <i>d</i></sub> &minus; <i>X</i><sub><i>i</i>, <i>d</i></sub>(<i>t</i>)| &middot;</span>
                  <span className="inline-flex items-center">
                    <span>ln</span>
                    <span className="text-xl md:text-3xl ml-1">(</span>
                    <div className="inline-flex flex-col items-center justify-center text-center text-base md:text-lg">
                      <span className="border-b border-slate-800 px-1 pb-0.5 leading-none">1</span>
                      <span className="pt-0.5 leading-none"><i>u</i><sub>model</sub></span>
                    </div>
                    <span className="text-xl md:text-3xl">)</span>
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-white p-3 rounded-lg border border-slate-200">
                <div>
                  <span className="font-bold text-slate-900 block font-sans">What it is:</span>
                  <span className="text-slate-700">Quantum state update along highway dimension <i>d</i></span>
                </div>
                <div>
                  <span className="font-bold text-slate-900 block font-sans">How it&apos;s calculated:</span>
                  <span className="text-slate-700">Dispersion parameter <i>u</i><sub>model</sub> is scaled by the prediction uncertainty variance &sigma;<sub>model</sub>&sup2;.</span>
                </div>
              </div>
            </div>

            {/* Live Arithmetic Substitution from Current Run */}
            <div className="bg-slate-50 border-2 border-blue-300 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-xs font-black uppercase tracking-wider text-blue-900">
                  Live Particle Calculation State (Iteration {sample.iteration}, Particle #{sample.particleIndex})
                </span>
                <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded border border-emerald-300">
                  Model-Guided
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-serif text-slate-900">
                {/* Step 1 */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
                  <div className="text-xs font-sans font-extrabold text-blue-800 uppercase tracking-wide">
                    Step 1: Attractor (<i>p</i>)
                  </div>
                  <div className="text-xs text-slate-600 font-sans">
                    &phi;<sub>model</sub> = {sample.phi} &bull; <i>P</i> = {sample.pbest_val} &bull; <i>G</i> = {sample.gbest_val}
                  </div>
                  <div className="text-sm font-sans bg-slate-50 border border-slate-200 rounded-lg p-2 font-bold text-slate-800">
                    = ({sample.phi} &times; {sample.pbest_val}) + ({Number((1 - sample.phi).toFixed(3))} &times; {sample.gbest_val})<br />
                    = <span className="text-blue-700 text-base font-black">{attractorP}</span>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
                  <div className="text-xs font-sans font-extrabold text-emerald-800 uppercase tracking-wide">
                    Step 2: Distance (&Delta;<i>L</i>)
                  </div>
                  <div className="text-xs text-slate-600 font-sans">
                    |<i>m</i><sub>best</sub> &minus; <i>X</i>| = |{sample.mbest_val} &minus; {sample.x_current}|
                  </div>
                  <div className="text-sm font-sans bg-slate-50 border border-slate-200 rounded-lg p-2 font-bold text-slate-800">
                    = <span className="text-emerald-700 text-base font-black">{charDistance}</span>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
                  <div className="text-xs font-sans font-extrabold text-purple-800 uppercase tracking-wide">
                    Step 3: Dispersion (&Delta;)
                  </div>
                  <div className="text-xs text-slate-600 font-sans">
                    &beta; = {sample.beta} &bull; <i>u</i> = {sample.u} &bull; ln(1/<i>u</i>) = {lnU}
                  </div>
                  <div className="text-sm font-sans bg-slate-50 border border-slate-200 rounded-lg p-2 font-bold text-slate-800">
                    = {sample.beta} &times; {charDistance} &times; {lnU} = <span className="text-purple-700 text-base font-black">{deltaCalc}</span>
                  </div>
                </div>
              </div>

              {/* Result State */}
              <div className="bg-white border-2 border-blue-400 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-black uppercase tracking-wider text-blue-900 block">
                    Next State: <i>X</i>(<i>t</i> + 1) = <i>p</i> + &Delta;
                  </span>
                  <span className="text-xl font-black text-blue-900 font-sans">{sample.x_next}</span>
                  <span className="text-xs text-slate-500 block">Guided by Trained Model Flow Prior ({sample.modelPriorDesirability ?? 0.76})</span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-500 font-bold block uppercase">Predicted Congestion</span>
                  <span className="text-base font-black text-amber-700 font-sans">{sample.modelPredictedCongestion ?? 1.2}&times;</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
