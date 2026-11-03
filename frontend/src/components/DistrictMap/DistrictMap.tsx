import { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type {
  BuildingFeatureProps,
  DistrictMapProps,
} from '../../types/contracts';
import {
  AOI_DEFAULT_CAMERA,
  ZONE_CAMERAS,
  BASE_MAP_STYLE,
  buildCompositeExtrusionColor,
} from './mapStyles';
import { BuildingTooltip } from './BuildingTooltip';
import { OrbitalReticle } from './OrbitalReticle';
import { createRoot, Root } from 'react-dom/client';

/**
 * MEMBER 3 WORKSPACE: `frontend/src/components/DistrictMap/`
 * Ultra-slick 60 FPS 3D WebGL Digital Twin of Dubai South & Expo City
 * Keeps `DistrictMapProps` intact for zero merge conflicts with Member 4's HUD.
 */
export function DistrictMap({
  activeLayer,
  selectedYear,
  activeZone,
  selectedBuilding,
  onSelectBuilding,
  appliedPrescriptions,
  latestTelemetry,
  satelliteBasemap,
}: DistrictMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  // Reticle marker refs
  const reticleMarkerRef = useRef<maplibregl.Marker | null>(null);
  const reticleNodeRef = useRef<HTMLDivElement | null>(null);
  const reticleRootRef = useRef<Root | null>(null);

  // Hover and interaction states
  const [hoveredBuilding, setHoveredBuilding] = useState<BuildingFeatureProps | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  // Track map ready status
  const [mapLoaded, setMapLoaded] = useState(false);

  // 1. Initialize MapLibre instance
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: BASE_MAP_STYLE,
      center: AOI_DEFAULT_CAMERA.center,
      zoom: AOI_DEFAULT_CAMERA.zoom,
      pitch: AOI_DEFAULT_CAMERA.pitch,
      bearing: AOI_DEFAULT_CAMERA.bearing,
      maxPitch: 75,
      minZoom: 10,
      maxZoom: 19,
    });

    // Add navigation controls (compass + zoom) in top-right
    map.addControl(
      new maplibregl.NavigationControl({
        visualizePitch: true,
        showCompass: true,
        showZoom: true,
      }),
      'top-right'
    );

    map.on('load', () => {
      // Setup dynamic atmosphere lighting
      map.setLight({
        anchor: 'map',
        color: '#f8fafc',
        intensity: 0.45,
        position: [1.2, 210, 35],
      });

      // Add GeoJSON source for Dubai South buildings
      map.addSource('dubai-south-buildings', {
        type: 'geojson',
        data: '/data/dubai_south/buildings_3d.geojson',
        generateId: true,
      });

      // Compute initial color expression
      const initialColor = buildCompositeExtrusionColor(
        'thermal',
        {
          deploySolar: false,
          applyCoolRoof: false,
          smartNightDimming: false,
          targetZone: 'ALL',
        },
        null
      );

      // Add 3D building fill-extrusion layer
      map.addLayer({
        id: 'buildings-3d',
        type: 'fill-extrusion',
        source: 'dubai-south-buildings',
        paint: {
          'fill-extrusion-color': initialColor,
          'fill-extrusion-height': ['get', 'height_m'],
          'fill-extrusion-base': 0,
          'fill-extrusion-opacity': 0.92,
        },
      });

      // Add building roof highlight glow layer for selected building
      map.addLayer({
        id: 'buildings-3d-highlight',
        type: 'fill-extrusion',
        source: 'dubai-south-buildings',
        filter: ['==', ['get', 'id'], ''],
        paint: {
          'fill-extrusion-color': '#38bdf8',
          'fill-extrusion-height': ['+', ['get', 'height_m'], 1.5],
          'fill-extrusion-base': ['get', 'height_m'],
          'fill-extrusion-opacity': 0.98,
        },
      });

      // Initial timeline filter
      map.setFilter('buildings-3d', ['<=', ['get', 'growth_year'], 2026]);

      // Hover and cursor handlers
      map.on('mouseenter', 'buildings-3d', (e) => {
        map.getCanvas().style.cursor = 'pointer';
        const feat = e.features?.[0];
        if (feat?.properties) {
          setHoveredBuilding(feat.properties as unknown as BuildingFeatureProps);
          setTooltipPos({ x: e.point.x, y: e.point.y });
        }
      });

      map.on('mousemove', 'buildings-3d', (e) => {
        setTooltipPos({ x: e.point.x, y: e.point.y });
      });

      map.on('mouseleave', 'buildings-3d', () => {
        map.getCanvas().style.cursor = '';
        setHoveredBuilding(null);
      });

      // Click selection handler
      map.on('click', 'buildings-3d', (e) => {
        const feat = e.features?.[0];
        if (feat?.properties) {
          const props = feat.properties as unknown as BuildingFeatureProps;
          onSelectBuilding(props);
          setTooltipPos({ x: e.point.x, y: e.point.y });
        }
      });

      // Deselect on empty ground click
      map.on('click', (e) => {
        const bbox = [
          [e.point.x - 4, e.point.y - 4],
          [e.point.x + 4, e.point.y + 4],
        ] as [maplibregl.PointLike, maplibregl.PointLike];
        const features = map.queryRenderedFeatures(bbox, { layers: ['buildings-3d'] });
        if (features.length === 0) {
          onSelectBuilding(null);
        }
      });

      mapRef.current = map;
      setMapLoaded(true);
    });

    return () => {
      if (reticleMarkerRef.current) {
        reticleMarkerRef.current.remove();
        reticleMarkerRef.current = null;
      }
      if (reticleRootRef.current) {
        reticleRootRef.current.unmount();
        reticleRootRef.current = null;
      }
      map.remove();
      mapRef.current = null;
      setMapLoaded(false);
    };
  }, [onSelectBuilding]);

  // 2. Basemap Style Toggle (Instant 60 FPS raster swap)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    if (map.getLayer('carto-dark-layer') && map.getLayer('esri-satellite-layer')) {
      map.setLayoutProperty(
        'carto-dark-layer',
        'visibility',
        satelliteBasemap ? 'none' : 'visible'
      );
      map.setLayoutProperty(
        'esri-satellite-layer',
        'visibility',
        satelliteBasemap ? 'visible' : 'none'
      );
    }
  }, [satelliteBasemap, mapLoaded]);

  // 3. Dynamic Timeline Growth Filter (2019 - 2026)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || !map.getLayer('buildings-3d')) return;

    map.setFilter('buildings-3d', ['<=', ['get', 'growth_year'], selectedYear]);
  }, [selectedYear, mapLoaded]);

  // 4. Update 3D Fill-Extrusion Shader Colors (Active Layer + Prescriptions + Selection)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || !map.getLayer('buildings-3d')) return;

    const nextColorExpression = buildCompositeExtrusionColor(
      activeLayer,
      appliedPrescriptions,
      selectedBuilding?.id || null
    );

    map.setPaintProperty('buildings-3d', 'fill-extrusion-color', nextColorExpression);

    // Update selected highlight rooftop layer
    if (map.getLayer('buildings-3d-highlight')) {
      map.setFilter('buildings-3d-highlight', [
        '==',
        ['get', 'id'],
        selectedBuilding?.id || '',
      ]);
    }
  }, [activeLayer, appliedPrescriptions, selectedBuilding, mapLoaded]);

  // 5. Camera flyTo for Preset Zones
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    if (activeZone && ZONE_CAMERAS[activeZone]) {
      const target = ZONE_CAMERAS[activeZone];
      map.flyTo({
        center: target.center,
        zoom: target.zoom,
        pitch: target.pitch,
        bearing: target.bearing,
        duration: 1800,
        curve: 1.4,
        essential: true,
      });
    } else if (activeZone === null) {
      map.flyTo({
        center: AOI_DEFAULT_CAMERA.center,
        zoom: AOI_DEFAULT_CAMERA.zoom,
        pitch: AOI_DEFAULT_CAMERA.pitch,
        bearing: AOI_DEFAULT_CAMERA.bearing,
        duration: 1800,
        curve: 1.4,
        essential: true,
      });
    }
  }, [activeZone, mapLoaded]);

  // 6. Orbital Nadir Reticle (Tracks Edge-AI telemetry)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || !latestTelemetry) return;

    const { edge_ai } = latestTelemetry;
    if (!edge_ai || typeof edge_ai.lat !== 'number' || typeof edge_ai.lon !== 'number') {
      return;
    }

    const coords: [number, number] = [edge_ai.lon, edge_ai.lat];

    if (!reticleMarkerRef.current) {
      const el = document.createElement('div');
      el.className = 'orbital-reticle-container pointer-events-none';
      reticleNodeRef.current = el;

      const root = createRoot(el);
      reticleRootRef.current = root;
      root.render(<OrbitalReticle telemetry={latestTelemetry} />);

      const marker = new maplibregl.Marker({
        element: el,
        anchor: 'center',
      })
        .setLngLat(coords)
        .addTo(map);

      reticleMarkerRef.current = marker;
    } else {
      reticleMarkerRef.current.setLngLat(coords);
      if (reticleRootRef.current) {
        reticleRootRef.current.render(<OrbitalReticle telemetry={latestTelemetry} />);
      }
    }
  }, [latestTelemetry, mapLoaded]);

  const activeTooltipBuilding = selectedBuilding || hoveredBuilding;

  const handleDismissTooltip = useCallback(() => {
    onSelectBuilding(null);
    setHoveredBuilding(null);
  }, [onSelectBuilding]);

  return (
    <div className="relative w-full h-full select-none overflow-hidden">
      {/* WebGL Canvas Container */}
      <div ref={containerRef} className="w-full h-full bg-slate-950" />

      {/* Cyberpunk Vignette & Scanline Overlay */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_40%,rgba(2,6,23,0.55)_100%)]" />

      {/* AOI Bounding Box Status Banner */}
      <div className="absolute top-4 left-4 pointer-events-none z-10 flex items-center gap-2 backdrop-blur-md bg-slate-950/80 border border-cyan-500/30 px-3 py-1.5 rounded text-xs font-mono text-cyan-300 shadow-lg">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
        <span className="font-bold tracking-wider">DUBAI SOUTH AOI [55.120°E, 24.880°N - 55.240°E, 24.980°N]</span>
        <span className="text-slate-500">|</span>
        <span className="text-slate-300 uppercase">
          LAYER: <strong className="text-cyan-400">{activeLayer}</strong>
        </span>
        <span className="text-slate-500">|</span>
        <span className="text-slate-300">
          YEAR: <strong className="text-amber-400">{selectedYear}</strong>
        </span>
      </div>

      {/* Interactive Tooltip (Floating or Anchored) */}
      {activeTooltipBuilding && (
        <BuildingTooltip
          building={activeTooltipBuilding}
          activeLayer={activeLayer}
          onClose={handleDismissTooltip}
          position={tooltipPos}
        />
      )}
    </div>
  );
}
export default DistrictMap;
