import { useEffect, useRef, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import maplibregl from 'maplibre-gl';
import type {
  BuildingFeatureProps,
  DistrictMapProps,
  ZoneId,
} from '../../types/contracts';
import {
  AOI_DEFAULT_CAMERA,
  ZONE_CAMERAS,
  buildCompositeExtrusionColor,
} from './mapStyles';
import { BuildingTooltip } from './BuildingTooltip';
import { OrbitalReticle } from './OrbitalReticle';
import './DistrictMap.css';

/**
 * 3D District Digital Twin: MapLibre GL 60 FPS Extruded Visualization
 * Combines 2,150 Dubai South 3D building footprints, 5 multi-spectral EO shaders,
 * rooftop highlight cap layer, instant hover tooltip, and live orbital scan reticle.
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
  const isLoadedRef = useRef<boolean>(false);
  const reticleMarkerRef = useRef<maplibregl.Marker | null>(null);
  const reticleRootRef = useRef<Root | null>(null);
  const prevZoneRef = useRef<ZoneId | null | undefined>(undefined);
  const onSelectBuildingRef = useRef(onSelectBuilding);
  onSelectBuildingRef.current = onSelectBuilding;

  const [hoveredBuilding, setHoveredBuilding] = useState<BuildingFeatureProps | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  // Initialize MapLibre GL Map once on mount
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
      center: AOI_DEFAULT_CAMERA.center,
      zoom: AOI_DEFAULT_CAMERA.zoom,
      pitch: AOI_DEFAULT_CAMERA.pitch,
      bearing: AOI_DEFAULT_CAMERA.bearing,
      maxPitch: 75,
    });

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-right');

    map.on('load', () => {
      // 1. Add Esri Satellite Imagery raster tile source
      map.addSource('esri-satellite', {
        type: 'raster',
        tiles: [
          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        ],
        tileSize: 256,
        attribution: 'Tiles &copy; Esri, Maxar, Earthstar Geographics',
        maxzoom: 19,
      });

      // 2. Add Esri Satellite layer directly below 3D buildings
      map.addLayer({
        id: 'esri-satellite-layer',
        type: 'raster',
        source: 'esri-satellite',
        layout: {
          visibility: satelliteBasemap ? 'visible' : 'none',
        },
        paint: {
          'raster-opacity': 0.95,
          'raster-fade-duration': 250,
        },
      });

      // 3. Add Dubai South 3D Buildings GeoJSON source (2,150 buildings)
      map.addSource('dubai-south-buildings', {
        type: 'geojson',
        data: '/data/dubai_south/buildings_3d.geojson',
      });

      // 4. Add 3D Extrusion Layer with multi-spectral EO shader & prescription highlights
      const initialColor = buildCompositeExtrusionColor(
        activeLayer,
        appliedPrescriptions,
        selectedBuilding?.id
      );

      map.addLayer({
        id: 'buildings-3d',
        type: 'fill-extrusion',
        source: 'dubai-south-buildings',
        paint: {
          'fill-extrusion-color': initialColor,
          'fill-extrusion-height': ['get', 'height_m'],
          'fill-extrusion-base': 0,
          'fill-extrusion-opacity': 0.88,
          'fill-extrusion-vertical-gradient': true,
        },
      });

      // 5. Add 3D Rooftop Highlight Cap Layer for selected building
      map.addLayer({
        id: 'buildings-3d-highlight',
        type: 'fill-extrusion',
        source: 'dubai-south-buildings',
        filter: ['==', ['get', 'id'], selectedBuilding?.id ?? ''],
        paint: {
          'fill-extrusion-color': '#38bdf8',
          'fill-extrusion-height': ['+', ['get', 'height_m'], 1.5],
          'fill-extrusion-base': ['get', 'height_m'],
          'fill-extrusion-opacity': 0.98,
        },
      });

      // 6. Directional sun lighting for 3D depth
      map.setLight({
        anchor: 'map',
        color: '#ffffff',
        intensity: 0.45,
        position: [1.5, 180, 55],
      });

      // 7. Growth year filter
      map.setFilter('buildings-3d', ['<=', ['get', 'growth_year'], selectedYear]);

      // 8. Interactive cursor hover & floating tooltip
      map.on('mousemove', 'buildings-3d', (e) => {
        map.getCanvas().style.cursor = 'pointer';
        const feat = e.features?.[0];
        if (!feat?.properties) return;
        const p = feat.properties as Record<string, unknown>;
        const parsed: BuildingFeatureProps = {
          id: String(p.id ?? ''),
          zone_id: String(p.zone_id ?? 'expo-core') as ZoneId,
          name: String(p.name ?? 'Dubai South Structure'),
          height_m: Number(p.height_m ?? 12),
          roof_area_m2: Number(p.roof_area_m2 ?? 400),
          land_use_class: String(p.land_use_class ?? 'Commercial'),
          growth_year: Number(p.growth_year ?? 2022),
          lst_celsius: Number(p.lst_celsius ?? 42),
          subsidence_mm_yr: Number(p.subsidence_mm_yr ?? -0.5),
          sar_coherence: Number(p.sar_coherence ?? 0.85),
          solar_kwh_yr: Number(p.solar_kwh_yr ?? 120000),
          solar_capacity_kwp: Number(p.solar_capacity_kwp ?? 75),
          viirs_radiance: Number(p.viirs_radiance ?? 22),
          prescription: String(p.prescription ?? 'SOLAR_ARRAY') as BuildingFeatureProps['prescription'],
          priority_score: Number(p.priority_score ?? 75),
        };
        setHoveredBuilding(parsed);
        setTooltipPos({ x: e.point.x, y: e.point.y });
      });

      map.on('mouseleave', 'buildings-3d', () => {
        map.getCanvas().style.cursor = '';
        setHoveredBuilding(null);
        setTooltipPos(null);
      });

      // 9. Building click handler
      map.on('click', 'buildings-3d', (e) => {
        e.originalEvent.stopPropagation();
        const feat = e.features?.[0];
        if (!feat?.properties) return;
        const p = feat.properties as Record<string, unknown>;
        const parsed: BuildingFeatureProps = {
          id: String(p.id ?? ''),
          zone_id: String(p.zone_id ?? 'expo-core') as ZoneId,
          name: String(p.name ?? 'Dubai South Structure'),
          height_m: Number(p.height_m ?? 12),
          roof_area_m2: Number(p.roof_area_m2 ?? 400),
          land_use_class: String(p.land_use_class ?? 'Commercial'),
          growth_year: Number(p.growth_year ?? 2022),
          lst_celsius: Number(p.lst_celsius ?? 42),
          subsidence_mm_yr: Number(p.subsidence_mm_yr ?? -0.5),
          sar_coherence: Number(p.sar_coherence ?? 0.85),
          solar_kwh_yr: Number(p.solar_kwh_yr ?? 120000),
          solar_capacity_kwp: Number(p.solar_capacity_kwp ?? 75),
          viirs_radiance: Number(p.viirs_radiance ?? 22),
          prescription: String(p.prescription ?? 'SOLAR_ARRAY') as BuildingFeatureProps['prescription'],
          priority_score: Number(p.priority_score ?? 75),
        };
        onSelectBuildingRef.current(parsed);
      });

      // 10. Map click outside building (with ±4px bounding box tolerance) clears selection
      map.on('click', (e) => {
        const bbox: [maplibregl.PointLike, maplibregl.PointLike] = [
          [e.point.x - 4, e.point.y - 4],
          [e.point.x + 4, e.point.y + 4],
        ];
        const feats = map.queryRenderedFeatures(bbox, { layers: ['buildings-3d'] });
        if (!feats || feats.length === 0) {
          onSelectBuildingRef.current(null);
        }
      });

      isLoadedRef.current = true;

      // Handle initial active zone fly-to if set on mount
      if (activeZone && ZONE_CAMERAS[activeZone]) {
        map.flyTo({ ...ZONE_CAMERAS[activeZone], speed: 1.2, essential: true });
        prevZoneRef.current = activeZone;
      }
    });

    mapRef.current = map;

    return () => {
      isLoadedRef.current = false;
      if (reticleRootRef.current) {
        reticleRootRef.current.unmount();
        reticleRootRef.current = null;
      }
      if (reticleMarkerRef.current) {
        reticleMarkerRef.current.remove();
        reticleMarkerRef.current = null;
      }
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update EO layer shaders, prescription highlights, and selected building rooftop cap
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isLoadedRef.current || !map.getLayer('buildings-3d')) return;

    const colorExpr = buildCompositeExtrusionColor(
      activeLayer,
      appliedPrescriptions,
      selectedBuilding?.id
    );
    map.setPaintProperty('buildings-3d', 'fill-extrusion-color', colorExpr);

    const hasActivePrescriptions =
      appliedPrescriptions.deploySolar ||
      appliedPrescriptions.applyCoolRoof ||
      appliedPrescriptions.smartNightDimming;
    map.setPaintProperty(
      'buildings-3d',
      'fill-extrusion-opacity',
      hasActivePrescriptions || selectedBuilding ? 0.95 : 0.88
    );

    if (map.getLayer('buildings-3d-highlight')) {
      map.setFilter('buildings-3d-highlight', [
        '==',
        ['get', 'id'],
        selectedBuilding?.id ?? '',
      ]);
    }
  }, [activeLayer, appliedPrescriptions, selectedBuilding]);

  // Update timeline filter (2019-2026 urban growth)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isLoadedRef.current || !map.getLayer('buildings-3d')) return;
    map.setFilter('buildings-3d', ['<=', ['get', 'growth_year'], selectedYear]);
  }, [selectedYear]);

  // Update satellite vs dark basemap toggle
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isLoadedRef.current || !map.getLayer('esri-satellite-layer')) return;
    map.setLayoutProperty(
      'esri-satellite-layer',
      'visibility',
      satelliteBasemap ? 'visible' : 'none'
    );
  }, [satelliteBasemap]);

  // Smooth camera navigation for the 4 district zones
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isLoadedRef.current) return;
    if (prevZoneRef.current === activeZone) return;
    prevZoneRef.current = activeZone;

    const target = activeZone && ZONE_CAMERAS[activeZone] ? ZONE_CAMERAS[activeZone] : AOI_DEFAULT_CAMERA;
    map.flyTo({
      center: target.center,
      zoom: target.zoom,
      pitch: target.pitch,
      bearing: target.bearing,
      speed: 1.2,
      curve: 1.4,
      essential: true,
    });
  }, [activeZone]);

  // Live pulsing React OrbitalReticle tracking live telemetry coordinates
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isLoadedRef.current || !latestTelemetry?.edge_ai) return;

    const { lat, lon } = latestTelemetry.edge_ai;
    if (typeof lat !== 'number' || typeof lon !== 'number') return;

    if (!reticleMarkerRef.current) {
      const el = document.createElement('div');
      el.className = 'orbital-reticle-container';
      const root = createRoot(el);
      reticleRootRef.current = root;
      root.render(<OrbitalReticle telemetry={latestTelemetry} />);

      reticleMarkerRef.current = new maplibregl.Marker({
        element: el,
        anchor: 'center',
      })
        .setLngLat([lon, lat])
        .addTo(map);
    } else {
      reticleMarkerRef.current.setLngLat([lon, lat]);
      reticleRootRef.current?.render(<OrbitalReticle telemetry={latestTelemetry} />);
    }
  }, [latestTelemetry]);

  return (
    <div className="relative w-full h-full bg-slate-950 overflow-hidden select-none">
      {/* Main 3D WebGL Map Container */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Subtle Radial Vignette for HUD Contrast */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_45%,rgba(2,6,23,0.45)_100%)]" />

      {/* Instant 60 FPS Hover Tooltip */}
      {hoveredBuilding && !selectedBuilding && (
        <BuildingTooltip
          building={hoveredBuilding}
          activeLayer={activeLayer}
          position={tooltipPos}
        />
      )}
    </div>
  );
}
