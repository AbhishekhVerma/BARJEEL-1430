import React from 'react';
import type { BuildingFeatureProps, LayerMode } from '../../types/contracts';

interface BuildingTooltipProps {
  building: BuildingFeatureProps;
  activeLayer: LayerMode;
  onClose?: () => void;
  position?: { x: number; y: number } | null;
}

export const BuildingTooltip: React.FC<BuildingTooltipProps> = ({
  building,
  activeLayer,
  onClose,
  position,
}) => {
  const getZoneLabel = (zoneId: string) => {
    switch (zoneId) {
      case 'expo-core':
        return 'Expo City Core';
      case 'logistics-mega':
        return 'Dubai South Logistics';
      case 'residential-growth':
        return 'Residential Boom Zone';
      case 'aviation-infra':
        return 'Al Maktoum Perimeter';
      default:
        return zoneId;
    }
  };

  const getPrescriptionBadge = (rx: string) => {
    switch (rx) {
      case 'SOLAR_ARRAY':
        return { label: 'DEWA Shams Solar Array', bg: 'bg-amber-500/20 text-amber-300 border-amber-500/40' };
      case 'COOL_ROOF_CORRIDOR':
        return { label: 'Cool-Roof High Albedo', bg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' };
      case 'SOLAR_AND_COOL_ROOF':
        return { label: 'Dual Solar + Cool Roof', bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' };
      case 'SMART_DIMMING':
        return { label: 'Smart Night Dimming', bg: 'bg-purple-500/20 text-purple-300 border-purple-500/40' };
      case 'GEOTECH_AUDIT':
        return { label: 'SAR Geotech Stability Audit', bg: 'bg-rose-500/20 text-rose-300 border-rose-500/40' };
      default:
        return { label: rx, bg: 'bg-slate-700 text-slate-300 border-slate-600' };
    }
  };

  const badge = getPrescriptionBadge(building.prescription);

  // Position style if rendered as floating overlay relative to map container
  const style: React.CSSProperties = position
    ? {
        position: 'absolute',
        left: `${Math.min(position.x + 16, window.innerWidth - 320)}px`,
        top: `${Math.max(16, Math.min(position.y - 120, window.innerHeight - 360))}px`,
        pointerEvents: 'auto',
      }
    : {};

  return (
    <div
      style={style}
      className="z-30 w-72 backdrop-blur-md bg-slate-950/85 border border-cyan-500/30 rounded-lg p-3 text-xs text-slate-200 shadow-2xl shadow-cyan-950/50 font-mono transition-all animate-in fade-in zoom-in-95 duration-150"
    >
      {/* Header */}
      <div className="flex items-start justify-between border-b border-cyan-500/20 pb-2 mb-2">
        <div>
          <div className="text-[10px] text-cyan-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            {getZoneLabel(building.zone_id)}
          </div>
          <div className="text-sm font-bold text-white tracking-wide truncate max-w-[200px]" title={building.name}>
            {building.name}
          </div>
          <div className="text-[10px] text-slate-400">ID: {building.id}</div>
        </div>
        {onClose && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="text-slate-400 hover:text-white px-1.5 py-0.5 rounded text-xs hover:bg-slate-800 transition"
          >
            ✕
          </button>
        )}
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-2 mb-2.5">
        <div className="bg-slate-900/60 p-1.5 rounded border border-slate-800">
          <div className="text-[9px] text-slate-400">ROOF AREA</div>
          <div className="text-xs font-semibold text-slate-100">
            {building.roof_area_m2 ? building.roof_area_m2.toLocaleString(undefined, { maximumFractionDigits: 0 }) : '--'} m²
          </div>
        </div>
        <div className="bg-slate-900/60 p-1.5 rounded border border-slate-800">
          <div className="text-[9px] text-slate-400">STRUCTURAL HT</div>
          <div className="text-xs font-semibold text-slate-100">
            {building.height_m ? building.height_m.toFixed(1) : '--'} m
          </div>
        </div>
      </div>

      {/* Dynamic Layer Focal Data */}
      <div className="mb-2 bg-slate-900/90 rounded p-2 border border-cyan-900/40">
        <div className="text-[9px] text-cyan-400/90 font-bold uppercase mb-1 flex items-center justify-between">
          <span>ACTIVE LAYER: {activeLayer.toUpperCase()}</span>
          {activeLayer === 'thermal' && (
            <span className="text-rose-400 font-bold animate-pulse">14:30 GST PEAK</span>
          )}
        </div>

        {activeLayer === 'thermal' && (
          <div className="flex items-baseline justify-between">
            <span className="text-[11px] text-slate-300">Surface Temp (LST):</span>
            <span
              className={`font-bold text-sm ${
                building.lst_celsius >= 44 ? 'text-rose-400' : 'text-amber-300'
              }`}
            >
              {building.lst_celsius}°C
            </span>
          </div>
        )}

        {activeLayer === 'solar' && (
          <div className="space-y-0.5">
            <div className="flex items-baseline justify-between">
              <span className="text-[10px] text-slate-300">Yield Potential:</span>
              <span className="font-bold text-xs text-amber-300">
                {(building.solar_kwh_yr / 1000).toFixed(0)} MWh/yr
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-[10px] text-slate-400">Capacity:</span>
              <span className="text-slate-200 text-xs font-semibold">
                {building.solar_capacity_kwp} kWp
              </span>
            </div>
          </div>
        )}

        {activeLayer === 'insar' && (
          <div className="space-y-0.5">
            <div className="flex items-baseline justify-between">
              <span className="text-[10px] text-slate-300">Subsidence Rate:</span>
              <span
                className={`font-bold text-xs ${
                  building.subsidence_mm_yr < -2 ? 'text-rose-400' : 'text-emerald-400'
                }`}
              >
                {building.subsidence_mm_yr} mm/yr
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-[10px] text-slate-400">SAR Coherence:</span>
              <span className="text-slate-200 text-xs">{building.sar_coherence}</span>
            </div>
          </div>
        )}

        {activeLayer === 'viirs' && (
          <div className="flex items-baseline justify-between">
            <span className="text-[10px] text-slate-300">Night Radiance:</span>
            <span className="font-bold text-xs text-purple-300">
              {building.viirs_radiance} nW/cm²·sr
            </span>
          </div>
        )}

        {activeLayer === 'growth' && (
          <div className="flex items-baseline justify-between">
            <span className="text-[10px] text-slate-300">Completed Year:</span>
            <span className="font-bold text-xs text-cyan-300">{building.growth_year}</span>
          </div>
        )}
      </div>

      {/* Prescription / Closed-Loop Recommendation */}
      <div className="border-t border-slate-800/80 pt-2">
        <div className="flex items-center justify-between text-[9px] text-slate-400 mb-1">
          <span>ORBITAL AI PRESCRIPTION</span>
          <span className="text-cyan-400">PRIORITY: {building.priority_score}/100</span>
        </div>
        <div className={`px-2 py-1 rounded border text-[10px] font-semibold tracking-wide ${badge.bg}`}>
          {badge.label}
        </div>
      </div>
    </div>
  );
};
