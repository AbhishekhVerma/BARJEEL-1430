# Mission BARJEEL-1430 (برجيل-1430)

**Autonomous Orbital Edge AI (`CCSDS 133.0-B-2` + Quantized `EuroSAT` INT8 ONNX) & Closed-Loop 3D Urban Sustainability Digital Twin**  
*Supernova × SpacePoint Competition — Theme 02: Cities from Orbit (Smart and sustainable urban living)*  
**Target Area of Interest (AOI)**: **Dubai South & Expo City Corridor** (`[55.120°E, 24.880°N]` to `[55.240°E, 24.980°N]`)

---

## 1. Executive Summary & The BARJEEL-1430 Thesis

Rapid urban expansion across the GCC desert corridor creates severe micro-climate heat islands, high building cooling demands, and accelerated geotechnical ground dynamics. Traditional Earth Observation workflows suffer from two fundamental operational bottlenecks:
1. **The Sun-Synchronous Blindspot**: Public sun-synchronous satellites (`Sentinel-2`, `Landsat 8/9`) pass over the UAE at **~10:30 AM local solar time**—missing the **14:30 GST peak urban heat island stress** and peak grid cooling loads.
2. **The Downlink Bottleneck**: Downlinking raw uncompressed multi-spectral frames over desert terrain wastes **~78.4% of satellite downlink bandwidth** transmitting static desert sand and cloud-covered pixels.

**Mission BARJEEL-1430** solves both challenges with an end-to-end, space-to-street closed loop:
- **Sense & Filter in Orbit**: An onboard quantized `EuroSAT` INT8 ONNX Edge AI pipeline classifies land use in real time, drops static desert/cloud tiles, and downlinks priority urban delta alerts using standard **`CCSDS 133.0-B-2` Space Packet** framing.
- **5-Dataset Multi-Satellite Fusion**: Ingests and harmonizes `Sentinel-2` (10 m growth & vegetation), `Sentinel-1` SAR (interferometric coherence & subsidence), `Copernicus DEM` (3D elevation & rooftop solar potential), `Landsat 8/9` TIRS (Land Surface Temperature), and `VIIRS` (nighttime radiance & energy waste).
- **Interactive 3D Digital Twin**: A 60 FPS WebGL digital twin (`MapLibre GL JS` + `Three.js` 3U CubeSat Picture-in-Picture HUD) providing municipal planners with real-time sustainability prescription simulations (DEWA Shams rooftop solar, Barjeel cool-roofs & shade corridors, smart VIIRS dimming) with dynamic ROI calculations ($\Delta\text{LST }^\circ\text{C}$, $\text{GWh/yr}$, $\text{AED}$ savings, $\text{tCO}_2$ avoidance).

---

## 2. Orbital Edge AI Benchmarks (Quantized INT8 ONNX)

The BARJEEL-1430 onboard computer executes a quantized MobileNetV3-Small classifier trained on 10-class Sentinel-2 land cover patches. Inference runs sub-millisecond on standard low-power edge processors.

| Metric | Full Precision (FP32) | Quantized Edge AI (INT8) | Impact / Delta |
| :--- | :--- | :--- | :--- |
| **Validation Accuracy** | **95.73%** | **95.73%** | **0.0% accuracy loss** |
| **Mean Inference Latency** | 2.14 ms | **0.524 ms** | **4.08× speedup** (sub-millisecond) |
| **P95 Latency** | 2.89 ms | **0.666 ms** | Reliable real-time push-broom classification |
| **Model Footprint** | 5.838 MB | **4.134 MB** | **29.2% memory reduction** |
| **Orbital Downlink Saved** | 0.0% (raw) | **78.4% reduction** | Only priority urban change alerts downlinked |
| **Space Protocol Framing** | N/A | **`CCSDS 133.0-B-2`** | 6-byte Primary Header + CCITT CRC-16 |

---

## 3. 5-Dataset Earth Observation Fusion Architecture

```
[Sentinel-2 (10m)]   --> Sprawl Tracking (2019–2026) & Vegetation NDVI
[Sentinel-1 SAR]     --> InSAR Coherence & Geotechnical Subsidence (mm/yr)
[Copernicus DEM 30m] --> 3D Extrusion Heights & DEWA Shams Solar Yield (kWp)  ==> Enriched 3D Buildings GeoJSON
[Landsat 8/9 TIRS]   --> Land Surface Temperature (LST °C) Heat Hotspots            & District Summary KPIs
[VIIRS Day/Night]    --> Nocturnal Radiance (nW/cm²/sr) & Energy Waste
```

- **Expo City Core (`expo-core`)**: Low-albedo passive shading benchmark (Al Wasl canopy) with integrated solar pavilion yields.
- **Logistics Mega-Hub (`logistics-mega`)**: High-density flat-roof logistics corridor with maximum rooftop solar capacity ($> 250\text{ MWp}$).
- **Residential Growth Boom (`residential-growth`)**: Fastest 2019–2026 desert-to-urban sprawl zone experiencing peak afternoon heat island effects.
- **Aviation Infrastructure (`aviation-infra`)**: Al Maktoum Airport perimeter under geotechnical subsidence monitoring ($> 3.0\text{ mm/yr}$ alert threshold).

---

## 4. Quickstart (< 60 Seconds, Zero API Keys Required)

All required assets (quantized ONNX model, 34 Sentinel-2 test patches, and enriched 3D GeoJSON) are included in the repository for immediate evaluation.

### Option A: One-Command Launch (Recommended)

Using Python:
```bash
python start_barjeel.py
```

Or using Windows PowerShell:
```powershell
.\start_barjeel.ps1
```

Both backend (port `8000`) and frontend (port `5173`) will launch concurrently.

### Option B: Manual Two-Terminal Launch

**Terminal 1 — Backend & Telemetry Server**:
```bash
cd backend
.\.venv\Scripts\python.exe server.py
# (Or: python -m uvicorn server:app --host 0.0.0.0 --port 8000)
```

**Terminal 2 — 3D Digital Twin Frontend**:
```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` in any modern web browser.

---

## 5. System Verification Suite

Run the full end-to-end backend test suite verifying CCSDS bit-packing, CRC-16 integrity, INT8 ONNX inference, REST endpoints, and WebSocket telemetry contracts:

```powershell
.\backend\.venv\Scripts\python.exe .\backend\test_backend.py
```

Expected output:
```
[BARJEEL-1430 EdgeAI] Loaded quantized INT8 ONNX model: eurosat_int8.onnx
[PASS] All BARJEEL-1430 CCSDS, Edge AI, HIL, and WebSocket contract tests passed!
```

Build the production frontend bundle:
```powershell
cd frontend
npm run build
```

---

## 6. Hardware-in-the-Loop (HIL) Capability

Mission BARJEEL-1430 includes optional physical ESP32-S3 microcontroller support:
- Firmware: `backend/esp32_hil/barjeel_obc_hil/barjeel_obc_hil.ino` (streams 1 Hz CCSDS-framed packets over USB Serial).
- Bridge: `backend/serial_hil_bridge.py` auto-detects USB COM ports and forwards telemetry to `http://localhost:8000/api/hil`.
- Zero campus Wi-Fi configuration required; the 3D twin dynamically switches telemetry badges between `SIM_OBC` and `ESP32_S3_HIL`.
