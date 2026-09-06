import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { ZoomIn, ZoomOut, Layers, Maximize2, Compass } from 'lucide-react';
import { GraphVertex, GraphEdge, EvaluatedRoute, DynamicRerouteState, VehicleType, OptimizationMode } from '../types';

interface MapComponentProps {
  vertices: GraphVertex[];
  edges: GraphEdge[];
  optimalRoute: EvaluatedRoute | null;
  shortestRoute?: EvaluatedRoute | null;
  startNode: GraphVertex | null;
  destNode: GraphVertex | null;
  dynamicReroute: DynamicRerouteState | null;
  vehicleType?: VehicleType;
  optimizationMode?: OptimizationMode;
  simCoords?: { lat: number; lng: number } | null;
  onEdgeClick?: (edge: GraphEdge) => void;
  onNodeClick?: (node: GraphVertex) => void;
}

type BaseMapLayerType = 'osm' | 'terrain' | 'satellite' | 'voyager';

export const MapComponent: React.FC<MapComponentProps> = ({
  vertices,
  edges,
  optimalRoute,
  shortestRoute,
  startNode,
  destNode,
  dynamicReroute,
  vehicleType = 'car',
  optimizationMode = 'balanced',
  simCoords,
  onEdgeClick,
  onNodeClick,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const baseTileLayerRef = useRef<L.TileLayer | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const [currentZoom, setCurrentZoom] = useState<number>(10);
  const [baseMapStyle, setBaseMapStyle] = useState<BaseMapLayerType>('osm');
  const [showLayerSelector, setShowLayerSelector] = useState<boolean>(false);
  const [hasUserMovedMap, setHasUserMovedMap] = useState<boolean>(false);

  // Initialize Map with full zoom & touch gestures
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if ((mapContainerRef.current as any)._leaflet_id) {
      delete (mapContainerRef.current as any)._leaflet_id;
    }

    if (!mapInstanceRef.current) {
      try {
        const AP_BOUNDS = L.latLngBounds([[11.5, 75.5], [20.2, 86.2]]);

        const map = L.map(mapContainerRef.current, {
          center: [15.85, 79.80], // Centered directly over Andhra Pradesh state
          zoom: 7.5,
          minZoom: 6,
          maxZoom: 19,
          maxBounds: AP_BOUNDS, // Restricts panning strictly to Andhra Pradesh region
          maxBoundsViscosity: 0.8,
          zoomControl: false, // We render dedicated high-contrast on-screen controls
          scrollWheelZoom: true,
          touchZoom: true,
          dragging: true,
          doubleClickZoom: true,
          boxZoom: true,
          attributionControl: true,
        });

        // High resolution standard OpenStreetMap tile layer for full street, avenue & locality level detail
        const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
          maxNativeZoom: 19,
        }).addTo(map);

        baseTileLayerRef.current = tileLayer;

        map.on('zoomend', () => {
          setCurrentZoom(map.getZoom());
        });

        map.on('movestart', (e: any) => {
          // If moved by user interaction
          if (e.originalEvent) {
            setHasUserMovedMap(true);
          }
        });

        const layerGroup = L.layerGroup().addTo(map);
        layerGroupRef.current = layerGroup;
        mapInstanceRef.current = map;
      } catch (err) {
        console.warn('Leaflet map creation error:', err);
      }
    }

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch {}
        mapInstanceRef.current = null;
      }
      if (mapContainerRef.current && (mapContainerRef.current as any)._leaflet_id) {
        delete (mapContainerRef.current as any)._leaflet_id;
      }
    };
  }, []);

  // Handle Base Map Layer Switch
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (baseTileLayerRef.current) {
      map.removeLayer(baseTileLayerRef.current);
    }

    let url = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    let attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

    if (baseMapStyle === 'terrain') {
      url = 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png';
      attribution = 'Map data: &copy; OpenStreetMap contributors, SRTM | Map style: &copy; OpenTopoMap';
    } else if (baseMapStyle === 'satellite') {
      url = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      attribution = 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community';
    } else if (baseMapStyle === 'voyager') {
      url = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
      attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';
    }

    const newLayer = L.tileLayer(url, {
      attribution,
      maxZoom: 19,
      maxNativeZoom: 19,
    }).addTo(map);

    baseTileLayerRef.current = newLayer;
  }, [baseMapStyle]);

  const handleZoomIn = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomIn();
      setHasUserMovedMap(true);
    }
  };

  const handleZoomOut = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomOut();
      setHasUserMovedMap(true);
    }
  };

  const handleResetFit = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    setHasUserMovedMap(false);

    try {
      if (optimalRoute && optimalRoute.segments.length > 0) {
        const routeBounds = L.latLngBounds([]);
        optimalRoute.segments.forEach(s => {
          s.edge.geometry.forEach(p => routeBounds.extend([p.lat, p.lng]));
        });
        if (routeBounds.isValid()) {
          map.fitBounds(routeBounds, { padding: [40, 40], maxZoom: 13 });
        }
      } else if (vertices.length > 0) {
        const b = L.latLngBounds([]);
        vertices.forEach(v => b.extend([v.coords.lat, v.coords.lng]));
        if (b.isValid()) {
          map.fitBounds(b, { padding: [30, 30], maxZoom: 12 });
        }
      }
    } catch {}
  };

  // Update Layers (Roads, Markers, Route, Vehicle Animation)
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layerGroup = layerGroupRef.current;
    if (!map || !layerGroup) return;

    // Clear previous frame animation
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    layerGroup.clearLayers();
    const bounds = L.latLngBounds([]);

    // 1. Draw all background roads with colors representing historical conditions
    const drawnEdgeKeys = new Set<string>();
    edges.forEach(edge => {
      const pairKey = [edge.from, edge.to].sort().join('__');
      if (drawnEdgeKeys.has(pairKey)) return;
      drawnEdgeKeys.add(pairKey);

      const latlngs: L.LatLngExpression[] = edge.geometry.map(p => [p.lat, p.lng]);
      latlngs.forEach(ll => bounds.extend(ll));

      const histCongestion = edge.historical_congestion ?? edge.trafficFactor;
      const histRisk = edge.historical_risk ?? edge.riskScore;
      const isBlocked = edge.incident?.isBlocked;

      // Road network colors represent actual historical conditions:
      // normal traffic: regular color
      // moderate historical traffic: yellow
      // high historical congestion: orange
      // high historical risk: red
      let color = '#94a3b8'; // Normal traffic: regular slate color
      let weight = 3.5;
      let opacity = 0.65;
      let dashArray: string | undefined = undefined;
      let conditionLabel = 'Normal Traffic Flow';

      if (isBlocked || histRisk >= 4.5) {
        color = '#ef4444'; // Red: High Historical Risk / Blocked
        weight = isBlocked ? 5.5 : 4.5;
        opacity = 0.85;
        dashArray = isBlocked ? '6, 6' : undefined;
        conditionLabel = isBlocked ? 'Blocked Corridor' : `High Historical Risk (${histRisk}/10)`;
      } else if (histCongestion >= 1.35) {
        color = '#f97316'; // Orange: High Historical Congestion
        weight = 4;
        opacity = 0.80;
        conditionLabel = `High Historical Congestion (${histCongestion}x)`;
      } else if (histCongestion >= 1.18) {
        color = '#eab308'; // Yellow: Moderate Historical Traffic
        weight = 3.5;
        opacity = 0.75;
        conditionLabel = `Moderate Historical Traffic (${histCongestion}x)`;
      }

      const polyline = L.polyline(latlngs, {
        color,
        weight,
        opacity,
        dashArray,
      });

      polyline.on('click', () => {
        if (onEdgeClick) onEdgeClick(edge);
      });

      layerGroup.addLayer(polyline);

      if (edge.incident) {
        const midIdx = Math.floor(edge.geometry.length / 2);
        const midPoint = edge.geometry[midIdx];
        const isBlocked = edge.incident.isBlocked;
        const incType = edge.incident.type || (isBlocked ? 'Road Closure' : 'Heavy Congestion');

        // Custom High-Resolution SVG Incident Icon
        const incidentSvg = isBlocked
          ? `<div style="position: relative; display: inline-flex; align-items: center; justify-content: center;">
              <div style="
                position: absolute;
                width: 38px;
                height: 38px;
                border-radius: 50%;
                background: rgba(220, 38, 38, 0.35);
                animation: pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
              "></div>
              <div style="
                background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%);
                color: #ffffff;
                border: 2px solid #ffffff;
                border-radius: 8px;
                padding: 4px 8px;
                font-weight: 900;
                font-size: 11px;
                letter-spacing: 0.3px;
                box-shadow: 0 4px 12px rgba(220, 38, 38, 0.5), 0 2px 4px rgba(0,0,0,0.3);
                display: flex;
                align-items: center;
                gap: 5px;
                cursor: pointer;
                transform: translateY(-2px);
              ">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
                </svg>
                <span>BLOCKED</span>
              </div>
            </div>`
          : `<div style="position: relative; display: inline-flex; align-items: center; justify-content: center;">
              <div style="
                position: absolute;
                width: 36px;
                height: 36px;
                border-radius: 50%;
                background: rgba(245, 158, 11, 0.35);
                animation: pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
              "></div>
              <div style="
                background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
                color: #ffffff;
                border: 2px solid #ffffff;
                border-radius: 8px;
                padding: 4px 8px;
                font-weight: 900;
                font-size: 11px;
                letter-spacing: 0.3px;
                box-shadow: 0 4px 12px rgba(217, 119, 6, 0.5), 0 2px 4px rgba(0,0,0,0.3);
                display: flex;
                align-items: center;
                gap: 5px;
                cursor: pointer;
                transform: translateY(-2px);
              ">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
                  <line x1="12" y1="9" x2="12" y2="13"></line>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
                <span>ALERT</span>
              </div>
            </div>`;

        const incidentMarker = L.marker([midPoint.lat, midPoint.lng], {
          icon: L.divIcon({
            html: incidentSvg,
            className: 'custom-incident-marker',
            iconSize: [96, 32],
            iconAnchor: [48, 16],
          }),
          zIndexOffset: 1200,
        });

        // Zoom-threshold dependent tooltip: permanent when zoomed in (>= 10), interactive tooltip otherwise
        const showPermanentIncidentTooltip = currentZoom >= 11;
        incidentMarker.bindTooltip(
          `<div style="font-family: system-ui, sans-serif; min-width: 140px;">
            <div style="display: flex; align-items: center; gap: 4px; font-weight: 800; font-size: 12px; color: ${isBlocked ? '#b91c1c' : '#d97706'};">
              <span>${isBlocked ? '⛔' : '⚠️'}</span>
              <span>${incType.toUpperCase()}</span>
            </div>
            <div style="font-size: 11px; font-weight: 600; color: #1e293b; margin-top: 2px;">${edge.roadName}</div>
            <div style="font-size: 10px; color: #64748b; margin-top: 2px;">
              ${isBlocked ? 'Road impassable • Dynamic QPSO Reroute Active' : `Speed capped at ${edge.incident.reducedSpeedKmH || 15} km/h`}
            </div>
          </div>`,
          {
            permanent: showPermanentIncidentTooltip,
            direction: 'top',
            offset: [0, -14],
            opacity: 0.96,
            className: 'incident-tooltip-bubble'
          }
        );

        layerGroup.addLayer(incidentMarker);
      }
    });

    // 1.5 Draw Baseline Shortest Geometric Path with condition-based color coding
    // Neutral dark underlay with segment-specific condition strokes (Yellow = Moderate Congestion, Orange = High Congestion, Red = High Risk)
    if (shortestRoute && shortestRoute.segments.length > 0) {
      // First, draw a continuous neutral/dark underlay for the entire shortest path
      const allShortestLatLngs: L.LatLngExpression[] = [];
      shortestRoute.segments.forEach(segment => {
        segment.edge.geometry.forEach(p => {
          allShortestLatLngs.push([p.lat, p.lng]);
          bounds.extend([p.lat, p.lng]);
        });
      });

      // 1. Draw Baseline Shortest-Path Route in Blue (Requirement: For shortest-path baseline: Blue)
      const blueGlowBaseLine = L.polyline(allShortestLatLngs, {
        color: '#1e40af', // Deep blue glow
        weight: 8,
        opacity: 0.75,
        lineCap: 'round',
        lineJoin: 'round',
      });
      const blueCoreBaseLine = L.polyline(allShortestLatLngs, {
        color: '#2563eb', // Royal Blue baseline line
        weight: 5,
        opacity: 0.95,
        dashArray: '8, 6',
        lineCap: 'round',
        lineJoin: 'round',
      });
      layerGroup.addLayer(blueGlowBaseLine);
      layerGroup.addLayer(blueCoreBaseLine);

      // Baseline line segments
      shortestRoute.segments.forEach(segment => {
        const segLatLngs: L.LatLngExpression[] = segment.edge.geometry.map(p => [p.lat, p.lng]);
        const baselineDetailLine = L.polyline(segLatLngs, {
          color: '#1d4ed8',
          weight: 6,
          opacity: 0.01, // Invisible click/hover target
        });
        layerGroup.addLayer(baselineDetailLine);
      });
    }

    // 2. Draw Active Selected Route in Green (Requirement: For selected route: Green)
    if (optimalRoute && optimalRoute.segments.length > 0) {
      const glowColor = '#047857'; // Deep emerald glow
      const coreColor = '#10b981'; // Vibrant Green core

      optimalRoute.segments.forEach(segment => {
        const segLatLngs: L.LatLngExpression[] = segment.edge.geometry.map(p => [p.lat, p.lng]);
        segLatLngs.forEach(ll => bounds.extend(ll));

        // Outer glow
        const routeGlow = L.polyline(segLatLngs, {
          color: glowColor,
          weight: 9,
          opacity: 0.85,
        });

        // Core bright line (GREEN for selected route)
        const routeLine = L.polyline(segLatLngs, {
          color: coreColor,
          weight: 5,
          opacity: 1.0,
        });

        layerGroup.addLayer(routeGlow);
        layerGroup.addLayer(routeLine);
      });
    }

    // 3. Dynamic rerouting already travelled layer
    if (dynamicReroute?.isActive && dynamicReroute.alreadyTraveledRoute.segments.length > 0) {
      dynamicReroute.alreadyTraveledRoute.segments.forEach(seg => {
        const geom: L.LatLngExpression[] = seg.edge.geometry.map(p => [p.lat, p.lng]);
        const travelledLine = L.polyline(geom, {
          color: '#64748b',
          weight: 5,
          dashArray: '5, 7',
          opacity: 0.85,
        });
        layerGroup.addLayer(travelledLine);
      });
    }

    // 4. Draw Map Vertices: Prominent Pins for Needed Vertices (Start, Dest, Waypoints) and Clean Circle + Name for Remaining Nodes
    const routeNodeSet = new Set(optimalRoute?.nodeIds || []);

    vertices.forEach(v => {
      const isStart = startNode?.id === v.id;
      const isDest = destNode?.id === v.id;
      const isRouteNode = routeNodeSet.has(v.id);

      if (isStart) {
        // High-resolution Custom SVG START Pin (Route Origin)
        const startIconHtml = `
          <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
            <div style="
              position: absolute;
              top: -2px;
              width: 36px;
              height: 36px;
              border-radius: 50%;
              background: rgba(34, 197, 94, 0.35);
              animation: pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
              z-index: 1;
            "></div>
            <div style="
              position: relative;
              z-index: 2;
              background: linear-gradient(135deg, #22c55e 0%, #15803d 100%);
              color: #ffffff;
              border: 2.5px solid #ffffff;
              border-radius: 50% 50% 50% 0;
              transform: rotate(-45deg);
              width: 32px;
              height: 32px;
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 4px 12px rgba(0,0,0,0.35), 0 0 14px rgba(34,197,94,0.6);
            ">
              <div style="transform: rotate(45deg); display: flex; align-items: center; justify-content: center;">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <polygon points="3 11 22 2 13 21 11 13 3 11"></polygon>
                </svg>
              </div>
            </div>
            <div style="
              position: relative;
              z-index: 3;
              margin-top: 3px;
              background: #0f172a;
              color: #4ade80;
              border: 1.5px solid #22c55e;
              border-radius: 6px;
              padding: 2px 7px;
              font-size: 11px;
              font-weight: 800;
              letter-spacing: 0.3px;
              box-shadow: 0 2px 6px rgba(0,0,0,0.4);
              white-space: nowrap;
            ">
              START: ${v.name}
            </div>
          </div>
        `;

        const startMarker = L.marker([v.coords.lat, v.coords.lng], {
          icon: L.divIcon({
            html: startIconHtml,
            className: 'custom-start-marker',
            iconSize: [120, 56],
            iconAnchor: [60, 26],
          }),
          zIndexOffset: 1600,
        });

        startMarker.on('click', () => {
          if (onNodeClick) onNodeClick(v);
        });

        layerGroup.addLayer(startMarker);
      } else if (isDest) {
        // High-resolution Custom SVG DESTINATION Pin (Route End - Blue Pin as specified)
        const destIconHtml = `
          <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
            <div style="
              position: absolute;
              top: -2px;
              width: 36px;
              height: 36px;
              border-radius: 50%;
              background: rgba(37, 99, 235, 0.35);
              animation: pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
              z-index: 1;
            "></div>
            <div style="
              position: relative;
              z-index: 2;
              background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
              color: #ffffff;
              border: 2.5px solid #ffffff;
              border-radius: 50% 50% 50% 0;
              transform: rotate(-45deg);
              width: 32px;
              height: 32px;
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 4px 12px rgba(0,0,0,0.35), 0 0 14px rgba(37,99,235,0.6);
            ">
              <div style="transform: rotate(45deg); display: flex; align-items: center; justify-content: center;">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <circle cx="12" cy="12" r="4" fill="#ffffff"></circle>
                </svg>
              </div>
            </div>
            <div style="
              position: relative;
              z-index: 3;
              margin-top: 3px;
              background: #0f172a;
              color: #93c5fd;
              border: 1.5px solid #2563eb;
              border-radius: 6px;
              padding: 2px 7px;
              font-size: 11px;
              font-weight: 800;
              letter-spacing: 0.3px;
              box-shadow: 0 2px 6px rgba(0,0,0,0.4);
              white-space: nowrap;
            ">
              DEST: ${v.name}
            </div>
          </div>
        `;

        const destMarker = L.marker([v.coords.lat, v.coords.lng], {
          icon: L.divIcon({
            html: destIconHtml,
            className: 'custom-dest-marker',
            iconSize: [120, 56],
            iconAnchor: [60, 26],
          }),
          zIndexOffset: 1600,
        });

        destMarker.on('click', () => {
          if (onNodeClick) onNodeClick(v);
        });

        layerGroup.addLayer(destMarker);
      } else if (isRouteNode) {
        // Active Route Waypoint (Clean, non-clumsy intermediate waypoint dot)
        const waypointHtml = `
          <div style="display: flex; align-items: center; justify-content: center; width: 14px; height: 14px; cursor: pointer; transform: translate(-50%, -50%);">
            <div style="
              width: 9px;
              height: 9px;
              border-radius: 50%;
              background: #10b981;
              border: 2px solid #ffffff;
              box-shadow: 0 0 6px rgba(16, 185, 129, 0.8), 0 1px 3px rgba(0,0,0,0.3);
            "></div>
          </div>
        `;

        const routeWaypointMarker = L.marker([v.coords.lat, v.coords.lng], {
          icon: L.divIcon({
            html: waypointHtml,
            className: 'custom-route-waypoint',
            iconSize: [14, 14],
            iconAnchor: [7, 7],
          }),
          zIndexOffset: 1100,
        });

        routeWaypointMarker.on('click', () => {
          if (onNodeClick) onNodeClick(v);
        });
        layerGroup.addLayer(routeWaypointMarker);
      } else {
        // Remaining Vertices on Map: Clean, non-intrusive circle dot + location name directly on map
        const isCityOrMetro = v.type === 'metro' || v.type === 'city';
        const isTown = v.type === 'town';
        const circleColor = isCityOrMetro ? '#0284c7' : isTown ? '#d97706' : '#059669';
        const circleSize = isCityOrMetro ? 8 : 6;

        const defaultNodeHtml = `
          <div style="display: inline-flex; align-items: center; gap: 4px; cursor: pointer; pointer-events: auto; transform: translateY(-50%);">
            <div style="
              width: ${circleSize}px;
              height: ${circleSize}px;
              border-radius: 50%;
              background: ${circleColor};
              border: 1.5px solid #ffffff;
              box-shadow: 0 1px 3px rgba(0,0,0,0.35);
              flex-shrink: 0;
            "></div>
            <span style="
              font-family: system-ui, -apple-system, sans-serif;
              font-size: ${isCityOrMetro ? '11px' : '10px'};
              font-weight: ${isCityOrMetro ? '700' : '600'};
              color: #1e293b;
              text-shadow: 1px 1px 0 #ffffff, -1px -1px 0 #ffffff, 1px -1px 0 #ffffff, -1px 1px 0 #ffffff, 0 0 3px #ffffff, 0 0 3px #ffffff;
              letter-spacing: -0.1px;
              white-space: nowrap;
              line-height: 1;
            ">
              ${v.name}
            </span>
          </div>
        `;

        const normalMarker = L.marker([v.coords.lat, v.coords.lng], {
          icon: L.divIcon({
            html: defaultNodeHtml,
            className: 'custom-map-node-label',
            iconSize: [120, 16],
            iconAnchor: [circleSize / 2, 8],
          }),
          zIndexOffset: isCityOrMetro ? 500 : 300,
        });

        normalMarker.on('click', () => {
          if (onNodeClick) onNodeClick(v);
        });
        layerGroup.addLayer(normalMarker);
      }
    });

    // 5. Draw Animated Moving Vehicle Marker during Journey Simulation
    if (simCoords) {
      const vehicleEmoji = vehicleType === 'bike' ? '🏍️' : vehicleType === 'bus' ? '🚌' : vehicleType === 'truck' ? '🚚' : vehicleType === 'emergency' ? '🚑' : '🚗';
      const vehicleHtml = `
        <div style="position: relative; display: flex; items-center; justify-content: center;">
          <div style="
            position: absolute;
            width: 42px;
            height: 42px;
            border-radius: 50%;
            background: rgba(37, 99, 235, 0.4);
            animation: pulse-ring 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          "></div>
          <div style="
            position: relative;
            z-index: 2;
            background: #1e40af;
            color: #ffffff;
            border: 2px solid #ffffff;
            border-radius: 50%;
            width: 34px;
            height: 34px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.4), 0 0 10px rgba(37,99,235,0.7);
          ">
            ${vehicleEmoji}
          </div>
        </div>
      `;

      const vehicleMarker = L.marker([simCoords.lat, simCoords.lng], {
        icon: L.divIcon({
          html: vehicleHtml,
          className: 'custom-vehicle-sim-marker',
          iconSize: [42, 42],
          iconAnchor: [21, 21],
        }),
        zIndexOffset: 2500,
      });

      vehicleMarker.bindTooltip(
        `<div style="font-family: system-ui, sans-serif; font-weight: 800; font-size: 12px; color: #1d4ed8;">
          ${vehicleEmoji} En-Route Vehicle Location
        </div>`,
        { permanent: true, direction: 'top', offset: [0, -20], opacity: 0.95 }
      );

      layerGroup.addLayer(vehicleMarker);
    }

    // Fit map view nicely on initial load or route change only (do not override if user is freely zooming/panning)
    if (!hasUserMovedMap) {
      try {
        if (optimalRoute && optimalRoute.segments.length > 0) {
          const routeBounds = L.latLngBounds([]);
          optimalRoute.segments.forEach(s => {
            s.edge.geometry.forEach(p => routeBounds.extend([p.lat, p.lng]));
          });
          if (routeBounds.isValid()) {
            map.fitBounds(routeBounds, { padding: [40, 40], maxZoom: 13 });
          }
        } else if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [30, 30], maxZoom: 12 });
        }
      } catch {}
    }
  }, [vertices, edges, optimalRoute, shortestRoute, startNode, destNode, dynamicReroute, vehicleType, simCoords, currentZoom, hasUserMovedMap, onEdgeClick, onNodeClick]);

  return (
    <div className="relative w-full h-[520px] bg-slate-100 border-2 border-slate-300 rounded-xl overflow-hidden shadow-xs">
      <div ref={mapContainerRef} className="w-full h-full" id="interactive-road-map" />

      {/* Top-Right Control Bar: Basemap Style & Zoom Tools */}
      <div className="absolute top-3 right-3 z-[1000] flex flex-col items-end gap-2">
        <div className="flex items-center gap-1.5">
          {/* Layer Selector Toggle */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowLayerSelector(!showLayerSelector)}
              className="flex items-center gap-1.5 bg-white/95 backdrop-blur-xs border border-slate-300 hover:bg-slate-50 text-slate-800 font-bold text-xs px-3 py-2 rounded-lg shadow-md transition-all cursor-pointer"
              title="Switch Map Tile Styles (Google/OSM/Satellite/Terrain)"
            >
              <Layers className="w-4 h-4 text-blue-600" />
              <span className="capitalize">{baseMapStyle === 'osm' ? 'Street Map' : baseMapStyle}</span>
            </button>

            {showLayerSelector && (
              <div className="absolute right-0 mt-1.5 w-44 bg-white border border-slate-300 rounded-xl shadow-xl py-1.5 z-50 text-xs font-semibold">
                <div className="px-3 py-1 text-[10px] uppercase font-black tracking-wider text-slate-500 border-b border-slate-100">
                  Map Basemap
                </div>
                {[
                  { id: 'osm', label: 'Detailed Streets', desc: 'OSM full street & lane names' },
                  { id: 'voyager', label: 'Clean Voyager', desc: 'Google-style modern contrast' },
                  { id: 'terrain', label: 'Topographic Terrain', desc: 'Elevation & contours' },
                  { id: 'satellite', label: 'Satellite Hybrid', desc: 'High-res aerial imagery' },
                ].map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setBaseMapStyle(opt.id as BaseMapLayerType);
                      setShowLayerSelector(false);
                    }}
                    className={`w-full text-left px-3 py-2 flex flex-col transition-colors cursor-pointer ${
                      baseMapStyle === opt.id ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span className="font-bold">{opt.label}</span>
                    <span className="text-[10px] text-slate-500 font-normal">{opt.desc}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Dedicated High-Contrast Zoom & Reset Controls */}
        <div className="flex flex-col bg-white/95 backdrop-blur-xs border border-slate-300 rounded-lg shadow-md overflow-hidden">
          <button
            type="button"
            onClick={handleZoomIn}
            className="p-2.5 hover:bg-slate-100 active:bg-slate-200 text-slate-700 border-b border-slate-200 cursor-pointer transition-colors"
            title="Zoom In (Inspect local streets and intersections)"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="p-2.5 hover:bg-slate-100 active:bg-slate-200 text-slate-700 border-b border-slate-200 cursor-pointer transition-colors"
            title="Zoom Out (Regional Overview)"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleResetFit}
            className="p-2.5 hover:bg-slate-100 active:bg-slate-200 text-slate-700 cursor-pointer transition-colors"
            title="Fit Route to Screen"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>

        {/* Current Zoom Level Pill */}
        <div className="bg-slate-900/80 backdrop-blur-xs text-white text-[11px] font-bold px-2 py-0.5 rounded-md shadow-xs">
          Zoom: {currentZoom}x {currentZoom >= 13 ? '🔎 Street Level' : currentZoom >= 9 ? '🏙️ City Hub' : '🗺️ Regional'}
        </div>
      </div>

      {/* Map Legend Overlay */}
      <div className="absolute bottom-3 left-3 z-[1000] bg-white/95 backdrop-blur-xs border border-slate-300 rounded-xl p-2.5 text-xs shadow-lg max-w-[95vw] text-slate-800">
        <div className="text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1.5 border-b border-slate-200 pb-1 flex items-center justify-between">
          <span>Road Conditions</span>
          {hasUserMovedMap && (
            <button
              type="button"
              onClick={handleResetFit}
              className="text-[10px] font-bold text-blue-600 hover:text-blue-800 underline ml-2 cursor-pointer"
            >
              Reset View
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-x-3.5 gap-y-1.5 text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-400"></span>
            <span className="font-semibold text-amber-800">🟡 Moderate Congestion</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-orange-500"></span>
            <span className="font-semibold text-orange-800">🟠 High Congestion</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500"></span>
            <span className="font-semibold text-red-800">🔴 High Risk</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-3.5 h-2 rounded-xs bg-emerald-500 shadow-xs"></span>
            <span className="font-bold text-emerald-800">🟢 QPSO Selected Safer Route</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-3.5 h-1.5 rounded-xs bg-slate-900 border-b border-dashed border-slate-400"></span>
            <span className="font-medium text-slate-700">⬛ Conventional Shortest Path</span>
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
              <span className="w-2 h-2 rounded-full bg-emerald-600"></span> Start
            </span>
            <span className="inline-flex items-center gap-1 font-semibold text-blue-700">
              <span className="w-2 h-2 rounded-full bg-blue-600"></span> Dest
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
