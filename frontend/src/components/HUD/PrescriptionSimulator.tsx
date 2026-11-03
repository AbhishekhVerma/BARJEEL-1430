import { useMemo, useState } from 'react';
import {
  Sun,
  Flame,
  Moon,
  TrendingDown,
  Zap,
  Coins,
  Leaf,
  ChevronDown,
  ChevronUp,
  Target,
  Sparkles,
} from 'lucide-react';
import type { AppliedPrescriptions, MissionPhase, ZoneId } from '../../types/contracts';

interface PrescriptionSimulatorProps {
  missionPhase: MissionPhase;
  onChangeMissionPhase: (phase: MissionPhase) => void;
  appliedPrescriptions: AppliedPrescriptions;
  onChangePrescriptions: (next: AppliedPrescriptions) => void;
}

const PHASES: { id: MissionPhase; title: string; subtitle: string; tag: string }[] = [
  {
    id: 1,
    title: 'Phase 1: Municipal STAC Pilot',
    subtitle: 'Historical S2/Landsat-8/9 cloud ingest & weekly verification',
    tag: 'TRL 7',
  },
  {
    id: 2,
    title: 'Phase 2: BARJEEL-1430 3U CubeSat',
    subtitle: '14:30 GST orbital pass with INT8 ONNX edge thermal anomaly detection',
    tag: 'FLIGHT DEMO',
  },
  {
    id: 3,
    title: 'Phase 3: GCC Net-Zero Constellation',
    subtitle: '12x 3U CubeSats delivering 30-min cadence across UAE/GCC corridors',
    tag: 'CONSTELLATION',
  },
];

const ZONE_OPTIONS: { id: ZoneId | 'ALL'; label: string; solarShare: number; areaShare: number }[] = [
  { id: 'ALL', label: 'All Dubai South Corridor', solarShare: 1.0, areaShare: 1.0 },
  { id: 'expo-core', label: 'Expo City Benchmark', solarShare: 0.16, areaShare: 0.18 },
  { id: 'logistics-mega', label: 'Logistics Solar Mega-Roof', solarShare: 0.48, areaShare: 0.38 },
  { id: 'residential-growth', label: 'Residential Heat Hotspot', solarShare: 0.24, areaShare: 0.28 },
  { id: 'aviation-infra', label: 'Al Maktoum Apron Infra', solarShare: 0.12, areaShare: 0.16 },
];

export function PrescriptionSimulator({
  missionPhase,
  onChangeMissionPhase,
  appliedPrescriptions,
  onChangePrescriptions,
}: PrescriptionSimulatorProps) {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  // Phase Scaling Multiplier
  const phaseMult = useMemo(() => {
    switch (missionPhase) {
      case 1:
        return 0.45;
      case 2:
        return 1.0;
      case 3:
        return 2.85;
      default:
        return 1.0;
    }
  }, [missionPhase]);

  // Zone scaling factors
  const selectedZoneConfig = useMemo(() => {
    return (
      ZONE_OPTIONS.find((z) => z.id === appliedPrescriptions.targetZone) ||
      ZONE_OPTIONS[0]
    );
  }, [appliedPrescriptions.targetZone]);

  // Dynamic KPI Computation Engine
  const kpiMetrics = useMemo(() => {
    const { deploySolar, applyCoolRoof, smartNightDimming } = appliedPrescriptions;
    const solarFactor = selectedZoneConfig.solarShare * phaseMult;
    const areaFactor = selectedZoneConfig.areaShare * phaseMult;

    // 1. Solar Generation (GWh/yr)
    const baseSolarGwh = 438.7; // From district_summary.json (250.7 MWp)
    const solarGwh = deploySolar ? Math.round(baseSolarGwh * solarFactor * 10) / 10 : 0;

    // 2. Surface Heat Island Reduction (ΔLST °C)
    let deltaLst = 0.0;
    if (applyCoolRoof) {
      // High-albedo cool roof reduces surface LST by 2.6 - 3.8 °C
      const zoneHeatSensitivity = appliedPrescriptions.targetZone === 'residential-growth' ? 3.6 : 3.0;
      deltaLst += zoneHeatSensitivity;
    }
    if (deploySolar) {
      // Photovoltaic roof shade effect drops roof surface heat by additional ~0.4 °C
      deltaLst += 0.4;
    }

    // 3. Financial Savings (AED M/yr)
    // - Clean power generation @ 0.38 AED / kWh
    const powerSavingsAedM = solarGwh * 0.38;
    // - Cool roof HVAC load reduction (~18% chiller savings on high-LST buildings)
    const hvacSavingsAedM = applyCoolRoof ? 26.3 * areaFactor : 0;
    // - Smart lighting dimming savings
    const dimmingSavingsAedM = smartNightDimming ? 6.2 * areaFactor : 0;
    const totalAedM = Math.round((powerSavingsAedM + hvacSavingsAedM + dimmingSavingsAedM) * 10) / 10;

    // 4. Carbon Avoidance (tCO2/yr)
    // Dubai DEWA grid factor: 0.42 kg CO2 / kWh
    const solarCo2Avoided = solarGwh * 1000 * 0.42; // MWh to kWh to tonnes
    const hvacCo2Avoided = applyCoolRoof ? (hvacSavingsAedM / 0.38) * 1000 * 0.42 : 0;
    const dimmingCo2Avoided = smartNightDimming ? (dimmingSavingsAedM / 0.38) * 1000 * 0.42 : 0;
    const totalCo2Tonnes = Math.round(solarCo2Avoided + hvacCo2Avoided + dimmingCo2Avoided);

    return {
      deltaLst: Math.round(deltaLst * 10) / 10,
      solarGwh,
      totalAedM,
      totalCo2Tonnes,
      activePrescriptionCount:
        (deploySolar ? 1 : 0) + (applyCoolRoof ? 1 : 0) + (smartNightDimming ? 1 : 0),
    };
  }, [appliedPrescriptions, phaseMult, selectedZoneConfig]);

  const togglePrescription = (key: 'deploySolar' | 'applyCoolRoof' | 'smartNightDimming') => {
    onChangePrescriptions({
      ...appliedPrescriptions,
      [key]: !appliedPrescriptions[key],
    });
  };

  const setTargetZone = (zone: ZoneId | 'ALL') => {
    onChangePrescriptions({
      ...appliedPrescriptions,
      targetZone: zone,
    });
  };

  return (
    <div className="pointer-events-auto flex flex-col rounded-xl border border-emerald-500/30 bg-slate-900/90 shadow-2xl backdrop-blur-md transition-all duration-300 w-80 sm:w-96 text-slate-100">
      {/* Simulator Header */}
      <div className="flex items-center justify-between border-b border-emerald-500/20 px-3.5 py-2.5 text-xs">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-emerald-400" />
          <span className="font-bold tracking-wider text-emerald-400 uppercase">
            Closed-Loop Prescription Engine
          </span>
        </div>
        <button
          onClick={() => setIsCollapsed((v) => !v)}
          className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-emerald-300"
          title={isCollapsed ? 'Expand Simulator' : 'Collapse Simulator'}
        >
          {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </button>
      </div>

      {!isCollapsed && (
        <div className="p-3.5 space-y-3 text-xs">
          {/* Mission Phase Selector */}
          <div>
            <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 mb-1.5 flex items-center justify-between">
              <span>Orbital Mission Horizon</span>
              <span className="text-cyan-400 font-mono">Phase {missionPhase}/3</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {PHASES.map((p) => (
                <button
                  key={p.id}
                  onClick={() => onChangeMissionPhase(p.id)}
                  className={`flex flex-col items-center justify-center rounded-lg p-2 text-center transition border ${
                    missionPhase === p.id
                      ? 'border-cyan-400 bg-cyan-950/70 text-cyan-300 shadow-md shadow-cyan-950/50'
                      : 'border-slate-800 bg-slate-950/50 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  <span className="font-bold text-[11px]">Phase {p.id}</span>
                  <span className="text-[9px] text-slate-400 line-clamp-1">{p.tag}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Target Zone Filter */}
          <div>
            <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 mb-1.5 flex items-center gap-1">
              <Target className="h-3 w-3 text-amber-400" />
              <span>Target Corridor Zone</span>
            </div>
            <select
              value={appliedPrescriptions.targetZone}
              onChange={(e) => setTargetZone(e.target.value as ZoneId | 'ALL')}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
            >
              {ZONE_OPTIONS.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.label}
                </option>
              ))}
            </select>
          </div>

          {/* 3 Sustainability Prescription Switches */}
          <div className="space-y-2 pt-1 border-t border-slate-800">
            <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">
              Active Prescriptions ({kpiMetrics.activePrescriptionCount}/3)
            </div>

            {/* Toggle 1: Solar */}
            <button
              onClick={() => togglePrescription('deploySolar')}
              className={`flex w-full items-center justify-between rounded-lg border p-2 text-left transition ${
                appliedPrescriptions.deploySolar
                  ? 'border-amber-500/50 bg-amber-950/40 text-amber-200'
                  : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`rounded p-1 ${
                    appliedPrescriptions.deploySolar ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  <Sun className="h-3.5 w-3.5" />
                </div>
                <div>
                  <div className="font-semibold text-xs">Deploy Shams Rooftop Solar</div>
                  <div className="text-[10px] text-slate-400">High-yield PV arrays on flat commercial roofs</div>
                </div>
              </div>
              <div
                className={`h-4 w-7 rounded-full p-0.5 transition ${
                  appliedPrescriptions.deploySolar ? 'bg-amber-500' : 'bg-slate-700'
                }`}
              >
                <div
                  className={`h-3 w-3 rounded-full bg-slate-950 transition transform ${
                    appliedPrescriptions.deploySolar ? 'translate-x-3' : 'translate-x-0'
                  }`}
                />
              </div>
            </button>

            {/* Toggle 2: Cool Roof */}
            <button
              onClick={() => togglePrescription('applyCoolRoof')}
              className={`flex w-full items-center justify-between rounded-lg border p-2 text-left transition ${
                appliedPrescriptions.applyCoolRoof
                  ? 'border-cyan-500/50 bg-cyan-950/40 text-cyan-200'
                  : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`rounded p-1 ${
                    appliedPrescriptions.applyCoolRoof ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  <Flame className="h-3.5 w-3.5" />
                </div>
                <div>
                  <div className="font-semibold text-xs">Apply Barjeel Cool-Roof & Shade</div>
                  <div className="text-[10px] text-slate-400">High-albedo coating & microclimate canopies</div>
                </div>
              </div>
              <div
                className={`h-4 w-7 rounded-full p-0.5 transition ${
                  appliedPrescriptions.applyCoolRoof ? 'bg-cyan-500' : 'bg-slate-700'
                }`}
              >
                <div
                  className={`h-3 w-3 rounded-full bg-slate-950 transition transform ${
                    appliedPrescriptions.applyCoolRoof ? 'translate-x-3' : 'translate-x-0'
                  }`}
                />
              </div>
            </button>

            {/* Toggle 3: Night Dimming */}
            <button
              onClick={() => togglePrescription('smartNightDimming')}
              className={`flex w-full items-center justify-between rounded-lg border p-2 text-left transition ${
                appliedPrescriptions.smartNightDimming
                  ? 'border-violet-500/50 bg-violet-950/40 text-violet-200'
                  : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`rounded p-1 ${
                    appliedPrescriptions.smartNightDimming
                      ? 'bg-violet-500/20 text-violet-400'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  <Moon className="h-3.5 w-3.5" />
                </div>
                <div>
                  <div className="font-semibold text-xs">Smart VIIRS Night Dimming</div>
                  <div className="text-[10px] text-slate-400">01:00–05:00 adaptive roadway luminescence</div>
                </div>
              </div>
              <div
                className={`h-4 w-7 rounded-full p-0.5 transition ${
                  appliedPrescriptions.smartNightDimming ? 'bg-violet-500' : 'bg-slate-700'
                }`}
              >
                <div
                  className={`h-3 w-3 rounded-full bg-slate-950 transition transform ${
                    appliedPrescriptions.smartNightDimming ? 'translate-x-3' : 'translate-x-0'
                  }`}
                />
              </div>
            </button>
          </div>

          {/* Dynamic Projected ROI KPI Matrix */}
          <div className="rounded-lg border border-emerald-500/30 bg-slate-950/70 p-2.5 space-y-2">
            <div className="flex items-center justify-between text-[10px] font-mono font-semibold uppercase tracking-wider text-emerald-400">
              <span>Projected Impact Metrics</span>
              <span>14:30 GST Closed-Loop</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {/* Metric 1: Heat Reduction */}
              <div className="rounded border border-slate-800 bg-slate-900/60 p-2">
                <div className="flex items-center gap-1 text-[10px] text-slate-400">
                  <TrendingDown className="h-3 w-3 text-cyan-400" />
                  <span>ΔLST Surface</span>
                </div>
                <div className="mt-1 font-mono text-base font-bold text-cyan-300">
                  {kpiMetrics.deltaLst > 0 ? `-${kpiMetrics.deltaLst.toFixed(1)} °C` : '0.0 °C'}
                </div>
                <div className="text-[9px] text-slate-500">Urban heat island relief</div>
              </div>

              {/* Metric 2: Clean Solar Power */}
              <div className="rounded border border-slate-800 bg-slate-900/60 p-2">
                <div className="flex items-center gap-1 text-[10px] text-slate-400">
                  <Zap className="h-3 w-3 text-amber-400" />
                  <span>Clean Solar</span>
                </div>
                <div className="mt-1 font-mono text-base font-bold text-amber-300">
                  +{kpiMetrics.solarGwh.toFixed(1)} <span className="text-xs font-normal">GWh/y</span>
                </div>
                <div className="text-[9px] text-slate-500">DEWA Shams yield</div>
              </div>

              {/* Metric 3: Economic Savings */}
              <div className="rounded border border-slate-800 bg-slate-900/60 p-2">
                <div className="flex items-center gap-1 text-[10px] text-slate-400">
                  <Coins className="h-3 w-3 text-emerald-400" />
                  <span>Cost Savings</span>
                </div>
                <div className="mt-1 font-mono text-base font-bold text-emerald-300">
                  +{kpiMetrics.totalAedM.toFixed(1)} <span className="text-xs font-normal">M AED/y</span>
                </div>
                <div className="text-[9px] text-slate-500">Power & HVAC chilling savings</div>
              </div>

              {/* Metric 4: Carbon Avoidance */}
              <div className="rounded border border-slate-800 bg-slate-900/60 p-2">
                <div className="flex items-center gap-1 text-[10px] text-slate-400">
                  <Leaf className="h-3 w-3 text-emerald-400" />
                  <span>Carbon Offset</span>
                </div>
                <div className="mt-1 font-mono text-base font-bold text-emerald-300">
                  +{kpiMetrics.totalCo2Tonnes.toLocaleString()} <span className="text-xs font-normal">t/y</span>
                </div>
                <div className="text-[9px] text-slate-500">Avoided GHG emissions</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
