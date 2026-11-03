import React, { useState } from 'react';
import {
  Satellite,
  Radio,
  Cpu,
  Layers,
  MapPin,
  Calendar,
  Send,
  Globe2,
  Signal,
  Flame,
  CheckCircle,
  AlertTriangle,
  Play,
  Pause,
} from 'lucide-react';
import type {
  LayerMode,
  MissionHUDProps,
  MissionPhase,
  ZoneId,
} from '../../types/contracts';
import { useTelemetryStream } from '../../hooks/useTelemetryStream';
import { OrbitalTwinPiP } from './OrbitalTwinPiP';
import { PrescriptionSimulator } from './PrescriptionSimulator';

const LAYERS: { id: LayerMode; label: string; icon: string; desc: string }[] = [
  { id: 'growth', label: '01 Sprawl (S2)', icon: '🌱', desc: '2019-2026 Urban Expansion' },
  { id: 'insar', label: '02 InSAR (S1)', icon: '📡', desc: 'Ground Stability & Subsidence' },
  { id: 'solar', label: '03 Solar (DEM)', icon: '☀️', desc: 'Copernicus 350+ MWp Potential' },
  { id: 'thermal', label: '04 14:30 Heat (L8/9)', icon: '🔥', desc: 'Peak 14:30 GST LST Hotspots' },
  { id: 'viirs', label: '05 Night Waste (VIIRS)', icon: '💡', desc: 'Nighttime Energy Radiance' },
];

const PHASES: { phase: MissionPhase; title: string; subtitle: string }[] = [
  { phase: 1, title: 'Phase 1: Municipal STAC', subtitle: '5-Satellite EO Fusion Today' },
  { phase: 2, title: 'Phase 2: 3U CubeSat 14:30', subtitle: 'Orbital Edge AI Pathfinder' },
  { phase: 3, title: 'Phase 3: GCC Constellation', subtitle: 'Automated Net-Zero Auditing' },
];

const ZONES: { id: ZoneId; label: string; tag: string }[] = [
  { id: 'expo-core', label: 'Expo Core', tag: 'Benchmark' },
  { id: 'logistics-mega', label: 'Logistics Mega', tag: '#1 Solar ROI' },
  { id: 'residential-growth', label: 'Residential Boom', tag: 'Thermal Hotspot' },
  { id: 'aviation-infra', label: 'Aviation Infra', tag: 'SAR Subsidence' },
];

export const MissionHUD: React.FC<MissionHUDProps> = ({
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
}) => {
  const {
    telemetry,
    isConnected,
    source,
    flightMode,
    uplinkStatus,
    sendCommand,
  } = useTelemetryStream(onTelemetryUpdate);

  const [isPlayingYear, setIsPlayingYear] = useState<boolean>(false);
  const playIntervalRef = React.useRef<number | null>(null);

  // Auto timeline play / pause
  const selectedYearRef = React.useRef(selectedYear);
  selectedYearRef.current = selectedYear;

  const togglePlayYear = () => {
    if (isPlayingYear) {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
      playIntervalRef.current = null;
      setIsPlayingYear(false);
    } else {
      setIsPlayingYear(true);
      playIntervalRef.current = window.setInterval(() => {
        const cur = selectedYearRef.current;
        const next = cur >= 2026 ? 2019 : cur + 1;
        onChangeYear(next);
      }, 1200);
    }
  };

  React.useEffect(() => {
    return () => {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    };
  }, []);

  const edgeAi = telemetry?.edge_ai;

  return (
    <div className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between p-3 md:p-4 select-none font-sans overflow-hidden">
      {/* ─────────────────────────────────────────────────────────────
          TOP BAR: Branding, Mission Phase, Layers, Year, Zones, Basemap
         ───────────────────────────────────────────────────────────── */}
      <header className="pointer-events-auto flex flex-col gap-2 rounded-2xl border border-cyan-500/30 bg-slate-950/85 p-3 shadow-2xl backdrop-blur-xl transition">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-2.5">
          {/* Mission Branding & Live Link Status */}
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-[0_0_15px_rgba(6,182,212,0.4)]">
              <Satellite className="h-5 w-5 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-black tracking-widest text-cyan-400">
                  MISSION BARJEEL-1430
                </span>
                <span className="text-[11px] font-arabic text-cyan-200">برجيل</span>
                <span className="rounded bg-cyan-950/80 px-1.5 py-0.5 text-[9px] font-mono text-cyan-300 border border-cyan-800/60">
                  THEME 02
                </span>
              </div>
              <div className="text-[11px] text-slate-300 font-medium">
                Dubai South & Expo City Closed-Loop Sustainability Twin
              </div>
            </div>
          </div>

          {/* Mission Phase Switcher */}
          <div className="flex items-center rounded-xl border border-slate-800 bg-slate-900/90 p-1">
            {PHASES.map((p) => (
              <button
                key={p.phase}
                onClick={() => onChangeMissionPhase(p.phase)}
                className={`flex flex-col items-start rounded-lg px-2.5 py-1 text-left transition ${
                  missionPhase === p.phase
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <span className="text-[11px] font-bold leading-tight">{p.title}</span>
                <span
                  className={`text-[9px] ${
                    missionPhase === p.phase ? 'text-slate-900' : 'text-slate-400'
                  }`}
                >
                  {p.subtitle}
                </span>
              </button>
            ))}
          </div>

          {/* Basemap & Live Status Pill */}
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleBasemap}
              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-mono transition ${
                satelliteBasemap
                  ? 'border-amber-500/50 bg-amber-500/20 text-amber-300'
                  : 'border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800'
              }`}
              title="Toggle between Cyberpunk Vector and Real High-Res Satellite Basemap"
            >
              <Globe2 className="h-3.5 w-3.5 text-cyan-400" />
              <span>{satelliteBasemap ? 'ESRI SATELLITE' : 'CARTO DARK'}</span>
            </button>

            {/* Link Badge */}
            <div
              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-mono ${
                isConnected
                  ? 'border-emerald-500/40 bg-emerald-950/60 text-emerald-300'
                  : 'border-cyan-500/40 bg-cyan-950/60 text-cyan-300'
              }`}
            >
              <Signal
                className={`h-3.5 w-3.5 ${isConnected ? 'text-emerald-400' : 'text-cyan-400'}`}
              />
              <span className="text-[10px] font-bold">
                {source === 'ESP32_S3_HIL'
                  ? 'ESP32-S3 HIL'
                  : isConnected
                  ? 'OBC LIVE'
                  : 'OBC STANDALONE'}
              </span>
            </div>
          </div>
        </div>

        {/* Second Row: Layer Mode Pills, Year Slider, Zone Quick Fly-To */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Layer Mode Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-mono uppercase text-slate-400 mr-1 flex items-center gap-1">
              <Layers className="h-3 w-3 text-cyan-400" />
              LAYERS:
            </span>
            {LAYERS.map((layer) => {
              const isActive = activeLayer === layer.id;
              return (
                <button
                  key={layer.id}
                  onClick={() => onChangeLayer(layer.id)}
                  title={layer.desc}
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-mono text-xs transition ${
                    isActive
                      ? 'bg-cyan-500 text-slate-950 font-bold shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                      : 'bg-slate-900/90 text-slate-300 hover:bg-slate-800 border border-slate-800'
                  }`}
                >
                  <span>{layer.icon}</span>
                  <span>{layer.label}</span>
                </button>
              );
            })}
          </div>

          {/* Timeline Slider with Play/Pause */}
          <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/90 px-3 py-1 font-mono">
            <button
              onClick={togglePlayYear}
              className="text-cyan-400 hover:text-cyan-300 transition"
              title={isPlayingYear ? 'Pause growth playback' : 'Play urban growth 2019-2026'}
            >
              {isPlayingYear ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            </button>
            <Calendar className="h-3.5 w-3.5 text-cyan-400" />
            <span className="text-slate-400 text-[11px]">SPRAWL:</span>
            <span className="font-bold text-cyan-300 min-w-[34px]">{selectedYear}</span>
            <input
              type="range"
              min={2019}
              max={2026}
              value={selectedYear}
              onChange={(e) => onChangeYear(Number(e.target.value))}
              className="h-1.5 w-24 cursor-pointer appearance-none rounded-lg bg-slate-700 accent-cyan-400"
            />
          </div>

          {/* 4 Zone Fly-To Buttons */}
          <div className="flex items-center gap-1 font-mono text-[11px]">
            <span className="text-slate-400 flex items-center gap-1 mr-1">
              <MapPin className="h-3 w-3 text-cyan-400" />
              ZONES:
            </span>
            {ZONES.map((zone) => {
              const isSelected = activeZone === zone.id;
              return (
                <button
                  key={zone.id}
                  onClick={() => onSelectZone(isSelected ? null : zone.id)}
                  className={`rounded-lg px-2 py-1 transition border ${
                    isSelected
                      ? 'border-cyan-400 bg-cyan-500/20 text-cyan-300 font-bold'
                      : 'border-slate-800 bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  {zone.label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────────
          MIDDLE WORKSPACE: Left/Right Docked Panels
         ───────────────────────────────────────────────────────────── */}
      <div className="pointer-events-none relative flex flex-1 items-start justify-between py-3 overflow-hidden">
        {/* Left: Closed-Loop Prescription Simulator */}
        <div className="pointer-events-auto max-h-[calc(100vh-210px)] overflow-y-auto pr-1">
          <PrescriptionSimulator
            selectedBuilding={selectedBuilding}
            onClearBuilding={onClearBuilding}
            activeZone={activeZone}
            onSelectZone={onSelectZone}
            appliedPrescriptions={appliedPrescriptions}
            onChangePrescriptions={onChangePrescriptions}
          />
        </div>

        {/* Right: Ruya 3U CubeSat Digital Twin PiP */}
        <div className="pointer-events-auto flex flex-col items-end gap-3 pl-1">
          <OrbitalTwinPiP telemetry={telemetry} />
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          BOTTOM STATUS STRIP: CCSDS Headers, Edge AI Metrics, Uplink
         ───────────────────────────────────────────────────────────── */}
      <footer className="pointer-events-auto flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-cyan-500/30 bg-slate-950/85 px-4 py-2.5 shadow-2xl backdrop-blur-xl font-mono text-xs">
        {/* CCSDS Hex Header & Pass Info */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-slate-300">
            <Radio className="h-3.5 w-3.5 text-cyan-400 animate-pulse" />
            <span className="text-slate-400 text-[11px]">CCSDS 133.0-B-2:</span>
            <span className="rounded bg-slate-900 px-2 py-0.5 font-bold tracking-wider text-cyan-300 border border-slate-800">
              0x{telemetry?.ccsds_header_hex || '0801C04A003F'}
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-1 rounded bg-amber-500/10 px-2 py-0.5 text-amber-300 border border-amber-500/30">
            <Flame className="h-3 w-3" />
            <span className="text-[11px] font-bold">14:30 GST PASS</span>
          </div>
        </div>

        {/* Edge AI Inference & Downlink Bandwidth Savings */}
        <div className="flex items-center gap-4 text-[11px]">
          <div className="flex items-center gap-1.5 text-slate-300">
            <Cpu className="h-3.5 w-3.5 text-cyan-400" />
            <span className="text-slate-400">EDGE AI:</span>
            <span className="font-semibold text-slate-200">
              {edgeAi?.predicted_class || 'Scanning...'}
            </span>
            <span className="text-cyan-400">({edgeAi?.inference_ms ?? 6.4} ms)</span>
          </div>

          {/* Bandwidth Savings Gauge */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">BANDWIDTH SAVED:</span>
            <span className="rounded bg-emerald-950/80 px-2 py-0.5 font-bold text-emerald-400 border border-emerald-800/50">
              ~{edgeAi?.bandwidth_saved_pct ?? 78.4}%
            </span>
            <span className="hidden md:inline text-[10px] text-slate-400">
              (Filtered desert/cloud in orbit)
            </span>
          </div>
        </div>

        {/* Uplink Command Buttons */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-400 uppercase hidden lg:inline">
            UPLINK COMMAND:
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => sendCommand('NOMINAL_EO_SCAN')}
              className={`rounded px-2 py-1 text-[10px] font-bold transition border ${
                flightMode === 'NOMINAL_EO_SCAN'
                  ? 'border-cyan-400 bg-cyan-500/20 text-cyan-300'
                  : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200'
              }`}
            >
              SCAN
            </button>
            <button
              onClick={() => sendCommand('THERMAL_PEAK_1430')}
              className={`rounded px-2 py-1 text-[10px] font-bold transition border ${
                flightMode === 'THERMAL_PEAK_1430'
                  ? 'border-amber-400 bg-amber-500/20 text-amber-300'
                  : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200'
              }`}
            >
              14:30 PEAK
            </button>
            <button
              onClick={() => sendCommand('SAFEHOLD')}
              className={`rounded px-2 py-1 text-[10px] font-bold transition border ${
                flightMode === 'SAFEHOLD'
                  ? 'border-rose-400 bg-rose-500/20 text-rose-300'
                  : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200'
              }`}
            >
              SAFEHOLD
            </button>
          </div>

          {uplinkStatus !== 'IDLE' && (
            <span className="ml-1 text-[10px] font-bold text-amber-400 animate-pulse">
              {uplinkStatus}
            </span>
          )}
        </div>
      </footer>
    </div>
  );
};
