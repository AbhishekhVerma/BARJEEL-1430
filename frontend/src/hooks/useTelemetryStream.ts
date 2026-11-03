import { useEffect, useRef, useState, useCallback } from 'react';
import type { OrbitalTelemetryPacket } from '../types/contracts';

const DOWNTIME_RECONNECT_MS = 6000;

const DUBAI_SOUTH_WAYPOINTS = [
  { lat: 24.9180, lon: 55.1680, tile_id: 'S2_24918_55168', cls: 'Industrial', conf: 0.96 },
  { lat: 24.9420, lon: 55.2050, tile_id: 'S2_24942_55205', cls: 'Residential', conf: 0.95 },
  { lat: 24.9600, lon: 55.1510, tile_id: 'S2_24960_55151', cls: 'Industrial', conf: 0.97 },
  { lat: 24.9020, lon: 55.1650, tile_id: 'S2_24902_55165', cls: 'Highway', conf: 0.94 },
  { lat: 24.9350, lon: 55.1850, tile_id: 'S2_24935_55185', cls: 'AnnualCrop', conf: 0.93 },
  { lat: 24.9520, lon: 55.1420, tile_id: 'S2_24952_55142', cls: 'Industrial', conf: 0.98 },
];

function generateCcsdsHex(seq: number, apid: number = 0x001): string {
  // CCSDS 133.0-B-2 primary header (6 bytes = 12 hex chars):
  // Byte 0-1: Ver (3b=0) | Type (1b=0) | SecHdr (1b=1) | APID (11b)
  const word1 = (0x0800 | (apid & 0x07ff));
  // Byte 2-3: SeqFlags (2b=3 unsegmented) | SeqCount (14b)
  const word2 = ((0x3 << 14) | (seq & 0x3fff));
  // Byte 4-5: Packet Length (16b) = data_length - 1 (e.g. 63 -> 0x003F)
  const word3 = 0x003f;
  return [
    word1.toString(16).padStart(4, '0'),
    word2.toString(16).padStart(4, '0'),
    word3.toString(16).padStart(4, '0'),
  ].join('').toUpperCase();
}

export function useTelemetryStream(
  onUpdate?: (packet: OrbitalTelemetryPacket) => void,
  initialFlightMode: 'NOMINAL_EO_SCAN' | 'THERMAL_PEAK_1430' | 'SAFEHOLD' = 'THERMAL_PEAK_1430'
) {
  const [telemetry, setTelemetry] = useState<OrbitalTelemetryPacket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isFallback, setIsFallback] = useState<boolean>(true);
  const [flightMode, setFlightMode] = useState<'NOMINAL_EO_SCAN' | 'THERMAL_PEAK_1430' | 'SAFEHOLD'>(initialFlightMode);

  const fallbackTimerRef = useRef<number | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const seqCounterRef = useRef<number>(104);
  const startTimeRef = useRef<number>(Date.now());
  const flightModeRef = useRef(flightMode);
  flightModeRef.current = flightMode;

  const emitPacket = useCallback((pkt: OrbitalTelemetryPacket) => {
    setTelemetry(pkt);
    if (onUpdate) {
      onUpdate(pkt);
    }
  }, [onUpdate]);

  // Synthetic 1 Hz Fallback Generator
  const runFallbackTick = useCallback(() => {
    seqCounterRef.current = (seqCounterRef.current + 1) & 0x3fff;
    const elapsedSec = (Date.now() - startTimeRef.current) / 1000;
    const wpIndex = Math.floor(elapsedSec / 4) % DUBAI_SOUTH_WAYPOINTS.length;
    const wpNextIndex = (wpIndex + 1) % DUBAI_SOUTH_WAYPOINTS.length;
    const progress = (elapsedSec % 4) / 4;

    const wpA = DUBAI_SOUTH_WAYPOINTS[wpIndex];
    const wpB = DUBAI_SOUTH_WAYPOINTS[wpNextIndex];

    const lat = Number((wpA.lat + (wpB.lat - wpA.lat) * progress).toFixed(6));
    const lon = Number((wpA.lon + (wpB.lon - wpA.lon) * progress).toFixed(6));

    // Realistic ADCS Oscillations
    const q1 = Number((0.06 * Math.sin(elapsedSec * 0.4)).toFixed(3));
    const q2 = Number((0.05 * Math.cos(elapsedSec * 0.3)).toFixed(3));
    const q3 = Number((0.08 * Math.sin(elapsedSec * 0.2)).toFixed(3));
    const q0 = Number(Math.sqrt(Math.max(0, 1.0 - q1 * q1 - q2 * q2 - q3 * q3)).toFixed(3));
    const temp_c = Number((42.0 + 4.8 * Math.sin(elapsedSec * 0.15)).toFixed(1));

    const currentMode = flightModeRef.current;
    const nadirLocked = currentMode !== 'SAFEHOLD';
    const ccsdsHeader = generateCcsdsHex(seqCounterRef.current, 0x001);

    const fallbackPacket: OrbitalTelemetryPacket = {
      ccsds_header_hex: ccsdsHeader,
      met_ms: Math.floor(elapsedSec * 1000),
      source: 'FRONTEND_FALLBACK',
      flight_mode: currentMode,
      solar_local_time: '14:30 GST',
      adcs: {
        q0,
        q1,
        q2,
        q3,
        nadir_locked: nadirLocked,
        temp_c,
      },
      edge_ai: {
        tile_id: wpA.tile_id,
        lat,
        lon,
        predicted_class: wpA.cls,
        confidence: wpA.conf,
        inference_ms: 0.52,
        action: 'DOWNLINK_PRIORITY_ALERT',
        bandwidth_saved_pct: 78.4,
        change_detected: true,
      },
    };

    emitPacket(fallbackPacket);
  }, [emitPacket]);

  const startFallback = useCallback(() => {
    setIsConnected(false);
    setIsFallback(true);
    if (!fallbackTimerRef.current) {
      runFallbackTick();
      fallbackTimerRef.current = window.setInterval(runFallbackTick, 1000);
    }
  }, [runFallbackTick]);

  const stopFallback = useCallback(() => {
    if (fallbackTimerRef.current) {
      clearInterval(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
    setIsFallback(false);
  }, []);

  // Connect WebSocket with resilient fallback
  const connectSocket = useCallback(() => {
    try {
      const ws = new WebSocket('ws://localhost:8000/ws/telemetry');
      socketRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        stopFallback();
      };

      ws.onmessage = (event) => {
        try {
          const packet: OrbitalTelemetryPacket = JSON.parse(event.data);
          emitPacket(packet);
          if (packet.flight_mode) {
            setFlightMode(packet.flight_mode);
          }
        } catch {
          // ignore corrupted frame
        }
      };

      ws.onerror = () => {
        startFallback();
      };

      ws.onclose = () => {
        startFallback();
        // Schedule reconnect attempt
        if (!reconnectTimerRef.current) {
          reconnectTimerRef.current = window.setTimeout(() => {
            reconnectTimerRef.current = null;
            connectSocket();
          }, DOWNTIME_RECONNECT_MS);
        }
      };
    } catch {
      startFallback();
    }
  }, [emitPacket, startFallback, stopFallback]);

  useEffect(() => {
    connectSocket();
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
      if (fallbackTimerRef.current) {
        clearInterval(fallbackTimerRef.current);
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
    };
  }, [connectSocket]);

  const sendCommand = useCallback(
    async (mode: 'NOMINAL_EO_SCAN' | 'THERMAL_PEAK_1430' | 'SAFEHOLD') => {
      setFlightMode(mode);
      flightModeRef.current = mode;

      try {
        const res = await fetch('http://localhost:8000/api/command', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode }),
        });
        if (!res.ok) {
          throw new Error(`Uplink HTTP status ${res.status}`);
        }
      } catch {
        // Fallback uplink: mode already applied to local state and fallback generator
      }
    },
    []
  );

  return {
    telemetry,
    isConnected,
    isFallback,
    flightMode,
    sendCommand,
  };
}
