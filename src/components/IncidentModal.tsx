import React, { useState } from 'react';
import { GraphEdge, IncidentType, EvaluatedRoute } from '../types';
import { AlertTriangle, X, ShieldAlert, Waves, Car, Construction } from 'lucide-react';

interface IncidentModalProps {
  isOpen: boolean;
  onClose: () => void;
  edges: GraphEdge[];
  currentRoute: EvaluatedRoute | null;
  selectedEdgeId?: string;
  onApplyIncident: (edgeId: string, type: IncidentType, description: string) => void;
  onClearIncidents: () => void;
  activeIncidentsCount: number;
}

export const IncidentModal: React.FC<IncidentModalProps> = ({
  isOpen,
  onClose,
  edges,
  currentRoute,
  selectedEdgeId,
  onApplyIncident,
  onClearIncidents,
  activeIncidentsCount,
}) => {
  const [selectedEdge, setSelectedEdge] = useState<string>(
    selectedEdgeId || (currentRoute?.segments[1]?.edge.id ?? edges[0]?.id ?? '')
  );
  const [incidentType, setIncidentType] = useState<IncidentType>('road_block');
  const [customNote, setCustomNote] = useState<string>('');

  if (!isOpen) return null;

  // Filter unique edges for selection list, prioritizing segments on the active route
  const routeEdgeIds = new Set(currentRoute?.segments.map(s => s.edge.id) || []);
  const selectableEdges = edges.filter(e => e.from < e.to); // undirected view

  const incidentOptions: { type: IncidentType; label: string; icon: any; mathEffect: string }[] = [
    {
      type: 'road_block',
      label: 'Road Block / Closure',
      icon: Construction,
      mathEffect: 'Edge weight = ∞ (Infeasible). Excluded from graph search.',
    },
    {
      type: 'heavy_traffic',
      label: 'Heavy Traffic Bottleneck',
      icon: Car,
      mathEffect: 'Traffic Factor ↑ (2.5x base delay multiplier).',
    },
    {
      type: 'accident',
      label: 'Vehicle Collision / Accident',
      icon: ShieldAlert,
      mathEffect: 'Risk Score ↑ (+5.0 hazard penalty) & Travel Time ↑.',
    },
    {
      type: 'flood',
      label: 'Seasonal Flash Flood / Waterlogging',
      icon: Waves,
      mathEffect: 'Road Impassable / Flooded (∞ Weight). Forces dynamic reroute detour.',
    },
    {
      type: 'hazardous_road',
      label: 'Hazardous Road Conditions / Debris',
      icon: AlertTriangle,
      mathEffect: 'Risk Penalty ↑ (+4.0) across all optimization modes.',
    },
  ];

  const handleApply = () => {
    if (!selectedEdge) return;
    const desc = customNote.trim() || incidentOptions.find(o => o.type === incidentType)?.label || 'Incident';
    onApplyIncident(selectedEdge, incidentType, desc);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[2000] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-300 rounded-lg max-w-lg w-full shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <span>INJECT ROUTE CONSTRAINT / INCIDENT</span>
            </h3>
            <p className="text-xs text-slate-600">
              Modifies physical graph edge weights and initiates real-time dynamic rerouting.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          {/* Incident Type Selection */}
          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-2">
              1. Select Incident Type
            </label>
            <div className="space-y-2">
              {incidentOptions.map(opt => {
                const IconComponent = opt.icon;
                const isSelected = incidentType === opt.type;
                return (
                  <label
                    key={opt.type}
                    onClick={() => setIncidentType(opt.type)}
                    className={`flex items-start gap-3 p-2.5 rounded border cursor-pointer transition-colors ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/60'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="incident_type"
                      checked={isSelected}
                      onChange={() => setIncidentType(opt.type)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                        <IconComponent className="w-4 h-4 text-slate-700" />
                        <span>{opt.label}</span>
                      </div>
                      <div className="text-[11px] text-slate-600 font-mono mt-0.5">
                        {opt.mathEffect}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Road Segment Selection */}
          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
              2. Select Affected Road Segment
            </label>
            <select
              value={selectedEdge}
              onChange={e => setSelectedEdge(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-xs font-medium text-slate-900 focus:outline-blue-600"
            >
              <optgroup label="Segments on Current Active Route (Recommended for Demo)">
                {currentRoute?.segments.map(seg => (
                  <option key={seg.edge.id} value={seg.edge.id}>
                    ★ [ON ROUTE] {seg.fromNode.name} &rarr; {seg.toNode.name} ({seg.edge.roadName})
                  </option>
                ))}
              </optgroup>
              <optgroup label="Other Network Road Edges">
                {selectableEdges
                  .filter(e => !routeEdgeIds.has(e.id))
                  .map(e => (
                    <option key={e.id} value={e.id}>
                      {e.from} &rarr; {e.to} ({e.roadName}, {e.distanceKm} km)
                    </option>
                  ))}
              </optgroup>
            </select>
          </div>

          {/* Custom Note */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Incident Context / Note (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Bridge maintenance, Flash water accumulation"
              value={customNote}
              onChange={e => setCustomNote(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 focus:outline-blue-600"
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div>
            {activeIncidentsCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  onClearIncidents();
                  onClose();
                }}
                className="text-xs text-red-600 hover:text-red-800 font-semibold cursor-pointer"
              >
                Clear All {activeIncidentsCount} Incident(s)
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="px-4 py-1.5 rounded bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs cursor-pointer"
            >
              APPLY INCIDENT & REROUTE
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
