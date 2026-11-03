"""
Zero-WiFi USB Serial Bridge for ESP32-S3 Hardware-in-the-Loop (`BARJEEL-1430`).
Auto-detects an ESP32-S3 COM port (or accepts `--port COMx`), reads 115200-baud JSON telemetry frames,
and forwards them to `http://localhost:8000/api/hil` so the 3D Twin switches live to `ESP32_S3_HIL`.
"""

import argparse
import json
import time
import requests
import serial
import serial.tools.list_ports


def detect_esp32_port() -> str | None:
    for port in serial.tools.list_ports.comports():
        desc = f"{port.description} {port.manufacturer or ''}".lower()
        if any(k in desc for k in ("usb", "cp210", "ch340", "jtag", "serial", "esp")):
            return port.device
    return None


def main() -> None:
    parser = argparse.ArgumentParser(description="BARJEEL-1430 ESP32-S3 USB HIL Bridge")
    parser.add_argument("--port", type=str, default=None, help="Serial COM port (e.g. COM5)")
    parser.add_argument("--baud", type=int, default=115200)
    parser.add_argument("--server", type=str, default="http://localhost:8000/api/hil")
    args = parser.parse_args()

    port = args.port or detect_esp32_port()
    if not port:
        raise SystemExit("No ESP32-S3 USB serial port detected. Pass --port COMx explicitly.")

    print(f"[BARJEEL-1430 HIL] Connecting to ESP32-S3 on {port} @ {args.baud} baud...")
    with serial.Serial(port, args.baud, timeout=2.0) as ser:
        while True:
            raw = ser.readline().decode("utf-8", errors="ignore").strip()
            if not raw.startswith("{"):
                continue
            try:
                frame = json.loads(raw)
                if "q0" in frame:
                    resp = requests.post(args.server, json=frame, timeout=1.5)
                    print(f"[HIL -> OBC] {raw} | HTTP {resp.status_code}")
            except Exception as exc:
                print(f"[HIL warn] {exc}")
                time.sleep(0.2)


if __name__ == "__main__":
    main()
