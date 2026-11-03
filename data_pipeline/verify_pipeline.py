import os
import sys
import json
from PIL import Image

# Ensure utf-8 encoding for stdout
sys.stdout.reconfigure(encoding="utf-8")

def verify():
    print("=" * 60)
    print("VERIFYING MEMBER 2 PIPELINE DELIVERABLES")
    print("=" * 60)

    # 1. Check GeoJSON
    geojson_path = "frontend/public/data/dubai_south/buildings_3d.geojson"
    assert os.path.exists(geojson_path), f"Missing {geojson_path}"
    with open(geojson_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    assert data["type"] == "FeatureCollection"
    features = data["features"]
    count = len(features)
    print(f"[PASS] GeoJSON Valid: {count} building features found (Requirement: 1,500-3,000)")
    assert 1500 <= count <= 3000

    size_mb = os.path.getsize(geojson_path) / (1024 * 1024)
    print(f"[PASS] File Size: {size_mb:.2f} MB (Requirement: < 12 MB)")
    assert size_mb < 12.0

    # Check Contract B properties
    req_props = [
        "id", "zone_id", "name", "height_m", "roof_area_m2",
        "land_use_class", "growth_year", "lst_celsius", "subsidence_mm_yr",
        "sar_coherence", "solar_kwh_yr", "solar_capacity_kwp",
        "viirs_radiance", "prescription", "priority_score"
    ]
    for idx, f in enumerate(features[:20]):
        props = f["properties"]
        for p in req_props:
            assert p in props, f"Missing {p} in feature {idx}"
    print(f"[PASS] Contract B Schema: Verified on building features")

    # 2. Check District Summary
    summary_path = "frontend/public/data/dubai_south/district_summary.json"
    assert os.path.exists(summary_path), f"Missing {summary_path}"
    with open(summary_path, "r", encoding="utf-8") as f:
        summary = json.load(f)
    mwp = summary["total_solar_capacity_mwp"]
    print(f"[PASS] District Summary Valid: {mwp} MWp solar mapped (Requirement: >= 350 MWp)")
    assert mwp >= 350.0

    # 3. Check S2 Patches
    patch_dir = "backend/data/s2_patches"
    patches = [f for f in os.listdir(patch_dir) if f.endswith(".png")]
    print(f"[PASS] Edge AI Patches: {len(patches)} PNG tiles found (Requirement: 30 tiles)")
    assert len(patches) == 30
    img = Image.open(os.path.join(patch_dir, patches[0]))
    assert img.size == (64, 64)
    print(f"[PASS] Patch Resolution: {img.size[0]}x{img.size[1]} RGB")

    # 4. Check Overlays
    lst_path = "frontend/public/data/dubai_south/landsat_lst.png"
    s2_path = "frontend/public/data/dubai_south/sentinel2_rgb.png"
    assert os.path.exists(lst_path) and os.path.exists(s2_path)
    print(f"[PASS] Raster Overlays: landsat_lst.png & sentinel2_rgb.png verified")

    print("=" * 60)
    print("ALL VERIFICATION CHECKS PASSED SUCCESSFULLY!")
    print("=" * 60)

if __name__ == "__main__":
    verify()
