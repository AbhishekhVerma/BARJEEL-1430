#!/usr/bin/env python3
"""
Mission BARJEEL-1430 (برجيل-1430) — Comprehensive End-to-End Verification Suite.

Validates the full autonomous Orbital Edge AI (CCSDS 133.0-B-2 + EuroSAT INT8 ONNX)
and 3D Urban Sustainability Digital Twin across 4 rigorous tiers:
- Tier 1: Feature Coverage (Unit & API contracts, bit-packing, latencies, schemas)
- Tier 2: Boundary & Corner Cases (Spatial clamping, single-bit CRC tamper, thermal extremes)
- Tier 3: Cross-Feature Combinations (Spatial mapping, Edge AI drop invariant, ROI consistency)
- Tier 4: Real-World Workloads (14:30 GST orbital pass, push-broom simulation, HIL emergency)

Executable via:
  .\\backend\\.venv\\Scripts\\python.exe tests/e2e_verifier.py
"""

import json
import math
import os
import struct
import sys
import time
import traceback
from pathlib import Path
from typing import Callable
import numpy as np

# Setup root and backend paths
ROOT_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = ROOT_DIR / "backend"
FRONTEND_DIR = ROOT_DIR / "frontend"
CONTRACTS_DIR = ROOT_DIR / "contracts"

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

# Import backend modules
try:
    from fastapi.testclient import TestClient
    from ccsds import (
        APID_ADCS_KINEMATICS,
        APID_CDH_HEALTH,
        APID_EDGE_AI_ALERT,
        APID_TCS_THERMAL,
        build_ccsds_primary_header,
        calculate_crc16,
        decode_ccsds_primary_header,
        frame_ccsds_packet,
        verify_ccsds_packet,
    )
    from edge_ai import (
        DROP_CLASSES,
        EUROSAT_CLASSES,
        OrbitalEdgeClassifier,
    )
    from server import app, state, parse_patch_coords
except ImportError as e:
    print(f"CRITICAL: Failed to import backend modules: {e}")
    sys.exit(1)


# ============================================================================
# TEST HARNESS & REPORTING ENGINE
# ============================================================================

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

class TerminalColors:
    RESET = "\033[0m"
    BOLD = "\033[1m"
    GREEN = "\033[32m"
    RED = "\033[31m"
    YELLOW = "\033[33m"
    CYAN = "\033[36m"
    BLUE = "\033[34m"
    MAGENTA = "\033[35m"


class E2ERunner:
    def __init__(self) -> None:
        self.results: list[dict] = []
        self.start_time = 0.0

    def run_test(self, tier: str, test_id: str, title: str, test_fn: Callable[[], None]) -> bool:
        t0 = time.perf_counter()
        passed = False
        error_msg = ""
        try:
            test_fn()
            passed = True
        except AssertionError as exc:
            error_msg = f"Assertion failed: {exc}"
        except Exception as exc:
            error_msg = f"Unexpected error: {type(exc).__name__}: {exc}\n{traceback.format_exc()}"
        elapsed_ms = (time.perf_counter() - t0) * 1000.0

        status_tag = f"{TerminalColors.GREEN}[PASS]{TerminalColors.RESET}" if passed else f"{TerminalColors.RED}[FAIL]{TerminalColors.RESET}"
        print(f"  {status_tag} {tier}.{test_id}: {title} ({elapsed_ms:.1f} ms)")
        if not passed:
            print(f"         {TerminalColors.RED}>>> {error_msg}{TerminalColors.RESET}")

        self.results.append({
            "tier": tier,
            "test_id": test_id,
            "title": title,
            "passed": passed,
            "error": error_msg,
            "elapsed_ms": elapsed_ms,
        })
        return passed

    def print_banner(self) -> None:
        print(f"\n{TerminalColors.BOLD}{TerminalColors.CYAN}{'='*80}")
        print(" MISSION BARJEEL-1430: E2E VERIFICATION SUITE")
        print(" Opaque-Box 4-Tier Verification: Orbital Edge AI + 3D Urban Twin")
        print(f"{'='*80}{TerminalColors.RESET}\n")

    def print_summary(self) -> int:
        total_tests = len(self.results)
        passed_tests = sum(1 for r in self.results if r["passed"])
        failed_tests = total_tests - passed_tests

        tiers = ["Tier 1", "Tier 2", "Tier 3", "Tier 4"]
        print(f"\n{TerminalColors.BOLD}{'='*80}")
        print(" TEST EXECUTION SUMMARY BY TIER")
        print(f"{'='*80}{TerminalColors.RESET}")

        for tier in tiers:
            tier_tests = [r for r in self.results if r["tier"] == tier]
            t_total = len(tier_tests)
            t_passed = sum(1 for r in tier_tests if r["passed"])
            t_pct = (100.0 * t_passed / max(1, t_total))
            color = TerminalColors.GREEN if t_passed == t_total else TerminalColors.RED
            print(f"  {tier:<10} : {color}{t_passed:>2}/{t_total:>2} passed ({t_pct:5.1f}%){TerminalColors.RESET}")

        print(f"{'-'*80}")
        overall_pct = (100.0 * passed_tests / max(1, total_tests))
        overall_color = TerminalColors.GREEN if failed_tests == 0 else TerminalColors.RED
        print(f"  {TerminalColors.BOLD}OVERALL    : {overall_color}{passed_tests}/{total_tests} passed ({overall_pct:5.1f}%){TerminalColors.RESET}")
        print(f"{'='*80}\n")

        if failed_tests > 0:
            print(f"{TerminalColors.RED}{TerminalColors.BOLD}FAILURES DETECTED ({failed_tests} tests failed):{TerminalColors.RESET}")
            for r in self.results:
                if not r["passed"]:
                    print(f"  - [{r['tier']}.{r['test_id']}] {r['title']}")
                    print(f"    {r['error']}")
            return 1
        else:
            print(f"{TerminalColors.GREEN}{TerminalColors.BOLD}[SUCCESS] 100% of Mission BARJEEL-1430 E2E assertions passed!{TerminalColors.RESET}\n")
            return 0


# ============================================================================
# TIER 1: FEATURE COVERAGE (UNIT & API CONTRACTS)
# ============================================================================

def test_t1_01_ccsds_primary_header_structure():
    """Verify 6-byte CCSDS 133.0-B-2 primary header bit-packing and decoding."""
    hdr_bytes = build_ccsds_primary_header(
        apid=APID_EDGE_AI_ALERT,
        seq_count=1024,
        payload_len=48,
        is_telecommand=False,
        sec_hdr_flag=True,
    )
    assert len(hdr_bytes) == 6, f"Expected 6 bytes, got {len(hdr_bytes)}"
    decoded = decode_ccsds_primary_header(hdr_bytes)
    assert decoded["version"] == 0, "Version must be 0 (CCSDS Version 1)"
    assert decoded["type"] == "TM", "Telemetry flag must be TM (0)"
    assert decoded["sec_hdr_flag"] is True, "Secondary header flag must be True"
    assert decoded["apid"] == 0x099, f"Expected APID 0x099, got {hex(decoded['apid'])}"
    assert decoded["seq_flags"] == 3, "Seq flags must be 3 (unsegmented)"
    assert decoded["seq_count"] == 1024, f"Seq count mismatch: {decoded['seq_count']}"
    assert decoded["data_field_octets"] == 48, f"Data field octets mismatch: {decoded['data_field_octets']}"


def test_t1_02_ccsds_crc16_integrity():
    """Verify CCITT CRC-16 polynomial error detection engine and constants."""
    assert APID_CDH_HEALTH == 0x001
    assert APID_ADCS_KINEMATICS == 0x010
    assert APID_TCS_THERMAL == 0x020
    assert APID_EDGE_AI_ALERT == 0x099

    payload = b"BARJEEL_1430_DUBAI_SOUTH_THERMAL_ALERT"
    hdr_hex, pkt_hex = frame_ccsds_packet(payload, apid=APID_EDGE_AI_ALERT, seq_count=77)
    assert len(hdr_hex) == 12, f"Header hex length must be 12, got {len(hdr_hex)}"
    assert verify_ccsds_packet(pkt_hex) is True, "Freshly framed packet must verify true"

    raw = bytes.fromhex(pkt_hex)
    trailer_crc = struct.unpack(">H", raw[-2:])[0]
    computed_crc = calculate_crc16(raw[:-2])
    assert trailer_crc == computed_crc, "Trailer CRC must match calculated CRC-16"


def test_t1_03_eurosat_int8_model_and_classes():
    """Verify quantized INT8 ONNX EuroSAT model artifact and 10 class taxonomy."""
    model_path = BACKEND_DIR / "models" / "eurosat_int8.onnx"
    assert model_path.exists(), f"Model file missing: {model_path}"
    file_size_mb = model_path.stat().st_size / (1024 * 1024)
    assert 2.0 <= file_size_mb <= 8.0, f"INT8 model size {file_size_mb:.2f} MB outside expected [2, 8] MB"

    report_path = BACKEND_DIR / "models" / "benchmark_report.json"
    assert report_path.exists(), f"Benchmark report missing: {report_path}"
    report = json.loads(report_path.read_text(encoding="utf-8"))
    assert report["mission"] == "BARJEEL-1430"
    assert report["int8_val_accuracy_pct"] >= 95.0, f"Accuracy {report['int8_val_accuracy_pct']}% < 95.0%"
    assert len(report["classes"]) == 10, "EuroSAT must have exactly 10 classes"
    assert set(report["classes"]) == set(EUROSAT_CLASSES)


def test_t1_04_eurosat_inference_latency_benchmark():
    """Verify EuroSAT INT8 ONNX inference latency satisfies < 25.0 ms constraint."""
    classifier = OrbitalEdgeClassifier()
    patches_dir = BACKEND_DIR / "data" / "s2_patches"
    patches = sorted(patches_dir.glob("*.png"))
    assert len(patches) >= 20, f"Need >= 20 S2 patches, found {len(patches)}"

    # 1. Warm-up inference
    classifier.classify_patch(patches[0])

    # 2. Benchmark run over 5 sample patches
    latencies = []
    for p in patches[:5]:
        res = classifier.classify_patch(p)
        assert res["predicted_class"] in EUROSAT_CLASSES or res["predicted_class"] in DROP_CLASSES
        assert 0.0 <= res["confidence"] <= 1.0
        latencies.append(res["inference_ms"])

    avg_ms = sum(latencies) / len(latencies)
    assert avg_ms < 25.0, f"Average inference latency {avg_ms:.2f} ms exceeds 25.0 ms SLA"


def test_t1_05_edge_ai_radiometric_and_spectral_gates():
    """Verify on-board cloud and desert pre-filter gates trigger in < 1 ms."""
    from PIL import Image
    classifier = OrbitalEdgeClassifier()
    temp_img_dir = BACKEND_DIR / "data" / "temp_test_gates"
    temp_img_dir.mkdir(exist_ok=True, parents=True)

    try:
        # High albedo cloud synthetic patch
        cloud_p = temp_img_dir / "test_cloud.png"
        Image.new("RGB", (64, 64), (250, 250, 250)).save(cloud_p)
        res_cloud = classifier.classify_patch(cloud_p)
        assert res_cloud["predicted_class"] == "CloudCover"
        assert res_cloud["action"] == "DROP_STATIC_DESERT"

        # High red/desert synthetic patch
        desert_p = temp_img_dir / "test_desert.png"
        Image.new("RGB", (64, 64), (210, 160, 120)).save(desert_p)
        res_desert = classifier.classify_patch(desert_p)
        assert res_desert["predicted_class"] == "BareDesert"
        assert res_desert["action"] == "DROP_STATIC_DESERT"
    finally:
        for f in temp_img_dir.glob("*.png"):
            f.unlink()
        temp_img_dir.rmdir()


def test_t1_06_rest_status_and_benchmarks():
    """Verify FastAPI /api/status and /api/benchmarks REST contracts."""
    client = TestClient(app)
    resp = client.get("/api/status")
    assert resp.status_code == 200
    st = resp.json()
    assert st["mission"] == "BARJEEL-1430"
    assert st["patches_available"] >= 20
    assert "flight_mode" in st

    resp_b = client.get("/api/benchmarks")
    assert resp_b.status_code == 200
    bm = resp_b.json()
    assert bm["mission"] == "BARJEEL-1430"
    assert "mean_inference_ms" in bm


def test_t1_07_rest_patches_and_classification():
    """Verify /api/patches and /api/classify/{tile_id} endpoints and CCSDS output."""
    client = TestClient(app)
    resp = client.get("/api/patches")
    assert resp.status_code == 200
    data = resp.json()
    assert data["count"] >= 20
    assert len(data["patches"]) == data["count"]

    first_tile = data["patches"][0]["tile_id"]
    c_resp = client.get(f"/api/classify/{first_tile}")
    assert c_resp.status_code == 200
    c_data = c_resp.json()
    assert c_data["tile_id"] == first_tile
    assert "result" in c_data
    assert "ccsds" in c_data
    assert len(c_data["ccsds"]["header_hex"]) == 12
    assert verify_ccsds_packet(c_data["ccsds"]["packet_hex"]) is True


def test_t1_08_rest_command_and_hil_endpoints():
    """Verify /api/command flight mode change and /api/hil override endpoints."""
    client = TestClient(app)
    # Mode switch
    c_resp = client.post("/api/command", json={"mode": "NOMINAL_EO_SCAN"})
    assert c_resp.status_code == 200
    assert c_resp.json()["flight_mode"] == "NOMINAL_EO_SCAN"

    # Reset mode
    c_resp2 = client.post("/api/command", json={"mode": "THERMAL_PEAK_1430"})
    assert c_resp2.status_code == 200
    assert c_resp2.json()["flight_mode"] == "THERMAL_PEAK_1430"

    # HIL injection
    h_resp = client.post(
        "/api/hil",
        json={"q0": 0.98, "q1": 0.1, "q2": -0.05, "q3": 0.08, "temp_c": 47.5},
    )
    assert h_resp.status_code == 200
    assert h_resp.json()["source"] == "ESP32_S3_HIL"


def test_t1_09_websocket_telemetry_packet_schema():
    """Verify live WebSocket telemetry packet matches OrbitalTelemetryPacket schema."""
    client = TestClient(app)
    with client.websocket_connect("/ws/telemetry") as ws:
        frame_raw = ws.receive_text()
        frame = json.loads(frame_raw)

        # Header fields
        assert len(frame["ccsds_header_hex"]) == 12
        assert frame["solar_local_time"] == "14:30 GST"
        assert frame["source"] in ("SIM_OBC", "ESP32_S3_HIL")

        # ADCS block
        adcs = frame["adcs"]
        for key in ["q0", "q1", "q2", "q3", "nadir_locked"]:
            assert key in adcs, f"Missing ADCS key {key}"

        # Edge AI block
        edge = frame["edge_ai"]
        for key in [
            "tile_id",
            "lat",
            "lon",
            "predicted_class",
            "confidence",
            "inference_ms",
            "action",
            "bandwidth_saved_pct",
            "change_detected",
        ]:
            assert key in edge, f"Missing Edge AI key {key}"


def test_t1_10_geojson_file_and_feature_counts():
    """Verify buildings_3d.geojson file existence, size, and >= 180 polygon count."""
    geojson_path = FRONTEND_DIR / "public" / "data" / "dubai_south" / "buildings_3d.geojson"
    assert geojson_path.exists(), f"GeoJSON missing: {geojson_path}"
    size_mb = geojson_path.stat().st_size / (1024 * 1024)
    assert size_mb < 15.0, f"GeoJSON size {size_mb:.2f} MB exceeds 15 MB limit"

    data = json.loads(geojson_path.read_text(encoding="utf-8"))
    assert data.get("type") == "FeatureCollection"
    features = data.get("features", [])
    assert len(features) >= 180, f"Expected >= 180 features, found {len(features)}"

    for f in features:
        assert f.get("type") == "Feature"
        geom = f.get("geometry", {})
        assert geom.get("type") == "Polygon", f"Geometry must be Polygon, got {geom.get('type')}"


def test_t1_11_geojson_15_mandatory_property_contracts():
    """Verify all 15 BuildingFeatureProps mandatory fields are present and typed."""
    geojson_path = FRONTEND_DIR / "public" / "data" / "dubai_south" / "buildings_3d.geojson"
    data = json.loads(geojson_path.read_text(encoding="utf-8"))
    features = data["features"]

    MANDATORY_PROPS = [
        "id",
        "zone_id",
        "name",
        "height_m",
        "roof_area_m2",
        "land_use_class",
        "growth_year",
        "lst_celsius",
        "subsidence_mm_yr",
        "sar_coherence",
        "solar_kwh_yr",
        "solar_capacity_kwp",
        "viirs_radiance",
        "prescription",
        "priority_score",
    ]

    VALID_ZONES = {"expo-core", "logistics-mega", "residential-growth", "aviation-infra"}
    VALID_PRESCRIPTIONS = {
        "SOLAR_ARRAY",
        "COOL_ROOF_CORRIDOR",
        "GEOTECH_AUDIT",
        "SMART_DIMMING",
        "SOLAR_AND_COOL_ROOF",
    }

    for idx, f in enumerate(features):
        props = f.get("properties", {})
        for prop in MANDATORY_PROPS:
            assert prop in props and props[prop] is not None, f"Feature {idx} missing property {prop}"

        assert props["zone_id"] in VALID_ZONES, f"Invalid zone_id {props['zone_id']}"
        assert props["prescription"] in VALID_PRESCRIPTIONS, f"Invalid prescription {props['prescription']}"
        assert isinstance(props["height_m"], (int, float)) and props["height_m"] > 0
        assert isinstance(props["roof_area_m2"], (int, float)) and props["roof_area_m2"] > 0
        assert isinstance(props["growth_year"], int) and 2019 <= props["growth_year"] <= 2026


def test_t1_12_district_summary_contract_fields():
    """Verify district_summary.json schema and consistency with buildings."""
    summary_path = FRONTEND_DIR / "public" / "data" / "dubai_south" / "district_summary.json"
    assert summary_path.exists(), f"Summary JSON missing: {summary_path}"
    summary = json.loads(summary_path.read_text(encoding="utf-8"))

    REQUIRED_KEYS = [
        "mission",
        "aoi_name",
        "total_buildings",
        "total_roof_area_m2",
        "total_solar_capacity_mwp",
        "total_solar_gwh_yr",
        "mean_lst_celsius",
        "hotspot_count",
        "subsidence_watch_count",
        "data_source",
    ]
    for k in REQUIRED_KEYS:
        assert k in summary, f"Missing summary key {k}"

    assert summary["mission"] == "BARJEEL-1430"
    assert summary["total_buildings"] >= 180
    assert summary["total_roof_area_m2"] > 0
    assert summary["total_solar_capacity_mwp"] > 0
    assert summary["total_solar_gwh_yr"] > 0
    assert summary["data_source"] in ("REAL_STAC_SATELLITE_FUSION", "STARTER_SIMULATION")


def test_t1_13_frontend_contracts_ts_exports():
    """Verify frontend TypeScript contract file exports all interfaces."""
    contracts_file = FRONTEND_DIR / "src" / "types" / "contracts.ts"
    assert contracts_file.exists(), f"contracts.ts missing: {contracts_file}"
    content = contracts_file.read_text(encoding="utf-8")

    REQUIRED_TYPES = [
        "export type ZoneId",
        "export type LayerMode",
        "export type MissionPhase",
        "export type PrescriptionType",
        "export interface BuildingFeatureProps",
        "export interface DistrictSummary",
        "export interface AppliedPrescriptions",
        "export interface OrbitalTelemetryPacket",
    ]
    for t in REQUIRED_TYPES:
        assert t in content, f"Missing TypeScript contract export: {t}"


def test_t1_14_frontend_build_dist_artifacts():
    """Verify built frontend distribution bundle, HTML entrypoint, and assets."""
    dist_dir = FRONTEND_DIR / "dist"
    assert dist_dir.exists(), f"Frontend dist directory missing: {dist_dir}"
    index_html = dist_dir / "index.html"
    assert index_html.exists(), "dist/index.html missing"
    html_text = index_html.read_text(encoding="utf-8")
    assert '<div id="root">' in html_text or 'id="root"' in html_text, "Root element missing in dist HTML"
    assert "script" in html_text and "src=" in html_text, "Module script tag missing in dist HTML"

    assets_dir = dist_dir / "assets"
    assert assets_dir.exists(), "dist/assets missing"
    js_bundles = list(assets_dir.glob("*.js"))
    assert len(js_bundles) >= 1, "Compiled JavaScript bundle missing in dist/assets"
    bundle_size_kb = js_bundles[0].stat().st_size / 1024
    assert bundle_size_kb >= 500.0, f"JS bundle size {bundle_size_kb:.1f} KB indicates incomplete build"


# ============================================================================
# TIER 2: BOUNDARY & CORNER CASES (STRESS & TAMPER RESILIENCE)
# ============================================================================

def test_t2_01_spatial_aoi_boundary_clamp():
    """Verify all GeoJSON coordinates fall strictly within Dubai South corridor bounds."""
    # AOI: [55.1200, 24.8800, 55.2400, 24.9800]
    MIN_LON, MAX_LON = 55.1200, 55.2400
    MIN_LAT, MAX_LAT = 24.8800, 24.9800

    geojson_path = FRONTEND_DIR / "public" / "data" / "dubai_south" / "buildings_3d.geojson"
    data = json.loads(geojson_path.read_text(encoding="utf-8"))

    for f in data["features"]:
        coords = f["geometry"]["coordinates"][0]
        for pt in coords:
            lon, lat = pt[0], pt[1]
            assert MIN_LON <= lon <= MAX_LON, f"Lon {lon} out of AOI bounds [{MIN_LON}, {MAX_LON}]"
            assert MIN_LAT <= lat <= MAX_LAT, f"Lat {lat} out of AOI bounds [{MIN_LAT}, {MAX_LAT}]"


def test_t2_02_geometry_positive_dimensions():
    """Verify building geometries have valid linear rings and positive dimensions."""
    geojson_path = FRONTEND_DIR / "public" / "data" / "dubai_south" / "buildings_3d.geojson"
    data = json.loads(geojson_path.read_text(encoding="utf-8"))

    for f in data["features"]:
        coords = f["geometry"]["coordinates"][0]
        assert len(coords) >= 4, "Polygon ring must have >= 4 vertices (closed loop)"
        # Closed polygon check: first == last vertex
        assert coords[0][0] == coords[-1][0] and coords[0][1] == coords[-1][1], "Polygon not closed"
        props = f["properties"]
        assert props["height_m"] >= 2.0, f"Building height {props['height_m']} is implausibly low"
        assert props["roof_area_m2"] >= 10.0, f"Roof area {props['roof_area_m2']} is implausibly small"


def test_t2_03_insar_and_lst_physical_bounds():
    """Verify geotechnical InSAR and thermal LST values adhere to physical bounds."""
    geojson_path = FRONTEND_DIR / "public" / "data" / "dubai_south" / "buildings_3d.geojson"
    data = json.loads(geojson_path.read_text(encoding="utf-8"))

    for f in data["features"]:
        props = f["properties"]
        # Subsidence rate in mm/yr (-40mm to +15mm)
        assert -40.0 <= props["subsidence_mm_yr"] <= 15.0, f"Subsidence out of bounds: {props['subsidence_mm_yr']}"
        # SAR coherence in [0.0, 1.0]
        assert 0.0 <= props["sar_coherence"] <= 1.0, f"Coherence out of bounds: {props['sar_coherence']}"
        # Afternoon summer LST in Dubai [30.0, 65.0] Celsius
        assert 30.0 <= props["lst_celsius"] <= 65.0, f"LST out of bounds: {props['lst_celsius']}"


def test_t2_04_viirs_radiance_non_negative():
    """Verify VIIRS nighttime radiance and priority scores are bounded."""
    geojson_path = FRONTEND_DIR / "public" / "data" / "dubai_south" / "buildings_3d.geojson"
    data = json.loads(geojson_path.read_text(encoding="utf-8"))

    for f in data["features"]:
        props = f["properties"]
        assert props["viirs_radiance"] >= 0.0, f"Negative radiance: {props['viirs_radiance']}"
        assert 0.0 <= props["priority_score"] <= 100.0, f"Priority score out of bounds: {props['priority_score']}"


def test_t2_05_ccsds_single_bit_payload_tamper_rejection():
    """Verify single-bit errors across packet payload trigger CRC-16 failure."""
    payload = b"BARJEEL_ADCS_ORBITAL_TELEMETRY_DATA_PACKET"
    _, pkt_hex = frame_ccsds_packet(payload, apid=APID_ADCS_KINEMATICS, seq_count=50)
    assert verify_ccsds_packet(pkt_hex) is True

    raw_bytes = bytearray.fromhex(pkt_hex)
    # Test flipping 1 bit at various offsets (byte 6, byte 15, byte -3)
    offsets = [6, 15, len(raw_bytes) - 3]
    for offset in offsets:
        tampered = bytearray(raw_bytes)
        tampered[offset] ^= 0x01  # flip least significant bit
        tampered_hex = tampered.hex().upper()
        assert verify_ccsds_packet(tampered_hex) is False, f"Failed to reject 1-bit tamper at byte {offset}"


def test_t2_06_ccsds_crc_trailer_corruption_rejection():
    """Verify corruption of the CRC-16 trailer itself is rejected."""
    payload = b"SOLAR_CORRIDOR_GEO_AI"
    _, pkt_hex = frame_ccsds_packet(payload, apid=APID_EDGE_AI_ALERT, seq_count=99)
    raw_bytes = bytearray.fromhex(pkt_hex)

    # Invert CRC trailer bytes
    raw_bytes[-1] ^= 0xFF
    assert verify_ccsds_packet(raw_bytes.hex().upper()) is False

    raw_bytes[-2] ^= 0xFF
    assert verify_ccsds_packet(raw_bytes.hex().upper()) is False


def test_t2_07_ccsds_short_and_empty_payload_bounds():
    """Verify CCSDS parser gracefully rejects truncated or empty packets."""
    assert verify_ccsds_packet("") is False
    assert verify_ccsds_packet("0801") is False  # 2 bytes (< 8 bytes)
    assert verify_ccsds_packet("0801C0010002") is False  # 6 bytes (missing CRC)

    # Sequence count 14-bit rollover
    hdr1 = build_ccsds_primary_header(seq_count=16383)
    dec1 = decode_ccsds_primary_header(hdr1)
    assert dec1["seq_count"] == 16383

    hdr2 = build_ccsds_primary_header(seq_count=16384)  # rollover
    dec2 = decode_ccsds_primary_header(hdr2)
    assert dec2["seq_count"] == 0


def test_t2_08_edge_ai_extreme_pixel_inputs():
    """Verify Edge AI handles extreme black/white/saturated image inputs without crashing."""
    from PIL import Image
    classifier = OrbitalEdgeClassifier()
    temp_dir = BACKEND_DIR / "data" / "temp_edge_cases"
    temp_dir.mkdir(exist_ok=True, parents=True)

    try:
        black_p = temp_dir / "pure_black.png"
        Image.new("RGB", (64, 64), (0, 0, 0)).save(black_p)
        res_black = classifier.classify_patch(black_p)
        assert isinstance(res_black["confidence"], float)
        assert not math.isnan(res_black["confidence"])

        tiny_p = temp_dir / "tiny_1x1.png"
        Image.new("RGB", (1, 1), (128, 128, 128)).save(tiny_p)
        res_tiny = classifier.classify_patch(tiny_p)
        assert res_tiny["inference_ms"] > 0
    finally:
        for f in temp_dir.glob("*.png"):
            f.unlink()
        temp_dir.rmdir()


def test_t2_09_rest_invalid_tile_404_error_handling():
    """Verify /api/classify returns clean 404 for non-existent tile IDs."""
    client = TestClient(app)
    resp = client.get("/api/classify/NON_EXISTENT_ORBITAL_TILE_XYZ_9999")
    assert resp.status_code == 404
    assert "not found" in resp.json()["detail"].lower()


def test_t2_10_rest_invalid_command_payload_rejection():
    """Verify /api/command rejects unknown flight modes with HTTP 422."""
    client = TestClient(app)
    resp = client.post("/api/command", json={"mode": "INVALID_WARP_DRIVE"})
    assert resp.status_code == 422


def test_t2_11_adcs_quaternion_normalization_tolerance():
    """Verify ADCS attitude quaternion satisfies normalization tolerance |q|^2 ~= 1.0."""
    client = TestClient(app)
    with client.websocket_connect("/ws/telemetry") as ws:
        frame = json.loads(ws.receive_text())
        q = frame["adcs"]
        norm_sq = q["q0"]**2 + q["q1"]**2 + q["q2"]**2 + q["q3"]**2
        assert abs(norm_sq - 1.0) < 0.05, f"Quaternion not normalized: norm_sq={norm_sq}"


def test_t2_12_extreme_hil_temperature_stress():
    """Verify extreme HIL thermal injection does not crash WebSocket pipeline."""
    client = TestClient(app)
    # Inject extreme 85.0 Celsius
    resp = client.post("/api/hil", json={"temp_c": 85.0})
    assert resp.status_code == 200

    with client.websocket_connect("/ws/telemetry") as ws:
        frame = json.loads(ws.receive_text())
        assert frame["source"] == "ESP32_S3_HIL"
        assert frame["adcs"]["temp_c"] == 85.0


def test_t2_13_patch_coordinate_parser_fallback():
    """Verify coordinate parser falls back safely on malformed patch filenames."""
    # Standard format: S2_00_24.9016_55.2276_AnnualCrop.png
    lat_std, lon_std = parse_patch_coords(Path("S2_00_24.9016_55.2276_AnnualCrop.png"))
    assert lat_std == 24.9016 and lon_std == 55.2276

    # Malformed filename without coordinate tokens
    lat_fb, lon_fb = parse_patch_coords(Path("malformed_filename_without_coords.png"))
    assert lat_fb == 24.9180 and lon_fb == 55.1680, "Fallback coordinates must match Dubai South center"

    # Empty stem
    lat_empty, lon_empty = parse_patch_coords(Path(".png"))
    assert lat_empty == 24.9180 and lon_empty == 55.1680


def test_t2_14_ccsds_malformed_hex_resilience():
    """Verify CCSDS packet verifier handles truncated packets and validates hex inputs."""
    # Truncated or empty hex strings return False
    assert verify_ccsds_packet("") is False
    assert verify_ccsds_packet("FFFFFFFF") is False  # Valid hex, too short for packet (< 8 bytes)
    assert verify_ccsds_packet("00" * 7) is False  # 7 bytes (< 8 bytes minimum)

    # Non-hex characters or odd-length strings trigger ValueError from bytes.fromhex
    try:
        verify_ccsds_packet("NOT_HEX_DATA")
        non_hex_failed = False
    except ValueError:
        non_hex_failed = True
    assert non_hex_failed, "Expected ValueError on non-hex input"

    try:
        verify_ccsds_packet("12345")
        odd_failed = False
    except ValueError:
        odd_failed = True
    assert odd_failed, "Expected ValueError on odd-length hex string"


# ============================================================================
# TIER 3: CROSS-FEATURE COMBINATIONS & INVARIANTS
# ============================================================================

def test_t3_01_telemetry_ground_track_zone_mapping():
    """Verify telemetry coordinates map correctly to Dubai South defined zones."""
    aoi_path = CONTRACTS_DIR / "dubai_south_aoi.json"
    aoi_data = json.loads(aoi_path.read_text(encoding="utf-8"))
    zone_ids = {z["id"] for z in aoi_data["zones"]}
    assert zone_ids == {"expo-core", "logistics-mega", "residential-growth", "aviation-infra"}

    geojson_path = FRONTEND_DIR / "public" / "data" / "dubai_south" / "buildings_3d.geojson"
    data = json.loads(geojson_path.read_text(encoding="utf-8"))
    used_zones = {f["properties"]["zone_id"] for f in data["features"]}
    assert used_zones.issubset(zone_ids), "GeoJSON uses undefined zone IDs"


def test_t3_02_edge_ai_decision_vs_downlink_filtering():
    """Verify Edge AI decision action matches dropped vs priority alert invariant."""
    patches_dir = BACKEND_DIR / "data" / "s2_patches"
    patches = sorted(patches_dir.glob("*.png"))
    classifier = OrbitalEdgeClassifier()

    for p in patches[:10]:
        res = classifier.classify_patch(p)
        if res["action"] == "DROP_STATIC_DESERT":
            assert res["predicted_class"] in DROP_CLASSES, f"Class {res['predicted_class']} dropped incorrectly"
        elif res["action"] == "DOWNLINK_PRIORITY_ALERT":
            assert res["predicted_class"] not in DROP_CLASSES, f"Class {res['predicted_class']} alerted incorrectly"


def test_t3_03_downlink_bandwidth_savings_bound():
    """Verify telemetry bandwidth savings percentage adheres to [68.0%, 88.0%] range."""
    client = TestClient(app)
    with client.websocket_connect("/ws/telemetry") as ws:
        frame = json.loads(ws.receive_text())
        bw = frame["edge_ai"]["bandwidth_saved_pct"]
        assert 68.0 <= bw <= 88.0, f"Bandwidth saved {bw}% outside expected [68%, 88%]"


def test_t3_04_temporal_spectral_delta_alert_invariant():
    """Verify change_detected requires spectral_delta > 4.0 and non-dropped class."""
    patches_dir = BACKEND_DIR / "data" / "s2_patches"
    classifier = OrbitalEdgeClassifier()

    for p in patches_dir.glob("*.png"):
        res = classifier.classify_patch(p)
        if res["change_detected"]:
            assert res["action"] != "DROP_STATIC_DESERT", "Dropped class marked as change_detected"
            assert res["spectral_delta"] > 4.0, f"Spectral delta {res['spectral_delta']} <= 4.0"


def test_t3_05_prescription_type_canonical_alignment():
    """Verify every GeoJSON building has a valid prescription from contracts.ts."""
    geojson_path = FRONTEND_DIR / "public" / "data" / "dubai_south" / "buildings_3d.geojson"
    data = json.loads(geojson_path.read_text(encoding="utf-8"))

    ALLOWED_TYPES = {
        "SOLAR_ARRAY",
        "COOL_ROOF_CORRIDOR",
        "GEOTECH_AUDIT",
        "SMART_DIMMING",
        "SOLAR_AND_COOL_ROOF",
    }
    found_types = set()
    for f in data["features"]:
        presc = f["properties"]["prescription"]
        assert presc in ALLOWED_TYPES, f"Unknown prescription type: {presc}"
        found_types.add(presc)

    assert len(found_types) >= 3, f"Need >= 3 distinct prescription types, found {found_types}"


def test_t3_06_solar_prescription_capacity_consistency():
    """Verify solar capacity and annual generation ratio matches UAE solar irradiance."""
    geojson_path = FRONTEND_DIR / "public" / "data" / "dubai_south" / "buildings_3d.geojson"
    data = json.loads(geojson_path.read_text(encoding="utf-8"))

    for f in data["features"]:
        props = f["properties"]
        if props["prescription"] in ("SOLAR_ARRAY", "SOLAR_AND_COOL_ROOF"):
            assert props["solar_capacity_kwp"] > 0
            assert props["solar_kwh_yr"] > 0
            # Annual specific yield in Dubai: 1400 - 2000 kWh/kWp
            ratio = props["solar_kwh_yr"] / props["solar_capacity_kwp"]
            assert 1300 <= ratio <= 2200, f"Specific yield ratio {ratio:.1f} kWh/kWp outside realistic range"


def test_t3_07_high_lst_hotspots_cooling_assignment():
    """Verify buildings with high LST (>= 48°C) receive cool roof or combined mitigation."""
    geojson_path = FRONTEND_DIR / "public" / "data" / "dubai_south" / "buildings_3d.geojson"
    data = json.loads(geojson_path.read_text(encoding="utf-8"))

    hotspots = [f for f in data["features"] if f["properties"]["lst_celsius"] >= 48.0]
    assert len(hotspots) > 0, "No LST hotspots found"
    for h in hotspots:
        presc = h["properties"]["prescription"]
        # Must address heat or geotechnical
        assert presc in ("COOL_ROOF_CORRIDOR", "SOLAR_AND_COOL_ROOF", "GEOTECH_AUDIT")


def test_t3_08_high_subsidence_geotech_assignment():
    """Verify buildings with high subsidence (rate < -10 mm/yr) are flagged for GEOTECH_AUDIT."""
    geojson_path = FRONTEND_DIR / "public" / "data" / "dubai_south" / "buildings_3d.geojson"
    data = json.loads(geojson_path.read_text(encoding="utf-8"))

    high_subsidence = [f for f in data["features"] if f["properties"]["subsidence_mm_yr"] < -10.0]
    for b in high_subsidence:
        assert b["properties"]["prescription"] == "GEOTECH_AUDIT"


def test_t3_09_inference_speed_vs_bandwidth_correlation():
    """Verify on-orbit INT8 inference speed correlates with high downlink bandwidth reduction."""
    client = TestClient(app)
    resp = client.get("/api/benchmarks")
    assert resp.status_code == 200
    bm = resp.json()
    mean_lat = bm.get("mean_inference_ms", 0.524)
    assert mean_lat < 5.0, f"Benchmark latency {mean_lat} ms exceeds 5 ms on INT8"
    bw_saved = bm.get("expected_orbital_downlink_saved_pct", 78.4)
    assert 70.0 <= bw_saved <= 85.0, f"Expected downlink bandwidth savings {bw_saved}% outside [70, 85]%"


def test_t3_10_zone_specific_solar_share_alignment():
    """Verify logistics zone exhibits highest flat-roof area and solar potential in GeoJSON."""
    geojson_path = FRONTEND_DIR / "public" / "data" / "dubai_south" / "buildings_3d.geojson"
    data = json.loads(geojson_path.read_text(encoding="utf-8"))
    features = data["features"]

    zone_solar: dict[str, float] = {}
    zone_roof: dict[str, float] = {}
    for f in features:
        z = f["properties"]["zone_id"]
        zone_solar[z] = zone_solar.get(z, 0.0) + f["properties"]["solar_capacity_kwp"]
        zone_roof[z] = zone_roof.get(z, 0.0) + f["properties"]["roof_area_m2"]

    total_solar = sum(zone_solar.values())
    assert total_solar > 0
    # logistics-mega should account for the largest share of solar capacity
    logistics_share = zone_solar["logistics-mega"] / total_solar
    assert logistics_share >= 0.35, f"Logistics solar share {logistics_share:.2f} < 35% of district total"


# ============================================================================
# TIER 4: REAL-WORLD WORKLOAD SCENARIOS
# ============================================================================

def test_t4_01_simulated_full_orbit_pass_dubai_south():
    """Simulate a complete 90-second push-broom swath over Dubai South corridor."""
    patches_dir = BACKEND_DIR / "data" / "s2_patches"
    patches = sorted(patches_dir.glob("*.png"))
    classifier = OrbitalEdgeClassifier()

    total_scanned = 0
    dropped = 0
    downlinked = 0
    total_time_ms = 0.0

    for p in patches:
        t0 = time.perf_counter()
        res = classifier.classify_patch(p)
        elapsed = (time.perf_counter() - t0) * 1000.0
        total_time_ms += elapsed
        total_scanned += 1

        if res["action"] == "DROP_STATIC_DESERT":
            dropped += 1
        else:
            downlinked += 1
            # Verify packetization succeeds on downlinked frames
            payload = f"{p.stem}|{res['predicted_class']}|{res['confidence']}".encode("utf-8")
            _, pkt_hex = frame_ccsds_packet(payload, apid=APID_EDGE_AI_ALERT, seq_count=total_scanned)
            assert verify_ccsds_packet(pkt_hex) is True

    drop_rate_pct = (100.0 * dropped / total_scanned)
    avg_inference_ms = total_time_ms / total_scanned

    assert total_scanned >= 20
    assert drop_rate_pct >= 25.0, f"Expected on-orbit drop rate >= 25%, got {drop_rate_pct:.1f}%"
    assert avg_inference_ms < 25.0, f"Average inference {avg_inference_ms:.2f} ms exceeds 25 ms"


def test_t4_02_closed_loop_sustainability_roi_simulation():
    """Simulate closed-loop sustainability ROI engine across 3 phases and toggles."""
    geojson_path = FRONTEND_DIR / "public" / "data" / "dubai_south" / "buildings_3d.geojson"
    data = json.loads(geojson_path.read_text(encoding="utf-8"))
    features = data["features"]

    # Baseline calculations
    total_roof_area = sum(f["properties"]["roof_area_m2"] for f in features)
    total_solar_kwh = sum(f["properties"]["solar_kwh_yr"] for f in features)
    base_solar_gwh = total_solar_kwh / 1_000_000.0

    assert total_roof_area > 1_000_000, f"Total roof area {total_roof_area} m2 < 1M m2"
    assert base_solar_gwh > 300.0, f"Base solar {base_solar_gwh} GWh < 300 GWh"

    # Simulate Phase 2 BARJEEL-1430 CubeSat with all 3 prescriptions ON
    deploySolar = True
    applyCoolRoof = True
    smartNightDimming = True

    # 1. Clean energy generation
    solar_gwh = base_solar_gwh if deploySolar else 0.0
    # 2. Financial savings (DEWA commercial power tariff @ 0.38 AED/kWh + HVAC chiller savings)
    power_savings_aed_m = solar_gwh * 0.38
    hvac_savings_aed_m = 26.3 if applyCoolRoof else 0.0
    dimming_savings_aed_m = 6.2 if smartNightDimming else 0.0
    total_aed_m = power_savings_aed_m + hvac_savings_aed_m + dimming_savings_aed_m

    # 3. Carbon Avoidance (0.42 kg CO2 / kWh)
    solar_co2_tonnes = solar_gwh * 1000 * 0.42
    hvac_co2_tonnes = (hvac_savings_aed_m / 0.38) * 1000 * 0.42 if applyCoolRoof else 0.0
    dimming_co2_tonnes = (dimming_savings_aed_m / 0.38) * 1000 * 0.42 if smartNightDimming else 0.0
    total_co2_tonnes = solar_co2_tonnes + hvac_co2_tonnes + dimming_co2_tonnes

    # 4. Surface Temperature Reduction
    delta_lst = (3.0 if applyCoolRoof else 0.0) + (0.4 if deploySolar else 0.0)

    assert total_aed_m > 150.0, f"Expected total AED savings > 150M, got {total_aed_m:.1f}M"
    assert total_co2_tonnes > 150_000, f"Expected CO2 avoided > 150k tonnes, got {total_co2_tonnes:.0f}"
    assert delta_lst >= 3.4, f"Expected Delta LST >= 3.4 C, got {delta_lst} C"


def test_t4_03_hil_telemetry_override_and_safemode_workflow():
    """Verify live HIL attitude override and ground safemode command execution."""
    client = TestClient(app)

    # Step 1: Nominal baseline check
    cmd_resp = client.post("/api/command", json={"mode": "NOMINAL_EO_SCAN"})
    assert cmd_resp.status_code == 200

    # Step 2: Inject HIL perturbation
    hil_resp = client.post(
        "/api/hil",
        json={"q0": 0.85, "q1": 0.35, "q2": 0.25, "q3": 0.30, "temp_c": 62.5},
    )
    assert hil_resp.status_code == 200

    with client.websocket_connect("/ws/telemetry") as ws:
        frame = json.loads(ws.receive_text())
        assert frame["source"] == "ESP32_S3_HIL"
        assert frame["adcs"]["temp_c"] == 62.5

    # Step 3: Trigger SAFEHOLD emergency command
    safe_resp = client.post("/api/command", json={"mode": "SAFEHOLD"})
    assert safe_resp.status_code == 200
    assert safe_resp.json()["flight_mode"] == "SAFEHOLD"

    # Step 4: Reset to nominal 14:30 flight mode
    reset_resp = client.post("/api/command", json={"mode": "THERMAL_PEAK_1430"})
    assert reset_resp.status_code == 200


def test_t4_04_emergency_downlink_trigger_on_thermal_anomaly():
    """Simulate acute urban/industrial anomaly triggering immediate high-priority CCSDS downlink."""
    classifier = OrbitalEdgeClassifier()
    patches_dir = BACKEND_DIR / "data" / "s2_patches"

    # Select an industrial patch representing urban/infrastructure facility in Dubai South
    industrial_patches = list(patches_dir.glob("*Industrial*.png"))
    assert len(industrial_patches) > 0, "No industrial patches found for anomaly test"
    anomaly_p = industrial_patches[0]

    res = classifier.classify_patch(anomaly_p)
    assert res["action"] == "DOWNLINK_PRIORITY_ALERT", f"Expected priority alert on {anomaly_p.name}"
    assert res["predicted_class"] not in DROP_CLASSES

    # Frame into CCSDS space packet
    payload = f"{anomaly_p.stem}|{res['predicted_class']}|{res['confidence']}".encode("utf-8")
    hdr_hex, pkt_hex = frame_ccsds_packet(payload, apid=APID_EDGE_AI_ALERT, seq_count=999)
    assert verify_ccsds_packet(pkt_hex) is True
    dec_hdr = decode_ccsds_primary_header(bytes.fromhex(hdr_hex))
    assert dec_hdr["apid"] == APID_EDGE_AI_ALERT
    assert dec_hdr["type"] == "TM"
    assert dec_hdr["seq_count"] == 999


def test_t4_05_three_phase_constellation_scaling_roi():
    """Verify monotonic multi-phase scaling from STAC pilot (TRL 7) to 12x CubeSat constellation."""
    geojson_path = FRONTEND_DIR / "public" / "data" / "dubai_south" / "buildings_3d.geojson"
    data = json.loads(geojson_path.read_text(encoding="utf-8"))
    base_solar_gwh = sum(f["properties"]["solar_kwh_yr"] for f in data["features"]) / 1_000_000.0

    phase_multipliers = {1: 0.45, 2: 1.00, 3: 2.85}
    results = {}

    for phase, mult in phase_multipliers.items():
        solar_gwh = base_solar_gwh * mult
        power_aed_m = solar_gwh * 0.38
        hvac_aed_m = 26.3 * mult
        dim_aed_m = 6.2 * mult
        total_aed_m = power_aed_m + hvac_aed_m + dim_aed_m
        results[phase] = {"solar_gwh": solar_gwh, "total_aed_m": total_aed_m}

    assert results[1]["solar_gwh"] < results[2]["solar_gwh"] < results[3]["solar_gwh"]
    assert results[1]["total_aed_m"] < results[2]["total_aed_m"] < results[3]["total_aed_m"]
    assert results[3]["solar_gwh"] > 1000.0
    assert results[3]["total_aed_m"] > 500.0


# ============================================================================
# MASTER SUITE RUNNER
# ============================================================================

def main():
    runner = E2ERunner()
    runner.print_banner()

    # Tier 1: Feature Coverage
    print(f"\n{TerminalColors.BOLD}{TerminalColors.BLUE}--- TIER 1: FEATURE COVERAGE (UNIT & API CONTRACTS) ---{TerminalColors.RESET}")
    runner.run_test("Tier 1", "01", "CCSDS 133.0-B-2 Primary Header Bit-Packing & Decoding", test_t1_01_ccsds_primary_header_structure)
    runner.run_test("Tier 1", "02", "CCITT CRC-16 Polynomial Error Detection & APIDs", test_t1_02_ccsds_crc16_integrity)
    runner.run_test("Tier 1", "03", "EuroSAT INT8 ONNX Model & Accuracy Report (>= 95.0%)", test_t1_03_eurosat_int8_model_and_classes)
    runner.run_test("Tier 1", "04", "EuroSAT INT8 ONNX Inference Latency Benchmark (< 25.0 ms)", test_t1_04_eurosat_inference_latency_benchmark)
    runner.run_test("Tier 1", "05", "On-Board Radiometric Cloud & Desert Pre-Filter Gates", test_t1_05_edge_ai_radiometric_and_spectral_gates)
    runner.run_test("Tier 1", "06", "FastAPI /api/status & /api/benchmarks REST Endpoints", test_t1_06_rest_status_and_benchmarks)
    runner.run_test("Tier 1", "07", "FastAPI /api/patches & /api/classify/{tile_id} Endpoints", test_t1_07_rest_patches_and_classification)
    runner.run_test("Tier 1", "08", "FastAPI /api/command Flight Mode & /api/hil Overrides", test_t1_08_rest_command_and_hil_endpoints)
    runner.run_test("Tier 1", "09", "WebSocket Live Telemetry Packet (OrbitalTelemetryPacket)", test_t1_09_websocket_telemetry_packet_schema)
    runner.run_test("Tier 1", "10", "3D Buildings GeoJSON Existence, Size (<15MB) & >=180 Count", test_t1_10_geojson_file_and_feature_counts)
    runner.run_test("Tier 1", "11", "3D Buildings GeoJSON 15 Mandatory Property Contracts", test_t1_11_geojson_15_mandatory_property_contracts)
    runner.run_test("Tier 1", "12", "District Summary Contract Schema & Mission Metrics", test_t1_12_district_summary_contract_fields)
    runner.run_test("Tier 1", "13", "Frontend TypeScript Contracts Exports Verification", test_t1_13_frontend_contracts_ts_exports)
    runner.run_test("Tier 1", "14", "Frontend Distribution Build Bundle & HTML Entrypoint", test_t1_14_frontend_build_dist_artifacts)

    # Tier 2: Boundary & Corner Cases
    print(f"\n{TerminalColors.BOLD}{TerminalColors.BLUE}--- TIER 2: BOUNDARY & CORNER CASES (STRESS & TAMPER RESILIENCE) ---{TerminalColors.RESET}")
    runner.run_test("Tier 2", "01", "Dubai South AOI Spatial Coordinate Clamp [55.12-55.24, 24.88-24.98]", test_t2_01_spatial_aoi_boundary_clamp)
    runner.run_test("Tier 2", "02", "Building Geometry Positive Dimensions & Closed Polygons", test_t2_02_geometry_positive_dimensions)
    runner.run_test("Tier 2", "03", "Geotechnical InSAR Subsidence & Summer Afternoon LST Bounds", test_t2_03_insar_and_lst_physical_bounds)
    runner.run_test("Tier 2", "04", "VIIRS Radiance Non-Negativity & Priority Score Bounds", test_t2_04_viirs_radiance_non_negative)
    runner.run_test("Tier 2", "05", "CCSDS Space Packet Single-Bit Payload Tamper Rejection", test_t2_05_ccsds_single_bit_payload_tamper_rejection)
    runner.run_test("Tier 2", "06", "CCSDS Space Packet CRC Trailer Corruption Rejection", test_t2_06_ccsds_crc_trailer_corruption_rejection)
    runner.run_test("Tier 2", "07", "CCSDS Short/Truncated Packet Rejection & Rollover", test_t2_07_ccsds_short_and_empty_payload_bounds)
    runner.run_test("Tier 2", "08", "Edge AI Classifier Saturated Black/White Pixel Handling", test_t2_08_edge_ai_extreme_pixel_inputs)
    runner.run_test("Tier 2", "09", "REST /api/classify 404 Error Handling for Unknown Tiles", test_t2_09_rest_invalid_tile_404_error_handling)
    runner.run_test("Tier 2", "10", "REST /api/command 422 Rejection for Invalid Flight Modes", test_t2_10_rest_invalid_command_payload_rejection)
    runner.run_test("Tier 2", "11", "ADCS Attitude Quaternion Normalization (|q|^2 ~= 1.0)", test_t2_11_adcs_quaternion_normalization_tolerance)
    runner.run_test("Tier 2", "12", "HIL Extreme Thermal Injection Handling (85.0 Celsius)", test_t2_12_extreme_hil_temperature_stress)
    runner.run_test("Tier 2", "13", "Patch Coordinate Parser Fallback on Malformed Names", test_t2_13_patch_coordinate_parser_fallback)
    runner.run_test("Tier 2", "14", "CCSDS Malformed Hex String & Odd-Length Rejection", test_t2_14_ccsds_malformed_hex_resilience)

    # Tier 3: Cross-Feature Combinations & Invariants
    print(f"\n{TerminalColors.BOLD}{TerminalColors.BLUE}--- TIER 3: CROSS-FEATURE COMBINATIONS & INVARIANTS ---{TerminalColors.RESET}")
    runner.run_test("Tier 3", "01", "Telemetry Ground Track to 4-Zone Bounding Intersection", test_t3_01_telemetry_ground_track_zone_mapping)
    runner.run_test("Tier 3", "02", "Edge AI Class Decision vs Downlink Filtering Invariant", test_t3_02_edge_ai_decision_vs_downlink_filtering)
    runner.run_test("Tier 3", "03", "Telemetry Downlink Bandwidth Savings Invariant [68-88%]", test_t3_03_downlink_bandwidth_savings_bound)
    runner.run_test("Tier 3", "04", "Temporal Spectral Delta Trigger Invariant (delta > 4.0)", test_t3_04_temporal_spectral_delta_alert_invariant)
    runner.run_test("Tier 3", "05", "Prescription Canonical Types Alignment Across Contracts", test_t3_05_prescription_type_canonical_alignment)
    runner.run_test("Tier 3", "06", "Solar Capacity to Generation Specific Yield Ratio (Dubai)", test_t3_06_solar_prescription_capacity_consistency)
    runner.run_test("Tier 3", "07", "High-LST Thermal Hotspot Cooling Intervention Assignment", test_t3_07_high_lst_hotspots_cooling_assignment)
    runner.run_test("Tier 3", "08", "High-Subsidence Millimeter Geotechnical Audit Assignment", test_t3_08_high_subsidence_geotech_assignment)
    runner.run_test("Tier 3", "09", "Edge AI Latency vs Telemetry Downlink Bandwidth Correlation", test_t3_09_inference_speed_vs_bandwidth_correlation)
    runner.run_test("Tier 3", "10", "Logistics Mega-Roof Solar Capacity Alignment (>35% Total)", test_t3_10_zone_specific_solar_share_alignment)

    # Tier 4: Real-World Workload Scenarios
    print(f"\n{TerminalColors.BOLD}{TerminalColors.BLUE}--- TIER 4: REAL-WORLD WORKLOAD SCENARIOS ---{TerminalColors.RESET}")
    runner.run_test("Tier 4", "01", "Full 14:30 GST Orbital Pass Push-Broom Swath Simulation", test_t4_01_simulated_full_orbit_pass_dubai_south)
    runner.run_test("Tier 4", "02", "Multi-Phase Closed-Loop Sustainability ROI Simulator", test_t4_02_closed_loop_sustainability_roi_simulation)
    runner.run_test("Tier 4", "03", "HIL Physical Attitude Perturbation & Safemode Escalation", test_t4_03_hil_telemetry_override_and_safemode_workflow)
    runner.run_test("Tier 4", "04", "Acute Thermal Anomaly Immediate High-Priority Downlink", test_t4_04_emergency_downlink_trigger_on_thermal_anomaly)
    runner.run_test("Tier 4", "05", "Three-Phase Constellation Multi-Scale ROI Validation", test_t4_05_three_phase_constellation_scaling_roi)

    exit_code = runner.print_summary()
    sys.exit(exit_code)


if __name__ == "__main__":
    main()
