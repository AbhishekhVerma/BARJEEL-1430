import React from 'react';
import type { OrbitalTelemetryPacket } from '../../types/contracts';

interface OrbitalReticleProps {
  telemetry: OrbitalTelemetryPacket;
}

export const OrbitalReticle: React.FC<OrbitalReticleProps> = ({ telemetry }) => {
  const { edge_ai, source, flight_mode } = telemetry;
  const isPriorityAlert = edge_ai.action === 'DOWNLINK_PRIORITY_ALERT';
  const colorClass = isPriorityAlert ? 'text-amber-400 border-amber-400/60' : 'text-cyan-400 border-cyan-400/60';
  const glowColor = isPriorityAlert ? 'rgba(245, 158, 11, 0.4)' : 'rgba(6, 182, 212, 0.4)';

  return (
    <div className="relative -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none font-mono">
      {/* Outer Radar Ripple */}
      <div
        className={`absolute -inset-8 rounded-full border animate-ping opacity-75 ${colorClass}`}
        style={{ animationDuration: '2.4s' }}
      />

      {/* Rotating Outer Reticle Ring */}
      <div
        className={`w-16 h-16 rounded-full border border-dashed animate-spin flex items-center justify-center ${colorClass}`}
        style={{ animationDuration: '10s' }}
      >
        <div className="w-12 h-12 rounded-full border border-cyan-500/40" />
      </div>

      {/* Inner Precision Crosshairs */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative w-8 h-8">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-2 bg-cyan-300" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0.5 h-2 bg-cyan-300" />
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-0.5 bg-cyan-300" />
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-0.5 bg-cyan-300" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-cyan-400 shadow-lg shadow-cyan-400 animate-pulse" />
        </div>
      </div>

      {/* Edge-AI Telemetry Floating Tag */}
      <div
        className="absolute left-10 top-0 backdrop-blur-md bg-slate-950/90 border border-cyan-500/40 rounded px-2.5 py-1.5 shadow-2xl min-w-[200px]"
        style={{ boxShadow: `0 0 20px ${glowColor}` }}
      >
        <div className="flex items-center justify-between gap-2 border-b border-cyan-500/20 pb-1 mb-1">
          <span className="text-[9px] font-bold tracking-wider text-cyan-300 uppercase flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            ORBITAL NADIR LOCK
          </span>
          <span className="text-[8px] text-slate-400">{source} · {flight_mode}</span>
        </div>

        <div className="text-[10px] text-slate-200 font-semibold truncate">
          TARGET: {edge_ai.tile_id || 'DUBAI_SOUTH_AOI'}
        </div>

        <div className="flex items-center justify-between text-[9px] text-slate-300 mt-0.5">
          <span>AI CLASS:</span>
          <span className="text-amber-300 font-bold">{edge_ai.predicted_class}</span>
        </div>

        <div className="flex items-center justify-between text-[9px] text-slate-300">
          <span>CONFIDENCE:</span>
          <span className="text-cyan-300">{(edge_ai.confidence * 100).toFixed(1)}%</span>
        </div>

        <div className="flex items-center justify-between text-[9px] text-slate-300">
          <span>LATENCY:</span>
          <span className="text-emerald-400">{edge_ai.inference_ms.toFixed(2)} ms</span>
        </div>

        {isPriorityAlert ? (
          <div className="mt-1 px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-[9px] font-bold text-amber-300 text-center uppercase tracking-wide">
            ⚠ DOWNLINK PRIORITY ALERT
          </div>
        ) : (
          <div className="mt-1 px-1.5 py-0.5 rounded bg-slate-800/80 border border-slate-700 text-[9px] font-bold text-slate-400 text-center uppercase tracking-wide">
            FILTERED STATIC DESERT / CLOUD
          </div>
        )}
      </div>
    </div>
  );
};
