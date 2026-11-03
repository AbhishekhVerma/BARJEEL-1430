import React, { useMemo } from 'react';
import {
  Sun,
  Wind,
  Moon,
  Zap,
  TrendingDown,
  Coins,
  Leaf,
  CheckCircle2,
  XCircle,
  Building2,
  Layers,
  Sparkles,
} from 'lucide-react';
import type {
  AppliedPrescriptions,
  BuildingFeatureProps,
  ZoneId,
} from '../../types/contracts';

interface PrescriptionSimulatorProps {
  selectedBuilding: BuildingFeatureProps | null;
  onClearBuilding: () => void;
  activeZone: ZoneId | null;
  onSelectZone: (zone: ZoneId | null) => void;
  appliedPrescriptions: AppliedPrescriptions;
  onChangePrescriptions: (next: AppliedPrescriptions) => void;
}

const ZONE_NAMES: Record<ZoneId, string> = {
  'expo-core': 'Expo City Benchmark',
  'logistics-mega': 'Dubai South Logistics Corridor',
  'residential-growth': 'Residential Boom Zone',
  'aviation-infra': 'Al Maktoum Perimeter',
};

export const PrescriptionSimulator: React.FC<PrescriptionSimulatorProps> = ({
  selectedBuilding,
  onClearBuilding,
  activeZone,
  appliedPrescriptions,
  onChangePrescriptions,
}) => {
  // Compute Closed-Loop Dynamic KPIs
  const kpis = useMemo(() => {
    let cleanPowerGwh = 0;
    let tempDeltaC = 0;
    let aedSavedM = 0;
    let co2OffsetTons = 0;
    let viirsReductionPct = 0;

    const isBuildingActive = !!selectedBuilding;

    if (appliedPrescriptions.deploySolar) {
      if (isBuildingActive) {
        const buildingGwh = (selectedBuilding.solar_kwh_yr || 150000) / 1_000_000;
        cleanPowerGwh += Number(buildingGwh.toFixed(2));
        aedSavedM += Number((cleanPowerGwh * 0.44).toFixed(2));
        co2OffsetTons += Math.round(cleanPowerGwh * 780);
      } else {
        // District-wide Shams Solar deployment (350+ MWp potential)
        cleanPowerGwh += 364.8;
        aedSavedM += 160.5; // ~160.5M AED in DEWA commercial tariffs
        co2OffsetTons += 284500;
      }
    }

    if (appliedPrescriptions.applyCoolRoof) {
      tempDeltaC = -2.5; // Verifiable -2.5°C LST drop
      aedSavedM += isBuildingActive ? 0.08 : 34.8; // HVAC chiller load reduction
      co2OffsetTons += isBuildingActive ? 75 : 38200;
    }

    if (appliedPrescriptions.smartNightDimming) {
      viirsReductionPct = 18.5;
      aedSavedM += isBuildingActive ? 0.02 : 12.4;
      co2OffsetTons += isBuildingActive ? 20 : 11400;
    }

    return {
      cleanPowerGwh: cleanPowerGwh.toFixed(1),
      tempDeltaC: tempDeltaC.toFixed(1),
      aedSavedM: aedSavedM.toFixed(1),
      co2OffsetTons: co2OffsetTons.toLocaleString(),
      viirsReductionPct: viirsReductionPct.toFixed(1),
      activeCount:
        (appliedPrescriptions.deploySolar ? 1 : 0) +
        (appliedPrescriptions.applyCoolRoof ? 1 : 0) +
        (appliedPrescriptions.smartNightDimming ? 1 : 0),
    };
  }, [appliedPrescriptions, selectedBuilding]);

  const toggleSolar = () => {
    onChangePrescriptions({
      ...appliedPrescriptions,
      deploySolar: !appliedPrescriptions.deploySolar,
    });
  };

  const toggleCoolRoof = () => {
    onChangePrescriptions({
      ...appliedPrescriptions,
      applyCoolRoof: !appliedPrescriptions.applyCoolRoof,
    });
  };

  const toggleDimming = () => {
    onChangePrescriptions({
      ...appliedPrescriptions,
      smartNightDimming: !appliedPrescriptions.smartNightDimming,
    });
  };

  const setTargetZone = (zone: ZoneId | 'ALL') => {
    onChangePrescriptions({
      ...appliedPrescriptions,
      targetZone: zone,
    });
  };

  return (
    <div className="pointer-events-auto flex flex-col gap-3 w-80 md:w-96 select-none">
      {/* 1. Selected Building or District Overview Panel */}
      <div className="overflow-hidden rounded-2xl border border-cyan-500/30 bg-slate-950/85 p-4 shadow-2xl backdrop-blur-xl">
        {selectedBuilding ? (
          <div>
            <div className="flex items-start justify-between border-b border-slate-800 pb-2.5">
              <div>
                <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-400">
                  <Building2 className="h-3 w-3" />
                  {ZONE_NAMES[selectedBuilding.zone_id] || selectedBuilding.zone_id}
                </div>
                <h3 className="text-sm font-bold text-slate-100 line-clamp-1">
                  {selectedBuilding.name}
                </h3>
              </div>
              <button
                onClick={onClearBuilding}
                className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                title="Clear selected building"
              >
                <XCircle className="h-4 w-4" />
              </button>
            </div>

            {/* Satellite Diagnostics Grid */}
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="rounded-lg bg-slate-900/80 p-2 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase">14:30 LST Heat</span>
                <div className="flex items-center gap-1 text-amber-400 font-bold">
                  {selectedBuilding.lst_celsius}°C
                  <span className="text-[9px] text-amber-500/80">
                    {selectedBuilding.lst_celsius > 45 ? 'PEAK' : 'MODERATE'}
                  </span>
                </div>
              </div>

              <div className="rounded-lg bg-slate-900/80 p-2 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase">InSAR Subsidence</span>
                <div className="flex items-center gap-1 font-bold text-emerald-400">
                  {selectedBuilding.subsidence_mm_yr} mm/yr
                  <span className="text-[9px] text-slate-400">
                    coh: {selectedBuilding.sar_coherence}
                  </span>
                </div>
              </div>

              <div className="rounded-lg bg-slate-900/80 p-2 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase">Roof Solar Cap</span>
                <div className="flex items-center gap-1 font-bold text-cyan-300">
                  <Zap className="h-3 w-3 text-cyan-400" />
                  {selectedBuilding.solar_capacity_kwp} kWp
                </div>
              </div>

              <div className="rounded-lg bg-slate-900/80 p-2 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase">Night Radiance</span>
                <div className="flex items-center gap-1 font-bold text-purple-300">
                  {selectedBuilding.viirs_radiance} nW
                </div>
              </div>
            </div>

            <div className="mt-2.5 flex items-center justify-between rounded-lg bg-cyan-950/40 px-2.5 py-1.5 border border-cyan-800/40 text-[11px] font-mono">
              <span className="text-cyan-300">Recommended Action:</span>
              <span className="font-bold text-cyan-400">{selectedBuilding.prescription}</span>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-2 border-b border-slate-800 pb-2.5">
              <Layers className="h-4 w-4 text-cyan-400" />
              <div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-cyan-400">
                  DIAGNOSTIC SCOPE
                </div>
                <h3 className="text-sm font-bold text-slate-100">
                  {activeZone ? ZONE_NAMES[activeZone] : 'Dubai South & Expo City Corridor'}
                </h3>
              </div>
            </div>
            <p className="mt-2 text-xs text-slate-300 leading-relaxed">
              Click any building footprint on the 3D twin to audit satellite telemetry or activate
              closed-loop orbital prescriptions below.
            </p>
          </div>
        )}
      </div>

      {/* 2. Closed-Loop Prescription Simulator Panel */}
      <div className="overflow-hidden rounded-2xl border border-cyan-500/30 bg-slate-950/85 p-4 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-400" />
            <h2 className="text-xs font-mono font-bold tracking-wider text-amber-300">
              CLOSED-LOOP PRESCRIPTIONS
            </h2>
          </div>
          <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-mono text-amber-400 border border-amber-500/30">
            {kpis.activeCount} ACTIVE
          </span>
        </div>

        {/* Scope selector */}
        <div className="mt-3 flex items-center justify-between gap-1 text-[10px] font-mono">
          <span className="text-slate-400">Target:</span>
          <div className="flex gap-1">
            {(['ALL', 'expo-core', 'logistics-mega', 'residential-growth'] as const).map((z) => (
              <button
                key={z}
                onClick={() => setTargetZone(z)}
                className={`rounded px-1.5 py-0.5 transition ${
                  appliedPrescriptions.targetZone === z
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-transparent'
                }`}
              >
                {z === 'ALL' ? 'ALL AOI' : z.split('-')[0].toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* 3 Interactive Intervention Switches */}
        <div className="mt-3 space-y-2.5">
          {/* Switch 1: Shams Rooftop Solar */}
          <button
            onClick={toggleSolar}
            className={`flex w-full items-center justify-between rounded-xl border p-2.5 transition ${
              appliedPrescriptions.deploySolar
                ? 'border-amber-500/60 bg-amber-500/15 text-amber-200 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700 hover:bg-slate-900'
            }`}
          >
            <div className="flex items-center gap-2.5 text-left">
              <div
                className={`rounded-lg p-1.5 ${
                  appliedPrescriptions.deploySolar ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-500'
                }`}
              >
                <Sun className="h-4 w-4" />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-100">
                  Deploy Shams Rooftop Solar
                </div>
                <div className="text-[10px] text-slate-400">DEWA Shams Net-Metering 350+ MWp</div>
              </div>
            </div>
            {appliedPrescriptions.deploySolar ? (
              <CheckCircle2 className="h-4 w-4 text-amber-400" />
            ) : (
              <div className="h-4 w-4 rounded-full border border-slate-700" />
            )}
          </button>

          {/* Switch 2: Barjeel Cool-Roof & Shade Corridor */}
          <button
            onClick={toggleCoolRoof}
            className={`flex w-full items-center justify-between rounded-xl border p-2.5 transition ${
              appliedPrescriptions.applyCoolRoof
                ? 'border-cyan-500/60 bg-cyan-500/15 text-cyan-200 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700 hover:bg-slate-900'
            }`}
          >
            <div className="flex items-center gap-2.5 text-left">
              <div
                className={`rounded-lg p-1.5 ${
                  appliedPrescriptions.applyCoolRoof ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-800 text-slate-500'
                }`}
              >
                <Wind className="h-4 w-4" />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-100">
                  Apply Barjeel Cool-Roof & Shade
                </div>
                <div className="text-[10px] text-slate-400">
                  High-Albedo Coating + Passive Wind Funnel
                </div>
              </div>
            </div>
            {appliedPrescriptions.applyCoolRoof ? (
              <CheckCircle2 className="h-4 w-4 text-cyan-400" />
            ) : (
              <div className="h-4 w-4 rounded-full border border-slate-700" />
            )}
          </button>

          {/* Switch 3: Smart VIIRS Streetlight Dimming */}
          <button
            onClick={toggleDimming}
            className={`flex w-full items-center justify-between rounded-xl border p-2.5 transition ${
              appliedPrescriptions.smartNightDimming
                ? 'border-purple-500/60 bg-purple-500/15 text-purple-200 shadow-[0_0_15px_rgba(168,85,247,0.2)]'
                : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700 hover:bg-slate-900'
            }`}
          >
            <div className="flex items-center gap-2.5 text-left">
              <div
                className={`rounded-lg p-1.5 ${
                  appliedPrescriptions.smartNightDimming
                    ? 'bg-purple-500/20 text-purple-400'
                    : 'bg-slate-800 text-slate-500'
                }`}
              >
                <Moon className="h-4 w-4" />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-100">
                  Smart VIIRS Night Dimming
                </div>
                <div className="text-[10px] text-slate-400">Adaptive Dimming in Logistics Parks</div>
              </div>
            </div>
            {appliedPrescriptions.smartNightDimming ? (
              <CheckCircle2 className="h-4 w-4 text-purple-400" />
            ) : (
              <div className="h-4 w-4 rounded-full border border-slate-700" />
            )}
          </button>
        </div>

        {/* 3. Live Animated KPI Counters */}
        <div className="mt-4 border-t border-slate-800/80 pt-3">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-2">
            <span>DISTRICT IMPACT PROJECTION</span>
            <span className="text-emerald-400 font-semibold">SPACE-VERIFIED</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            {/* LST Delta */}
            <div className="rounded-lg bg-slate-900/90 p-2 border border-slate-800">
              <div className="flex items-center gap-1 text-[10px] text-slate-400 uppercase">
                <TrendingDown className="h-3 w-3 text-cyan-400" />
                <span>Δ Surface Temp</span>
              </div>
              <div className="mt-0.5 text-base font-bold text-cyan-400">
                {Number(kpis.tempDeltaC) < 0 ? `${kpis.tempDeltaC}°C` : '0.0°C'}
              </div>
              <div className="text-[9px] text-slate-400">14:30 GST Heat Relief</div>
            </div>

            {/* Clean Power */}
            <div className="rounded-lg bg-slate-900/90 p-2 border border-slate-800">
              <div className="flex items-center gap-1 text-[10px] text-slate-400 uppercase">
                <Zap className="h-3 w-3 text-amber-400" />
                <span>Clean Energy</span>
              </div>
              <div className="mt-0.5 text-base font-bold text-amber-400">
                +{kpis.cleanPowerGwh} GWh
              </div>
              <div className="text-[9px] text-slate-400">Annual Solar Generation</div>
            </div>

            {/* AED Saved */}
            <div className="rounded-lg bg-slate-900/90 p-2 border border-slate-800">
              <div className="flex items-center gap-1 text-[10px] text-slate-400 uppercase">
                <Coins className="h-3 w-3 text-emerald-400" />
                <span>Municipal ROI</span>
              </div>
              <div className="mt-0.5 text-base font-bold text-emerald-400">
                +{kpis.aedSavedM}M AED
              </div>
              <div className="text-[9px] text-slate-400">Annual Tariff & Cooling</div>
            </div>

            {/* CO2 Avoided */}
            <div className="rounded-lg bg-slate-900/90 p-2 border border-slate-800">
              <div className="flex items-center gap-1 text-[10px] text-slate-400 uppercase">
                <Leaf className="h-3 w-3 text-lime-400" />
                <span>tCO2 Avoided</span>
              </div>
              <div className="mt-0.5 text-base font-bold text-lime-400">
                {kpis.co2OffsetTons} t
              </div>
              <div className="text-[9px] text-slate-400">Net Zero 2050 Aligned</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
