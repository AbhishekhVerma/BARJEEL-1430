# Mission BARJEEL-1430 (برجيل-1430)

**Autonomous Orbital Edge AI & Closed-Loop 3D Urban Sustainability Mission**  
*Supernova × SpacePoint Competition — Theme 02: Cities from Orbit (Smart and sustainable urban living)*

---

## Why BARJEEL-1430?

- **Barjeel (برجيل)**: Traditional Emirati wind-tower architecture—centuries-old passive cooling engineered for sustainable desert cities.
- **1430 (`14:30 GST`)**: Public sun-synchronous satellites (`Sentinel-2`, `Landsat 8/9`) cross the UAE around **10:30 AM local solar time**, missing **peak afternoon urban heat island stress (`14:30 GST`)** and peak cooling grid demand—while wasting **~78% of downlink bandwidth** transmitting static desert and cloud-covered pixels.

**Mission BARJEEL-1430** closes both gaps through a **4-step Orbital-to-Municipal Loop**:
1. **Sense & Filter in Orbit (`backend/`)**: Quantized `EuroSAT` INT8 ONNX Edge AI classifies satellite tiles on-board, discards unchanged desert/cloud frames (**~78% bandwidth saved**), and downlinks priority urban alerts using **`CCSDS 133.0-B-2` Space Packet framing** (with optional **`ESP32-S3` Hardware-in-the-Loop**).
2. **Diagnose (`data_pipeline/`)**: Fuses **5 Earth Observation datasets** over the **Dubai South & Expo City Corridor** (`[55.12°E–55.24°E, 24.88°N–24.98°N]`):
   - `Sentinel-2` (10 m): 2019–2026 Urban Growth & NDVI/NDBI land-use change
   - `Sentinel-1` SAR + `Copernicus DEM`: Radar coherence & ground settlement risk (`mm/yr`)
   - `Copernicus DEM` (30 m) + 3D Footprints: Rooftop solar capacity (`kWp` & `MWh/yr`)
   - `Landsat 8/9` TIRS: Land Surface Temperature (`°C`) heat island hotspots
   - `VIIRS` Nighttime Lights: Wasted nocturnal radiance & smart dimming targets
3. **Prescribe (`frontend/`)**: Interactive **60 FPS 3D District Digital Twin** (`MapLibre GL JS` + `Three.js` 3U CubeSat PiP HUD) where urban planners simulate **Shams Rooftop Solar**, **Barjeel Cool-Roof & Shade Corridors**, and **Smart VIIRS Dimming** with live $\Delta^\circ\text{C}$, $\text{GWh/yr}$, $\text{AED}$, and $\text{tCO}_2$ ROI.
4. **Verify from Space**: Phased roadmap from **Phase 1 Municipal STAC Pilot** → **Phase 2 *BARJEEL-1430* $37^\circ$-Inclined 3U CubeSat** (capturing 14:30 GST thermal peaks) → **Phase 3 GCC Space-Verified ESG Constellation**.

---

## Quickstart (< 60 Seconds, Zero API Keys Required)

Pre-baked Dubai South & Expo City satellite-enriched GeoJSON (`frontend/public/data/dubai_south/`) and quantized Edge AI patches (`backend/data/s2_patches/`) are included in the repository for instant evaluation.

### 1. Start the Orbital Edge AI & CCSDS Telemetry Backend (Port `8000`)
```bash
cd backend
pip install -r requirements.txt
python server.py
```

### 2. Start the 3D District Digital Twin & Mission HUD (Port `5173`)
```bash
cd frontend
npm install
npm run dev
```
*(Note: If `frontend` is launched standalone without `backend`, the HUD automatically falls back to a built-in simulated `CCSDS 133.0-B-2` orbital stream so the 3D Twin never breaks.)*

---

## Repository Structure & Parallel Team Ownership

| Directory | Owner | Responsibility |
| :--- | :--- | :--- |
| `backend/` | **Member 1** | Quantized `EuroSAT` INT8 ONNX inference, `CCSDS 133.0-B-2` packetizer, FastAPI WebSocket (`ws://localhost:8000/ws/telemetry`), & `ESP32-S3` HIL endpoint. |
| `data_pipeline/` | **Member 2** | Open STAC (`Sentinel-1/2`, `Landsat 8/9`, `Copernicus DEM`, `VIIRS`) + OSM 3D footprint enrichment for Dubai South & Expo City. |
| `frontend/src/components/DistrictMap/` | **Member 3** | `MapLibre GL JS` 3D extruded district digital twin, 5 EO shader modes, 2019–2026 growth timeline, & orbital scan reticle. |
| `frontend/src/components/HUD/` | **Member 4** | Recycled `Three.js` 3U CubeSat PiP Digital Twin, live CCSDS telemetry HUD, & Closed-Loop Sustainability Prescription Simulator. |
| `contracts/` & `docs/` | **All / Member 5** | Frozen AOI/JSON contracts (`contracts/`) and full Mission Blueprint & Pitch Deck guide (`docs/TEAM_PROMPTS_AND_PLAN.md`). |
