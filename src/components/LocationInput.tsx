import React, { useState, useRef, useEffect } from 'react';
import { GraphVertex } from '../types';
import {
  searchIndiaLocations,
  IndiaLocation,
  resolveLocationToNearbyGraphNode,
  INDIA_REGIONS,
  IndiaRegion,
} from '../data/indiaLocations';
import { Search, MapPin, Check, Navigation, X, Globe, Compass, Landmark, Building2, Trees, Milestone } from 'lucide-react';

interface LocationInputProps {
  id: string;
  label: string;
  selectedVertex: GraphVertex;
  userQuery?: string;
  nearbyDistanceKm?: number;
  graphVertices: GraphVertex[];
  excludeVertexId?: string;
  onSelectNode: (vertex: GraphVertex, customQueryName?: string, distanceKm?: number) => void;
  onUseGps?: () => void;
}

export const LocationInput: React.FC<LocationInputProps> = ({
  id,
  label,
  selectedVertex,
  userQuery,
  nearbyDistanceKm,
  graphVertices,
  excludeVertexId,
  onSelectNode,
  onUseGps,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchText, setSearchText] = useState(userQuery || selectedVertex.name);
  const [selectedRegion, setSelectedRegion] = useState<'All Andhra Pradesh' | IndiaRegion>('All Andhra Pradesh');
  const [searchResults, setSearchResults] = useState<IndiaLocation[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync with prop changes
  useEffect(() => {
    setSearchText(userQuery || selectedVertex.name);
  }, [selectedVertex, userQuery]);

  // Click outside listener to close dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update search results whenever searchText or selectedRegion changes
  const updateResults = (query: string, region: 'All Andhra Pradesh' | IndiaRegion) => {
    const results = searchIndiaLocations(query, region, 20);
    setSearchResults(results);
  };

  const handleInputChange = (val: string) => {
    setSearchText(val);
    setIsOpen(true);
    updateResults(val, selectedRegion);
  };

  const handleRegionChange = (region: 'All Andhra Pradesh' | IndiaRegion) => {
    setSelectedRegion(region);
    setIsOpen(true);
    updateResults(searchText, region);
  };

  const handleFocus = () => {
    setIsOpen(true);
    updateResults(searchText, selectedRegion);
  };

  const handleSelectLocation = (loc: IndiaLocation) => {
    const resolved = resolveLocationToNearbyGraphNode(loc.name, graphVertices);
    const targetNode = graphVertices.find(v => v.id === resolved.nearestGraphNodeId) || graphVertices[0];
    setSearchText(loc.name);
    setIsOpen(false);
    onSelectNode(targetNode, loc.name, resolved.distanceToGraphNodeKm);
  };

  const handleSelectGraphVertex = (vertex: GraphVertex) => {
    setSearchText(vertex.name);
    setIsOpen(false);
    onSelectNode(vertex, vertex.name, 0);
  };

  const handleCustomSubmit = () => {
    if (!searchText.trim()) return;
    const resolved = resolveLocationToNearbyGraphNode(searchText, graphVertices);
    const targetNode = graphVertices.find(v => v.id === resolved.nearestGraphNodeId) || graphVertices[0];
    setIsOpen(false);
    onSelectNode(targetNode, resolved.matchedPlaceName, resolved.distanceToGraphNodeKm);
  };

  const isNearbyMapped = nearbyDistanceKm && nearbyDistanceKm > 4;

  const getTierIcon = (tier?: string) => {
    switch (tier?.toLowerCase()) {
      case 'metro':
      case 'city':
        return <Landmark className="w-3.5 h-3.5 text-blue-600" />;
      case 'town':
        return <Building2 className="w-3.5 h-3.5 text-amber-600" />;
      case 'village':
        return <Trees className="w-3.5 h-3.5 text-emerald-600" />;
      case 'junction':
        return <Milestone className="w-3.5 h-3.5 text-purple-600" />;
      default:
        return <MapPin className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  const getTierBadge = (tier?: string) => {
    switch (tier?.toLowerCase()) {
      case 'metro':
      case 'city':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'town':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'village':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'junction':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div ref={containerRef} className="relative space-y-1.5 w-full">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="block text-sm font-black uppercase text-slate-900 flex items-center gap-1.5">
          <Compass className="w-4 h-4 text-blue-700" />
          <span>{label}</span>
        </label>
        {onUseGps && (
          <button
            type="button"
            onClick={onUseGps}
            className="text-xs font-bold text-blue-700 hover:text-blue-900 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>Use My GPS</span>
          </button>
        )}
      </div>

      <div className="relative">
        <div className="flex items-center w-full bg-white border-2 border-slate-300 hover:border-blue-500 focus-within:border-blue-700 rounded-xl px-3 py-2 shadow-xs transition-colors">
          <Search className="w-5 h-5 text-slate-400 mr-2 shrink-0" />
          <input
            id={id}
            type="text"
            value={searchText}
            onChange={e => handleInputChange(e.target.value)}
            onFocus={handleFocus}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleCustomSubmit();
              }
            }}
            placeholder="Search Andhra Pradesh cities, towns, villages, or junctions..."
            className="w-full text-base font-black text-slate-900 placeholder:text-slate-400 placeholder:font-normal outline-none bg-transparent"
          />
          {searchText && (
            <button
              type="button"
              onClick={() => {
                setSearchText('');
                updateResults('', selectedRegion);
                setIsOpen(true);
              }}
              className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 cursor-pointer"
              title="Clear text"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Nearby City Mapping Indicator Pill */}
        <div className="mt-1.5 flex items-center gap-1.5 text-xs">
          {isNearbyMapped ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-amber-50 text-amber-950 font-bold border border-amber-300 shadow-xs">
              <MapPin className="w-3.5 h-3.5 text-amber-700 shrink-0" />
              <span>
                Selected Place: <strong className="text-amber-950 font-black">{searchText}</strong>
                <span className="text-amber-800 mx-1">→</span>
                Nearest AP Network Vertex: <strong className="text-blue-900 font-black underline">{selectedVertex.name}</strong> ({nearbyDistanceKm} km away)
              </span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-blue-50 text-blue-950 font-bold border border-blue-200 shadow-xs">
              <Check className="w-3.5 h-3.5 text-blue-700 shrink-0" />
              <span className="flex items-center gap-1.5">
                <span>Active AP Vertex:</span>
                <strong className="text-blue-950 font-black">{selectedVertex.name}</strong>
                <span className={`text-[10px] uppercase font-black px-1.5 py-0.5 rounded border ${getTierBadge(selectedVertex.tier || selectedVertex.type)}`}>
                  {selectedVertex.tier || selectedVertex.type}
                </span>
              </span>
            </div>
          )}
        </div>

        {/* Live Search & Autocomplete Results Dropdown */}
        {isOpen && (
          <div className="absolute top-full left-0 right-0 z-50 mt-1.5 bg-white border-2 border-slate-300 rounded-xl shadow-2xl max-h-96 overflow-y-auto divide-y divide-slate-100">
            {/* Region Filter Selector */}
            <div className="p-2.5 bg-slate-50 border-b border-slate-200">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-black uppercase text-slate-700 tracking-wider flex items-center gap-1">
                  <Globe className="w-3 h-3 text-blue-600" />
                  <span>FILTER AP REGION:</span>
                </span>
                {selectedRegion !== 'All Andhra Pradesh' && (
                  <button
                    type="button"
                    onClick={() => handleRegionChange('All Andhra Pradesh')}
                    className="text-[10px] font-bold text-blue-700 hover:underline cursor-pointer"
                  >
                    Reset to All AP
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1">
                {INDIA_REGIONS.map(reg => {
                  const isActive = selectedRegion === reg;
                  return (
                    <button
                      key={reg}
                      type="button"
                      onClick={() => handleRegionChange(reg)}
                      className={`px-2 py-1 rounded-md text-xs font-extrabold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-blue-700 text-white shadow-xs'
                          : 'bg-white text-slate-700 border border-slate-300 hover:bg-blue-50 hover:border-blue-400'
                      }`}
                    >
                      {reg}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Direct Connected Graph Cities Quick Grid */}
            <div className="p-2.5 bg-slate-50">
              <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider block mb-1">
                Direct Connected AP Vertices (Cities, Towns, Villages)
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1">
                {graphVertices
                  .filter(v => v.id !== excludeVertexId)
                  .slice(0, 16)
                  .map(v => {
                    const isSelected = selectedVertex.id === v.id;
                    return (
                      <button
                        key={`graph-quick-${v.id}`}
                        type="button"
                        onClick={() => handleSelectGraphVertex(v)}
                        className={`text-left px-2 py-1.5 rounded-md text-xs font-bold truncate transition-colors cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'bg-blue-700 text-white font-black'
                            : 'bg-white text-slate-800 border border-slate-200 hover:bg-blue-50 hover:border-blue-300'
                        }`}
                      >
                        <span className="truncate">{v.name}</span>
                        <span className={`text-[9px] uppercase px-1 py-0.2 rounded font-bold ${isSelected ? 'bg-blue-800 text-white' : 'bg-slate-100 text-slate-600'}`}>
                          {v.tier || v.type}
                        </span>
                      </button>
                    );
                  })}
              </div>
            </div>

            {/* All Cities & Towns across Andhra Pradesh in Selected Region */}
            <div className="p-2 space-y-1">
              <div className="px-2 py-1 flex items-center justify-between text-[11px] font-black uppercase text-slate-500 tracking-wider">
                <span>Andhra Pradesh Locations ({selectedRegion})</span>
                <span className="text-slate-400 font-normal">Click to connect to road graph</span>
              </div>

              {searchResults.length > 0 ? (
                searchResults.map(loc => {
                  const resolved = resolveLocationToNearbyGraphNode(loc.name, graphVertices);
                  const isExact = resolved.isDirectGraphNode;
                  return (
                    <button
                      key={`loc-${loc.id}`}
                      type="button"
                      onClick={() => handleSelectLocation(loc)}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors flex items-center justify-between group cursor-pointer border border-transparent hover:border-slate-200"
                    >
                      <div className="flex items-center gap-2.5">
                        {getTierIcon(loc.type)}
                        <div>
                          <div className="text-sm font-bold text-slate-900 group-hover:text-blue-700 flex items-center gap-1.5">
                            <span>{loc.name}</span>
                            <span className={`text-[10px] uppercase font-extrabold px-1.5 py-0.5 rounded border ${getTierBadge(loc.type)}`}>
                              {loc.type}
                            </span>
                            <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                              {loc.region}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500">
                            {loc.district} District, Andhra Pradesh
                          </div>
                        </div>
                      </div>
                      <div className="text-right text-xs">
                        <span className="font-bold text-slate-800 block">
                          → {resolved.nearestGraphNodeName}
                        </span>
                        {isExact ? (
                          <span className="text-[11px] text-green-700 font-extrabold">
                            Graph Vertex
                          </span>
                        ) : (
                          <span className="text-[11px] text-amber-800 font-bold">
                            {resolved.distanceToGraphNodeKm} km away
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="p-4 text-center text-sm text-slate-500 font-medium">
                  Press Enter to resolve "<strong className="text-slate-800">{searchText}</strong>" to nearest Andhra Pradesh vertex
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
