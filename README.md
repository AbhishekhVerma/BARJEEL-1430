# Mission BARJEEL-1430 (برجيل-1430)

**Autonomous Orbital Edge AI (`CCSDS 133.0-B-2` + Quantized `EuroSAT` INT8 ONNX) & Closed-Loop 3D Urban Sustainability Digital Twin**  
*Supernova × SpacePoint Competition — Theme 02: Cities from Orbit (Smart and sustainable urban living)*  
**Target Area of Interest (AOI)**: **Dubai South & Expo City Corridor** (`[55.120°E, 24.880°N]` to `[55.240°E, 24.980°N]`)

---

## 1. Executive Summary & The BARJEEL-1430 Thesis

Rapid urban expansion across the GCC desert corridor creates severe micro-climate heat islands, high building cooling demands, and accelerated geotechnical ground dynamics. Traditional Earth Observation workflows suffer from two fundamental operational bottlenecks:
1. **The Sun-Synchronous Blindspot**: Public sun-synchronous satellites (`Sentinel-2`, `Landsat 8/9`) pass over the UAE at **~10:30 AM local solar time**—missing the **14:30 GST peak urban heat island stress** (up to $6.8^\circ\text{C}$ hotter) and peak grid cooling loads.
2. **The Downlink Bottleneck**: Downlinking raw uncompressed multi-spectral frames over desert terrain wastes **~78.4% of satellite downlink bandwidth** transmitting static desert sand and cloud-covered pixels.

**Mission BARJEEL-1430** solves both challenges with an end-to-end, space-to-street closed loop:
- **Sense & Filter in Orbit**: An onboard quantized `EuroSAT` INT8 ONNX Edge AI pipeline classifies land use in real time, drops static desert/cloud tiles, and downlinks priority urban delta alerts using standard **`CCSDS 133.0-B-2` Space Packet** framing.
- **Barjeel-TsHARP Spatial Disaggregation**: Fuses high-resolution 10 m `Sentinel-2` albedo and `Copernicus DEM` 3D building boundaries through a physics-constrained surface energy balance equation, sharpening coarse 75 m thermal flux into discrete building rooftop temperatures ($\pm 1.2^\circ\text{C}$).
- **Interactive 3D Digital Twin**: A 60 FPS WebGL digital twin (`MapLibre GL JS` + `Three.js` 3U CubeSat Picture-in-Picture HUD) mapping 2,150 3D buildings across Dubai South, enabling municipal planners to simulate and prescribe DEWA Shams rooftop solar ($2,020\text{ MWp}$ potential), Barjeel cool-roofs & shade corridors ($-2.6^\circ\text{C } \Delta\text{LST}$), and smart VIIRS dimming.
- **Space-Verified Carbon Credit (SV-CC) Oracle**: Unlike open-loop dashboards, subsequent 14:30 passes empirically measure real surface cooling ($\Delta\text{LST}$) and dispatch automated GeoHub tickets to Dubai Municipality and DEWA, minting audited proof-of-mitigation for UAE Net Zero 2050 carbon credits.

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

## 4. Hardware-in-the-Loop (HIL) Testbed

An ESP32-S3 microcontroller acts as a physical hardware-in-the-loop payload testbed, executing zero-overhead serial streaming of telemetry packets and validating:
- CCSDS primary header framing (APID `0x099`, Sequence Flags `0b11`, big-endian packet length)
- CCITT CRC-16 checksum error detection over noisy simulated RF channels
- Flight mode command handling (`NOMINAL_EO_SCAN`, `THERMAL_PEAK_1430`, `SAFEHOLD`)
- Ground station handshaking via bidirectional JSON/hex protocol

---

## 5. Verification & Automated Test Suites

The repository contains comprehensive opaque-box test suites verifying end-to-end functionality across all 4 tiers of the mission architecture.

```powershell
# Run the 4-Tier Opaque-Box E2E Verifier (43/43 assertions)
.\backend\.venv\Scripts\python.exe tests\e2e_verifier.py

# Run the Adversarial Challenger Suite (21/21 assertions)
.\backend\.venv\Scripts\python.exe -m unittest discover -s tests -p "adversarial_*.py" -v

# Run the Data Pipeline Deliverables Verifier
.\backend\.venv\Scripts\python.exe data_pipeline\verify_pipeline.py
```

---

## 6. One-Command Quickstart

To run the complete BARJEEL-1430 system locally:

```powershell
# 1. Start both the FastAPI backend (port 8000) and Vite frontend (port 5173)
python start_barjeel.py

# 2. Open the 3D Digital Twin in your browser
# URL: http://localhost:5173
```
