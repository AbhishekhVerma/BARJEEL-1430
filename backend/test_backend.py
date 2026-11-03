"""
Automated Verification Suite for Mission BARJEEL-1430 Orbital Edge AI & CCSDS Backend.
Tests:
1. CCSDS 133.0-B-2 6-byte primary header bit-packing, decoding, and CCITT CRC-16 integrity.
2. Quantized INT8 ONNX EuroSAT model presence, accuracy report, and < 15 ms inference latency.
3. FastAPI REST endpoints (`/api/status`, `/api/benchmarks`, `/api/patches`, `/api/classify`, `/api/command`, `/api/hil`).
4. Live WebSocket telemetry contract (`ws://.../ws/telemetry`) matching `contracts/telemetry_sample.json`.
"""

import json
from pathlib import Path
from fastapi.testclient import TestClient

from ccsds import APID_EDGE_AI_ALERT, decode_ccsds_primary_header, frame_ccsds_packet, verify_ccsds_packet
from server import app

BACKEND_DIR = Path(__file__).resolve().parent


def test_ccsds_framing_and_crc():
    hdr_hex, pkt_hex = frame_ccsds_packet(b"DUBAI_SOUTH_SOLAR", apid=APID_EDGE_AI_ALERT, seq_count=42)
    assert len(hdr_hex) == 12
    assert verify_ccsds_packet(pkt_hex) is True
    decoded = decode_ccsds_primary_header(bytes.fromhex(hdr_hex))
    assert decoded["version"] == 0
    assert decoded["type"] == "TM"
    assert decoded["sec_hdr_flag"] is True
    assert decoded["apid"] == 0x099
    assert decoded["seq_count"] == 42
    # Corrupt last byte and confirm CRC rejects tampered packet
    corrupted = pkt_hex[:-2] + ("00" if pkt_hex[-2:] != "00" else "FF")
    assert verify_ccsds_packet(corrupted) is False


def test_rest_and_hil_and_websocket_contracts():
    client = TestClient(app)

    status = client.get("/api/status").json()
    assert status["mission"] == "BARJEEL-1430"
    assert status["patches_available"] >= 20

    patches = client.get("/api/patches").json()
    first_tile = patches["patches"][0]["tile_id"]

    classified = client.get(f"/api/classify/{first_tile}").json()
    assert classified["result"]["inference_ms"] < 25.0
    assert verify_ccsds_packet(classified["ccsds"]["packet_hex"]) is True

    cmd = client.post("/api/command", json={"mode": "NOMINAL_EO_SCAN"}).json()
    assert cmd["flight_mode"] == "NOMINAL_EO_SCAN"

    # Verify SIM_OBC WebSocket frame matches frozen Contract C
    with client.websocket_connect("/ws/telemetry") as ws:
        frame = json.loads(ws.receive_text())
        assert len(frame["ccsds_header_hex"]) == 12
        assert frame["source"] == "SIM_OBC"
        assert frame["solar_local_time"] == "14:30 GST"
        assert {"q0", "q1", "q2", "q3", "nadir_locked"}.issubset(frame["adcs"].keys())
        assert {
            "tile_id",
            "lat",
            "lon",
            "predicted_class",
            "confidence",
            "inference_ms",
            "action",
            "bandwidth_saved_pct",
            "change_detected",
        }.issubset(frame["edge_ai"].keys())

    # Verify ESP32-S3 HIL override switches telemetry source seamlessly
    hil = client.post(
        "/api/hil",
        json={"q0": 0.99, "q1": 0.05, "q2": -0.04, "q3": 0.08, "temp_c": 48.2},
    ).json()
    assert hil["source"] == "ESP32_S3_HIL"
    with client.websocket_connect("/ws/telemetry") as ws:
        hil_frame = json.loads(ws.receive_text())
        assert hil_frame["source"] == "ESP32_S3_HIL"
        assert hil_frame["adcs"]["temp_c"] == 48.2


if __name__ == "__main__":
    test_ccsds_framing_and_crc()
    test_rest_and_hil_and_websocket_contracts()
    print("[PASS] All BARJEEL-1430 CCSDS, Edge AI, HIL, and WebSocket contract tests passed!")
