import React, { useState, useEffect } from 'react';
import { GraphVertex, GraphEdge, IncidentType, DayType } from '../../types';
import { VrpSolution, VrpDynamicRerouteState, VrpVehicleImpact } from '../../types/vrp';
import { solveDynamicFleetReroute } from '../../algorithms/vrpOptimizer';
import { buildTrafficState } from '../../algorithms/trafficModel';
import { FleetMap } from './FleetMap';
import {
  AlertTriangle,
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Truck,
  TrendingUp,
  Activity,
  ArrowRight,
  ShieldAlert,
  Info,
} from 'lucide-react';
import { formatDurationHuman } from '../../algorithms/evaluator';

interface FleetDynamicReroutingPanelProps {
  initialSolution: VrpSolution | null;
  vertices: GraphVertex[];
  edges: GraphEdge[];
  trafficTimestamp: string;
  dayType: DayType;
  onUpdateSolution?: (updatedSol: VrpSolution) => void;
}

export const FleetDynamicReroutingPanel: React.FC<FleetDynamicReroutingPanelProps> = ({
  initialSolution,
  vertices,
  edges,
  trafficTimestamp,
  dayType,
  onUpdateSolution,
}) => {
  // Disruption State
  const [selectedEdgeId, setSelectedEdgeId] = useState<string>('');
  const [selectedIncidentType, setSelectedIncidentType] = useState<IncidentType>('accident');
  const [rerouteState, setRerouteState] = useState<VrpDynamicRerouteState | null>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  // Automatically select an edge traversed by the fleet when solution updates
  useEffect(() => {
    if (initialSolution && initialSolution.vehicleRoutes.length > 0) {
      for (const vr of initialSolution.vehicleRoutes) {
        if (vr.route && vr.route.segments.length > 0) {
          const edgeId = vr.route.segments[0].edge.id;
          setSelectedEdgeId(edgeId);
          break;
        }
      }
    }
  }, [initialSolution]);

  if (!initialSolution) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-8 text-center space-y-3">
        <Truck className="w-10 h-10 text-slate-400 mx-auto" />
        <h3 className="text-sm font-bold text-slate-900">No Active Fleet Solution Found</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Please run "Optimize Fleet" on the Fleet VRP page first to generate a fleet routing instance before simulating traffic incidents.
        </p>
      </div>
    );
  }

  // Find graph edges actually traversed by at least one vehicle in the fleet
  const traversedEdgeIds = new Set<string>();
  initialSolution.vehicleRoutes.forEach(vr => {
    vr.route?.segments.forEach(seg => traversedEdgeIds.add(seg.edge.id));
  });

  const fleetEdges = edges.filter(e => traversedEdgeIds.has(e.id));
  const candidateEdges = fleetEdges.length > 0 ? fleetEdges : edges.slice(0, 15);

  const selectedEdgeObj = edges.find(e => e.id === selectedEdgeId) || candidateEdges[0];

  // Execute Dynamic Fleet Rerouting
  const handleSimulateDisruption = async () => {
    if (!selectedEdgeObj) return;

    setIsSimulating(true);
    await new Promise(r => setTimeout(r, 40));

    try {
      const trafficMultiplier =
        selectedIncidentType === 'road_block'
          ? 999
          : selectedIncidentType === 'heavy_traffic'
          ? 2.9
          : 3.5;

      const updatedEdges = edges.map(edge => {
        if (edge.id === selectedEdgeObj.id) {
          return {
            ...edge,
            incident: {
              type: selectedIncidentType,
              description: `Dynamic incident reported on ${edge.roadName}`,
              trafficMultiplier,
              riskAddition: 4.0,
              reducedSpeedKmH: Math.max(10, Math.floor(edge.baseSpeedKmH / trafficMultiplier)),
              isBlocked: selectedIncidentType === 'road_block',
            },
          };
        }
        return edge;
      });

      const updatedTrafficState = buildTrafficState(updatedEdges, trafficTimestamp, dayType);
      const res = solveDynamicFleetReroute(
        initialSolution,
        vertices,
        updatedEdges,
        selectedEdgeObj.id,
        selectedIncidentType,
        updatedTrafficState
      );

      setRerouteState(res);
      if (onUpdateSolution) {
        onUpdateSolution(res.updatedSolution);
      }
    } catch (err) {
      console.error('Dynamic Fleet Reroute error:', err);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleResetDisruption = () => {
    setRerouteState(null);
    setSelectedVehicleId(null);
  };

  const activeSolution = rerouteState ? rerouteState.updatedSolution : initialSolution;

  return (
    <div className="space-y-6 text-slate-900 pb-12">
      {/* HEADER */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-1">
        <div className="flex items-center gap-2">
          <span className="p-1.5 bg-amber-50 text-amber-800 rounded-lg border border-amber-200">
            <AlertTriangle className="w-5 h-5" />
          </span>
          <h2 className="text-lg font-bold text-slate-900">
            Dynamic Fleet Rerouting & Traffic Disruption
          </h2>
        </div>
        <p className="text-xs font-semibold text-amber-900">
          Real-Time Traffic Incident Response & Affected Vehicle Re-Optimization
        </p>
        <p className="text-xs text-slate-600 max-w-3xl pt-0.5">
          Simulate traffic bottlenecks, accidents, or roadblocks on specific Andhra Pradesh road network segments. Adaptive QPSO re-evaluates affected vehicles while keeping unaffected fleet routes stable.
        </p>
      </div>

      {/* DISRUPTION CONTROLS */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 md:p-5 shadow-2xs space-y-3">
        <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-100">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
          <span>Select Road Edge Disruption</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          {/* Edge Selector */}
          <div className="md:col-span-6">
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Disrupted Highway Corridor Segment
            </label>
            <select
              value={selectedEdgeId}
              onChange={e => setSelectedEdgeId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg px-2.5 py-2 text-xs font-medium focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              {candidateEdges.map(e => {
                const fromName = vertices.find(v => v.id === e.from)?.name || e.from;
                const toName = vertices.find(v => v.id === e.to)?.name || e.to;
                return (
                  <option key={e.id} value={e.id}>
                    {e.roadName} ({fromName} → {toName}) - {e.distanceKm} km
                  </option>
                );
              })}
            </select>
          </div>

          {/* Incident Type */}
          <div className="md:col-span-3">
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Traffic Incident Type
            </label>
            <select
              value={selectedIncidentType}
              onChange={e => setSelectedIncidentType(e.target.value as IncidentType)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-lg px-2.5 py-2 text-xs font-medium focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="heavy_traffic">Heavy Traffic Bottleneck (2.9x delay)</option>
              <option value="accident">Severe Traffic Accident (3.5x delay)</option>
              <option value="road_block">Complete Corridor Blockade (Blocked)</option>
            </select>
          </div>

          {/* Buttons */}
          <div className="md:col-span-3 flex items-center gap-2">
            {rerouteState && (
              <button
                type="button"
                onClick={handleResetDisruption}
                className="px-3 py-2 rounded-lg text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 cursor-pointer transition-colors"
              >
                Reset Incident
              </button>
            )}

            <button
              type="button"
              disabled={isSimulating}
              onClick={handleSimulateDisruption}
              className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-1.5 text-xs cursor-pointer disabled:opacity-50 shadow-2xs"
            >
              {isSimulating ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Re-Optimizing...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Simulate & Reroute</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* REROUTING MAP */}
      <section className="bg-white border border-slate-200 rounded-xl p-4 md:p-5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-amber-600" />
            <span>Geographic Fleet Rerouting Map</span>
          </h3>
          {rerouteState && (
            <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
              {rerouteState.reroutedVehicleCount} of {rerouteState.affectedVehicleCount} Affected Vehicles Rerouted
            </span>
          )}
        </div>

        <FleetMap
          solution={activeSolution}
          vertices={vertices}
          edges={edges}
          selectedVehicleId={selectedVehicleId}
          onSelectVehicle={vId => setSelectedVehicleId(vId === selectedVehicleId ? null : vId)}
        />
      </section>

      {/* BEFORE VS AFTER FLEET METRICS COMPARISON */}
      {rerouteState && (
        <section className="space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            <span>Fleet Impact & Delta Metrics</span>
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 tabular-nums">
            {/* Affected Vehicles */}
            <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-1">
              <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">
                Affected Vehicles
              </span>
              <span className="text-lg font-bold text-amber-800">
                {rerouteState.affectedVehicleCount} / {rerouteState.initialSolution.vehicles.length}
              </span>
            </div>

            {/* Total Distance Delta */}
            <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-1">
              <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">
                Fleet Distance Delta
              </span>
              <span className={`text-lg font-bold ${rerouteState.totalDistanceDeltaKm > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                {rerouteState.totalDistanceDeltaKm > 0 ? `+${rerouteState.totalDistanceDeltaKm}` : rerouteState.totalDistanceDeltaKm} km
              </span>
            </div>

            {/* Total Travel Time Delta */}
            <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-1">
              <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">
                Fleet Travel Time Delta
              </span>
              <span className={`text-lg font-bold ${rerouteState.totalTimeDeltaMin > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                {rerouteState.totalTimeDeltaMin > 0 ? `+${rerouteState.totalTimeDeltaMin}` : rerouteState.totalTimeDeltaMin} min
              </span>
            </div>

            {/* Fleet Objective Delta */}
            <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-1 bg-amber-50/50 border-amber-200">
              <span className="text-[11px] font-medium text-amber-900 uppercase tracking-wider block">
                Objective Delta ΔF
              </span>
              <span className="text-lg font-bold text-amber-900">
                {rerouteState.totalFitnessDelta > 0 ? `+${rerouteState.totalFitnessDelta}` : rerouteState.totalFitnessDelta}
              </span>
            </div>
          </div>

          {/* PER-VEHICLE IMPACT BREAKDOWN TABLE */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 md:p-5 space-y-3 shadow-2xs">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100">
              Per-Vehicle Dynamic Rerouting Breakdown
            </h4>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs tabular-nums">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50/80">
                    <th className="py-2.5 px-3">Vehicle</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Initial Dist / Time</th>
                    <th className="py-2.5 px-3">Updated Dist / Time</th>
                    <th className="py-2.5 px-3">Time Delta</th>
                    <th className="py-2.5 px-3">Fitness ΔF</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rerouteState.vehicleImpacts.map(imp => {
                    return (
                      <tr
                        key={imp.vehicleId}
                        onClick={() => setSelectedVehicleId(imp.vehicleId === selectedVehicleId ? null : imp.vehicleId)}
                        className={`cursor-pointer transition-colors ${
                          selectedVehicleId === imp.vehicleId ? 'bg-amber-50 font-semibold' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="py-2.5 px-3 font-bold whitespace-nowrap">
                          Vehicle {imp.vehicleId}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                              imp.status === 'Rerouted'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : imp.status === 'Route Retained'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {imp.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap">
                          {imp.initialRoute.totalDistanceKm} km / {imp.initialRoute.totalTimeMin} min
                        </td>
                        <td className="py-2.5 px-3 text-slate-900 font-medium whitespace-nowrap">
                          {imp.updatedRoute.totalDistanceKm} km / {imp.updatedRoute.totalTimeMin} min
                        </td>
                        <td className="py-2.5 px-3 font-semibold whitespace-nowrap">
                          <span className={imp.timeDeltaMin > 0 ? 'text-amber-700' : 'text-emerald-700'}>
                            {imp.timeDeltaMin > 0 ? `+${imp.timeDeltaMin}` : imp.timeDeltaMin} min
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-800 whitespace-nowrap">
                          {imp.fitnessDelta > 0 ? `+${imp.fitnessDelta}` : imp.fitnessDelta}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};
