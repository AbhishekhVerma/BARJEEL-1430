"""
Deterministic starter generator for Mission BARJEEL-1430.
Creates:
1. frontend/public/data/dubai_south/buildings_3d.geojson (180 realistic 3D polygons across the 4 Dubai South & Expo City zones)
2. frontend/public/data/dubai_south/district_summary.json
3. backend/data/s2_patches/*.png (24 synthetic Sentinel-2 64x64 RGB patches for immediate Edge AI testing until Member 2 drops real STAC patches)
"""

import json
import math
import random
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
GEOJSON_OUT = ROOT / "frontend" / "public" / "data" / "dubai_south" / "buildings_3d.geojson"
SUMMARY_OUT = ROOT / "frontend" / "public" / "data" / "dubai_south" / "district_summary.json"
PATCHES_DIR = ROOT / "backend" / "data" / "s2_patches"

ZONES = [
    {
        "id": "expo-core",
        "prefix": "Expo Pavilion",
        "center": (55.1510, 24.9600),
        "spread": (0.012, 0.010),
        "count": 45,
        "height_range": (14.0, 38.0),
        "size_deg": (0.00055, 0.00095),
        "land_use": "Commercial",
        "years": [2019, 2020, 2021, 2022],
        "lst_range": (38.2, 42.6),
        "sub_range": (-1.1, -0.2),
        "viirs_range": (22.0, 48.0),
        "prescriptions": ["SOLAR_ARRAY", "SMART_DIMMING"],
    },
    {
        "id": "logistics-mega",
        "prefix": "Logistics Mega-Hub",
        "center": (55.1680, 24.9180),
        "spread": (0.018, 0.012),
        "count": 50,
        "height_range": (11.0, 19.0),
        "size_deg": (0.00095, 0.00180),
        "land_use": "Industrial",
        "years": [2019, 2020, 2021, 2022, 2023, 2024, 2025],
        "lst_range": (45.2, 49.6),
        "sub_range": (-2.6, -0.6),
        "viirs_range": (34.0, 68.0),
        "prescriptions": ["SOLAR_AND_COOL_ROOF", "SOLAR_ARRAY"],
    },
    {
        "id": "residential-growth",
        "prefix": "South Residence Block",
        "center": (55.2050, 24.9420),
        "spread": (0.016, 0.013),
        "count": 55,
        "height_range": (16.0, 52.0),
        "size_deg": (0.00045, 0.00080),
        "land_use": "Residential",
        "years": [2021, 2022, 2023, 2024, 2025, 2026],
        "lst_range": (44.0, 48.8),
        "sub_range": (-2.2, -0.5),
        "viirs_range": (28.0, 58.0),
        "prescriptions": ["COOL_ROOF_CORRIDOR", "SOLAR_AND_COOL_ROOF", "SMART_DIMMING"],
    },
    {
        "id": "aviation-infra",
        "prefix": "Al Maktoum Concourse Infra",
        "center": (55.1650, 24.9020),
        "spread": (0.020, 0.008),
        "count": 30,
        "height_range": (12.0, 28.0),
        "size_deg": (0.00080, 0.00150),
        "land_use": "Highway",
        "years": [2019, 2020, 2022, 2024, 2025, 2026],
        "lst_range": (45.5, 49.9),
        "sub_range": (-5.1, -2.1),
        "viirs_range": (45.0, 82.0),
        "prescriptions": ["GEOTECH_AUDIT", "SOLAR_AND_COOL_ROOF"],
    },
]


def make_rect_polygon(cx: float, cy: float, w: float, h: float, angle_deg: float):
    rad = math.radians(angle_deg)
    cos_a, sin_a = math.cos(rad), math.sin(rad)
    corners = [(-w / 2, -h / 2), (w / 2, -h / 2), (w / 2, h / 2), (-w / 2, h / 2)]
    ring = []
    for dx, dy in corners:
        rx = dx * cos_a - dy * sin_a
        ry = dx * sin_a + dy * cos_a
        ring.append([round(cx + rx, 6), round(cy + ry, 6)])
    ring.append(ring[0])
    return ring


def write_ppm_or_png_patches():
    """Write lightweight 64x64 valid PNG files using pure Python zlib/struct (zero dependencies!)."""
    import struct
    import zlib

    PATCHES_DIR.mkdir(parents=True, exist_ok=True)
    presets = [
        ("Industrial", (195, 190, 185), 24.918, 55.168),
        ("Residential", (175, 155, 140), 24.942, 55.205),
        ("Highway", (110, 112, 118), 24.902, 55.165),
        ("BareDesert", (218, 192, 148), 24.895, 55.225),
        ("BareDesert", (222, 198, 152), 24.970, 55.230),
        ("BareDesert", (215, 188, 142), 24.930, 55.128),
        ("HerbaceousVegetation", (85, 138, 78), 24.960, 55.151),
        ("CloudCover", (242, 245, 248), 24.950, 55.180),
    ]

    def save_png(path: Path, width: int, height: int, rgb_rows: list[bytes]):
        def chunk(tag: bytes, data: bytes) -> bytes:
            return (
                struct.pack("!I", len(data))
                + tag
                + data
                + struct.pack("!I", zlib.crc32(tag + data) & 0xFFFFFFFF)
            )

        raw = b"".join(b"\x00" + row for row in rgb_rows)
        ihdr = struct.pack("!IIBBBBB", width, height, 8, 2, 0, 0, 0)
        png = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) + chunk(b"IDAT", zlib.compress(raw)) + chunk(b"IEND", b"")
        path.write_bytes(png)

    for idx in range(24):
        cls_name, base_rgb, base_lat, base_lon = presets[idx % len(presets)]
        lat = round(base_lat + random.uniform(-0.008, 0.008), 4)
        lon = round(base_lon + random.uniform(-0.008, 0.008), 4)
        rows = []
        for y in range(64):
            row = bytearray()
            for x in range(64):
                stripe = 18 if (cls_name in ("Industrial", "Residential") and (x % 12 < 6) and (y % 12 < 6)) else 0
                noise = random.randint(-10, 10)
                for c in base_rgb:
                    row.append(max(0, min(255, c + stripe + noise)))
            rows.append(bytes(row))
        fname = f"S2_{idx:02d}_{lat}_{lon}_{cls_name}.png"
        save_png(PATCHES_DIR / fname, 64, 64, rows)


def main():
    random.seed(1430)
    features = []
    bldg_idx = 1000
    total_area = 0.0
    total_kwp = 0.0
    total_kwh = 0.0
    lst_vals = []
    hotspots = 0
    sub_watch = 0

    for zone in ZONES:
        zx, zy = zone["center"]
        sx, sy = zone["spread"]
        for i in range(zone["count"]):
            bldg_idx += 1
            cx = zx + random.uniform(-sx, sx)
            cy = zy + random.uniform(-sy, sy)
            w_deg = random.uniform(*zone["size_deg"])
            h_deg = random.uniform(*zone["size_deg"]) * random.uniform(0.6, 1.3)
            poly = make_rect_polygon(cx, cy, w_deg, h_deg, angle_deg=35.0 + random.uniform(-8, 8))

            # Convert deg to meters at ~24.9N (1 deg lat ~ 111,132m, 1 deg lon ~ 100,800m)
            area_m2 = round((w_deg * 100800) * (h_deg * 111132), 1)
            height_m = round(random.uniform(*zone["height_range"]), 1)
            lst_c = round(random.uniform(*zone["lst_range"]), 1)
            sub_mm = round(random.uniform(*zone["sub_range"]), 2)
            coh = round(max(0.45, min(0.97, 0.95 + sub_mm * 0.07 + random.uniform(-0.04, 0.04))), 2)
            kwp = round(area_m2 * 0.65 * 0.20, 1)
            kwh = round(kwp * 1750, 0)
            viirs = round(random.uniform(*zone["viirs_range"]), 1)
            year = random.choice(zone["years"])

            if sub_mm < -3.0:
                presc = "GEOTECH_AUDIT"
            elif kwp > 500 and lst_c > 45.5:
                presc = "SOLAR_AND_COOL_ROOF"
            elif lst_c > 46.0:
                presc = "COOL_ROOF_CORRIDOR"
            elif kwp > 300:
                presc = "SOLAR_ARRAY"
            else:
                presc = random.choice(zone["prescriptions"])

            score = int(
                min(
                    99,
                    max(
                        42,
                        (lst_c - 36.0) * 3.5 + min(30, kwp / 45.0) + abs(sub_mm) * 6.0,
                    ),
                )
            )

            total_area += area_m2
            total_kwp += kwp
            total_kwh += kwh
            lst_vals.append(lst_c)
            if lst_c >= 46.0:
                hotspots += 1
            if sub_mm <= -3.0:
                sub_watch += 1

            features.append(
                {
                    "type": "Feature",
                    "properties": {
                        "id": f"bldg_{bldg_idx}",
                        "zone_id": zone["id"],
                        "name": f"{zone['prefix']} #{i + 1:02d}",
                        "height_m": height_m,
                        "roof_area_m2": area_m2,
                        "land_use_class": zone["land_use"],
                        "growth_year": year,
                        "lst_celsius": lst_c,
                        "subsidence_mm_yr": sub_mm,
                        "sar_coherence": coh,
                        "solar_kwh_yr": kwh,
                        "solar_capacity_kwp": kwp,
                        "viirs_radiance": viirs,
                        "prescription": presc,
                        "priority_score": score,
                    },
                    "geometry": {"type": "Polygon", "coordinates": [poly]},
                }
            )

    GEOJSON_OUT.parent.mkdir(parents=True, exist_ok=True)
    GEOJSON_OUT.write_text(
        json.dumps({"type": "FeatureCollection", "features": features}, indent=2),
        encoding="utf-8",
    )

    summary = {
        "mission": "BARJEEL-1430",
        "aoi_name": "Dubai South & Expo City Corridor",
        "total_buildings": len(features),
        "total_roof_area_m2": round(total_area, 0),
        "total_solar_capacity_mwp": round(total_kwp / 1000.0, 2),
        "total_solar_gwh_yr": round(total_kwh / 1_000_000.0, 2),
        "mean_lst_celsius": round(sum(lst_vals) / len(lst_vals), 2),
        "hotspot_count": hotspots,
        "subsidence_watch_count": sub_watch,
        "data_source": "STARTER_SIMULATION",
    }
    SUMMARY_OUT.write_text(json.dumps(summary, indent=2), encoding="utf-8")
    write_ppm_or_png_patches()
    print(f"[BARJEEL-1430] Generated {len(features)} 3D buildings -> {GEOJSON_OUT}")
    print(f"[BARJEEL-1430] Total Solar Capacity: {summary['total_solar_capacity_mwp']} MWp | Mean LST: {summary['mean_lst_celsius']} C")


if __name__ == "__main__":
    main()
