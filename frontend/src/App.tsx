import { useState } from 'react';
import { DistrictMap } from './components/DistrictMap/DistrictMap';
import { MissionHUD } from './components/HUD/MissionHUD';
import type {
  AppliedPrescriptions,
  BuildingFeatureProps,
  LayerMode,
  MissionPhase,
  OrbitalTelemetryPacket,
  ZoneId,
} from './types/contracts';

export default function App() {
  const [missionPhase, setMissionPhase] = useState<MissionPhase>(2);
  const [activeLayer, setActiveLayer] = useState<LayerMode>('thermal');
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [activeZone, setActiveZone] = useState<ZoneId | null>(null);
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingFeatureProps | null>(null);
  const [satelliteBasemap, setSatelliteBasemap] = useState<boolean>(false);
  const [latestTelemetry, setLatestTelemetry] = useState<OrbitalTelemetryPacket | null>(null);
  const [appliedPrescriptions, setAppliedPrescriptions] = useState<AppliedPrescriptions>({
    deploySolar: false,
    applyCoolRoof: false,
    smartNightDimming: false,
    targetZone: 'ALL',
  });

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950">
      <DistrictMap
        activeLayer={activeLayer}
        selectedYear={selectedYear}
        activeZone={activeZone}
        selectedBuilding={selectedBuilding}
        onSelectBuilding={setSelectedBuilding}
        appliedPrescriptions={appliedPrescriptions}
        latestTelemetry={latestTelemetry}
        satelliteBasemap={satelliteBasemap}
      />
      <MissionHUD
        missionPhase={missionPhase}
        onChangeMissionPhase={setMissionPhase}
        activeLayer={activeLayer}
        onChangeLayer={setActiveLayer}
        selectedYear={selectedYear}
        onChangeYear={setSelectedYear}
        activeZone={activeZone}
        onSelectZone={setActiveZone}
        selectedBuilding={selectedBuilding}
        onClearBuilding={() => setSelectedBuilding(null)}
        appliedPrescriptions={appliedPrescriptions}
        onChangePrescriptions={setAppliedPrescriptions}
        satelliteBasemap={satelliteBasemap}
        onToggleBasemap={() => setSatelliteBasemap((v) => !v)}
        onTelemetryUpdate={setLatestTelemetry}
      />
    </div>
  );
}
