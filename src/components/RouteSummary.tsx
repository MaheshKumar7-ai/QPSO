import React from 'react';
import { EvaluatedRoute, VehicleType, OptimizationMode } from '../types';
import { formatDurationHuman, getTrafficCategory, getRiskCategory } from '../algorithms/evaluator';
import { ArrowRight, Car, Bike, Bus, Truck, ShieldAlert } from 'lucide-react';

interface RouteSummaryProps {
  route: EvaluatedRoute | null;
  shortestRoute?: EvaluatedRoute | null;
  vehicle: VehicleType;
  mode: OptimizationMode;
  currentTimeString: string;
  isSimulatedTraffic: boolean;
  onViewDetails: () => void;
}

export const RouteSummary: React.FC<RouteSummaryProps> = ({
  route,
  shortestRoute,
  vehicle,
  mode,
  currentTimeString,
  isSimulatedTraffic,
  onViewDetails,
}) => {
  const getVehicleIcon = () => {
    switch (vehicle) {
      case 'car': return <Car className="w-5 h-5 text-blue-600 inline mr-1.5" />;
      case 'bike': return <Bike className="w-5 h-5 text-blue-600 inline mr-1.5" />;
      case 'bus': return <Bus className="w-5 h-5 text-blue-600 inline mr-1.5" />;
      case 'truck': return <Truck className="w-5 h-5 text-blue-600 inline mr-1.5" />;
      case 'emergency': return <ShieldAlert className="w-5 h-5 text-red-600 inline mr-1.5" />;
    }
  };

  const getVehicleLabel = () => {
    switch (vehicle) {
      case 'car': return 'Car';
      case 'bike': return 'Bike';
      case 'bus': return 'Bus';
      case 'truck': return 'Truck';
      case 'emergency': return 'Emergency Vehicle';
    }
  };

  const getModeLabel = () => {
    switch (mode) {
      case 'fastest': return 'Fastest Route';
      case 'balanced': return 'Balanced Route';
      case 'safer': return 'Safer Route';
      default: return 'Fastest Route';
    }
  };

  if (!route) {
    return (
      <div className="w-full bg-white border border-blue-200 rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl border border-blue-200 shrink-0">
            <ArrowRight className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight">
              Ready to Optimize Route
            </h2>
            <p className="text-xs text-slate-600 font-medium mt-0.5">
              Select your Start, Destination, Vehicle Type, and Goal above, then click <span className="font-extrabold text-blue-700">Calculate Route</span> to display the path on the map.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!route.isFeasible) {
    return (
      <div className="w-full bg-white border border-rose-300 rounded-2xl p-6 shadow-xs">
        <h2 className="text-xl font-black text-rose-700">
          NO FEASIBLE ROUTE FOUND
        </h2>
        <p className="text-sm text-slate-700 mt-2 font-medium">
          {route.infeasibilityReason || 'No connected road path found under current vehicle restrictions or road incidents.'}
        </p>
      </div>
    );
  }

  const trafficLabel = getTrafficCategory(route.averageTrafficFactor);
  const riskLabel = getRiskCategory(route.averageRisk);

  return (
    <div className="w-full bg-white border border-slate-200 rounded-2xl p-5 md:p-6 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-xs uppercase font-extrabold px-2.5 py-1 rounded bg-blue-50 text-blue-800 border border-blue-200">
              Optimal Route Summary
            </span>
            {shortestRoute && (
              <span className="text-xs font-bold px-2.5 py-1 rounded bg-sky-50 text-sky-800 border border-sky-200">
                🩵 Geometric Shortest Path: {shortestRoute.totalDistanceKm} km
              </span>
            )}
          </div>
          <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
            {getModeLabel()} • {getVehicleLabel()}
          </h2>
        </div>

        <div className="text-left sm:text-right text-xs text-slate-600 font-semibold">
          <div>Active Time: <span className="font-extrabold text-slate-900">{currentTimeString}</span></div>
          <div className="mt-0.5 text-blue-800 font-bold">Dynamic Traffic Conditions</div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-4">
        {/* Vehicle */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
          <span className="text-[11px] text-slate-500 block uppercase font-bold">Vehicle</span>
          <div className="text-lg font-black text-slate-900 mt-1 flex items-center">
            {getVehicleIcon()}
            <span>{getVehicleLabel()}</span>
          </div>
        </div>

        {/* Mode */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
          <span className="text-[11px] text-slate-500 block uppercase font-bold">Mode</span>
          <div className="text-lg font-black text-slate-900 mt-1 capitalize">
            {mode}
          </div>
        </div>

        {/* Distance */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
          <span className="text-[11px] text-slate-500 block uppercase font-bold">Distance</span>
          <div className="text-xl font-black text-slate-900 mt-1">
            {route.totalDistanceKm} <span className="text-xs font-bold text-slate-500">km</span>
          </div>
        </div>

        {/* Travel Time */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5">
          <span className="text-[11px] text-blue-900 block uppercase font-bold">Travel Time</span>
          <div className="text-xl font-black text-blue-950 mt-1">
            {formatDurationHuman(route.totalTimeMin)}
          </div>
        </div>

        {/* Traffic */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
          <span className="text-[11px] text-slate-500 block uppercase font-bold">Traffic</span>
          <div className="text-lg font-black text-slate-900 mt-1 flex items-center gap-1.5">
            <span>{trafficLabel}</span>
            <span className="text-xs text-slate-500 font-bold">({route.averageTrafficFactor}&times;)</span>
          </div>
        </div>

        {/* Cost Score */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5">
          <span className="text-[11px] text-emerald-900 block uppercase font-bold">Cost Score</span>
          <div className="text-xl font-black text-emerald-950 mt-1">
            {route.fitness}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between pt-3 border-t border-slate-100 gap-3">
        <div className="text-xs text-slate-600 font-semibold">
          Road Segments: <span className="font-black text-slate-900">{route.segments.length} segments</span>
        </div>
        <button
          onClick={onViewDetails}
          id="btn-view-route-details"
          className="text-xs font-bold text-blue-700 hover:text-blue-900 flex items-center gap-1.5 cursor-pointer bg-blue-50 hover:bg-blue-100 px-3.5 py-1.5 rounded-lg border border-blue-200 transition-colors"
        >
          <span>View Turn-by-Turn Route</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
