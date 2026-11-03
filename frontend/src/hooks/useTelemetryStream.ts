import { useEffect, useRef, useState, useCallback } from 'react';
import type { OrbitalTelemetryPacket } from '../types/contracts';

const DOWNTIME_RECONNECT_MS = 6000;

const DUBAI_SOUTH_WAYPOINTS = [
  { lat: 24.9602, lon: 55.1512, tile_id: 'S2_24960_55151', cls: 'Industrial', conf: 0.96 },
  { lat: 24.9535, lon: 55.1595, tile_id: 'S2_24953_55159', cls: 'Industrial', conf: 0.98 },
  { lat: 24.9468, lon: 55.1678, tile_id: 'S2_24946_55167', cls: 'Residential', conf: 0.94 },
  { lat: 24.9401, lon: 55.1761, tile_id: 'S2_24940_55176', cls: 'Highway', conf: 0.92 },
  { lat: 24.9334, lon: 55.1844, tile_id: 'S2_24933_55184', cls: 'BareDesert', conf: 0.99 },
  { lat: 24.9267, lon: 55.1927, tile_id: 'S2_24926_55192', cls: 'Residential', conf: 0.95 },
  { lat: 24.9200, lon: 55.2010, tile_id: 'S2_24920_55201', cls: 'Industrial', conf: 0.97 },
  { lat: 24.9133, lon: 55.1920, tile_id: 'S2_24913_55192', cls: 'AnnualCrop', conf: 0.91 },
  { lat: 24.9066, lon: 55.1830, tile_id: 'S2_24906_55183', cls: 'BareDesert', conf: 0.99 },
  { lat: 24.8999, lon: 55.1740, tile_id: 'S2_24899_55174', cls: 'Industrial', conf: 0.96 },
  { lat: 24.8932, lon: 55.1650, tile_id: 'S2_24893_55165', cls: 'Highway', conf: 0.93 },
  { lat: 24.9050, lon: 55.1560, tile_id: 'S2_24905_55156', cls: 'CloudCover', conf: 0.98 },
  { lat: 24.9180, lon: 55.1680, tile_id: 'S2_24918_55168', cls: 'Industrial', conf: 0.96 },
  { lat: 24.9350, lon: 55.1850, tile_id: 'S2_24935_55185', cls: 'Residential', conf: 0.95 },
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
  const [uplinkStatus, setUplinkStatus] = useState<string>('IDLE');

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
    const wpIndex = Math.floor(elapsedSec / 3) % DUBAI_SOUTH_WAYPOINTS.length;
    const wpNextIndex = (wpIndex + 1) % DUBAI_SOUTH_WAYPOINTS.length;
    const progress = (elapsedSec % 3) / 3;

    const wpA = DUBAI_SOUTH_WAYPOINTS[wpIndex];
    const wpB = DUBAI_SOUTH_WAYPOINTS[wpNextIndex];

    const lat = Number((wpA.lat + (wpB.lat - wpA.lat) * progress).toFixed(6));
    const lon = Number((wpA.lon + (wpB.lon - wpA.lon) * progress).toFixed(6));

    // Realistic ADCS Oscillations
    const q1 = Number((0.06 * Math.sin(elapsedSec * 0.4)).toFixed(3));
    const q2 = Number((0.05 * Math.cos(elapsedSec * 0.3)).toFixed(3));
    const q3 = Number((0.08 * Math.sin(elapsedSec * 0.2)).toFixed(3));
    const q0 = Number(Math.sqrt(Math.max(0, 1.0 - q1 * q1 - q2 * q2 - q3 * q3)).toFixed(3));
    const tempBase = flightModeRef.current === 'THERMAL_PEAK_1430' ? 43.2 : flightModeRef.current === 'SAFEHOLD' ? 35.5 : 39.8;
    const temp_c = Number((tempBase + 3.8 * Math.sin(elapsedSec * 0.15)).toFixed(1));

    const currentMode = flightModeRef.current;
    const nadirLocked = currentMode !== 'SAFEHOLD';
    const ccsdsHeader = generateCcsdsHex(seqCounterRef.current, 0x001);

    const isDroppedTile = wpA.cls === 'BareDesert' || wpA.cls === 'CloudCover';
    const inferenceMs = Number((0.50 + 0.04 * Math.abs(Math.sin(elapsedSec))).toFixed(2));

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
        inference_ms: inferenceMs,
        action: isDroppedTile ? 'DROP_STATIC_DESERT' : 'DOWNLINK_PRIORITY_ALERT',
        bandwidth_saved_pct: isDroppedTile ? 84.2 : 78.4,
        change_detected: !isDroppedTile,
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

  // Connect WebSocket with resilient fallback & 1.5s connect timeout
  const connectSocket = useCallback(() => {
    try {
      const ws = new WebSocket('ws://localhost:8000/ws/telemetry');
      socketRef.current = ws;

      const connectTimeout = window.setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          startFallback();
        }
      }, 1500);

      ws.onopen = () => {
        clearTimeout(connectTimeout);
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
        clearTimeout(connectTimeout);
        startFallback();
      };

      ws.onclose = () => {
        clearTimeout(connectTimeout);
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
      setUplinkStatus(`UPLINKING: ${mode}...`);

      try {
        const res = await fetch('http://localhost:8000/api/command', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode }),
        });
        if (!res.ok) {
          throw new Error(`Uplink HTTP status ${res.status}`);
        }
        setUplinkStatus(`ACK: ${mode}`);
      } catch {
        // Fallback uplink: mode already applied to local state and fallback generator
        setUplinkStatus(`SIM ACK: ${mode}`);
      }
      window.setTimeout(() => setUplinkStatus('IDLE'), 3500);
    },
    []
  );

  return {
    telemetry,
    isConnected,
    isFallback,
    flightMode,
    uplinkStatus,
    sendCommand,
  };
}
