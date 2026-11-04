# MISSION BARJEEL-1430 // LIVE DEMO ARCHITECTURE & OPERATOR WALKTHROUGH
**Interactive 3D Digital Twin & Orbital Edge AI Ground Station**  
**Team**: **Team Hermes 2.0** — BITS Pilani, Dubai Campus  
**Live URL**: [https://barjeel-1430.vercel.app/](https://barjeel-1430.vercel.app/)  
**GitHub Repository**: [https://github.com/AbhishekhVerma/BARJEEL-1430](https://github.com/AbhishekhVerma/BARJEEL-1430)  
**Area of Interest (AOI)**: Dubai South & Expo City Corridor (`145 km²`, 2,150 discrete 3D buildings)

---

## 1. Executive Demo Overview

The BARJEEL-1430 application is not a passive GIS dashboard or a static mockup. It is a **closed-loop cyber-physical system** designed to solve two core aerospace and municipal challenges:
1. **The 14:30 GST Orbital Blindspot**: Conventional sun-synchronous satellites pass at 10:30 AM local time, completely missing peak afternoon urban heat ($+6.8^\circ\text{C}$ hotter at 14:30 GST) when power grids experience maximum chiller stress.
2. **The Satellite Bandwidth Bottleneck**: Downlinking raw multi-spectral imagery over desert landscapes wastes **78.4% of satellite downlink bandwidth** on empty sand and static clouds.

The live application demonstrates the entire loop: **onboard Edge AI filtering in orbit ➔ space-standard CCSDS downlink ➔ physics-constrained TsHARP thermal sharpening ➔ a 60 FPS WebGL 3D twin ➔ municipal permit dispatch and space-audited carbon credits**.

```
┌────────────────────────────────────────────────────────────────────────────────────────────────┐
│  BARJEEL-1430 MISSION HUD (TOP BAR)                                                            │
│  [5 Multi-Spectral Shaders]  │  [Zone Selector]  │  [2019-2026 Timeline Play/Pause]  │ [Basemap]│
├─────────────────────────────────────────────────────────────┬──────────────────────────────────┤
│                                                             │                                  │
│   3D DISTRICT DIGITAL TWIN (MAPLIBRE GL 3D)                 │  PRESCRIPTION & CLOSED-LOOP      │
│   • 2,150 extruded buildings rendered at 60 FPS             │  ORACLE SIMULATOR (RIGHT PANEL)  │
│   • Sun angle lighting + rooftop thermal shaders            │                                  │
│   • Click any building for high-res rooftop diagnostics     │  • Phase Scaling (TRL 7 -> 9)    │
│                                                             │  • Cool Roof Canopy (-2.6°C)     │
│                                                             │  • Shams Solar (2,020 MWp)       │
│                                                             │  • Smart Night Dimming           │
│                                                             │  • Live ROI, Carbon & GeoHub     │
├─────────────────────────────────────────────────────────────┤    Municipal Ticket Dispatch     │
│  ORBITAL TWIN PiP (BOTTOM-LEFT THREE.JS WINDOW)             │                                  │
│  • 3D 3U CubeSat with gold MLI, solar wings & radiator glow │                                  │
│  • Real-time ADCS Quaternions (q0, q1, q2, q3) & Roll/Pitch │                                  │
│  • Live CCSDS 133.0-B-2 Hex Header Stream & 0.52 ms INT8    │                                  │
│  • Edge AI Action: 78.4% Static Sand Dropped vs Alert Sent  │                                  │
└─────────────────────────────────────────────────────────────┴──────────────────────────────────┘
```

---

## 2. Component-by-Component Deep Dive

### A. The 3D District Digital Twin (Center Map Canvas)
- **Engine**: MapLibre GL JS utilizing hardware-accelerated WebGL 3D extrusion layers running smoothly at 60 FPS.
- **Dataset**: **2,150 discrete vector polygons** generated from OpenStreetMap building footprints, Copernicus DEM elevation, Sentinel-2 spectral indices, and Landsat-8/9 thermal radiance (`/data/dubai_south/buildings_3d.geojson`).
- **Interactive Map Controls**:
  - **Left-Click + Drag**: Pan across the Dubai South corridor.
  - **Right-Click + Drag / Ctrl + Drag**: Dynamically adjust camera pitch ($0^\circ$ top-down nadir to $60^\circ$ oblique 3D) and bearing/azimuth.
  - **Scroll Wheel**: Smooth zoom from an orbital overview (500 km altitude) down to individual rooftop inspection.
  - **Satellite Basemap Toggle**: Switches between a deep-space dark mission canvas and high-resolution Esri World Imagery (Maxar/Earthstar Geographics) satellite basemap.
  - **Single-Building Click Inspection**: Clicking any building triggers a smooth camera fly-to, highlights the rooftop in glowing cyan (`#38BDF8`), and opens the **Building Diagnostic Modal** displaying:
    - Unique Building ID & Sub-District Zone.
    - Land-use class (Industrial, Commercial, Logistics, Residential).
    - Physical height ($m$) and usable rooftop surface area ($m^2$).
    - 14:30 GST Land Surface Temperature ($LST_{14:30}$ in °C).
    - InSAR ground subsidence velocity ($mm/yr$) and SAR coherence.
    - Photovoltaic capacity ($kW_p$) and estimated annual clean generation ($kWh/yr$).
    - Tailored physical prescription (e.g. `COOL_ROOF_CANOPY`, `SOLAR_ARRAY`).

---

### B. The 5 Multi-Spectral Earth Observation (EO) Shaders (Top Bar)
Planners and judges can toggle between 5 distinct physical layers to see the district through different satellite instruments:

1. **🔥 14:30 Heat (Landsat-8/9 & Barjeel-TsHARP)** *(Default)*:
   - Visualizes peak daytime heat island stress (14:30 GST).
   - Rooftops are dynamically shaded on a color ramp from cool lavender ($38^\circ\text{C}$) to yellow ($44^\circ\text{C}$) to fiery crimson ($52^\circ\text{C}+$).
   - Demonstrates the **Barjeel-TsHARP algorithm**, which disaggregates coarse 75m thermal pixels into discrete 10m rooftop temperatures using high-resolution Sentinel-2 NDVI and 3D DEM building height boundaries.
2. **☀️ Solar Rooftops (Copernicus DEM & DEWA Shams Dubai)**:
   - Colors rooftops based on their solar photovoltaic potential.
   - High-yield roofs ($>150\text{ kWp}$) glow bright emerald/yellow, identifying prime logistics warehouses ready for Shams Dubai grid interconnection.
3. **📅 Sprawl (Sentinel-2 Temporal Urban Expansion)**:
   - Visualizes the massive construction expansion of Dubai South from **2019 to 2026**.
   - Includes an **interactive timeline slider with an automatic Play/Pause button** that animates urban sprawl year-by-year at 1.2-second intervals.
4. **📉 InSAR Subsidence (Sentinel-1 SAR Interferometry)**:
   - Displays vertical millimetric ground movement ($-6.0\text{ mm/yr}$ red subsidence to $+1.0\text{ mm/yr}$ stable green).
   - Monitors geotechnical integrity along heavy logistics freight routes and runways at Al Maktoum International Airport.
5. **🌙 Night Waste (VIIRS Day-Night Band)**:
   - Renders nocturnal stray light radiance (purple-to-cyan glow).
   - Highlights empty logistics lots and un-dimmed commercial facilities that waste electricity after operating hours.

---

### C. The Orbital Twin PiP (Bottom-Left Three.js Window)
A high-fidelity Picture-in-Picture window demonstrating the spaceborne segment in real time:

- **3U CubeSat Spacecraft Model**:
  - Modeled in Three.js with gold Multi-Layer Insulation (MLI), deployable photovoltaic solar wings, nadir LWIR thermal sensor, and UHF antenna.
  - **Dynamic Thermal Glow**: The thermal radiator plate's emissivity changes dynamically from cold indigo to glowing amber/red as onboard sensor temperature fluctuates.
- **Attitude Determination & Control System (ADCS) HUD**:
  - Live 3D quaternion rotation based on telemetry quaternion components ($\mathbf{q} = [q_0, q_1, q_2, q_3]$).
  - Tickers real-time **Roll, Pitch, and Yaw** in degrees.
  - Indicates `NADIR_LOCKED` pointing status.
- **CCSDS 133.0-B-2 Space Packet Stream**:
  - Displays the live 6-byte hexadecimal primary header parsed byte-by-byte:
    - Version Number (`000b`)
    - Type (`0` = Telemetry)
    - Secondary Header Flag (`1`)
    - Application Process ID (APID `0x099` for priority thermal alerts; `0x001` for spacecraft health)
    - Sequence Flags (`11b` unsegmented) & Packet Sequence Counter
    - Packet Data Length
- **Onboard Edge AI Inference & 78.4% Bandwidth Filter**:
  - Tickers the current ground track waypoint, predicted land cover (e.g. `Industrial 98%`), and inference speed (**`0.52 ms`** on MobileNetV3 INT8).
  - Demonstrates onboard decision logic:
    - **`DROP_STATIC_DESERT`**: When passing over empty sand or cloud, the frame is dropped onboard, saving RF power (`0 Watts RF emitted`).
    - **`DOWNLINK_PRIORITY_ALERT`**: When a high-heat anomaly or urban change is detected, a priority alert is framed and queued for immediate downlink.

---

### D. The Prescription & Closed-Loop Oracle Simulator (Right Panel)
Demonstrates the transformation of orbital data into actionable municipal climate governance:

- **Mission Phase Scaling**:
  - *Phase 1 (TRL 7)*: STAC Cloud Pilot (historical Sentinel/Landsat ingest).
  - *Phase 2 (Flight Demo)*: Dedicated BARJEEL-1430 3U CubeSat at 14:30 GST orbit.
  - *Phase 3 (Constellation)*: 12-CubeSat GCC Net-Zero Constellation with 30-min revisit cadence.
- **Target Zone Selector**:
  - Focuses calculations on specific corridors: *All Dubai South Corridor (2,150 buildings)*, *Expo City*, *Logistics Solar Mega-Roof*, *Residential Heat Hotspot*, or *Al Maktoum Apron Infra*.
- **Cyber-Physical Prescription Toggles**:
  - **☀️ Deploy Shams Solar Arrays**: Simulates installing rooftop PV across eligible structures, unlocking up to **`2,020 MWp`** clean generation across the full corridor.
  - **❄️ Apply Cool-Roof High-Albedo Canopy**: Simulates applying high-reflectance reflective coating to building roofs, dropping surface temperature by **`-2.6°C`** and shaving **`18.5%`** off daytime chiller AC power consumption.
  - **💡 Smart Night Dimming**: Simulates automated scheduling of external lighting, reducing nighttime grid waste.
- **Real-Time Economic & Climate Impact Engine**:
  - Computes instantaneous **Annual Energy Savings** (AED Millions/yr).
  - Computes **Capital Payback Period** (Years).
  - Computes **Carbon Abatement** ($t\text{CO}_2/\text{yr}$ avoided).
- **🚀 Dispatch GeoHub Municipal Permits Button**:
  - Generates automated work orders for Dubai Municipality GeoHub.
  - Schedules **Pass 2 Satellite Auditing**: when the CubeSat flies over on its next afternoon pass, it measures actual empirical $\Delta\text{LST}$ drops to certify **Space-Verified Carbon Credits (SV-CC)**, preventing greenwashing.

---

## 3. Dual-Mode Telemetry Stream Architecture

The live demo features a fail-proof **Dual-Mode Telemetry Stream**:

```
                       ┌───────────────────────────────┐
                       │   Client Application (App)    │
                       └──────────────┬────────────────┘
                                      │
                         Attempt ws://localhost:8000
                                      │
                    ┌─────────────────┴─────────────────┐
                    │                                   │
             Connected? [YES]                    Connected? [NO]
                    │                                   │
         ▼                      ▼
┌───────────────────────────────┐   ┌───────────────────────────────┐
│ LOCAL HARDWARE / SIM MODE     │   │ AUTONOMOUS CLOUD VERCEL MODE  │
│                               │   │                               │
│ • Live FastAPI WebSocket      │   │ • Client-side 1 Hz generator  │
│ • Physical ESP32-S3 HIL over  │   │ • Real orbit propagation over │
│   USB Serial (`ESP32_S3_HIL`) │   │   Dubai South waypoints       │
│ • Onboard ONNX INT8 classifier│   │ • True CCSDS 133.0-B-2 hex    │
│ • Cyan/Green Telemetry Badge  │   │ • Zero server dependencies    │
└───────────────────────────────┘   └───────────────────────────────┘
```

1. **Local Mode (Live Hardware & Python OBC)**:
   - When running on a presentation laptop with `python start_barjeel.py`, the frontend connects to `ws://localhost:8000/ws/telemetry`.
   - If an **ESP32-S3 microcontroller** is plugged into USB, it receives real-world attitude sensor data over serial (`COM3`), lighting up the green `[ESP32_S3_HIL]` badge.
2. **Cloud Mode (Vercel Standalone)**:
   - When judges open [https://barjeel-1430.vercel.app/](https://barjeel-1430.vercel.app/) on their phones, iPads, or laptops, the app automatically switches to the built-in **Synthetic Orbital Telemetry Engine** (`[FRONTEND_FALLBACK]`).
   - The CubeSat animates, CCSDS packets stream at 1 Hz, waypoints advance over Dubai South, and all shaders, building clicks, and prescription simulations run with zero latency directly in their mobile browser.

---

## 4. Presenter Demo Script (Speaker 3: Abhishekh Verma [2:30–3:50])

Use this exact sequence of actions during your 80-second live prototype demo:

| Timestamp | Verbal Talking Points | Action on Screen |
| :--- | :--- | :--- |
| **2:30 – 2:45** | *"Judges, what you see on screen is our live, functioning digital twin mapping 2,150 discrete 3D buildings across the entire 145 km² Dubai South corridor."* | Pan and rotate the 3D map slightly using right-click to show the 3D building heights and sun lighting. |
| **2:45 – 3:05** | *"In the bottom-left PiP, our 3U CubeSat streams real-time CCSDS 133.0-B-2 space packets. Notice our onboard MobileNetV3 INT8 filter running in 0.52 ms—dropping 78.4% of empty desert frames and downlinking only priority heat alerts."* | Point to the 3D CubeSat rotating in the bottom-left, the changing CCSDS hex header, and the `0.52 ms` inference latency badge. |
| **3:05 – 3:25** | *"Planners can instantly toggle between multi-spectral satellite layers: from 14:30 peak thermal stress, to solar rooftop potential, to construction sprawl timelines, and millimeter InSAR ground subsidence."* | Click **"☀️ Solar Rooftops"** to see buildings turn green/yellow, then click **"📅 Sprawl"** and press Play to show construction growth. |
| **3:25 – 3:50** | *"Clicking any building flies us to the rooftop, revealing solar yield and cooling prescriptions. In the right panel, toggling cool-roof coatings shaves 18.5% off peak chiller loads and unlocks 2,020 MWp of solar—with automated GeoHub permit dispatch. I'll now hand over to Vrushank to cover impact."* | Click an industrial building in the center, toggle **"Apply Cool-Roof Canopy"** in the right panel, and click **"Dispatch GeoHub Permits"**. |

---

*Mission BARJEEL-1430 · Team Hermes 2.0 · BITS Pilani, Dubai Campus*
