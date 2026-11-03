import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import type {
  AppliedPrescriptions,
  BuildingFeatureProps,
  DistrictMapProps,
  LayerMode,
  ZoneId,
} from '../../types/contracts';
import './DistrictMap.css';

/**
 * 4-Zone coordinate benchmarks from contracts/dubai_south_aoi.json
 */
const DEFAULT_CAMERA = {
  center: [55.158, 24.948] as [number, number],
  zoom: 13.4,
  pitch: 58,
  bearing: 135,
};

const ZONE_COORDS: Record<ZoneId, { center: [number, number]; zoom: number; pitch: number; bearing: number }> = {
  'expo-core': { center: [55.151, 24.96], zoom: 14.8, pitch: 58, bearing: 135 },
  'logistics-mega': { center: [55.168, 24.918], zoom: 14.4, pitch: 58, bearing: 135 },
  'residential-growth': { center: [55.205, 24.942], zoom: 14.3, pitch: 58, bearing: 135 },
  'aviation-infra': { center: [55.165, 24.902], zoom: 14.2, pitch: 58, bearing: 135 },
};

/**
 * Builds the dynamic MapLibre GL color expression for the 5 Earth Observation layers
 * and overlays sustainability prescription mitigations & building selection highlights.
 */
function buildBuildingColorExpression(
  activeLayer: LayerMode,
  appliedPrescriptions: AppliedPrescriptions,
  selectedBuildingId?: string,
): any {
  // 1. Base EO layer color ramps
  let baseColorExpr: any;
  switch (activeLayer) {
    case 'growth':
      baseColorExpr = [
        'interpolate',
        ['linear'],
        ['get', 'growth_year'],
        2019, '#0284c7', // Sky Blue (pre-Expo baseline)
        2021, '#10b981', // Emerald (Expo 2020 opening)
        2023, '#f59e0b', // Amber (Post-Expo expansion)
        2026, '#f43f5e', // Coral (Latest boom)
      ];
      break;

    case 'insar':
      baseColorExpr = [
        'interpolate',
        ['linear'],
        ['get', 'subsidence_mm_yr'],
        -4.0, '#ef4444', // Crimson: Critical geotechnical risk
        -2.0, '#f59e0b', // Amber: Watch corridor
        0.0, '#10b981', // Emerald: Stable foundation
      ];
      break;

    case 'solar':
      baseColorExpr = [
        'interpolate',
        ['linear'],
        ['get', 'solar_capacity_kwp'],
        100, '#334155', // Slate: Low yield
        600, '#eab308', // Gold: High commercial yield
        1500, '#fef08a', // Bright Solar Yellow: Mega-roof
      ];
      break;

    case 'viirs':
      baseColorExpr = [
        'interpolate',
        ['linear'],
        ['get', 'viirs_radiance'],
        15.0, '#1e1b4b', // Midnight Deep Blue
        30.0, '#8b5cf6', // Violet
        45.0, '#f43f5e', // Hot Magenta / Nocturnal Glare
      ];
      break;

    case 'thermal':
    default:
      baseColorExpr = [
        'interpolate',
        ['linear'],
        ['get', 'lst_celsius'],
        38.0, '#06b6d4', // Cool Cyan: Shaded benchmark
        44.0, '#f97316', // Orange: Moderate surface heat
        49.0, '#ef4444', // Crimson: Peak urban heat island
      ];
      break;
  }

  // 2. Cases for highlighting:
  // - Actively selected building (amber gold)
  // - Sustainability prescriptions (solar emerald, cool-roof cyan, dimming purple)
  const cases: any[] = ['case'];

  if (selectedBuildingId) {
    cases.push(['==', ['get', 'id'], selectedBuildingId]);
    cases.push('#fbbf24'); // Amber gold highlight for selected building
  }

  const { deploySolar, applyCoolRoof, smartNightDimming, targetZone } = appliedPrescriptions;
  const zoneCondition =
    targetZone && targetZone !== 'ALL'
      ? ['==', ['get', 'zone_id'], targetZone]
      : null;

  // Dual mitigation: Solar + Cool Roof
  if (deploySolar && applyCoolRoof) {
    const dualPrescription = ['==', ['get', 'prescription'], 'SOLAR_AND_COOL_ROOF'];
    const cond = zoneCondition ? ['all', zoneCondition, dualPrescription] : dualPrescription;
    cases.push(cond);
    cases.push('#00f5d4'); // Electric teal-cyan
  }

  // Deploy Shams Solar mitigation highlight
  if (deploySolar) {
    const solarPrescription = [
      'any',
      ['==', ['get', 'prescription'], 'SOLAR_ARRAY'],
      ['==', ['get', 'prescription'], 'SOLAR_AND_COOL_ROOF'],
    ];
    const cond = zoneCondition ? ['all', zoneCondition, solarPrescription] : solarPrescription;
    cases.push(cond);
    cases.push('#10b981'); // Emerald solar green
  }

  // Apply Cool Roof & Shade Corridors mitigation highlight
  if (applyCoolRoof) {
    const coolRoofPrescription = [
      'any',
      ['==', ['get', 'prescription'], 'COOL_ROOF_CORRIDOR'],
      ['==', ['get', 'prescription'], 'SOLAR_AND_COOL_ROOF'],
    ];
    const cond = zoneCondition ? ['all', zoneCondition, coolRoofPrescription] : coolRoofPrescription;
    cases.push(cond);
    cases.push('#38bdf8'); // Sky albedo cyan
  }

  // Smart VIIRS Streetlight Dimming mitigation highlight
  if (smartNightDimming) {
    const dimmingPrescription = ['==', ['get', 'prescription'], 'SMART_DIMMING'];
    const cond = zoneCondition ? ['all', zoneCondition, dimmingPrescription] : dimmingPrescription;
    cases.push(cond);
    cases.push('#c084fc'); // Eco violet
  }

  // If no conditional highlights are active, return base expression directly
  if (cases.length <= 1) {
    return baseColorExpr;
  }

  cases.push(baseColorExpr);
  return cases;
}

/**
 * Format HTML for building selection popup
 */
function generateBuildingPopupHtml(props: BuildingFeatureProps): string {
  const lstColor = Number(props.lst_celsius) >= 44 ? '#f87171' : '#38bdf8';
  const subColor = Number(props.subsidence_mm_yr) < -2 ? '#fbbf24' : '#34d399';

  return `
    <div style="padding: 12px; font-family: system-ui, -apple-system, sans-serif; font-size: 11px; color: #f1f5f9; line-height: 1.4;">
      <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(6, 182, 212, 0.35); padding-bottom: 6px; margin-bottom: 8px;">
        <span style="font-weight: 700; color: #22d3ee; font-size: 13px; letter-spacing: 0.02em;">${props.name}</span>
        <span style="background: rgba(8, 51, 68, 0.8); color: #67e8f9; font-size: 9px; padding: 2px 6px; border-radius: 4px; border: 1px solid rgba(6, 182, 212, 0.4); text-transform: uppercase; font-weight: 600;">${props.land_use_class}</span>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px 8px; margin-bottom: 8px; font-size: 11px;">
        <div><span style="color: #94a3b8;">Zone:</span> <span style="font-family: monospace; color: #e2e8f0;">${props.zone_id}</span></div>
        <div><span style="color: #94a3b8;">Growth Year:</span> <span style="font-family: monospace; color: #e2e8f0;">${props.growth_year}</span></div>
        <div><span style="color: #94a3b8;">Height:</span> <span style="font-family: monospace; color: #e2e8f0;">${props.height_m} m</span></div>
        <div><span style="color: #94a3b8;">Roof Area:</span> <span style="font-family: monospace; color: #e2e8f0;">${Number(props.roof_area_m2).toLocaleString()} m²</span></div>
        <div><span style="color: #94a3b8;">14:30 LST:</span> <span style="font-family: monospace; font-weight: 700; color: ${lstColor};">${props.lst_celsius} °C</span></div>
        <div><span style="color: #94a3b8;">Solar Yield:</span> <span style="font-family: monospace; font-weight: 700; color: #facc15;">${props.solar_capacity_kwp} kWp</span></div>
        <div><span style="color: #94a3b8;">Subsidence:</span> <span style="font-family: monospace; color: ${subColor};">${props.subsidence_mm_yr} mm/yr</span></div>
        <div><span style="color: #94a3b8;">SAR Coherence:</span> <span style="font-family: monospace; color: #e2e8f0;">${props.sar_coherence}</span></div>
        <div style="grid-column: span 2;"><span style="color: #94a3b8;">Night Radiance:</span> <span style="font-family: monospace; color: #c084fc;">${props.viirs_radiance} nW/cm²</span></div>
      </div>
      <div style="border-top: 1px solid rgba(51, 65, 85, 0.7); padding-top: 6px; display: flex; align-items: center; justify-content: space-between;">
        <span style="color: #94a3b8; font-size: 10px;">Prescription:</span>
        <span style="background: rgba(6, 78, 59, 0.7); color: #34d399; font-weight: 600; padding: 2px 8px; border-radius: 4px; border: 1px solid rgba(16, 185, 129, 0.4); font-size: 10px;">${props.prescription}</span>
      </div>
    </div>
  `;
}

/**
 * 3D District Digital Twin: MapLibre GL 60 FPS Extruded Visualization
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
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const prevZoneRef = useRef<ZoneId | null | undefined>(undefined);

  // Initialize MapLibre GL Map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
      center: DEFAULT_CAMERA.center,
      zoom: DEFAULT_CAMERA.zoom,
      pitch: DEFAULT_CAMERA.pitch,
      bearing: DEFAULT_CAMERA.bearing,
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

      // 3. Add Dubai South 3D Buildings GeoJSON source
      map.addSource('dubai-south-buildings', {
        type: 'geojson',
        data: '/data/dubai_south/buildings_3d.geojson',
      });

      // 4. Add 3D Extrusion Layer with initial EO layer shader & prescription highlights
      const initialColor = buildBuildingColorExpression(
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

      // 5. Sun shadow lighting for 3D realism
      map.setLight({
        anchor: 'map',
        color: '#ffffff',
        intensity: 0.45,
        position: [1.5, 180, 55],
      });

      // 6. Growth year filter
      map.setFilter('buildings-3d', ['<=', ['get', 'growth_year'], selectedYear]);

      // 7. Interactive cursor hover
      map.on('mouseenter', 'buildings-3d', () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', 'buildings-3d', () => {
        map.getCanvas().style.cursor = '';
      });

      // 8. Building click handler & popup
      map.on('click', 'buildings-3d', (e) => {
        const feat = e.features?.[0];
        if (!feat?.properties) return;
        const props = feat.properties as unknown as BuildingFeatureProps;
        onSelectBuilding(props);

        if (!popupRef.current) {
          popupRef.current = new maplibregl.Popup({
            closeButton: true,
            closeOnClick: false,
            maxWidth: '340px',
            className: 'barjeel-building-popup',
            offset: [0, -10],
          });
          popupRef.current.on('close', () => {
            onSelectBuilding(null);
          });
        }

        const html = generateBuildingPopupHtml(props);
        popupRef.current.setLngLat(e.lngLat).setHTML(html).addTo(map);
      });

      // 9. Map click outside building clears selection
      map.on('click', (e) => {
        const feats = map.queryRenderedFeatures(e.point, { layers: ['buildings-3d'] });
        if (!feats || feats.length === 0) {
          onSelectBuilding(null);
          if (popupRef.current?.isOpen()) {
            popupRef.current.remove();
          }
        }
      });

      isLoadedRef.current = true;

      // Handle initial active zone fly-to if set on mount
      if (activeZone && ZONE_COORDS[activeZone]) {
        map.flyTo({ ...ZONE_COORDS[activeZone], speed: 1.2, essential: true });
        prevZoneRef.current = activeZone;
      }
    });

    mapRef.current = map;

    return () => {
      isLoadedRef.current = false;
      if (reticleMarkerRef.current) {
        reticleMarkerRef.current.remove();
        reticleMarkerRef.current = null;
      }
      if (popupRef.current) {
        popupRef.current.remove();
        popupRef.current = null;
      }
      map.remove();
      mapRef.current = null;
    };
  }, []); // Run once on mount

  // Update EO layer shaders, prescription highlights, and selected building highlight
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isLoadedRef.current || !map.getLayer('buildings-3d')) return;

    const colorExpr = buildBuildingColorExpression(
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

    const target = activeZone && ZONE_COORDS[activeZone] ? ZONE_COORDS[activeZone] : DEFAULT_CAMERA;
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

  // Live pulsing orbital scan reticle tracking live telemetry coordinates
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isLoadedRef.current) return;

    if (!latestTelemetry?.edge_ai) {
      if (reticleMarkerRef.current) {
        reticleMarkerRef.current.getElement().style.display = 'none';
      }
      return;
    }

    const { lat, lon, tile_id, predicted_class, confidence, inference_ms, action } =
      latestTelemetry.edge_ai;

    if (!reticleMarkerRef.current) {
      const container = document.createElement('div');
      container.className = 'orbital-reticle-marker';

      const pulseRing = document.createElement('div');
      pulseRing.className = 'reticle-pulse-ring';

      const crosshair = document.createElement('div');
      crosshair.className = 'reticle-crosshair';

      const coreDot = document.createElement('div');
      coreDot.className = 'reticle-core-dot';

      const hudBadge = document.createElement('div');
      hudBadge.className = 'reticle-hud-badge';
      hudBadge.id = 'barjeel-reticle-badge';

      container.appendChild(pulseRing);
      container.appendChild(crosshair);
      container.appendChild(coreDot);
      container.appendChild(hudBadge);

      reticleMarkerRef.current = new maplibregl.Marker({
        element: container,
        anchor: 'center',
      })
        .setLngLat([lon, lat])
        .addTo(map);
    } else {
      reticleMarkerRef.current.setLngLat([lon, lat]);
      reticleMarkerRef.current.getElement().style.display = 'flex';
    }

    const badge = document.getElementById('barjeel-reticle-badge');
    if (badge) {
      const isAlert = action === 'DOWNLINK_PRIORITY_ALERT';
      badge.innerHTML = `
        <div style="font-weight: 700; color: #22d3ee; margin-bottom: 2px; display: flex; justify-content: space-between; gap: 8px;">
          <span>● LIVE ORBITAL SCAN</span>
          <span style="color: #38bdf8;">${tile_id}</span>
        </div>
        <div style="color: #94a3b8; font-size: 9px;">
          LAT: <span style="color: #f1f5f9;">${lat.toFixed(4)}°N</span> | LON: <span style="color: #f1f5f9;">${lon.toFixed(4)}°E</span>
        </div>
        <div style="color: #94a3b8; font-size: 9px;">
          CLASS: <span style="color: #4ade80; font-weight: 600;">${predicted_class}</span> (${(confidence * 100).toFixed(0)}%)
        </div>
        <div style="color: #94a3b8; font-size: 9px;">
          INFER: <span style="color: #facc15;">${inference_ms.toFixed(2)} ms</span> | <span style="color: ${isAlert ? '#f87171' : '#38bdf8'}; font-weight: 600;">${action}</span>
        </div>
      `;
    }
  }, [latestTelemetry]);

  // Sync external building deselection with popup
  useEffect(() => {
    if (!selectedBuilding && popupRef.current?.isOpen()) {
      popupRef.current.remove();
    }
  }, [selectedBuilding]);

  return <div ref={containerRef} className="w-full h-full" />;
}
