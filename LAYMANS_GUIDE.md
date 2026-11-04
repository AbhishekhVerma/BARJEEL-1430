# MISSION BARJEEL-1430 // THE PLAIN-ENGLISH COMPANION GUIDE
**Everything You Need to Know About the Project & Pitch in Layman's Terms**  
**Team**: **Team Hermes 2.0** — BITS Pilani, Dubai Campus  
**Presenters**: Kapish Roy, Bhavya Sri Chinnamsetty, Abhishekh Verma, Vrushank Tipnis, Sivani Ajay  
**Live Demo**: [https://barjeel-1430.vercel.app/](https://barjeel-1430.vercel.app/)  
**GitHub**: [https://github.com/AbhishekhVerma/BARJEEL-1430](https://github.com/AbhishekhVerma/BARJEEL-1430)  

---

## 1. The Core Idea in 30 Seconds: What is a "Barjeel"?

Centuries ago, long before air conditioning or electricity existed in the Arabian Gulf, Emirati builders designed the **Barjeel** (the traditional architectural wind-tower you see in historic Dubai). It stood tall above houses to catch the cool desert breeze and funnel it straight down into courtyards to naturally cool families.

**Our project does the exact same thing, but from outer space.**  
Instead of catching desert wind, our satellite captures **space data and urban heat** from orbit, sharpens it down to individual building rooftops in Dubai South, and tells the city exactly where to install solar panels and reflective cool-roof coatings so we don't cook our cities or waste billions of dirhams on air conditioning.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│  THE HISTORIC BARJEEL (PAST)                 │  MISSION BARJEEL-1430 (TODAY)           │
│  Harnessed cool desert winds from above      │  Harnesses Earth observation from orbit │
│  Cooled courtyards naturally                 │  Cools 2,150 modern urban buildings     │
│  Zero electricity, pure architecture         │  Autonomous Edge AI + 3D Digital Twin   │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. The Two Huge Problems (Why Existing Satellites Fail)

### Problem 1: Satellites Take Photos at the Wrong Time of Day
- Big government satellites like NASA’s Landsat or Europe’s Sentinel pass over the UAE at around **10:30 AM**.
- At 10:30 AM, Dubai is warm, but it hasn't reached peak heat yet.
- The **real heat crisis strikes at 2:30 PM (14:30 GST)**—when the sun has baked asphalt highways and warehouse roofs for hours, temperatures climb to $50^\circ\text{C}$ to $52^\circ\text{C}$, and air conditioning chillers are drawing maximum electricity from the power grid.
- **The Result**: Conventional satellites are completely blind to the hottest, most dangerous hour of the day.

### Problem 2: Satellites Waste Battery Sending "Boring" Sand
- Traditional Earth observation satellites take hundreds of gigabytes of photos and try to beam everything down to ground stations.
- But 80% of the desert terrain is empty yellow sand or cloud cover!
- Satellites drain their onboard batteries, waste radio bandwidth, and clog cloud storage beaming down gigabytes of pictures where nothing is happening.

---

## 3. How BARJEEL-1430 Solves This (The 4 Simple Steps)

```
[ IN ORBIT: 2:30 PM ]                [ SATELLITE DOWNLINK ]                [ ON THE GROUND ]                [ CITY ACTION ]
  3U Small Satellite                   Compact Space Packet                   TsHARP Algorithm                 Dubai Municipality
  Filters empty sand                   Alerts sent in under                  Sharpens 75m blur                Sends work orders &
  using onboard AI                       90 minutes                            into 10m roofs                   checks cooling next pass
        │                                    │                                      │                                 │
        ▼                                    ▼                                      ▼                                 ▼
   Step 01: SENSE                       Step 02: BEAM                          Step 03: SHARPEN                  Step 04: FIX & VERIFY
```

### Step 01: Put an AI Bouncer on the Satellite
Instead of blindly beaming every photo back to Earth, we put a lightweight artificial intelligence model right on the satellite's flight computer:
- If the camera sees empty sand or clouds, the AI immediately discards it: *"Throw it away, don't waste battery transmitting this."* (This saves **78.4% of downlink bandwidth**).
- If it sees a city, a sudden heat anomaly, or rapid building construction, it flags it: *"Alert! Beam this down right now!"*

### Step 02: Send Down a Lightweight Alert (CCSDS Protocol)
Instead of sending heavy raw picture files that take hours to downlink, the satellite packages the alert into a standardized space packet that reaches ground stations in **under 90 minutes** (instead of the usual 3 to 6 weeks it takes for satellite data to be processed).

### Step 03: Turn a Blurry 75-Meter Heat Smudge into Sharp 10-Meter Roofs (Barjeel-TsHARP)
- Because small CubeSats have compact lenses, thermal infrared photos from orbit are blurry. A single thermal pixel covers 75 meters (an entire city block). You can’t tell which specific warehouse is overheating!
- Our software mathematically fuses that blurry thermal picture with high-resolution 10-meter satellite camera photos and 3D building heights.
- It calculates the temperature of **each individual building's roof** with $\pm 1.2^\circ\text{C}$ accuracy.

### Step 04: The Closed Loop (Fixing the Problem, Not Just Showing a Map)
Most satellite projects stop at creating a pretty dashboard that sits unused in a municipal archive. **We close the loop**:
1. Our system automatically drafts an actionable work order for Dubai Municipality (e.g., *"Warehouse #412 is hitting 52°C; dispatch reflective cool-roof coating"*).
2. City contractors apply high-albedo reflective coating to the roof.
3. When our satellite flies over on its next afternoon pass, it checks the building from orbit. If the temperature dropped by $2.6^\circ\text{C}$, it proves the fix worked and unlocks certified carbon credits!

---

## 4. What Everything in the Live Demo Does (Button by Button)

When you open [https://barjeel-1430.vercel.app/](https://barjeel-1430.vercel.app/):

### The 3D City Map (Center Screen)
- **2,150 3D Buildings**: Every structure in Dubai South (from Expo City down to Al Maktoum Airport) is rendered in 3D.
- **Click any building**: The camera zooms right to it, highlights its roof in glowing cyan, and reveals:
  - How tall it is and how large its roof is.
  - Exactly how hot it gets at 2:30 PM.
  - How many solar panels you can fit on it.
  - What prescription it needs (e.g., Cool-Roof coating or Solar PV).

### The 5 Color Shaders (Top Bar)
1. **🔥 14:30 Heat**: Colors buildings based on how hot they get in the afternoon (yellow = warm, red/purple = extreme heat island).
2. **☀️ Solar Rooftops**: Colors buildings based on solar power potential (bright green/yellow = massive warehouse roofs perfect for DEWA Shams solar).
3. **📅 Sprawl Timeline**: Shows how Dubai South expanded between 2019 and 2026. Click **Play** to watch the city grow year-by-year!
4. **📉 InSAR Subsidence**: Shows if the ground is sinking or shifting by millimeters near the airport runways or freight railways (red = sinking, green = stable).
5. **🌙 Night Waste**: Highlights which logistics facilities leave exterior lights blazing all night when no one is there.

### The Little Satellite (Bottom-Left Window)
- A 3D digital twin of our **3U CubeSat** flying in space.
- The numbers showing $q_0, q_1, q_2, q_3$ are its real-time 3D rotation angles in orbit.
- The text ticker displays live space radio packets being beamed down.
- Notice the **0.52 ms** tag: that’s how fast our onboard AI scans each image patch—faster than the blink of an eye.

### The Control Panel on the Right (The Money & Climate Engine)
- **Flip the "Apply Cool-Roof Canopy" switch**: Simulates painting roofs with reflective coating across Dubai South. Watch the temperature drop by **`-2.6°C`** and air conditioning electricity drop by **`18.5%`**.
- **Flip the "Deploy Shams Solar" switch**: Calculates how much clean electricity those roofs could generate (**2,020 Megawatts**—enough to power hundreds of thousands of homes).
- **"Dispatch GeoHub Permits" Button**: Simulates sending official work orders directly to Dubai Municipality.

---

## 5. The 6-Minute Pitch Breakdown (Who Says What)

| Speaker | Time | Simple Role | The Plain-English Narrative |
| :--- | :--- | :--- | :--- |
| **1. Kapish Roy** | `0:00 – 1:20` | **The Hook & The Problem** | *"Good morning, esteemed judges. We are Team Hermes 2.0 from BITS Pilani Dubai. In the UAE, heat peaks at 2:30 PM, but today’s satellites pass at 10:30 AM and miss it completely. Worse, they waste 78% of their battery beaming pictures of empty desert sand. We built BARJEEL-1430 to fix this."* |
| **2. Bhavya Sri Chinnamsetty** | `1:20 – 2:30` | **The Solution & 4 Steps** | *"Our solution is a complete loop from space to street: an AI filter in orbit that drops sand and keeps alerts, a formula that sharpens blurry thermal pixels to individual roofs, and a 3D digital twin that sends work orders to Dubai Municipality."* |
| **3. Abhishekh Verma** | `2:30 – 3:50` | **The Live Demo on Screen** | *"This isn't a slide; this is our real working software. You're looking at 2,150 buildings in Dubai South. In the bottom corner, our satellite is streaming real space packets. I can click any warehouse to inspect its roof heat, or toggle solar potential and sprawl timelines live on stage."* |
| **4. Vrushank Tipnis** | `3:50 – 6:00` | **The Impact, Future & Finish** | *"The numbers are huge: 2,020 Megawatts of solar potential and a 2.6°C temperature drop that cuts chiller loads by 18.5%. Best of all, we measure the cooling from orbit to prove real carbon cuts under UAE Net Zero 2050. Just like the historic Barjeel cooled homes centuries ago, BARJEEL-1430 brings that heritage to space."* |

---

## 6. Why This Pitch Wins

Judges see many student hackathon projects that are just *"we downloaded satellite data and made a pretty map."*  
**BARJEEL-1430 wins because:**
1. **It solves real orbital physics**: You addressed orbital timing (14:30 LTAN sun-synchronous pass) and optical diffraction (TsHARP sharpening).
2. **It saves onboard spacecraft resources**: The AI drops 78.4% of empty sand before wasting radio transmission power.
3. **It connects to real municipal initiatives**: DEWA Shams Dubai, Dubai Municipality GeoHub, and UAE Net Zero 2050.
4. **It is closed-loop**: You don't just point out where it's hot—you issue the permit, verify the cooling on the next satellite pass, and audit real carbon credits.

---

*Mission BARJEEL-1430 · Team Hermes 2.0 · BITS Pilani, Dubai Campus*
