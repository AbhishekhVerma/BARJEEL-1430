"""
Mission BARJEEL-1430 (برجيل-1430) — Unified One-Command Launcher.
Starts the Orbital Edge AI & CCSDS Telemetry Backend (Port 8000)
and the 3D Urban Sustainability Digital Twin Frontend (Port 5173).
"""

import os
import signal
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent
BACKEND_DIR = ROOT / "backend"
FRONTEND_DIR = ROOT / "frontend"

VENV_PYTHON = (
    BACKEND_DIR / ".venv" / ("Scripts" if os.name == "nt" else "bin") / ("python.exe" if os.name == "nt" else "python")
)


def main():
    print("=" * 72)
    print("   MISSION BARJEEL-1430 (برجيل-1430) — ONE-COMMAND LAUNCHER")
    print("   Theme 02: Cities from Orbit | Dubai South & Expo City Twin")
    print("=" * 72)

    python_exe = str(VENV_PYTHON) if VENV_PYTHON.exists() else sys.executable
    print(f"[*] Python interpreter : {python_exe}")
    print(f"[*] Backend directory  : {BACKEND_DIR}")
    print(f"[*] Frontend directory : {FRONTEND_DIR}")

    # Launch Backend
    print("\n[1/2] Starting Orbital Edge AI & CCSDS Backend on http://localhost:8000 ...")
    backend_proc = subprocess.Popen(
        [python_exe, "server.py"],
        cwd=str(BACKEND_DIR),
    )

    # Launch Frontend
    print("[2/2] Starting 3D Digital Twin Frontend on http://localhost:5173 ...")
    frontend_proc = subprocess.Popen(
        ["npm", "run", "dev"],
        cwd=str(FRONTEND_DIR),
        shell=(os.name == "nt"),
    )

    print("\n" + "-" * 72)
    print("   SYSTEM READY:")
    print("   - 3D Digital Twin & Mission HUD : http://localhost:5173")
    print("   - Edge AI REST & Docs API       : http://localhost:8000/docs")
    print("   - Live CCSDS Telemetry Stream   : ws://localhost:8000/ws/telemetry")
    print("-" * 72)
    print("   Press Ctrl+C to terminate both servers cleanly.\n")

    def handle_shutdown(sig, frame):
        print("\n[*] Shutting down Mission BARJEEL-1430 services...")
        try:
            frontend_proc.terminate()
        except Exception:
            pass
        try:
            backend_proc.terminate()
        except Exception:
            pass
        try:
            frontend_proc.wait(timeout=3)
        except Exception:
            try:
                frontend_proc.kill()
            except Exception:
                pass
        try:
            backend_proc.wait(timeout=3)
        except Exception:
            try:
                backend_proc.kill()
            except Exception:
                pass
        print("[+] All services stopped cleanly.")
        sys.exit(0)

    signal.signal(signal.SIGINT, handle_shutdown)
    signal.signal(signal.SIGTERM, handle_shutdown)

    try:
        while True:
            time.sleep(1.0)
            if backend_proc.poll() is not None:
                print("[!] Backend exited unexpectedly.")
                break
            if frontend_proc.poll() is not None:
                print("[!] Frontend exited unexpectedly.")
                break
    except KeyboardInterrupt:
        handle_shutdown(None, None)


if __name__ == "__main__":
    main()
