import { useEffect } from 'react';
import type { LayerMode, MissionHUDProps } from '../../types/contracts';

/**
 * MEMBER 4 WORKSPACE: `frontend/src/components/HUD/`
 * Keep `MissionHUDProps` intact so `App.tsx` and Member 3's `DistrictMap` integrate with zero merge conflicts.
 */
const LAYERS: { id: LayerMode; label: string }[] = [
  { id: 'growth', label: '01 Sprawl (S2)' },
  { id: 'insar', label: '02 InSAR (S1)' },
  { id: 'solar', label: '03 Solar (DEM)' },
  { id: 'thermal', label: '04 14:30 Heat (L8/9)' },
  { id: 'viirs', label: '05 Night Waste (VIIRS)' },
];

export function MissionHUD({
  activeLayer,
  onChangeLayer,
  selectedYear,
  onChangeYear,
  selectedBuilding,
  onTelemetryUpdate,
}: MissionHUDProps) {
  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8000/ws/telemetry');
    ws.onmessage = (ev) => {
      try {
        onTelemetryUpdate(JSON.parse(ev.data));
      } catch {
        // Ignore malformed frame
      }
    };
    return () => ws.close();
  }, [onTelemetryUpdate]);

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-4">
      <div className="pointer-events-auto flex flex-wrap items-center justify-between gap-3 rounded-xl border border-cyan-500/30 bg-slate-900/85 px-4 py-3 backdrop-blur-md">
        <div>
          <div className="text-xs font-semibold tracking-widest text-cyan-400">
            SUPERNOVA × SPACEPOINT // MISSION BARJEEL-1430
          </div>
          <div className="text-sm text-slate-300">
            Dubai South & Expo City Closed-Loop Sustainability Twin
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {LAYERS.map((l) => (
            <button
              key={l.id}
              onClick={() => onChangeLayer(l.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                activeLayer === l.id
                  ? 'bg-cyan-500 text-slate-950 font-bold'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-300">
          <span>Year: {selectedYear}</span>
          <input
            type="range"
            min={2019}
            max={2026}
            value={selectedYear}
            onChange={(e) => onChangeYear(Number(e.target.value))}
          />
        </div>
      </div>

      {selectedBuilding && (
        <div className="pointer-events-auto w-80 rounded-xl border border-amber-500/40 bg-slate-900/90 p-4 text-xs backdrop-blur-md">
          <div className="font-bold text-amber-400">{selectedBuilding.name}</div>
          <div className="mt-1 text-slate-300">LST: {selectedBuilding.lst_celsius} °C | Solar: {selectedBuilding.solar_capacity_kwp} kWp</div>
          <div className="text-slate-300">Subsidence: {selectedBuilding.subsidence_mm_yr} mm/yr | Fix: {selectedBuilding.prescription}</div>
        </div>
      )}
    </div>
  );
}
