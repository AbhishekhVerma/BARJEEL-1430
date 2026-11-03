import type { StyleSpecification, ExpressionSpecification } from 'maplibre-gl';
import type { LayerMode, AppliedPrescriptions, ZoneId } from '../../types/contracts';

/**
 * Camera presets for AOI and the 4 Dubai South districts
 */
export const AOI_DEFAULT_CAMERA = {
  center: [55.1580, 24.9480] as [number, number],
  zoom: 13.6,
  pitch: 58,
  bearing: 135,
};

export const ZONE_CAMERAS: Record<ZoneId, { center: [number, number]; zoom: number; pitch: number; bearing: number }> = {
  'expo-core': {
    center: [55.1510, 24.9600],
    zoom: 15.0,
    pitch: 58,
    bearing: 135,
  },
  'logistics-mega': {
    center: [55.1680, 24.9180],
    zoom: 14.4,
    pitch: 55,
    bearing: 140,
  },
  'residential-growth': {
    center: [55.2050, 24.9420],
    zoom: 14.3,
    pitch: 58,
    bearing: 130,
  },
  'aviation-infra': {
    center: [55.1650, 24.9020],
    zoom: 14.2,
    pitch: 55,
    bearing: 135,
  },
};

/**
 * High-performance dual basemap style (CARTO Dark Matter + Esri World Imagery)
 */
export const BASE_MAP_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    'carto-dark': {
      type: 'raster',
      tiles: [
        'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
        'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
        'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
        'https://d.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
      ],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors, © CARTO',
      maxzoom: 20,
    },
    'esri-satellite': {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      attribution: '© Esri, Maxar, Earthstar Geographics',
      maxzoom: 19,
    },
  },
  layers: [
    {
      id: 'background-fill',
      type: 'background',
      paint: {
        'background-color': '#020617',
      },
    },
    {
      id: 'carto-dark-layer',
      type: 'raster',
      source: 'carto-dark',
      paint: {
        'raster-opacity': 1,
        'raster-fade-duration': 300,
      },
    },
    {
      id: 'esri-satellite-layer',
      type: 'raster',
      source: 'esri-satellite',
      layout: {
        visibility: 'none',
      },
      paint: {
        'raster-opacity': 0.95,
        'raster-fade-duration': 300,
      },
    },
  ],
};

/**
 * Generate 3D fill-extrusion color expression for the 5 multi-spectral satellite layers
 */
export function getBaseLayerColorExpression(activeLayer: LayerMode): ExpressionSpecification {
  switch (activeLayer) {
    case 'growth':
      // 2019-2026 urban expansion color ramp (6 stops)
      return [
        'interpolate',
        ['linear'],
        ['get', 'growth_year'],
        2019, '#334155', // Slate - established
        2021, '#0284c7', // Sky Blue - Expo era
        2023, '#0d9488', // Teal - post-Expo logistics
        2024, '#10b981', // Emerald - green expansion
        2025, '#f59e0b', // Amber - recent boom
        2026, '#ec4899', // Hot Pink - latest 2026 builds
      ];

    case 'insar':
      // Ground subsidence risk: crimson (< -4 mm/yr) -> amber (-2 mm/yr) -> emerald (0 mm/yr)
      return [
        'interpolate',
        ['linear'],
        ['get', 'subsidence_mm_yr'],
        -6.0, '#7f1d1d', // Severe subsidence
        -4.0, '#ef4444', // High risk crimson
        -2.0, '#f59e0b', // Moderate amber
        -0.5, '#10b981', // Stable emerald
        1.0, '#06b6d4',  // Uplift / bedrock
      ];

    case 'solar':
      // Rooftop clean energy potential: deep slate -> glowing gold/amber scaled by solar_kwh_yr
      return [
        'interpolate',
        ['linear'],
        ['get', 'solar_kwh_yr'],
        0, '#1e293b',       // Low/none - dark slate
        400000, '#78350f',  // Modest yield
        1200000, '#d97706', // High commercial yield
        2200000, '#f59e0b', // Mega-warehouse yield (gold)
        3500000, '#fef08a', // Peak solar yield (brilliant gold/white)
      ];

    case 'thermal':
      // 14:30 GST Heat Island: cool cyan (34°C) -> orange -> intense crimson (51°C)
      return [
        'interpolate',
        ['linear'],
        ['get', 'lst_celsius'],
        34, '#06b6d4', // Cool cyan canopy
        38, '#0284c7', // Tempered
        42, '#f97316', // Warm orange
        46, '#ef4444', // Hot crimson
        51, '#991b1b', // Extreme thermal hotspot
      ];

    case 'viirs':
      // Nighttime radiance / wasted illumination: midnight blue -> neon magenta/white
      return [
        'interpolate',
        ['linear'],
        ['get', 'viirs_radiance'],
        5, '#0f172a',  // Low radiance midnight
        18, '#4338ca', // Indigo
        32, '#a855f7', // Purple
        48, '#ec4899', // Neon magenta
        65, '#ffffff', // High radiance blazing white
      ];

    default:
      return ['literal', '#06b6d4'];
  }
}

/**
 * Builds the composite fill-extrusion color expression that accounts for:
 * 1. Selected building highlight (amber gold #fbbf24 paired with cyan roof cap)
 * 2. Distinct per-prescription mitigation colors:
 *    - Dual Solar + Cool Roof: #00f5d4 (Electric Teal)
 *    - Shams Rooftop Solar: #10b981 (Emerald)
 *    - Barjeel Cool-Roof Corridor: #38bdf8 (Sky Cyan)
 *    - Smart VIIRS Night Dimming: #c084fc (Eco Violet)
 * 3. Base multi-spectral satellite layer color
 */
export function buildCompositeExtrusionColor(
  activeLayer: LayerMode,
  prescriptions: AppliedPrescriptions,
  selectedBuildingId: string | null | undefined
): any {
  const baseColorExpr = getBaseLayerColorExpression(activeLayer);
  const cases: any[] = ['case'];

  if (selectedBuildingId) {
    cases.push(['==', ['get', 'id'], selectedBuildingId]);
    cases.push('#fbbf24');
  }

  const { deploySolar, applyCoolRoof, smartNightDimming, targetZone } = prescriptions;
  const zoneCondition =
    targetZone && targetZone !== 'ALL'
      ? ['==', ['get', 'zone_id'], targetZone]
      : null;

  if (deploySolar && applyCoolRoof) {
    const dualPrescription = ['==', ['get', 'prescription'], 'SOLAR_AND_COOL_ROOF'];
    const cond = zoneCondition ? ['all', zoneCondition, dualPrescription] : dualPrescription;
    cases.push(cond);
    cases.push('#00f5d4');
  }

  if (deploySolar) {
    const solarPrescription = [
      'any',
      ['==', ['get', 'prescription'], 'SOLAR_ARRAY'],
      ['==', ['get', 'prescription'], 'SOLAR_AND_COOL_ROOF'],
    ];
    const cond = zoneCondition ? ['all', zoneCondition, solarPrescription] : solarPrescription;
    cases.push(cond);
    cases.push('#10b981');
  }

  if (applyCoolRoof) {
    const coolRoofPrescription = [
      'any',
      ['==', ['get', 'prescription'], 'COOL_ROOF_CORRIDOR'],
      ['==', ['get', 'prescription'], 'SOLAR_AND_COOL_ROOF'],
    ];
    const cond = zoneCondition ? ['all', zoneCondition, coolRoofPrescription] : coolRoofPrescription;
    cases.push(cond);
    cases.push('#38bdf8');
  }

  if (smartNightDimming) {
    const dimmingPrescription = ['==', ['get', 'prescription'], 'SMART_DIMMING'];
    const cond = zoneCondition ? ['all', zoneCondition, dimmingPrescription] : dimmingPrescription;
    cases.push(cond);
    cases.push('#c084fc');
  }

  if (cases.length <= 1) {
    return baseColorExpr;
  }

  cases.push(baseColorExpr);
  return cases;
}
