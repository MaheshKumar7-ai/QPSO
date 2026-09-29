import React, { useState } from 'react';
import { EvaluatedRoute, VehicleType, GraphVertex, GraphEdge, IncidentType } from '../types';
import { formatDurationHuman } from '../algorithms/evaluator';
import { Play, Pause, RotateCcw, FastForward, Car, Bike, Bus, Truck, ShieldAlert, AlertTriangle, Navigation, MapPin, Construction, Waves } from 'lucide-react';

export interface JourneySimulationState {
  isSimulating: boolean;
  isPaused: boolean;
  speedMultiplier: number;
  currentNodeIndex: number; // Index in route.nodeIds
  subStepIndex?: number;
  currentNodeId: string;
  nextNodeId: string | null;
  currentCoords: { lat: number; lng: number } | null;
  traveledNodeIds: string[];
  traveledDistanceKm: number;
  traveledTimeMin: number;
  progressPercent: number;
  hasArrived: boolean;
}

interface JourneyControllerProps {
  simState: JourneySimulationState;
  activeRoute: EvaluatedRoute | null;
  startNode: GraphVertex | null;
  destNode: GraphVertex | null;
  vehicleType: VehicleType;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  onSpeedChange: (speed: number) => void;
  onTriggerIncident: (type: IncidentType) => void;
}

export const JourneyController: React.FC<JourneyControllerProps> = ({
  simState,
  activeRoute,
  startNode,
  destNode,
  vehicleType,
  onStart,
  onPause,
  onResume,
  onReset,
  onSpeedChange,
  onTriggerIncident,
}) => {
  const [selectedIncidentType, setSelectedIncidentType] = useState<IncidentType>('road_block');

  if (!activeRoute || !activeRoute.isFeasible) return null;

  const currNodeName = simState.currentNodeId || startNode?.name || 'Origin';
  const nextNodeName = simState.nextNodeId || 'Destination Hub';

  const remainingDist = Math.max(0, Number((activeRoute.totalDistanceKm - simState.traveledDistanceKm).toFixed(1)));
  const remainingTime = Math.max(0, Number((activeRoute.totalTimeMin - simState.traveledTimeMin).toFixed(1)));

  const getVehicleIcon = () => {
    switch (vehicleType) {
      case 'car': return <Car className="w-5 h-5 text-slate-900 inline shrink-0" />;
      case 'bike': return <Bike className="w-5 h-5 text-slate-900 inline shrink-0" />;
      case 'bus': return <Bus className="w-5 h-5 text-slate-900 inline shrink-0" />;
      case 'truck': return <Truck className="w-5 h-5 text-slate-900 inline shrink-0" />;
      case 'emergency': return <ShieldAlert className="w-5 h-5 text-red-600 inline shrink-0" />;
    }
  };

  const incidentOptions: { type: IncidentType; label: string; icon: any; mathEffect: string }[] = [
    {
      type: 'road_block',
      label: 'Road Block / Closure',
      icon: Construction,
      mathEffect: 'Road Closure (∞ Weight)',
    },
    {
      type: 'heavy_traffic',
      label: 'Heavy Traffic Bottleneck',
      icon: Car,
      mathEffect: '2.5x Traffic Congestion',
    },
    {
      type: 'accident',
      label: 'Vehicle Collision / Accident',
      icon: ShieldAlert,
      mathEffect: '+5.0 Risk Score Penalty',
    },
  ];

  return (
    <div id="live-journey-controller-panel" className="w-full bg-white border-2 border-slate-300 rounded-2xl p-5 md:p-6 shadow-md text-slate-900 space-y-4 font-sans">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-slate-100 border border-slate-300 rounded-xl text-slate-900">
            <Navigation className="w-6 h-6 animate-pulse text-slate-900" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded bg-slate-900 text-white shadow-xs">
                LIVE JOURNEY SIMULATOR
              </span>
              {simState.isSimulating && (
                <span className="text-xs font-black text-slate-900 flex items-center gap-1.5 border border-slate-300 px-2 py-0.5 rounded bg-slate-50">
                  <span className="w-2 h-2 rounded-full bg-slate-900 animate-ping"></span>
                  {simState.isPaused ? 'PAUSED' : 'EN-ROUTE (MOVING)'}
                </span>
              )}
            </div>
            <h3 className="text-lg font-black text-slate-900 mt-1 flex items-center gap-2">
              <span>{startNode?.name}</span>
              <span className="text-slate-500">➔</span>
              <span>{destNode?.name}</span>
            </h3>
          </div>
        </div>

        {/* Primary Simulation Controls - START JOURNEY BUTTON */}
        <div className="flex flex-wrap items-center gap-2">
          {!simState.isSimulating ? (
            <button
              type="button"
              onClick={onStart}
              id="btn-start-journey"
              className="flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-black text-sm rounded-xl transition-all cursor-pointer shadow-md border border-slate-900"
            >
              <Play className="w-5 h-5 fill-white" />
              <span>Start Journey</span>
            </button>
          ) : simState.isPaused ? (
            <button
              type="button"
              onClick={onResume}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-sm rounded-xl transition-all cursor-pointer shadow-md"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Resume</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onPause}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-sm rounded-xl transition-all cursor-pointer shadow-md"
            >
              <Pause className="w-4 h-4 fill-white" />
              <span>Pause</span>
            </button>
          )}

          {simState.isSimulating && (
            <button
              type="button"
              onClick={onReset}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-900 font-black text-xs rounded-xl border border-slate-300 transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}

          {/* Speed Multiplier Selectors */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-300 text-xs font-black">
            <span className="text-[10px] uppercase text-slate-700 font-extrabold px-2 flex items-center gap-1">
              <FastForward className="w-3 h-3 text-slate-900" />
              Speed:
            </span>
            {[1, 2, 5, 10].map(s => (
              <button
                key={s}
                type="button"
                onClick={() => onSpeedChange(s)}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  simState.speedMultiplier === s
                    ? 'bg-slate-900 text-white shadow-xs font-black'
                    : 'text-slate-700 hover:text-slate-900 font-bold'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs font-black text-slate-900">
          <div className="flex items-center gap-1.5">
            {getVehicleIcon()}
            <span>
              En-Route Location: <strong className="text-slate-900 underline">{currNodeName}</strong>
            </span>
          </div>
          <span className="text-slate-900 font-mono font-black text-sm">{simState.progressPercent}% Complete</span>
        </div>
        <div className="w-full bg-slate-100 h-4 rounded-full overflow-hidden border-2 border-slate-300 relative p-0.5">
          <div
            className="bg-slate-900 h-full rounded-full transition-all duration-200 relative"
            style={{ width: `${simState.progressPercent}%` }}
          >
            <div className="absolute right-0 top-0 bottom-0 w-3 bg-white/50 rounded-full animate-pulse"></div>
          </div>
        </div>
      </div>

      {/* Live En-Route Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
        <div className="bg-slate-50 border-2 border-slate-200 rounded-xl p-3.5">
          <span className="text-[10px] text-slate-700 font-extrabold uppercase block">Traveled</span>
          <div className="text-xl font-black text-slate-900 mt-0.5">
            {simState.traveledDistanceKm} <span className="text-xs text-slate-700">km</span>
          </div>
        </div>

        <div className="bg-slate-50 border-2 border-slate-200 rounded-xl p-3.5">
          <span className="text-[10px] text-slate-700 font-extrabold uppercase block">Time Spent</span>
          <div className="text-xl font-black text-slate-900 mt-0.5">
            {formatDurationHuman(simState.traveledTimeMin)}
          </div>
        </div>

        <div className="bg-slate-50 border-2 border-slate-200 rounded-xl p-3.5">
          <span className="text-[10px] text-slate-700 font-extrabold uppercase block">Remaining</span>
          <div className="text-xl font-black text-slate-900 mt-0.5">
            {remainingDist} <span className="text-xs text-slate-700">km</span>
          </div>
        </div>

        <div className="bg-slate-50 border-2 border-slate-200 rounded-xl p-3.5">
          <span className="text-[10px] text-slate-700 font-extrabold uppercase block">Est. Time Left</span>
          <div className="text-xl font-black text-slate-900 mt-0.5">
            {formatDurationHuman(remainingTime)}
          </div>
        </div>
      </div>

      {/* En-Route Incident Selector & Injector */}
      <div className="pt-3 bg-slate-50 p-5 rounded-2xl border-2 border-slate-300 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-slate-900 rounded-xl text-white shrink-0">
            <AlertTriangle className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <div className="font-black text-slate-900 text-sm sm:text-base">Inject En-Route Incident Ahead</div>
            <div className="text-slate-700 text-xs font-medium mt-0.5">
              Select an incident condition to simulate real-time road changes ahead of your moving vehicle:
            </div>
          </div>
        </div>

        {/* 5 Incident Selector Cards - Light Blue Selection Theme */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
          {incidentOptions.map(opt => {
            const Icon = opt.icon;
            const isSelected = selectedIncidentType === opt.type;
            return (
              <button
                key={opt.type}
                type="button"
                onClick={() => setSelectedIncidentType(opt.type)}
                className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all cursor-pointer relative ${
                  isSelected
                    ? 'bg-blue-50 border-blue-600 text-blue-950 shadow-md scale-[1.02] ring-2 ring-blue-500/30'
                    : 'bg-white text-slate-900 border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                }`}
              >
                <div className={`p-2 rounded-lg shrink-0 ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-900'}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className={`text-sm font-black leading-tight ${isSelected ? 'text-blue-950' : 'text-slate-900'}`}>
                    {opt.label}
                  </div>
                  <div className={`text-xs font-semibold mt-1 px-2 py-0.5 rounded-md inline-block ${
                    isSelected
                      ? 'bg-blue-200/80 text-blue-900 font-mono border border-blue-300'
                      : 'bg-slate-100 text-slate-700 font-mono border border-slate-200'
                  }`}>
                    {opt.mathEffect}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={() => onTriggerIncident(selectedIncidentType)}
            className="flex items-center justify-center gap-2.5 px-6 py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-sm rounded-xl shadow-md cursor-pointer transition-all border border-slate-900 active:scale-95"
          >
            <ShieldAlert className="w-5 h-5 text-red-400" />
            <span>Add Incident En-Route</span>
          </button>
        </div>
      </div>
    </div>
  );
};
