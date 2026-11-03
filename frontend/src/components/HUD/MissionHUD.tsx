import { useEffect, useState } from 'react';
import {
  Satellite,
  Flame,
  Sun,
  Moon,
  Activity,
  Calendar,
  MapPin,
  Globe,
  Radio,
  Cpu,
  ShieldAlert,
  Send,
  X,
  Building,
  Zap,
  Play,
  Pause,
} from 'lucide-react';
import { useTelemetryStream } from '../../hooks/useTelemetryStream';
import { OrbitalTwinPiP } from './OrbitalTwinPiP';
import { PrescriptionSimulator } from './PrescriptionSimulator';
import type {
  LayerMode,
  MissionHUDProps,
  ZoneId,
} from '../../types/contracts';

const LAYERS: { id: LayerMode; label: string; icon: typeof Flame; color: string }[] = [
  { id: 'thermal', label: '14:30 Heat (L8/9)', icon: Flame, color: 'text-amber-400' },
  { id: 'solar', label: 'Solar Rooftops (DEM)', icon: Sun, color: 'text-yellow-400' },
  { id: 'growth', label: 'Sprawl (S2)', icon: Calendar, color: 'text-sky-400' },
  { id: 'insar', label: 'InSAR Subsidence (S1)', icon: Activity, color: 'text-emerald-400' },
  { id: 'viirs', label: 'Night Waste (VIIRS)', icon: Moon, color: 'text-purple-400' },
];

const ZONES: { id: ZoneId | null; label: string }[] = [
  { id: null, label: 'All Corridor' },
  { id: 'expo-core', label: 'Expo City' },
  { id: 'logistics-mega', label: 'Logistics Solar' },
  { id: 'residential-growth', label: 'Residential Heat' },
  { id: 'aviation-infra', label: 'Al Maktoum Infra' },
];

export function MissionHUD({
  missionPhase,
  onChangeMissionPhase,
  activeLayer,
  onChangeLayer,
  selectedYear,
  onChangeYear,
  activeZone,
  onSelectZone,
  selectedBuilding,
  onClearBuilding,
  appliedPrescriptions,
  onChangePrescriptions,
  satelliteBasemap,
  onToggleBasemap,
  onTelemetryUpdate,
}: MissionHUDProps) {
  // Connect to live telemetry stream with automatic fallback
  const { telemetry, isFallback, flightMode, uplinkStatus, sendCommand } = useTelemetryStream(
    onTelemetryUpdate,
    'THERMAL_PEAK_1430'
  );

  // Auto-play timeline animation (2019 -> 2026)
  const [isPlayingYear, setIsPlayingYear] = useState<boolean>(false);

  useEffect(() => {
    if (!isPlayingYear) return;
    const timer = window.setInterval(() => {
      onChangeYear(selectedYear >= 2026 ? 2019 : selectedYear + 1);
    }, 1200);
    return () => clearInterval(timer);
  }, [isPlayingYear, selectedYear, onChangeYear]);

  const sourceBadgeStyle =
    telemetry?.source === 'ESP32_S3_HIL'
      ? 'border-emerald-500/60 bg-emerald-950/80 text-emerald-300'
      : telemetry?.source === 'SIM_OBC'
      ? 'border-cyan-500/60 bg-cyan-950/80 text-cyan-300'
      : 'border-amber-500/60 bg-amber-950/80 text-amber-300';

  const edgeAction = telemetry?.edge_ai.action || 'DOWNLINK_PRIORITY_ALERT';
  const isPriorityAlert = edgeAction === 'DOWNLINK_PRIORITY_ALERT';

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-3 sm:p-4 overflow-hidden">
      {/* ===================== TOP NAVIGATION & STATUS BAR ===================== */}
      <div className="flex flex-col gap-2">
        {/* Main App Header & Layer Controls */}
        <div className="pointer-events-auto flex flex-wrap items-center justify-between gap-3 rounded-xl border border-cyan-500/30 bg-slate-900/90 px-4 py-2.5 shadow-2xl backdrop-blur-md">
          {/* Mission Branding */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/20 border border-cyan-400/40 text-cyan-300">
              <Satellite className="h-4 w-4 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black tracking-widest text-cyan-400">
                  SUPERNOVA × SPACEPOINT
                </span>
                <span className="rounded bg-cyan-950 px-1.5 py-0.5 text-[10px] font-mono text-cyan-300 border border-cyan-800">
                  BARJEEL-1430 (برجيل-1430)
                </span>
              </div>
              <div className="text-[11px] text-slate-300">
                Dubai South & Expo City Closed-Loop Sustainability Digital Twin
              </div>
            </div>
          </div>

          {/* 5 Layer Selector Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {LAYERS.map((l) => {
              const Icon = l.icon;
              const isActive = activeLayer === l.id;
              return (
                <button
                  key={l.id}
                  onClick={() => onChangeLayer(l.id)}
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                    isActive
                      ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/30'
                      : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-slate-950' : l.color}`} />
                  <span>{l.label}</span>
                </button>
              );
            })}
          </div>

          {/* Timeline & Basemap Toggles */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Timeline Slider with Play/Pause */}
            <div className="flex items-center gap-2 rounded-lg border border-slate-700/60 bg-slate-950/60 px-2.5 py-1 text-xs text-slate-300">
              <button
                onClick={() => setIsPlayingYear((prev) => !prev)}
                className="flex h-5 w-5 items-center justify-center rounded bg-sky-500/20 border border-sky-500/40 text-sky-300 hover:bg-sky-500/30 transition"
                title={isPlayingYear ? 'Pause 2019–2026 growth animation' : 'Play 2019–2026 growth animation'}
              >
                {isPlayingYear ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
              </button>
              <Calendar className="h-3.5 w-3.5 text-sky-400" />
              <span className="font-mono font-bold text-sky-300">{selectedYear}</span>
              <input
                type="range"
                min={2019}
                max={2026}
                value={selectedYear}
                onChange={(e) => onChangeYear(Number(e.target.value))}
                className="h-1.5 w-20 cursor-pointer accent-sky-400"
                title="Filter urban growth 2019-2026"
              />
            </div>

            {/* Satellite / Dark Basemap Toggle */}
            <button
              onClick={onToggleBasemap}
              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${
                satelliteBasemap
                  ? 'border-emerald-400 bg-emerald-950/80 text-emerald-300'
                  : 'border-slate-700 bg-slate-950/80 text-slate-300 hover:border-slate-500'
              }`}
            >
              <Globe className="h-3.5 w-3.5" />
              <span>{satelliteBasemap ? 'Satellite Base' : 'Dark Mission Base'}</span>
            </button>
          </div>
        </div>

        {/* ===================== TELEMETRY & EDGE AI STATUS STRIP ===================== */}
        <div className="pointer-events-auto flex flex-wrap items-center justify-between gap-2 rounded-xl border border-cyan-500/20 bg-slate-900/85 px-3 py-1.5 text-xs shadow-lg backdrop-blur-md">
          {/* Left: Zone Navigation Presets */}
          <div className="flex items-center gap-1">
            <span className="flex items-center gap-1 text-[11px] font-mono text-slate-400 mr-1">
              <MapPin className="h-3 w-3 text-cyan-400" />
              <span>ZONES:</span>
            </span>
            {ZONES.map((z) => (
              <button
                key={z.id ?? 'all'}
                onClick={() => onSelectZone(z.id)}
                className={`rounded px-2 py-0.5 text-[11px] font-mono transition ${
                  activeZone === z.id
                    ? 'bg-cyan-500/20 border border-cyan-400 text-cyan-300 font-bold'
                    : 'bg-slate-950/60 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {z.label}
              </button>
            ))}
          </div>

          {/* Right: CCSDS Header + EuroSAT ONNX Badge + Action + Hardware Source + Uplink Buttons */}
          <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
            {/* CCSDS 133.0-B-2 Packet Header */}
            <div className="flex items-center gap-1 rounded border border-slate-700 bg-slate-950/70 px-2 py-0.5 text-slate-300">
              <Radio className="h-3 w-3 text-cyan-400" />
              <span className="text-[10px] text-slate-400">CCSDS:</span>
              <span className="font-bold text-cyan-300">
                {telemetry?.ccsds_header_hex || '0801C04A003F'}
              </span>
            </div>

            {/* EuroSAT INT8 ONNX Prediction */}
            <div className="flex items-center gap-1 rounded border border-amber-500/40 bg-amber-950/60 px-2 py-0.5 text-amber-300">
              <Cpu className="h-3 w-3 text-amber-400" />
              <span>
                EuroSAT:{' '}
                <strong className="text-amber-200">
                  {telemetry?.edge_ai.predicted_class || 'Industrial'} (
                  {Math.round((telemetry?.edge_ai.confidence ?? 0.96) * 100)}%)
                </strong>
              </span>
            </div>

            {/* Edge AI Action Decision Pill */}
            <div
              className={`hidden xl:flex items-center gap-1 rounded border px-2 py-0.5 text-[10px] font-bold ${
                isPriorityAlert
                  ? 'border-amber-500/50 bg-amber-950/70 text-amber-300'
                  : 'border-slate-600/60 bg-slate-900/80 text-slate-400'
              }`}
            >
              <span>{edgeAction}</span>
            </div>

            {/* Inference Latency & Downlink Saved */}
            <div className="flex items-center gap-1.5 rounded border border-slate-700 bg-slate-950/70 px-2 py-0.5 text-slate-300">
              <span className="text-emerald-400 font-bold">
                {telemetry?.edge_ai.inference_ms ?? 0.52} ms
              </span>
              <span className="text-slate-500">|</span>
              <span className="text-sky-300">
                {telemetry?.edge_ai.bandwidth_saved_pct ?? 78.4}% Saved
              </span>
            </div>

            {/* Hardware Source Badge */}
            <div className={`flex items-center gap-1 rounded border px-2 py-0.5 text-[10px] font-bold ${sourceBadgeStyle}`}>
              <ShieldAlert className="h-3 w-3" />
              <span>{telemetry?.source || (isFallback ? 'FRONTEND_FALLBACK' : 'SIM_OBC')}</span>
            </div>

            {/* Uplink Flight Mode Buttons */}
            <div className="flex items-center gap-1 border-l border-slate-700 pl-2">
              <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                <Send className="h-2.5 w-2.5 text-cyan-400" />
                <span>UPLINK:</span>
              </span>
              {(['NOMINAL_EO_SCAN', 'THERMAL_PEAK_1430', 'SAFEHOLD'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => sendCommand(mode)}
                  className={`rounded px-1.5 py-0.5 text-[9px] font-bold transition ${
                    flightMode === mode
                      ? 'bg-cyan-500 text-slate-950'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                  title={`Uplink flight mode: ${mode}`}
                >
                  {mode === 'NOMINAL_EO_SCAN' ? 'SCAN' : mode === 'THERMAL_PEAK_1430' ? '14:30 PEAK' : 'SAFEHOLD'}
                </button>
              ))}
              {uplinkStatus !== 'IDLE' && (
                <span className="rounded bg-emerald-950/90 border border-emerald-500/40 px-1.5 py-0.5 text-[9px] text-emerald-300">
                  {uplinkStatus}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ===================== BOTTOM CONTROLS & FLOATING PANELS ===================== */}
      <div className="flex flex-col sm:flex-row items-end justify-between gap-4 pointer-events-none">
        {/* Bottom Left: Three.js 3U CubeSat Picture-in-Picture */}
        <div className="pointer-events-auto">
          <OrbitalTwinPiP telemetry={telemetry} />
        </div>

        {/* Bottom Center / Floating: Building Inspector Card */}
        {selectedBuilding && (
          <div className="pointer-events-auto w-80 sm:w-96 rounded-xl border border-amber-500/50 bg-slate-900/95 p-4 text-xs shadow-2xl backdrop-blur-md text-slate-200">
            <div className="flex items-center justify-between border-b border-amber-500/30 pb-2">
              <div className="flex items-center gap-2">
                <Building className="h-4 w-4 text-amber-400" />
                <div>
                  <div className="font-bold text-amber-400 text-sm">{selectedBuilding.name}</div>
                  <div className="text-[10px] font-mono text-slate-400">
                    ID: {selectedBuilding.id} · Built {selectedBuilding.growth_year}
                  </div>
                </div>
              </div>
              <button
                onClick={onClearBuilding}
                className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
                title="Close Inspector"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5 mt-3 font-mono text-[11px]">
              <div className="rounded border border-slate-800 bg-slate-950/60 p-2">
                <div className="text-slate-400">ZONE / GEOMETRY</div>
                <div className="font-bold text-slate-200">{selectedBuilding.zone_id}</div>
                <div className="text-slate-400">
                  {selectedBuilding.height_m}m · {selectedBuilding.roof_area_m2.toLocaleString()} m²
                </div>
              </div>

              <div className="rounded border border-slate-800 bg-slate-950/60 p-2">
                <div className="text-slate-400">14:30 LST TEMP</div>
                <div className="font-bold text-orange-400">{selectedBuilding.lst_celsius.toFixed(1)} °C</div>
                <div className="text-slate-400">{selectedBuilding.lst_celsius >= 44 ? 'Peak Heat Hotspot' : 'Moderate'}</div>
              </div>

              <div className="rounded border border-slate-800 bg-slate-950/60 p-2">
                <div className="text-slate-400">SOLAR POTENTIAL</div>
                <div className="font-bold text-yellow-300">{selectedBuilding.solar_capacity_kwp} kWp</div>
                <div className="text-slate-400">{Math.round(selectedBuilding.solar_kwh_yr / 1000)} MWh/yr</div>
              </div>

              <div className="rounded border border-slate-800 bg-slate-950/60 p-2">
                <div className="text-slate-400">INSAR & VIIRS</div>
                <div className={`font-bold ${selectedBuilding.subsidence_mm_yr < -2 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {selectedBuilding.subsidence_mm_yr} mm/yr (γ={selectedBuilding.sar_coherence.toFixed(2)})
                </div>
                <div className="text-purple-300">{selectedBuilding.viirs_radiance} nW/cm²/sr</div>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-950/40 p-2">
              <div className="flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-[10px] uppercase font-bold text-emerald-300">Prescription:</span>
              </div>
              <span className="font-mono font-bold text-emerald-200 text-xs">
                {selectedBuilding.prescription}
              </span>
            </div>
          </div>
        )}

        {/* Bottom Right: Closed-Loop Sustainability Prescription Simulator */}
        <div className="pointer-events-auto">
          <PrescriptionSimulator
            missionPhase={missionPhase}
            onChangeMissionPhase={onChangeMissionPhase}
            appliedPrescriptions={appliedPrescriptions}
            onChangePrescriptions={onChangePrescriptions}
          />
        </div>
      </div>
    </div>
  );
}
