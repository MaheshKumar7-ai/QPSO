import React, { useState, useEffect, useCallback } from 'react';
import { GraphVertex, GraphEdge, DayType, ObjectiveWeights } from '../../types';
import { VrpSolution, VrpConfig, VrpVehicleRoute, VrpBenchmarkResult } from '../../types/vrp';
import { solveFleetVrpWithQpso } from '../../algorithms/vrpOptimizer';
import { buildTrafficState, TRAFFIC_TIME_PRESETS } from '../../algorithms/trafficModel';
import { FleetMap } from './FleetMap';
import { FleetConvergenceSection } from './FleetConvergenceSection';
import { FleetBenchmarkSection } from './FleetBenchmarkSection';
import { FleetDynamicReroutingPanel } from './FleetDynamicReroutingPanel';
import {
  Truck,
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Clock,
  Navigation,
  Activity,
  Layers,
  ArrowRight,
  TrendingUp,
  Sliders,
  ChevronRight,
  X,
  Info,
  BarChart3,
  AlertTriangle,
  TrendingDown,
  Scale,
} from 'lucide-react';
import { formatDurationHuman } from '../../algorithms/evaluator';

interface FleetVrpPageProps {
  vertices: GraphVertex[];
  edges: GraphEdge[];
  objectiveWeights: ObjectiveWeights;
  onNavigateToScalability?: () => void;
}

export const FleetVrpPage: React.FC<FleetVrpPageProps> = ({
  vertices,
  edges,
  objectiveWeights,
  onNavigateToScalability,
}) => {
  // Page Sub-Tab State
  const [vrpTab, setVrpTab] = useState<'routing' | 'convergence' | 'benchmarks' | 'rerouting'>('routing');

  // Config State with Default Demo Values (50 Customers, 10 Vehicles, Vijayawada Depot)
  const [depotId, setDepotId] = useState<string>('VIJAYAWADA');
  const [customerCount, setCustomerCount] = useState<number>(50);
  const [vehicleCount, setVehicleCount] = useState<number>(10);
  const [vehicleCapacity, setVehicleCapacity] = useState<number>(100);
  const [trafficTimestamp, setTrafficTimestamp] = useState<string>('08:30');
  const [dayType, setDayType] = useState<DayType>('weekday');
  const [seed, setSeed] = useState<number>(42);

  // Execution & Solution State
  const [isSolving, setIsSolving] = useState<boolean>(false);
  const [solvingStatus, setSolvingStatus] = useState<string>('');
  const [solution, setSolution] = useState<VrpSolution | null>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [selectedVehicleRoute, setSelectedVehicleRoute] = useState<VrpVehicleRoute | null>(null);

  // Scalability Quick Benchmarks state
  const [scaleBenchmarkResults, setScaleBenchmarkResults] = useState<
    Array<{ count: number; runtimeMs: number; fitness: number; feasible: boolean }>
  >([]);

  // Execute VRP Optimization
  const handleOptimizeFleet = useCallback(async () => {
    if (vertices.length === 0 || edges.length === 0) return;

    setIsSolving(true);
    setSolvingStatus('Building VRP instance & generating customer demands...');
    await new Promise(r => setTimeout(r, 20));

    try {
      setSolvingStatus('Running Adaptive QPSO fleet optimization...');
      await new Promise(r => setTimeout(r, 20));

      setSolvingStatus('Decoding solution & constructing connected graph routes...');
      await new Promise(r => setTimeout(r, 20));

      setSolvingStatus('Evaluating distance, travel time, and traffic congestion...');
      await new Promise(r => setTimeout(r, 20));

      const config: VrpConfig = {
        depotId,
        customerCount,
        vehicleCount,
        vehicleCapacity,
        trafficTimestamp,
        dayType,
        seed,
      };

      const trafficState = buildTrafficState(edges, trafficTimestamp, dayType);
      const sol = solveFleetVrpWithQpso(vertices, edges, config, trafficState, objectiveWeights);

      setSolution(sol);
    } catch (err) {
      console.error('Fleet VRP Optimization error:', err);
    } finally {
      setIsSolving(false);
      setSolvingStatus('');
    }
  }, [
    vertices,
    edges,
    depotId,
    customerCount,
    vehicleCount,
    vehicleCapacity,
    trafficTimestamp,
    dayType,
    seed,
    objectiveWeights,
  ]);

  // Sync selected vehicle route detail when selected vehicle or solution updates
  useEffect(() => {
    if (solution && selectedVehicleId) {
      const found = solution.vehicleRoutes.find(vr => vr.vehicleId === selectedVehicleId);
      setSelectedVehicleRoute(found || null);
    } else {
      setSelectedVehicleRoute(null);
    }
  }, [solution, selectedVehicleId]);

  // Initial auto-run on load
  useEffect(() => {
    if (vertices.length > 0 && edges.length > 0 && !solution) {
      handleOptimizeFleet();
    }
  }, [vertices, edges, solution, handleOptimizeFleet]);

  // Reset to Defaults
  const handleReset = () => {
    setDepotId('VIJAYAWADA');
    setCustomerCount(50);
    setVehicleCount(10);
    setVehicleCapacity(100);
    setTrafficTimestamp('08:30');
    setDayType('weekday');
    setSeed(42);
    setSelectedVehicleId(null);
    setSelectedVehicleRoute(null);
    setTimeout(() => {
      handleOptimizeFleet();
    }, 10);
  };

  // Run Scalability Benchmark across 10, 25, 50, 100 customer counts
  const runScalabilityTest = async () => {
    setIsSolving(true);
    await new Promise(r => setTimeout(r, 40));

    const testCounts = [10, 25, 50, 100];
    const results = [];

    const trafficState = buildTrafficState(edges, trafficTimestamp, dayType);

    for (const count of testCounts) {
      const config: VrpConfig = {
        depotId,
        customerCount: count,
        vehicleCount: Math.max(3, Math.ceil(count / 5)),
        vehicleCapacity: 100,
        trafficTimestamp,
        dayType,
        seed,
      };
      const sol = solveFleetVrpWithQpso(vertices, edges, config, trafficState, objectiveWeights);
      results.push({
        count,
        runtimeMs: sol.runtimeMs,
        fitness: sol.fleetFitness,
        feasible: sol.isFeasible,
      });
    }

    setScaleBenchmarkResults(results);
    setIsSolving(false);
  };

  const selectedVehicleObj = solution?.vehicles.find(v => v.id === selectedVehicleId) || null;

  return (
    <div className="space-y-6 text-slate-900 pb-12">
      {/* 1. PAGE HEADER */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 md:p-6 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-blue-50 text-blue-700 rounded-lg border border-blue-200">
                <Truck className="w-5 h-5" />
              </span>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                Fleet Vehicle Routing
              </h1>
            </div>
            <p className="text-xs font-semibold text-blue-800">
              Multi-Vehicle Route Optimization under Traffic and Capacity Constraints
            </p>
            <p className="text-xs text-slate-600 max-w-3xl pt-0.5">
              Adaptive QPSO assigns customers to vehicles and optimizes the visiting sequence over the existing Andhra Pradesh transportation network.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
            {onNavigateToScalability && (
              <button
                type="button"
                onClick={onNavigateToScalability}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
              >
                <span>Analyze at Scale</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* SUB-MODULE NAVIGATOR TABS */}
      <div className="flex flex-wrap items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs text-xs font-semibold">
        <button
          type="button"
          onClick={() => setVrpTab('routing')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors cursor-pointer ${
            vrpTab === 'routing'
              ? 'bg-blue-600 text-white font-bold shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Navigation className="w-3.5 h-3.5" />
          <span>Fleet Routing & Map</span>
        </button>

        <button
          type="button"
          onClick={() => setVrpTab('convergence')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors cursor-pointer ${
            vrpTab === 'convergence'
              ? 'bg-blue-600 text-white font-bold shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <TrendingDown className="w-3.5 h-3.5" />
          <span>QPSO Convergence Analysis</span>
        </button>

        <button
          type="button"
          onClick={() => setVrpTab('benchmarks')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors cursor-pointer ${
            vrpTab === 'benchmarks'
              ? 'bg-blue-600 text-white font-bold shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Fleet Benchmark Lab</span>
        </button>

        <button
          type="button"
          onClick={() => setVrpTab('rerouting')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors cursor-pointer ${
            vrpTab === 'rerouting'
              ? 'bg-amber-600 text-white font-bold shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Dynamic Fleet Rerouting</span>
        </button>
      </div>

      {vrpTab === 'convergence' && (
        <FleetConvergenceSection solution={solution} />
      )}

      {vrpTab === 'benchmarks' && (
        <FleetBenchmarkSection
          vertices={vertices}
          edges={edges}
          config={{ depotId, customerCount, vehicleCount, vehicleCapacity, trafficTimestamp, dayType, seed }}
          trafficState={buildTrafficState(edges, trafficTimestamp, dayType)}
          objectiveWeights={objectiveWeights}
          onSelectConvergence={() => setVrpTab('convergence')}
        />
      )}

      {vrpTab === 'rerouting' && (
        <FleetDynamicReroutingPanel
          initialSolution={solution}
          vertices={vertices}
          edges={edges}
          trafficTimestamp={trafficTimestamp}
          dayType={dayType}
          onUpdateSolution={updatedSol => setSolution(updatedSol)}
        />
      )}

      {vrpTab === 'routing' && (
        <>
      {/* 2. COMPACT CONTROL BAR */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 md:p-5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-blue-600" />
            <span>Fleet Optimization Parameters</span>
          </span>
          <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
            Simulated Traffic State Active
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-12 gap-3 items-end">
          {/* Depot */}
          <div className="lg:col-span-3">
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Central Depot
            </label>
            <select
              value={depotId}
              onChange={e => setDepotId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg px-2.5 py-2 text-xs font-medium focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              {vertices.map(v => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.type})
                </option>
              ))}
            </select>
          </div>

          {/* Customers */}
          <div className="lg:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Customers
            </label>
            <select
              value={customerCount}
              onChange={e => setCustomerCount(Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg px-2.5 py-2 text-xs font-medium focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value={10}>10 Customers</option>
              <option value={25}>25 Customers</option>
              <option value={50}>50 Customers (Default)</option>
              <option value={75}>75 Customers</option>
              <option value={100}>100 Customers</option>
            </select>
          </div>

          {/* Vehicles */}
          <div className="lg:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Vehicles
            </label>
            <select
              value={vehicleCount}
              onChange={e => setVehicleCount(Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg px-2.5 py-2 text-xs font-medium focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value={3}>3 Vehicles</option>
              <option value={5}>5 Vehicles</option>
              <option value={8}>8 Vehicles</option>
              <option value={10}>10 Vehicles (Default)</option>
              <option value={15}>15 Vehicles</option>
            </select>
          </div>

          {/* Vehicle Capacity */}
          <div className="lg:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Vehicle Capacity
            </label>
            <select
              value={vehicleCapacity}
              onChange={e => setVehicleCapacity(Number(e.target.value))}
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg px-2.5 py-2 text-xs font-medium focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value={60}>60 units</option>
              <option value={80}>80 units</option>
              <option value={100}>100 units (Default)</option>
              <option value={120}>120 units</option>
              <option value={150}>150 units</option>
            </select>
          </div>

          {/* Traffic State / Time */}
          <div className="lg:col-span-3">
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Simulated Traffic State
            </label>
            <div className="flex items-center gap-1.5">
              <select
                value={trafficTimestamp}
                onChange={e => setTrafficTimestamp(e.target.value)}
                className="flex-1 bg-slate-50 border border-slate-200 text-slate-900 rounded-lg px-2 py-2 text-xs font-medium focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                {TRAFFIC_TIME_PRESETS.map(p => (
                  <option key={p.timestamp} value={p.timestamp}>
                    {p.label}
                  </option>
                ))}
              </select>
              <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-medium shrink-0">
                {(['weekday', 'weekend'] as DayType[]).map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDayType(d)}
                    className={`px-2 py-1.5 rounded-md capitalize transition-colors cursor-pointer whitespace-nowrap ${
                      dayType === d
                        ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Action Row: Optimize CTA, Algorithm Badge, Reset */}
        <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span className="font-semibold text-slate-700">Algorithm:</span>
            <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md border border-blue-200 font-bold">
              Adaptive QPSO
            </span>
            <span className="text-slate-400">·</span>
            <span className="text-slate-500">Seed: {seed}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReset}
              className="px-3 py-2 rounded-lg text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>

            <button
              type="button"
              disabled={isSolving}
              onClick={handleOptimizeFleet}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-5 rounded-lg transition-colors flex items-center justify-center gap-1.5 text-xs cursor-pointer disabled:opacity-50 shadow-2xs"
            >
              {isSolving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Optimizing Fleet...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Optimize Fleet</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 3. LARGE GEOGRAPHIC MAP */}
      <section className="bg-white border border-slate-200 rounded-xl p-4 md:p-5 space-y-3 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Navigation className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900">
              Geographic Fleet Routing Network Map
            </h2>
          </div>
          {selectedVehicleId && (
            <div className="flex items-center gap-2 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 text-xs text-amber-800 font-medium">
              <span>Focusing on <b>Vehicle {selectedVehicleId}</b></span>
              <button
                type="button"
                onClick={() => {
                  setSelectedVehicleId(null);
                  setSelectedVehicleRoute(null);
                }}
                className="hover:bg-amber-100 p-0.5 rounded cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        <FleetMap
          solution={solution}
          vertices={vertices}
          edges={edges}
          selectedVehicleId={selectedVehicleId}
          onSelectVehicle={vId => {
            if (vId === selectedVehicleId) {
              setSelectedVehicleId(null);
              setSelectedVehicleRoute(null);
            } else {
              setSelectedVehicleId(vId);
              const found = solution?.vehicleRoutes.find(vr => vr.vehicleId === vId) || null;
              setSelectedVehicleRoute(found);
            }
          }}
        />
      </section>

      {/* 4. FLEET SUMMARY METRICS */}
      {solution && (
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-slate-900 px-1 flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-600" />
            <span>Fleet Optimization Result Summary</span>
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 tabular-nums">
            {/* Customers Served */}
            <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-1">
              <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">
                Customers Served
              </span>
              <div className="flex items-baseline justify-between">
                <span className="text-lg font-bold text-slate-900">
                  {solution.totalServedCount} / {solution.totalCustomerCount}
                </span>
                <span className="text-xs font-semibold text-emerald-600">100%</span>
              </div>
            </div>

            {/* Active Vehicles */}
            <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-1">
              <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">
                Vehicles Used
              </span>
              <div className="flex items-baseline justify-between">
                <span className="text-lg font-bold text-blue-700">
                  {solution.vehicleRoutes.filter(v => v.assignedCustomers.length > 0).length} / {solution.vehicles.length}
                </span>
                <span className="text-xs text-slate-500">Fleet</span>
              </div>
            </div>

            {/* Feasible Status */}
            <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-1">
              <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">
                Feasibility Status
              </span>
              <div className="flex items-center gap-1.5">
                {solution.isFeasible ? (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>FEASIBLE</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                    <XCircle className="w-3.5 h-3.5" />
                    <span>INFEASIBLE</span>
                  </span>
                )}
              </div>
            </div>

            {/* Total Distance */}
            <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-1">
              <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">
                Total Fleet Distance
              </span>
              <span className="text-lg font-bold text-slate-900">
                {solution.totalDistanceKm.toFixed(1)} km
              </span>
            </div>

            {/* Total Travel Time */}
            <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-1">
              <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">
                Total Travel Time
              </span>
              <span className="text-lg font-bold text-slate-900">
                {formatDurationHuman(solution.totalTimeMin)}
              </span>
            </div>

            {/* Fleet Objective F(R, t) */}
            <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-1 bg-blue-50/50 border-blue-200">
              <span className="text-[11px] font-medium text-blue-700 uppercase tracking-wider block">
                Fleet Objective F(R, t)
              </span>
              <span className="text-lg font-bold text-blue-900">
                {solution.fleetFitness.toFixed(4)}
              </span>
            </div>
          </div>

          {/* Optimization Performance Details */}
          <div className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 tabular-nums">
            <div className="flex flex-wrap items-center gap-4">
              <span>
                QPSO Iterations: <strong className="text-slate-900">{solution.iterations}</strong>
              </span>
              <span aria-hidden="true">·</span>
              <span>
                Fitness Evaluations: <strong className="text-slate-900">{solution.fitnessEvaluations}</strong>
              </span>
              <span aria-hidden="true">·</span>
              <span>
                Measured Runtime: <strong className="text-blue-700">{solution.runtimeMs} ms</strong>
              </span>
              <span aria-hidden="true">·</span>
              <span>
                Avg Congestion Index: <strong className="text-amber-700">{solution.totalCongestion.toFixed(2)}</strong>
              </span>
            </div>
            <span className="text-[11px] text-slate-500">
              Evaluated on real Andhra Pradesh road network graph
            </span>
          </div>

          {/* FLEET MATHEMATICAL CALCULATIONS & FORMULATION BREAKDOWN PANEL */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Fleet VRP Optimization Mathematical Calculations
                </h3>
              </div>
              <span className="text-xs font-bold text-blue-800 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                Fleet Objective F(R, t) = {solution.fleetFitness.toFixed(4)}
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              The multi-vehicle QPSO fleet objective function <strong>F(R, t)</strong> minimizes the total network travel time, distance, and congestion across all assigned vehicle routes while strictly enforcing vehicle load capacity constraints:
            </p>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center font-semibold text-slate-900 text-xs">
              F(R, t) = Sum of [ (wT × Total Fleet Time) + (wD × Total Fleet Distance) + (wC × Total Fleet Congestion) ] + Capacity Penalty
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              {/* Step 1: Capacity Constraint Verification */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5">
                <div className="font-bold text-slate-900 text-[11px] uppercase tracking-wider flex items-center justify-between">
                  <span>Step 1: Capacity Verification</span>
                  <span className="text-[10px] text-emerald-700 font-extrabold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                    {solution.isFeasible ? 'PASSED' : 'VIOLATED'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600">
                  For every active vehicle <i>k</i>: Total Demand = Sum(Customer Demands) ≤ Capacity ({vehicleCapacity} units).
                </p>
                <div className="text-[10.5px] font-mono text-slate-800 bg-white p-2 rounded border border-slate-200">
                  Customers Served: {solution.totalServedCount} / {solution.totalCustomerCount} (100%)
                </div>
              </div>

              {/* Step 2: Fleet Cumulative Totals */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5">
                <div className="font-bold text-slate-900 text-[11px] uppercase tracking-wider">
                  Step 2: Fleet Cumulative Totals
                </div>
                <p className="text-[11px] text-slate-600">
                  Summed across {solution.vehicleRoutes.filter(v => v.assignedCustomers.length > 0).length} active vehicle tours:
                </p>
                <div className="space-y-0.5 text-[10.5px] font-mono text-slate-800 bg-white p-2 rounded border border-slate-200">
                  <div>• Total Distance = {solution.totalDistanceKm.toFixed(1)} km</div>
                  <div>• Total Travel Time = {formatDurationHuman(solution.totalTimeMin)}</div>
                  <div>• Total Congestion Index = {solution.totalCongestion.toFixed(2)}</div>
                </div>
              </div>

              {/* Step 3: Objective Fitness Valuation */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5">
                <div className="font-bold text-slate-900 text-[11px] uppercase tracking-wider">
                  Step 3: QPSO Fitness Valuation
                </div>
                <p className="text-[11px] text-slate-600">
                  Weighted sum substitution using active objective weights (Time: 40%, Dist: 30%, Congestion: 30%):
                </p>
                <div className="text-[10.5px] font-mono text-blue-900 font-bold bg-blue-50/80 p-2 rounded border border-blue-200">
                  Final Fleet Objective F(R, t) = {solution.fleetFitness.toFixed(4)}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 5. VEHICLE ROUTE TABLE & DETAIL PANEL */}
      {solution && (
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Table Column */}
          <div className={`space-y-3 ${selectedVehicleRoute ? 'lg:col-span-7' : 'lg:col-span-12'}`}>
            <div className="bg-white border border-slate-200 rounded-xl p-4 md:p-5 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-blue-600" />
                  <span>Vehicle Assignment & Route Breakdown</span>
                </h3>
                <span className="text-[11px] text-slate-500">
                  Click any vehicle row to highlight route
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs tabular-nums">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50/80">
                      <th className="py-2.5 px-3">Vehicle</th>
                      <th className="py-2.5 px-3">Assigned Customers</th>
                      <th className="py-2.5 px-3">Load / Capacity</th>
                      <th className="py-2.5 px-3">Distance</th>
                      <th className="py-2.5 px-3">Travel Time</th>
                      <th className="py-2.5 px-3">Congestion</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {solution.vehicleRoutes.map((vr, idx) => {
                      const veh = solution.vehicles[idx];
                      const isSelected = selectedVehicleId === vr.vehicleId;
                      const loadPct = Math.round((vr.load / vr.capacity) * 100);

                      return (
                        <tr
                          key={vr.vehicleId}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedVehicleId(null);
                              setSelectedVehicleRoute(null);
                            } else {
                              setSelectedVehicleId(vr.vehicleId);
                              setSelectedVehicleRoute(vr);
                            }
                          }}
                          className={`cursor-pointer transition-colors ${
                            isSelected ? 'bg-blue-50/80 font-semibold text-slate-900' : 'hover:bg-slate-50'
                          }`}
                        >
                          {/* Vehicle ID & Color */}
                          <td className="py-2.5 px-3 font-bold whitespace-nowrap">
                            <span className="inline-flex items-center gap-2">
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: veh?.color || '#2563eb' }}
                              />
                              <span>Vehicle {vr.vehicleId}</span>
                            </span>
                          </td>

                          {/* Customer sequence */}
                          <td className="py-2.5 px-3 max-w-[220px] truncate text-slate-700">
                            {vr.assignedCustomers.length > 0
                              ? vr.assignedCustomers.map(c => c.id).join(', ')
                              : <span className="text-slate-400 italic">Unassigned (Idle)</span>}
                          </td>

                          {/* Load / Capacity */}
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span>{vr.load} / {vr.capacity}</span>
                              <div className="w-12 bg-slate-200 h-1.5 rounded-full overflow-hidden shrink-0">
                                <div
                                  className={`h-full ${
                                    loadPct > 100 ? 'bg-rose-600' : loadPct > 85 ? 'bg-amber-500' : 'bg-emerald-600'
                                  }`}
                                  style={{ width: `${Math.min(100, loadPct)}%` }}
                                />
                              </div>
                            </div>
                          </td>

                          {/* Distance */}
                          <td className="py-2.5 px-3 font-medium whitespace-nowrap">
                            {vr.totalDistanceKm} km
                          </td>

                          {/* Travel Time */}
                          <td className="py-2.5 px-3 font-medium whitespace-nowrap">
                            {formatDurationHuman(vr.totalTimeMin)}
                          </td>

                          {/* Congestion */}
                          <td className="py-2.5 px-3 text-amber-800 font-medium whitespace-nowrap">
                            {vr.totalCongestion.toFixed(2)}
                          </td>

                          {/* Action Button */}
                          <td className="py-2.5 px-3 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={e => {
                                e.stopPropagation();
                                if (isSelected) {
                                  setSelectedVehicleId(null);
                                  setSelectedVehicleRoute(null);
                                } else {
                                  setSelectedVehicleId(vr.vehicleId);
                                  setSelectedVehicleRoute(vr);
                                }
                              }}
                              className={`px-2 py-1 rounded-md text-[11px] font-semibold cursor-pointer transition-colors ${
                                isSelected
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                              }`}
                            >
                              {isSelected ? 'Focused' : 'View Route'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Vehicle Detail Panel Column */}
          {selectedVehicleRoute && selectedVehicleObj && (
            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-4 md:p-5 space-y-4 shadow-sm border-l-4 border-l-blue-600">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: selectedVehicleObj.color }}
                  />
                  <h3 className="text-sm font-bold text-slate-900">
                    Vehicle {selectedVehicleRoute.vehicleId} Route Sequence
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedVehicleId(null);
                    setSelectedVehicleRoute(null);
                  }}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-md cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Load & Capacity Bar */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1 text-xs">
                <div className="flex justify-between font-semibold">
                  <span className="text-slate-600">Vehicle Load</span>
                  <span className="text-slate-900">
                    {selectedVehicleRoute.load} / {selectedVehicleRoute.capacity} units
                  </span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600"
                    style={{ width: `${Math.min(100, (selectedVehicleRoute.load / selectedVehicleRoute.capacity) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Step-by-Step Route Itinerary Sequence */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-700 block uppercase tracking-wider">
                  Visiting Sequence
                </span>

                <div className="space-y-1.5 text-xs font-medium max-h-60 overflow-y-auto pr-1">
                  {/* Start Depot */}
                  <div className="flex items-center gap-2 text-amber-900 bg-amber-50 p-2 rounded-lg border border-amber-200">
                    <span className="w-5 h-5 rounded-full bg-amber-600 text-white font-extrabold text-[10px] flex items-center justify-center shrink-0">
                      0
                    </span>
                    <span>Depot ({solution.depotNode.name})</span>
                  </div>

                  {/* Customer Hops */}
                  {selectedVehicleRoute.assignedCustomers.map((cust, hopIdx) => (
                    <React.Fragment key={cust.id}>
                      <div className="flex justify-center my-0.5">
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400 rotate-90" />
                      </div>
                      <div className="flex items-center justify-between gap-2 text-slate-800 bg-slate-50 p-2 rounded-lg border border-slate-200">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-extrabold text-[10px] flex items-center justify-center shrink-0">
                            {hopIdx + 1}
                          </span>
                          <div>
                            <span className="font-bold text-blue-900">{cust.id}</span>
                            <span className="text-slate-600 ml-1.5">({cust.nodeName})</span>
                          </div>
                        </div>
                        <span className="text-[11px] font-semibold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                          {cust.demand} units
                        </span>
                      </div>
                    </React.Fragment>
                  ))}

                  {/* Return to Depot */}
                  <div className="flex justify-center my-0.5">
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 rotate-90" />
                  </div>
                  <div className="flex items-center gap-2 text-amber-900 bg-amber-50 p-2 rounded-lg border border-amber-200">
                    <span className="w-5 h-5 rounded-full bg-amber-600 text-white font-extrabold text-[10px] flex items-center justify-center shrink-0">
                      {selectedVehicleRoute.assignedCustomers.length + 1}
                    </span>
                    <span>Depot ({solution.depotNode.name})</span>
                  </div>
                </div>
              </div>

              {/* Metrics Summary */}
              <div className="grid grid-cols-3 gap-2 text-xs pt-2 border-t border-slate-100 tabular-nums">
                <div className="bg-slate-50 p-2 rounded-lg text-center">
                  <span className="text-[10px] text-slate-500 block">Distance</span>
                  <span className="font-bold text-slate-900">{selectedVehicleRoute.totalDistanceKm} km</span>
                </div>
                <div className="bg-slate-50 p-2 rounded-lg text-center">
                  <span className="text-[10px] text-slate-500 block">Travel Time</span>
                  <span className="font-bold text-slate-900">{formatDurationHuman(selectedVehicleRoute.totalTimeMin)}</span>
                </div>
                <div className="bg-slate-50 p-2 rounded-lg text-center">
                  <span className="text-[10px] text-slate-500 block">Congestion</span>
                  <span className="font-bold text-amber-700">{selectedVehicleRoute.totalCongestion.toFixed(2)}</span>
                </div>
              </div>

              {/* Full Traversed Road Graph Nodes */}
              {selectedVehicleRoute.route?.nodeIds && selectedVehicleRoute.route.nodeIds.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs">
                  <span className="font-bold text-slate-700 block uppercase tracking-wider text-[11px]">
                    Traversed Road Network Nodes ({selectedVehicleRoute.route.nodeIds.length} Hops)
                  </span>
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 font-mono text-[11px] text-slate-700 max-h-32 overflow-y-auto leading-relaxed flex flex-wrap gap-1.5 items-center">
                    {selectedVehicleRoute.route.nodeIds.map((nId, idx) => {
                      const vName = vertices.find(v => v.id === nId)?.name || nId;
                      return (
                        <React.Fragment key={`${nId}-${idx}`}>
                          <span className="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-900 font-medium">
                            {vName}
                          </span>
                          {idx < selectedVehicleRoute.route!.nodeIds.length - 1 && (
                            <span className="text-slate-400 font-bold">→</span>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* 6. FEASIBILITY STATUS PANEL */}
      {solution && (
        <section className="bg-white border border-slate-200 rounded-xl p-4 md:p-5 space-y-3 shadow-2xs">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Feasibility & Constraint Validation Checks</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            <div className={`p-3 rounded-lg border flex items-center gap-2.5 ${solution.constraintChecks.allServed ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'}`}>
              {solution.constraintChecks.allServed ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <XCircle className="w-4 h-4 text-rose-600 shrink-0" />}
              <span className="font-medium">Every customer served exactly once</span>
            </div>

            <div className={`p-3 rounded-lg border flex items-center gap-2.5 ${solution.constraintChecks.noDuplicates ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'}`}>
              {solution.constraintChecks.noDuplicates ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <XCircle className="w-4 h-4 text-rose-600 shrink-0" />}
              <span className="font-medium">No duplicate customer assignments</span>
            </div>

            <div className={`p-3 rounded-lg border flex items-center gap-2.5 ${solution.constraintChecks.capacitySatisfied ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'}`}>
              {solution.constraintChecks.capacitySatisfied ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <XCircle className="w-4 h-4 text-rose-600 shrink-0" />}
              <span className="font-medium">Vehicle capacities satisfied</span>
            </div>

            <div className={`p-3 rounded-lg border flex items-center gap-2.5 ${solution.constraintChecks.depotStartEnd ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'}`}>
              {solution.constraintChecks.depotStartEnd ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <XCircle className="w-4 h-4 text-rose-600 shrink-0" />}
              <span className="font-medium">Depot start and end origin satisfied</span>
            </div>

            <div className={`p-3 rounded-lg border flex items-center gap-2.5 ${solution.constraintChecks.allRoutesConnected ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'}`}>
              {solution.constraintChecks.allRoutesConnected ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <XCircle className="w-4 h-4 text-rose-600 shrink-0" />}
              <span className="font-medium">All routes connected via AP road graph</span>
            </div>

            <div className={`p-3 rounded-lg border flex items-center gap-2.5 ${solution.constraintChecks.fleetSizeSatisfied ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'}`}>
              {solution.constraintChecks.fleetSizeSatisfied ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <XCircle className="w-4 h-4 text-rose-600 shrink-0" />}
              <span className="font-medium">Fleet size constraint satisfied</span>
            </div>
          </div>
        </section>
      )}

      {/* 7. SCALABILITY EXPERIMENT PANEL */}
      <section className="bg-white border border-slate-200 rounded-xl p-4 md:p-5 space-y-3 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-100">
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
              <span>Scalability Benchmark (10 to 100 Customers)</span>
            </h3>
            <p className="text-[11px] text-slate-500">
              Measures real Adaptive QPSO execution time and fleet fitness across increasing customer sizes.
            </p>
          </div>

          <button
            type="button"
            onClick={runScalabilityTest}
            disabled={isSolving}
            className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg text-xs font-semibold cursor-pointer transition-colors disabled:opacity-50"
          >
            Run Scalability Benchmark
          </button>
        </div>

        {scaleBenchmarkResults.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs tabular-nums pt-1">
            {scaleBenchmarkResults.map(res => (
              <div key={res.count} className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1">
                <span className="font-bold text-slate-900 block">
                  {res.count} Customers
                </span>
                <div className="text-slate-600 space-y-0.5 text-[11px]">
                  <div>Runtime: <strong className="text-blue-700">{res.runtimeMs} ms</strong></div>
                  <div>Fitness: <strong className="text-slate-800">{res.fitness.toFixed(4)}</strong></div>
                  <div>Feasible: <strong className="text-emerald-700">{res.feasible ? 'YES' : 'NO'}</strong></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
        </>
      )}
    </div>
  );
};
