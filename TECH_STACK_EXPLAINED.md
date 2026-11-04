# MISSION BARJEEL-1430 // SLIDE 6 TECH STACK EXPLAINED IN LAYMAN'S TERMS
**The Plain-English Guide to All 16 Aerospace & Software Building Blocks**  
**Team**: **Team Hermes 2.0** — BITS Pilani, Dubai Campus  
**Slide Referenced**: [Slide 6: Built With](file:///C:/Users/abhis/Downloads/BARJEEL_1430_FINAL_SUBMISSION/SLIDE_PREVIEWS/Slide6.PNG)  
**Presenter**: Speaker 3 (Abhishekh Verma) & Speaker 4 (Vrushank Tipnis)

---

## Quick Summary Architecture Matrix

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ 1. FRONTEND:        [ React 19 + TS ]    [ MapLibre GL 3D ]   [ Three.js CubeSat ]  [ Tailwind CSS v4 ] │
│ 2. BACKEND:         [ FastAPI Async ]    [ CCSDS 133.0-B-2 ]  [ CCITT CRC-16 ]      [ 1 Hz WebSocket ]  │
│ 3. DATA AND AI:     [ MobileNetV3 INT8 ] [ TsHARP Inversion ] [ Sentinel-1/2 + L8 ] [ DEM + VIIRS STAC]│
│ 4. INFRASTRUCTURE:  [ ESP32-S3 HIL ]     [ USB Serial Bridge] [ 43/43 E2E Tests ]   [ Zero-Key GeoJSON ]│
└─────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Tier 1: Frontend (The Visual Cockpit)

### 1. `React 19 + TS` (React 19 with TypeScript)
- **What it is in plain English**: The engine that powers the website UI. Think of it as the smart dashboard of a modern electric car.
- **Everyday Analogy**: It’s like Lego blocks with a built-in spellchecker. React creates the interactive buttons, sliders, and panels, while TypeScript enforces strict grammar rules so the app never crashes from typos or missing data.
- **Why we use it in BARJEEL**: It handles rapid data updates (space packets, building clicks, shader toggles) instantly without reloading the browser page.
- **10-Second Judge Defense**: *"React 19 gives us zero-lag UI reactivity, while TypeScript guarantees strict type safety between our aerospace telemetry contracts and the 3D map."*

---

### 2. `MapLibre GL 3D`
- **What it is in plain English**: The 3D map engine that displays the city.
- **Everyday Analogy**: Like the 3D graphics engine inside a flight simulator or Google Earth, but running smoothly inside a web browser.
- **Why we use it in BARJEEL**: Instead of showing a flat 2D map, it uses the user's computer graphics card (GPU) to extrude all **2,150 buildings in Dubai South** as real 3D structures with realistic sun lighting, shadows, and rooftop angles.
- **10-Second Judge Defense**: *"MapLibre GL renders 2,150 buildings as hardware-accelerated 3D extrusions at a locked 60 frames per second directly in WebGL."*

---

### 3. `Three.js CubeSat`
- **What it is in plain English**: The 3D animation engine that renders our satellite in the bottom-left window.
- **Everyday Analogy**: Like a miniature 3D video game character. When the satellite in space turns, this 3D model turns at the exact same angle on screen.
- **Why we use it in BARJEEL**: It renders our 3U CubeSat with gold thermal insulation, solar wings, and a glowing heat radiator that shifts color as the satellite heats up or cools down in orbit.
- **10-Second Judge Defense**: *"Three.js translates raw 4-dimensional quaternion telemetry ($q_0, q_1, q_2, q_3$) into a live, physically accurate 3D orientation of the CubeSat in orbit."*

---

### 4. `Tailwind CSS v4`
- **What it is in plain English**: The styling and cosmetic design system.
- **Everyday Analogy**: The interior design and color palette of a spacecraft mission control room.
- **Why we use it in BARJEEL**: It allows us to build a custom, ultra-modern aerospace aesthetic—deep space violet (`#1E1538`), neon cyan, and glowing amber telemetry badges—that automatically resizes cleanly on phone, tablet, and projector screens.
- **10-Second Judge Defense**: *"Tailwind v4 provides a zero-runtime CSS design token system matching the exact deep-space competition palette across all screen sizes."*

---

## Tier 2: Backend (The Space Communications Gateway)

### 5. `FastAPI Async`
- **What it is in plain English**: The fast server that handles data requests and connects the satellite to the web app.
- **Everyday Analogy**: An ultra-fast air traffic controller that can talk to thousands of airplanes at the same time without making anyone wait in line.
- **Why we use it in BARJEEL**: Python is the global language of satellite data and AI. FastAPI lets our backend run AI models, parse satellite telemetry, and feed web clients asynchronously in microseconds.
- **10-Second Judge Defense**: *"FastAPI provides asynchronous, non-blocking Python performance capable of streaming real-time orbital telemetry while executing onboard AI routines."*

---

### 6. `CCSDS 133.0-B-2`
- **What it is in plain English**: The official international language for satellite communications.
- **Everyday Analogy**: Like maritime Morse code or air-traffic radio standards. Every space agency in the world (NASA, ESA, Mohammed Bin Rashid Space Centre) mandates this standard format so satellites and ground stations can understand each other.
- **Why we use it in BARJEEL**: Instead of sending random JSON text over space radio, we pack our telemetry into real 6-byte hexadecimal headers conforming to the official space standard.
- **10-Second Judge Defense**: *"We don't use toy mock formats. We encapsulate all priority thermal anomalies into standard CCSDS 133.0-B-2 primary space packets with APID 0x099."*

---

### 7. `CCITT CRC-16`
- **What it is in plain English**: A mathematical error-checking checksum.
- **Everyday Analogy**: Like the security seal on a medicine bottle. If space radiation or radio static flips a single bit during transmission from orbit, this math formula detects that the message was damaged and rejects it.
- **Why we use it in BARJEEL**: Space radios are noisy. CRC-16 guarantees that ground controllers never act on corrupted thermal data or false emergency alerts.
- **10-Second Judge Defense**: *"We implement the CCITT CRC-16 polynomial ($0x1021$) to ensure bit-level telemetry integrity against radiation single-event upsets in LEO."*

---

### 8. `1 Hz WebSocket`
- **What it is in plain English**: A live, non-stop telephone line between the satellite server and the browser.
- **Everyday Analogy**: Like a live phone call instead of sending letters back and forth. The server pushes an update once every second (1 Hz) without the browser having to ask *"is there new data yet?"*.
- **Why we use it in BARJEEL**: It keeps the 3D satellite model rotating smoothly and keeps the ground track advancing across Dubai South in real time.
- **10-Second Judge Defense**: *"A persistent, full-duplex WebSocket pushes live 1 Hz telemetry frames with sub-5ms local latency directly to the React mission HUD."*

---

## Tier 3: Data and AI (The Orbital Brain & Physics Engine)

### 9. `MobileNetV3 INT8`
- **What it is in plain English**: A tiny, hyper-compressed artificial intelligence model running on the satellite.
- **Everyday Analogy**: Imagine taking a heavy 50-pound textbook and summarizing it into a 3-page pocket cheat-sheet without losing any important knowledge.
- **Why we use it in BARJEEL**: Spacecraft computers have very little power (usually under 5 Watts). We converted the neural network from 32-bit floating point down to 8-bit integers (`INT8`). It runs in **0.52 milliseconds**—fast enough to drop 78.4% of boring desert images before wasting radio power.
- **10-Second Judge Defense**: *"We quantized MobileNetV3 to mixed-precision INT8 using ONNX Runtime, preserving 95.73% land-cover accuracy while slashing inference time to just 0.52 ms."*

---

### 10. `TsHARP Inversion` (Thermal Sharpening)
- **What it is in plain English**: An algorithm that turns blurry thermal photos into sharp rooftop temperatures.
- **Everyday Analogy**: Like wearing reading glasses. A CubeSat's thermal camera only sees a blurry 75-meter blob (an entire city block). TsHARP combines that blob with sharp 10-meter camera photos and building geometry to figure out the temperature of each roof ($\pm 1.2^\circ\text{C}$).
- **Why we use it in BARJEEL**: Without TsHARP, a 3U CubeSat could never tell which specific warehouse needs cool-roof paint. TsHARP solves optical diffraction using surface energy balance physics.
- **10-Second Judge Defense**: *"TsHARP solves a physics-constrained surface energy balance equation, disaggregating diffraction-limited 75m thermal pixels onto 10m discrete building polygons."*

---

### 11. `Sentinel-1/2 + L8` (Sentinel-1, Sentinel-2, Landsat-8/9)
- **What it is in plain English**: The real satellite constellations feeding our training data and baseline rasters.
- **Everyday Analogy**: The master reference library.
  - **Sentinel-2**: High-res optical color camera (shows trees, asphalt, concrete).
  - **Landsat-8/9**: High-accuracy thermal sensor (shows surface temperature).
  - **Sentinel-1**: Radar satellite (sees through clouds and measures ground sinking).
- **Why we use it in BARJEEL**: It grounds our digital twin in verified scientific measurements from NASA and the European Space Agency.
- **10-Second Judge Defense**: *"We harmonize multi-mission Earth observation data: Sentinel-2 optical bands for albedo, Landsat-8/9 TIRS for baseline LST, and Sentinel-1 SAR for ground subsidence."*

---

### 12. `DEM + VIIRS STAC`
- **What it is in plain English**: 3D elevation maps + night-light satellite sensors accessed through an open cloud catalogue.
- **Everyday Analogy**:
  - **DEM (Digital Elevation Model)**: A 3D topographical clay model of the terrain and building heights.
  - **VIIRS**: A camera so sensitive it photographs city lights at midnight from space.
  - **STAC (SpatioTemporal Asset Catalog)**: The search engine that lets our software find and download satellite tiles automatically by latitude and longitude.
- **Why we use it in BARJEEL**: DEM tells us the tilt and area of each roof for solar panels; VIIRS identifies empty warehouses wasting electricity on outdoor floodlights at night.
- **10-Second Judge Defense**: *"We use Copernicus 30m DEM for solar irradiance geometry and VIIRS Day-Night Band via STAC API to detect nocturnal urban energy waste."*

---

## Tier 4: Infrastructure (The Hardware & Reliability Rig)

### 13. `ESP32-S3 HIL` (Hardware-in-the-Loop)
- **What it is in plain English**: A real physical microchip on the presenter's desk acting as the satellite's flight computer.
- **Everyday Analogy**: Instead of just running computer code on a laptop, you connect a real physical black-box chip (the same kind used in real aerospace prototypes) via USB cable to prove your code works on real hardware.
- **Why we use it in BARJEEL**: It proves to the judges that this is not a mock design; our software runs on actual embedded silicon.
- **10-Second Judge Defense**: *"Our ESP32-S3 microcontroller runs in a Hardware-in-the-Loop testbed over USB serial, proving our C&DH software runs on flight-representative embedded silicon."*

---

### 14. `USB Serial Bridge`
- **What it is in plain English**: The physical communication cord between the microchip and the laptop.
- **Everyday Analogy**: The umbilical cord that plugs into an astronaut's suit before launch to test life support systems.
- **Why we use it in BARJEEL**: It streams live sensor readings (temperature, gyro orientation) from the physical ESP32 chip straight into the web dashboard at 115,200 baud.
- **10-Second Judge Defense**: *"The USB Serial Bridge creates a low-overhead serial link streaming binary telemetry frames directly from physical microcontroller registers to our FastAPI server."*

---

### 15. `43/43 E2E Tests` (End-to-End Test Suite)
- **What it is in plain English**: 43 automated robotic inspections that test every part of our project to prove nothing is broken.
- **Everyday Analogy**: The 43-point pre-flight checklist a pilot goes through before takeoff (flaps working, fuel pressure good, radio clear).
- **Why we use it in BARJEEL**: It guarantees our demo will not freeze or glitch during the live presentation in front of the judges.
- **10-Second Judge Defense**: *"Our automated test suite runs 43 rigorous tests—validating bit-exact CCSDS CRC-16 checksums, INT8 ONNX inference bounds, and GeoJSON schema integrity."*

---

### 16. `Zero-Key GeoJSON`
- **What it is in plain English**: The spatial map file format that needs zero passwords, zero API keys, and zero paid cloud subscriptions.
- **Everyday Analogy**: An open-source PDF or image file. Anyone can open it on any device without paying Adobe or signing into an account.
- **Why we use it in BARJEEL**: Most mapping tools require expensive Mapbox tokens that fail if the credit card expires or internet disconnects. Our entire 2,150-building digital twin is stored locally in standard open GeoJSON, so the demo runs 100% offline or on Vercel with zero chance of an API lock.
- **10-Second Judge Defense**: *"All 2,150 building geometries and multi-spectral attributes are bundled into static, zero-key GeoJSON, ensuring 100% offline presentation reliability."*

---

*Mission BARJEEL-1430 · Team Hermes 2.0 · BITS Pilani, Dubai Campus*
