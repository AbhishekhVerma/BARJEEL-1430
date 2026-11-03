export type ZoneId =
  | 'expo-core'
  | 'logistics-mega'
  | 'residential-growth'
  | 'aviation-infra';

export type LayerMode =
  | 'growth'
  | 'insar'
  | 'solar'
  | 'thermal'
  | 'viirs';

export type MissionPhase = 1 | 2 | 3;

export type PrescriptionType =
  | 'SOLAR_ARRAY'
  | 'COOL_ROOF_CORRIDOR'
  | 'GEOTECH_AUDIT'
  | 'SMART_DIMMING'
  | 'SOLAR_AND_COOL_ROOF';

export interface BuildingFeatureProps {
  id: string;
  zone_id: ZoneId;
  name: string;
  height_m: number;
  roof_area_m2: number;
  land_use_class: string;
  growth_year: number;
  lst_celsius: number;
  subsidence_mm_yr: number;
  sar_coherence: number;
  solar_kwh_yr: number;
  solar_capacity_kwp: number;
  viirs_radiance: number;
  prescription: PrescriptionType;
  priority_score: number;
}

export interface ZoneDefinition {
  id: ZoneId;
  name: string;
  center: [number, number];
  zoom: number;
  summary: string;
}

export interface DistrictSummary {
  mission: string;
  aoi_name: string;
  total_buildings: number;
  total_roof_area_m2: number;
  total_solar_capacity_mwp: number;
  total_solar_gwh_yr: number;
  mean_lst_celsius: number;
  hotspot_count: number;
  subsidence_watch_count: number;
  data_source: 'REAL_STAC_SATELLITE_FUSION';
}

export interface AppliedPrescriptions {
  deploySolar: boolean;
  applyCoolRoof: boolean;
  smartNightDimming: boolean;
  targetZone: ZoneId | 'ALL';
}

export interface OrbitalTelemetryPacket {
  ccsds_header_hex: string;
  met_ms: number;
  source: 'SIM_OBC' | 'ESP32_S3_HIL' | 'FRONTEND_FALLBACK';
  flight_mode: 'NOMINAL_EO_SCAN' | 'THERMAL_PEAK_1430' | 'SAFEHOLD';
  solar_local_time: string;
  adcs: {
    q0: number;
    q1: number;
    q2: number;
    q3: number;
    nadir_locked: boolean;
    temp_c?: number;
  };
  edge_ai: {
    tile_id: string;
    lat: number;
    lon: number;
    predicted_class: string;
    confidence: number;
    inference_ms: number;
    action: 'DOWNLINK_PRIORITY_ALERT' | 'DROP_STATIC_DESERT';
    bandwidth_saved_pct: number;
    change_detected: boolean;
  };
}

export interface DistrictMapProps {
  activeLayer: LayerMode;
  selectedYear: number;
  activeZone: ZoneId | null;
  selectedBuilding: BuildingFeatureProps | null;
  onSelectBuilding: (building: BuildingFeatureProps | null) => void;
  appliedPrescriptions: AppliedPrescriptions;
  latestTelemetry: OrbitalTelemetryPacket | null;
  satelliteBasemap: boolean;
}

export interface MissionHUDProps {
  missionPhase: MissionPhase;
  onChangeMissionPhase: (phase: MissionPhase) => void;
  activeLayer: LayerMode;
  onChangeLayer: (layer: LayerMode) => void;
  selectedYear: number;
  onChangeYear: (year: number) => void;
  activeZone: ZoneId | null;
  onSelectZone: (zone: ZoneId | null) => void;
  selectedBuilding: BuildingFeatureProps | null;
  onClearBuilding: () => void;
  appliedPrescriptions: AppliedPrescriptions;
  onChangePrescriptions: (next: AppliedPrescriptions) => void;
  satelliteBasemap: boolean;
  onToggleBasemap: () => void;
  onTelemetryUpdate: (packet: OrbitalTelemetryPacket) => void;
}

