import React from 'react';
import { EvaluatedRoute } from '../types';
import { X, MapPin, ArrowDown, Shield } from 'lucide-react';
import { formatDurationHuman, getTrafficCategory, getRiskCategory } from '../algorithms/evaluator';

interface RouteDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  route: EvaluatedRoute | null;
}

export const RouteDetailsModal: React.FC<RouteDetailsModalProps> = ({
  isOpen,
  onClose,
  route,
}) => {
  if (!isOpen || !route) return null;

  return (
    <div className="fixed inset-0 z-[2000] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-300 rounded-lg max-w-2xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-600" />
              <span>OPTIMIZED ROUTE TURN-BY-TURN SEGMENT SPECIFICATION</span>
            </h3>
            <p className="text-xs text-slate-600">
              {route.segments.length} Physical Road Segments | Total: {route.totalDistanceKm} km, {formatDurationHuman(route.totalTimeMin)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-3 divide-y divide-slate-100">
          {route.segments.map((seg, idx) => {
            const traffic = getTrafficCategory(seg.edge.trafficFactor);
            const risk = getRiskCategory(seg.effectiveRisk);

            return (
              <div key={seg.edge.id} className="pt-3 first:pt-0">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-2.5">
                    <div className="flex flex-col items-center">
                      <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 text-xs font-bold flex items-center justify-center border border-blue-200">
                        {idx + 1}
                      </span>
                      {idx < route.segments.length - 1 && (
                        <div className="w-0.5 h-8 bg-slate-200 my-1" />
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <span>{seg.fromNode.name}</span>
                        <span className="text-slate-400">&rarr;</span>
                        <span>{seg.toNode.name}</span>
                      </div>
                      <div className="text-[11px] text-slate-600 font-mono mt-0.5">
                        Road: <span className="font-semibold text-slate-800">{seg.edge.roadName}</span> ({seg.edge.roadType.toUpperCase()})
                      </div>
                    </div>
                  </div>

                  <div className="text-right text-xs font-mono">
                    <div className="font-bold text-slate-900">{seg.segmentDistanceKm} km</div>
                    <div className="text-blue-700 font-medium">{formatDurationHuman(seg.adjustedTimeMin)}</div>
                  </div>
                </div>

                <div className="ml-8 mt-2 flex flex-wrap items-center gap-3 text-[11px] text-slate-600">
                  <span>Speed: <strong className="text-slate-800">{seg.edge.baseSpeedKmH} km/h</strong></span>
                  <span>Traffic: <strong className="text-slate-800">{traffic} ({seg.edge.trafficFactor}x)</strong></span>
                  <span>Risk Score: <strong className="text-slate-800">{seg.effectiveRisk}/10</strong></span>
                  {seg.edge.incident ? (
                    <span className="text-red-700 font-bold bg-red-50 px-1.5 py-0.5 rounded border border-red-200">
                      ⚠️ {seg.edge.incident.type.toUpperCase()}
                    </span>
                  ) : (
                    <span className="text-emerald-700 font-medium">Status: Clear</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
          <span className="font-mono text-slate-600">
            End-to-End Route: {route.nodeIds.length} Nodes Traverse
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-slate-900 text-white font-semibold hover:bg-slate-800 cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
