import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { ZoomIn, ZoomOut, Layers, Compass } from 'lucide-react';
import { VrpSolution, VrpVehicleRoute } from '../../types/vrp';
import { GraphVertex, GraphEdge } from '../../types';

interface FleetMapProps {
  solution: VrpSolution | null;
  vertices: GraphVertex[];
  edges: GraphEdge[];
  selectedVehicleId: string | null;
  onSelectVehicle: (vehicleId: string | null) => void;
}

type BaseMapStyle = 'osm' | 'terrain' | 'satellite' | 'voyager';

export const FleetMap: React.FC<FleetMapProps> = ({
  solution,
  vertices,
  edges,
  selectedVehicleId,
  onSelectVehicle,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const baseTileLayerRef = useRef<L.TileLayer | null>(null);
  const lastFittedSolutionRef = useRef<VrpSolution | null>(null);

  const [currentZoom, setCurrentZoom] = useState<number>(7.5);
  const [baseMapStyle, setBaseMapStyle] = useState<BaseMapStyle>('osm');
  const [showLayerSelector, setShowLayerSelector] = useState<boolean>(false);

  // Initialize Leaflet Map over Andhra Pradesh
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if ((mapContainerRef.current as any)._leaflet_id) {
      delete (mapContainerRef.current as any)._leaflet_id;
    }

    if (!mapInstanceRef.current) {
      try {
        const AP_BOUNDS = L.latLngBounds([[11.5, 75.5], [20.2, 86.2]]);
        const map = L.map(mapContainerRef.current, {
          center: [16.2, 80.5], // Centered over AP
          zoom: 7.5,
          minZoom: 6,
          maxZoom: 18,
          maxBounds: AP_BOUNDS,
          maxBoundsViscosity: 0.8,
          preferCanvas: true, // Ultra-fast hardware accelerated canvas renderer
          zoomControl: false,
          scrollWheelZoom: true,
          touchZoom: true,
          dragging: true,
        });

        const tileLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
          attribution: '&copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ',
          maxZoom: 18,
        }).addTo(map);

        baseTileLayerRef.current = tileLayer;

        const layerGroup = L.layerGroup().addTo(map);
        layerGroupRef.current = layerGroup;
        mapInstanceRef.current = map;

        // Force Leaflet map size recalculation
        setTimeout(() => {
          if (mapInstanceRef.current) {
            mapInstanceRef.current.invalidateSize();
          }
        }, 100);
      } catch (err) {
        console.warn('FleetMap creation error:', err);
      }
    }

    return () => {
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch {}
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Handle Base Map Layer Change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (baseTileLayerRef.current) {
      map.removeLayer(baseTileLayerRef.current);
    }

    let url = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}';
    let attribution = '&copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ';
    let subdomains = 'abc';

    if (baseMapStyle === 'terrain') {
      url = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}';
      attribution = '&copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom, Intermap';
      subdomains = 'abc';
    } else if (baseMapStyle === 'satellite') {
      url = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      attribution = '&copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS';
      subdomains = 'abc';
    } else if (baseMapStyle === 'voyager') {
      url = 'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png';
      attribution = '&copy; OpenStreetMap contributors &copy; CARTO';
      subdomains = 'abcd';
    } else if (baseMapStyle === 'osm') {
      url = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}';
      attribution = '&copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ';
      subdomains = 'abc';
    }

    const newLayer = L.tileLayer(url, { attribution, subdomains, maxZoom: 18 }).addTo(map);
    baseTileLayerRef.current = newLayer;
  }, [baseMapStyle]);

  // Render Depot, Customers, and Vehicle Routes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layerGroup = layerGroupRef.current;
    if (!map || !layerGroup || !solution) return;

    layerGroup.clearLayers();

    const bounds = L.latLngBounds([]);

    // 1. Render Depot Marker
    if (solution.depotNode) {
      const depotLat = solution.depotNode.coords.lat;
      const depotLng = solution.depotNode.coords.lng;
      bounds.extend([depotLat, depotLng]);

      const depotHtml = `
        <div style="
          background: #d97706;
          color: #ffffff;
          font-weight: 800;
          font-size: 11px;
          padding: 4px 8px;
          border-radius: 6px;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          white-space: nowrap;
          display: flex;
          align-items: center;
          gap: 4px;
        ">
          <span>🏬 DEPOT: ${solution.depotNode.name}</span>
        </div>
      `;

      const depotIcon = L.divIcon({
        className: 'custom-depot-marker',
        html: depotHtml,
        iconSize: [120, 26],
        iconAnchor: [60, 13],
      });

      L.marker([depotLat, depotLng], { icon: depotIcon, zIndexOffset: 1000 })
        .bindTooltip(`Central Fleet Depot: ${solution.depotNode.name}`, { permanent: false })
        .addTo(layerGroup);
    }

    // 2. Render Vehicle Routes
    solution.vehicleRoutes.forEach((vRoute, idx) => {
      if (!vRoute.route || vRoute.route.segments.length === 0) return;

      const vehicleColor = solution.vehicles[idx]?.color || '#2563eb';
      const isSelected = selectedVehicleId === vRoute.vehicleId;
      const isAnySelected = Boolean(selectedVehicleId);

      // Opacity and line weight based on selection
      const weight = isSelected ? 5.5 : isAnySelected ? 2.0 : 3.5;
      const opacity = isSelected ? 1.0 : isAnySelected ? 0.35 : 0.85;

      // Extract segment geometry polyline coordinates
      const routeLatLngs: [number, number][] = [];
      vRoute.route.segments.forEach(seg => {
        if (seg.edge.geometry && seg.edge.geometry.length > 0) {
          seg.edge.geometry.forEach(pt => {
            routeLatLngs.push([pt.lat, pt.lng]);
            bounds.extend([pt.lat, pt.lng]);
          });
        } else {
          routeLatLngs.push([seg.fromNode.coords.lat, seg.fromNode.coords.lng]);
          routeLatLngs.push([seg.toNode.coords.lat, seg.toNode.coords.lng]);
          bounds.extend([seg.fromNode.coords.lat, seg.fromNode.coords.lng]);
          bounds.extend([seg.toNode.coords.lat, seg.toNode.coords.lng]);
        }
      });

      // Soft glow backing for selected vehicle
      if (isSelected) {
        L.polyline(routeLatLngs, {
          color: '#fef08a',
          weight: 10,
          opacity: 0.8,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(layerGroup);
      }

      const polyline = L.polyline(routeLatLngs, {
        color: vehicleColor,
        weight,
        opacity,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(layerGroup);

      polyline.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        onSelectVehicle(vRoute.vehicleId);
      });

      polyline.bindTooltip(
        `<b>Vehicle ${vRoute.vehicleId}</b><br/>Load: ${vRoute.load}/${vRoute.capacity}<br/>Dist: ${vRoute.totalDistanceKm} km`,
        { sticky: true }
      );
    });

    // 3. Render Customer Markers
    solution.customers.forEach(cust => {
      bounds.extend([cust.coords.lat, cust.coords.lng]);

      // Check which vehicle serves this customer
      const assignedVehicleRoute = solution.vehicleRoutes.find(vr =>
        vr.assignedCustomers.some(c => c.id === cust.id)
      );
      const vehicleIdx = assignedVehicleRoute
        ? solution.vehicles.findIndex(v => v.id === assignedVehicleRoute.vehicleId)
        : -1;
      const custColor = vehicleIdx >= 0 ? solution.vehicles[vehicleIdx].color : '#64748b';

      const isAssignedVehicleSelected =
        selectedVehicleId && assignedVehicleRoute?.vehicleId === selectedVehicleId;
      const isAnySelected = Boolean(selectedVehicleId);

      const radius = isAssignedVehicleSelected ? 7 : 5;
      const opacity = isAssignedVehicleSelected ? 1.0 : isAnySelected ? 0.4 : 0.9;

      const circleMarker = L.circleMarker([cust.coords.lat, cust.coords.lng], {
        radius,
        fillColor: custColor,
        fillOpacity: opacity,
        color: '#ffffff',
        weight: 1.5,
      }).addTo(layerGroup);

      // Tooltip with customer ID, Node Name, Demand
      circleMarker.bindTooltip(
        `<b>Customer ${cust.id}</b>: ${cust.nodeName}<br/>Demand: ${cust.demand} units${
          assignedVehicleRoute ? `<br/>Served by: <b>Vehicle ${assignedVehicleRoute.vehicleId}</b>` : ''
        }`,
        { permanent: currentZoom >= 11, direction: 'top', className: 'text-xs font-sans' }
      );

      circleMarker.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        if (assignedVehicleRoute) {
          onSelectVehicle(assignedVehicleRoute.vehicleId);
        }
      });
    });

    // Auto fit bounds only once per new solution instance
    if (bounds.isValid() && solution.customers.length > 0 && lastFittedSolutionRef.current !== solution) {
      lastFittedSolutionRef.current = solution;
      map.invalidateSize();
      map.fitBounds(bounds, { padding: [35, 35], maxZoom: 12 });
    }
  }, [solution, selectedVehicleId, onSelectVehicle]);

  return (
    <div className="relative w-full h-[520px] rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
      {/* Map Container */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Floating Zoom Controls */}
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-1 bg-white/95 backdrop-blur-xs p-1 rounded-xl border border-slate-200 shadow-xs">
        <button
          type="button"
          onClick={() => mapInstanceRef.current?.zoomIn()}
          className="p-2 hover:bg-slate-100 text-slate-700 rounded-lg cursor-pointer transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => mapInstanceRef.current?.zoomOut()}
          className="p-2 hover:bg-slate-100 text-slate-700 rounded-lg cursor-pointer transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => setShowLayerSelector(!showLayerSelector)}
          className="p-2 hover:bg-slate-100 text-slate-700 rounded-lg cursor-pointer transition-colors border-t border-slate-100"
          title="Map Tile Style"
        >
          <Layers className="w-4 h-4" />
        </button>
      </div>

      {/* Layer Style Switcher Drawer */}
      {showLayerSelector && (
        <div className="absolute top-14 right-3 z-20 bg-white/95 backdrop-blur-xs p-2 rounded-xl border border-slate-200 shadow-md text-xs space-y-1 w-36">
          <div className="font-semibold text-slate-700 px-2 py-1 border-b border-slate-100 mb-1">
            Map Style
          </div>
          {(['osm', 'voyager', 'terrain', 'satellite'] as BaseMapStyle[]).map(style => (
            <button
              key={style}
              type="button"
              onClick={() => {
                setBaseMapStyle(style);
                setShowLayerSelector(false);
              }}
              className={`w-full text-left px-2 py-1.5 rounded-md capitalize cursor-pointer transition-colors ${
                baseMapStyle === style ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {style}
            </button>
          ))}
        </div>
      )}

      {/* Map Legend */}
      <div className="absolute bottom-3 left-3 z-10 bg-white/95 backdrop-blur-xs px-3 py-2 rounded-xl border border-slate-200 shadow-xs text-xs space-y-1.5">
        <div className="font-bold text-slate-900 border-b border-slate-100 pb-1 flex items-center justify-between gap-4">
          <span>Fleet VRP Legend</span>
          {selectedVehicleId && (
            <button
              type="button"
              onClick={() => onSelectVehicle(null)}
              className="text-[10px] text-blue-600 hover:underline cursor-pointer"
            >
              Show All Routes
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3 text-slate-700 text-[11px]">
          <span className="inline-flex items-center gap-1.5 font-semibold text-amber-800">
            <span className="w-2.5 h-2.5 rounded-xs bg-amber-600 inline-block"></span>
            <span>Depot</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-600 inline-block"></span>
            <span>Customer</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-4 h-1 rounded-full bg-blue-600 inline-block"></span>
            <span>Vehicle Route</span>
          </span>
          {selectedVehicleId && (
            <span className="inline-flex items-center gap-1.5 text-amber-700 font-bold">
              <span className="w-4 h-1.5 rounded-full bg-amber-500 inline-block"></span>
              <span>Vehicle {selectedVehicleId}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
