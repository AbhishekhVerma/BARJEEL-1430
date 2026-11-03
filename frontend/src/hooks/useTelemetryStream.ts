import { useEffect, useRef, useState, useCallback } from 'react';
import type { OrbitalTelemetryPacket } from '../types/contracts';

const DUBAI_SOUTH_TILES = [
  { id: 'S2_24916_55175_Industrial', lat: 24.9163, lon: 55.1757, cls: 'Industrial', alert: true },
  { id: 'S2_24943_55198_Residential', lat: 24.9432, lon: 55.1984, cls: 'Residential', alert: true },
  { id: 'S2_24901_55171_Highway', lat: 24.9019, lon: 55.1719, cls: 'Highway', alert: true },
  { id: 'S2_24897_55228_BareDesert', lat: 24.8971, lon: 55.2286, cls: 'BareDesert', alert: false },
  { id: 'S2_24972_55231_BareDesert', lat: 24.9728, lon: 55.2315, cls: 'BareDesert', alert: false },
  { id: 'S2_24936_55125_BareDesert', lat: 24.9360, lon: 55.1259, cls: 'BareDesert', alert: false },
  { id: 'S2_24960_55146_Vegetation', lat: 24.9607, lon: 55.1466, cls: 'HerbaceousVegetation', alert: true },
  { id: 'S2_24945_55177_CloudCover', lat: 24.9455, lon: 55.1770, cls: 'CloudCover', alert: false },
  { id: 'S2_24911_55160_Industrial', lat: 24.9117, lon: 55.1604, cls: 'Industrial', alert: true },
  { id: 'S2_24949_55201_Residential', lat: 24.9499, lon: 55.2017, cls: 'Residential', alert: true },
  { id: 'S2_24905_55161_Highway', lat: 24.9053, lon: 55.1619, cls: 'Highway', alert: true },
  { id: 'S2_24894_55220_BareDesert', lat: 24.8945, lon: 55.2206, cls: 'BareDesert', alert: false },
  { id: 'S2_24963_55237_BareDesert', lat: 24.9630, lon: 55.2375, cls: 'BareDesert', alert: false },
  { id: 'S2_24955_55186_CloudCover', lat: 24.9554, lon: 55.1867, cls: 'CloudCover', alert: false },
  { id: 'S2_24917_55170_Industrial', lat: 24.9172, lon: 55.1701, cls: 'Industrial', alert: true },
];

function generateFallbackPacket(
  seq: number,
  metMs: number,
  flightMode: 'NOMINAL_EO_SCAN' | 'THERMAL_PEAK_1430' | 'SAFEHOLD'
): OrbitalTelemetryPacket {
  const tSec = metMs / 1000;
  const tileIdx = (seq + Math.floor(tSec)) % DUBAI_SOUTH_TILES.length;
  const tile = DUBAI_SOUTH_TILES[tileIdx];

  const q1 = Number((0.06 * Math.sin(tSec * 0.4)).toFixed(3));
  const q2 = Number((0.05 * Math.cos(tSec * 0.3)).toFixed(3));
  const q3 = Number((0.08 * Math.sin(tSec * 0.2)).toFixed(3));
  const q0 = Number(Math.sqrt(Math.max(0.0, 1.0 - q1 * q1 - q2 * q2 - q3 * q3)).toFixed(3));

  // CCSDS Primary Header formatting (APID 0x01A for Alert or 0x010 for Health)
  const apid = tile.alert ? 0x01a : 0x010;
  const p1 = ((0 & 0x07) << 5) | ((0 & 0x01) << 4) | ((1 & 0x01) << 3) | ((apid >> 8) & 0x07);
  const p2 = apid & 0xff;
  const p3 = (0x03 << 6) | ((seq >> 8) & 0x3f);
  const p4 = seq & 0xff;
  const length = 28;
  const p5 = (length >> 8) & 0xff;
  const p6 = length & 0xff;
  const headerHex = [p1, p2, p3, p4, p5, p6]
    .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
    .join('');

  // Realistic bandwidth saved ~ 78% (desert/cloud dropped on orbit)
  const bwSaved = Number((76.5 + 3.2 * Math.sin(tSec * 0.1)).toFixed(1));

  return {
    ccsds_header_hex: headerHex,
    met_ms: metMs,
    source: 'FRONTEND_FALLBACK',
    flight_mode: flightMode,
    solar_local_time: '14:30 GST',
    adcs: {
      q0,
      q1,
      q2,
      q3,
      nadir_locked: flightMode !== 'SAFEHOLD',
      temp_c: Number((43.2 + 2.8 * Math.sin(tSec * 0.15)).toFixed(1)),
    },
    edge_ai: {
      tile_id: tile.id,
      lat: tile.lat,
      lon: tile.lon,
      predicted_class: tile.cls,
      confidence: Number((0.93 + (tileIdx % 5) * 0.012).toFixed(2)),
      inference_ms: Number((6.8 + (tileIdx % 7) * 0.7).toFixed(1)),
      action: tile.alert ? 'DOWNLINK_PRIORITY_ALERT' : 'DROP_STATIC_DESERT',
      bandwidth_saved_pct: bwSaved,
      change_detected: tile.alert,
    },
  };
}

export function useTelemetryStream(onPacket?: (pkt: OrbitalTelemetryPacket) => void) {
  const [telemetry, setTelemetry] = useState<OrbitalTelemetryPacket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [source, setSource] = useState<'SIM_OBC' | 'ESP32_S3_HIL' | 'FRONTEND_FALLBACK'>('FRONTEND_FALLBACK');
  const [flightMode, setFlightMode] = useState<'NOMINAL_EO_SCAN' | 'THERMAL_PEAK_1430' | 'SAFEHOLD'>('THERMAL_PEAK_1430');
  const [uplinkStatus, setUplinkStatus] = useState<string>('IDLE');

  const wsRef = useRef<WebSocket | null>(null);
  const seqRef = useRef<number>(100);
  const startMsRef = useRef<number>(Date.now());
  const fallbackIntervalRef = useRef<number | null>(null);

  // Fallback simulator loop
  const runFallbackTick = useCallback(() => {
    seqRef.current = (seqRef.current + 1) & 0x3fff;
    const met = Date.now() - startMsRef.current;
    const packet = generateFallbackPacket(seqRef.current, met, flightMode);
    setTelemetry(packet);
    setSource('FRONTEND_FALLBACK');
    onPacket?.(packet);
  }, [flightMode, onPacket]);

  // Connect to live backend WebSocket or seamlessly run fallback
  useEffect(() => {
    let unmounted = false;
    let fallbackActive = false;

    const startFallback = () => {
      if (fallbackActive) return;
      fallbackActive = true;
      setIsConnected(false);
      if (!fallbackIntervalRef.current) {
        runFallbackTick();
        fallbackIntervalRef.current = window.setInterval(runFallbackTick, 1000);
      }
    };

    const stopFallback = () => {
      fallbackActive = false;
      if (fallbackIntervalRef.current) {
        clearInterval(fallbackIntervalRef.current);
        fallbackIntervalRef.current = null;
      }
    };

    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket('ws://localhost:8000/ws/telemetry');
      wsRef.current = ws;

      const connectionTimeout = window.setTimeout(() => {
        if (ws?.readyState !== WebSocket.OPEN) {
          startFallback();
        }
      }, 1500);

      ws.onopen = () => {
        if (unmounted) return;
        clearTimeout(connectionTimeout);
        stopFallback();
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        if (unmounted) return;
        try {
          const data: OrbitalTelemetryPacket = JSON.parse(event.data);
          setTelemetry(data);
          setSource(data.source);
          setFlightMode(data.flight_mode);
          onPacket?.(data);
        } catch {
          // Ignore parse errors
        }
      };

      ws.onerror = () => {
        if (unmounted) return;
        startFallback();
      };

      ws.onclose = () => {
        if (unmounted) return;
        startFallback();
      };
    } catch {
      startFallback();
    }

    return () => {
      unmounted = true;
      if (fallbackIntervalRef.current) {
        clearInterval(fallbackIntervalRef.current);
        fallbackIntervalRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [runFallbackTick, onPacket]);

  // Uplink Command function
  const sendCommand = async (mode: 'NOMINAL_EO_SCAN' | 'THERMAL_PEAK_1430' | 'SAFEHOLD') => {
    setUplinkStatus(`UPLINKING: ${mode}...`);
    setFlightMode(mode);
    try {
      const res = await fetch('http://localhost:8000/api/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode }),
      });
      if (res.ok) {
        setUplinkStatus(`ACK: ${mode} CONFIRMED`);
      } else {
        setUplinkStatus(`SIMULATED: ${mode}`);
      }
    } catch {
      setUplinkStatus(`OFFLINE ACK (SIM): ${mode}`);
    }
    setTimeout(() => setUplinkStatus('IDLE'), 3500);
  };

  return {
    telemetry,
    isConnected,
    source,
    flightMode,
    uplinkStatus,
    sendCommand,
  };
}
