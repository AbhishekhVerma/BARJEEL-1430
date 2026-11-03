export type ZoneId = 'expo-core' | 'logistics-mega' | 'residential-growth' | 'aviation-infra';

export type PrescriptionType = 
  | 'SOLAR_ARRAY' 
  | 'COOL_ROOF_CORRIDOR' 
  | 'GEOTECH_AUDIT' 
  | 'SMART_DIMMING' 
  | 'SOLAR_AND_COOL_ROOF';

export interface BuildingFeatureProperties {
  id: string;
  zone_id: ZoneId;
  name: string;
  height_m: number;
  roof_area_m2: number;
  land_use_class: string;
  growth_year: number; // 2019..2026
  lst_celsius: number;
  subsidence_mm_yr: number;
  sar_coherence: number;
  solar_kwh_yr: number;
  solar_capacity_kwp: number;
  viirs_radiance: number;
  prescription: PrescriptionType;
  priority_score: number; // 0..100
}

export interface BuildingGeoJSONFeature {
  type: 'Feature';
  id: string;
  geometry: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: number[][][] | number[][][][];
  };
  properties: BuildingFeatureProperties;
}

export interface BuildingGeoJSONCollection {
  type: 'FeatureCollection';
  features: BuildingGeoJSONFeature[];
}

export interface ZoneSummary {
  zone_id: ZoneId;
  name: string;
  building_count: number;
  total_roof_area_m2: number;
  total_solar_capacity_kwp: number;
  total_solar_kwh_yr: number;
  avg_lst_celsius: number;
  avg_subsidence_mm_yr: number;
  avg_sar_coherence: number;
  avg_viirs_radiance: number;
  tco2_avoided_yr: number;
  prescriptions: Record<PrescriptionType, number>;
}

export interface DistrictSummary {
  mission: string;
  generated_at: string;
  aoi_bbox: [number, number, number, number];
  total_buildings: number;
  total_roof_area_m2: number;
  total_solar_capacity_mwp: number;
  total_solar_gwh_yr: number;
  total_tco2_offset_yr: number;
  zones: Record<ZoneId, ZoneSummary>;
}
