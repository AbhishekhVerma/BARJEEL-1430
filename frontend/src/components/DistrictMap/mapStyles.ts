import type { StyleSpecification, ExpressionSpecification } from 'maplibre-gl';
import type { LayerMode, AppliedPrescriptions, ZoneId } from '../../types/contracts';

/**
 * Camera presets for AOI and the 4 Dubai South districts
 */
export const AOI_DEFAULT_CAMERA = {
  center: [55.1510, 24.9600] as [number, number],
  zoom: 13.8,
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
 * Both raster sources are registered so toggling is instantaneous (zero reload/re-render flicker)
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
      // 2019-2026 urban expansion color ramp
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
      // Ground subsidence risk: emerald (0 mm/yr) -> amber (-2 mm/yr) -> crimson (< -4 mm/yr)
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
      // 14:30 GST Heat Island: cool cyan (36°C) -> orange -> intense crimson (49°C+)
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
 * 1. Selected building highlight (luminous neon gold/white)
 * 2. Applied Prescriptions ("Mitigated" glowing cyan/emerald shader)
 * 3. Base multi-spectral satellite layer color
 */
export function buildCompositeExtrusionColor(
  activeLayer: LayerMode,
  prescriptions: AppliedPrescriptions,
  selectedBuildingId: string | null
): ExpressionSpecification {
  const baseColorExpr = getBaseLayerColorExpression(activeLayer);

  // Check which prescriptions are currently active
  const hasPrescriptionsActive =
    prescriptions.deploySolar ||
    prescriptions.applyCoolRoof ||
    prescriptions.smartNightDimming;

  // Build conditions for mitigation match
  const mitigationConditions: ExpressionSpecification[] = [];

  if (prescriptions.deploySolar) {
    mitigationConditions.push([
      'any',
      ['==', ['get', 'prescription'], 'SOLAR_ARRAY'],
      ['==', ['get', 'prescription'], 'SOLAR_AND_COOL_ROOF'],
    ]);
  }

  if (prescriptions.applyCoolRoof) {
    mitigationConditions.push([
      'any',
      ['==', ['get', 'prescription'], 'COOL_ROOF_CORRIDOR'],
      ['==', ['get', 'prescription'], 'SOLAR_AND_COOL_ROOF'],
    ]);
  }

  if (prescriptions.smartNightDimming) {
    mitigationConditions.push(['==', ['get', 'prescription'], 'SMART_DIMMING']);
  }

  // Zone filter for prescriptions
  let isPrescriptionTargetMatch: ExpressionSpecification = ['literal', true];
  if (prescriptions.targetZone !== 'ALL') {
    isPrescriptionTargetMatch = ['==', ['get', 'zone_id'], prescriptions.targetZone];
  }

  // Mitigated highlight color: vibrant futuristic emerald-cyan (#00f5d4)
  const MITIGATED_COLOR = '#00f5d4';
  const SELECTED_COLOR = '#38bdf8'; // Glowing sky-blue highlight

  // Assemble full case expression
  if (selectedBuildingId && hasPrescriptionsActive && mitigationConditions.length > 0) {
    return [
      'case',
      ['==', ['get', 'id'], selectedBuildingId],
      SELECTED_COLOR,
      [
        'all',
        isPrescriptionTargetMatch,
        ['any', ...mitigationConditions],
      ],
      MITIGATED_COLOR,
      baseColorExpr,
    ];
  }

  if (selectedBuildingId) {
    return [
      'case',
      ['==', ['get', 'id'], selectedBuildingId],
      SELECTED_COLOR,
      baseColorExpr,
    ];
  }

  if (hasPrescriptionsActive && mitigationConditions.length > 0) {
    return [
      'case',
      [
        'all',
        isPrescriptionTargetMatch,
        ['any', ...mitigationConditions],
      ],
      MITIGATED_COLOR,
      baseColorExpr,
    ];
  }

  return baseColorExpr;
}
