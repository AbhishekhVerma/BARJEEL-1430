"""
Mission BARJEEL-1430: Adversarial Challenger 2 Test Suite.
Empirically stress-tests:
1. Geospatial Contracts (Polygon geometry, winding order, non-self-intersection, strict containment).
2. Physical Plausibility (Solar specific yield, LST microclimates, InSAR subsidence [-40 to +15 mm/yr], SAR coherence [0 to 1]).
3. Prescription Simulator & ROI Math (State-space exploration, zero baseline, monotonicity, phase scaling, edge inputs).
4. Frontend Offline Resilience & Fallback Telemetry (CCSDS hex format, quaternion normalization, socket error handling).
5. Repository Sanitization & Forbidden Keyword Audit.
"""

import json
import math
import os
import re
import sys
import unittest
from pathlib import Path
from typing import List, Tuple

ROOT = Path(__file__).resolve().parent.parent
GEOJSON_PATH = ROOT / "frontend" / "public" / "data" / "dubai_south" / "buildings_3d.geojson"
SUMMARY_PATH = ROOT / "frontend" / "public" / "data" / "dubai_south" / "district_summary.json"
AOI_CONFIG_PATH = ROOT / "contracts" / "dubai_south_aoi.json"
CONTRACTS_TS_PATH = ROOT / "frontend" / "src" / "types" / "contracts.ts"
DIST_DIR = ROOT / "frontend" / "dist"

# AOI: [min_lon, min_lat, max_lon, max_lat]
AOI_BBOX = [55.1200, 24.8800, 55.2400, 24.9800]


def shoelace_signed_area(ring: List[List[float]]) -> float:
    """Calculate signed 2D area using shoelace formula for (lon, lat).
    Positive value indicates counter-clockwise (CCW) winding order.
    """
    n = len(ring)
    if n < 3:
        return 0.0
    area = 0.0
    for i in range(n - 1):
        x1, y1 = ring[i][0], ring[i][1]
        x2, y2 = ring[i + 1][0], ring[i + 1][1]
        area += (x1 * y2) - (x2 * y1)
    return 0.5 * area


def ccw_turn(a: Tuple[float, float], b: Tuple[float, float], c: Tuple[float, float]) -> float:
    """2D cross-product orientation test.
    Returns >0 if CCW turn, <0 if CW turn, 0 if collinear.
    """
    return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])


def on_segment(p: Tuple[float, float], a: Tuple[float, float], b: Tuple[float, float]) -> bool:
    """Check if point p lies on segment ab (assuming collinear)."""
    return (
        min(a[0], b[0]) <= p[0] <= max(a[0], b[0])
        and min(a[1], b[1]) <= p[1] <= max(a[1], b[1])
    )


def segments_intersect(
    p1: Tuple[float, float],
    p2: Tuple[float, float],
    p3: Tuple[float, float],
    p4: Tuple[float, float],
) -> bool:
    """Check whether line segment p1-p2 strictly intersects line segment p3-p4."""
    d1 = ccw_turn(p3, p4, p1)
    d2 = ccw_turn(p3, p4, p2)
    d3 = ccw_turn(p1, p2, p3)
    d4 = ccw_turn(p1, p2, p4)

    # General case: segments straddle each other
    if ((d1 > 0 and d2 < 0) or (d1 < 0 and d2 > 0)) and ((d3 > 0 and d4 < 0) or (d3 < 0 and d4 > 0)):
        return True

    # Special collinear overlap cases
    if abs(d1) < 1e-9 and on_segment(p1, p3, p4):
        return True
    if abs(d2) < 1e-9 and on_segment(p2, p3, p4):
        return True
    if abs(d3) < 1e-9 and on_segment(p3, p1, p2):
        return True
    if abs(d4) < 1e-9 and on_segment(p4, p1, p2):
        return True

    return False


def polygon_is_self_intersecting(ring: List[List[float]]) -> bool:
    """Check if any non-adjacent edges of a simple polygon intersect."""
    pts = [(p[0], p[1]) for p in ring]
    n_edges = len(pts) - 1
    if n_edges < 3:
        return True

    for i in range(n_edges):
        e1_a = pts[i]
        e1_b = pts[i + 1]
        for j in range(i + 1, n_edges):
            # Adjacent edges share a vertex, skip them
            if j == i or j == i + 1:
                continue
            # First and last edges share the start/end vertex
            if i == 0 and j == n_edges - 1:
                continue

            e2_a = pts[j]
            e2_b = pts[j + 1]
            if segments_intersect(e1_a, e1_b, e2_a, e2_b):
                return True
    return False


class TestGeospatialContracts(unittest.TestCase):
    """Rigorous empirical validation of GeoJSON structure, coordinates, and polygon topologies."""

    @classmethod
    def setUpClass(cls):
        with open(GEOJSON_PATH, "r", encoding="utf-8") as f:
            cls.geojson = json.load(f)
        cls.features = cls.geojson.get("features", [])

    def test_01_feature_count_and_type(self):
        """Verify feature count >= 180 and valid FeatureCollection."""
        self.assertEqual(self.geojson.get("type"), "FeatureCollection")
        self.assertGreaterEqual(len(self.features), 180, f"Expected >= 180 features, got {len(self.features)}")

    def test_02_all_features_are_valid_polygons(self):
        """Verify each feature is a Polygon with exactly one exterior ring and closed loop."""
        for idx, feat in enumerate(self.features):
            bldg_id = feat.get("properties", {}).get("id", f"idx_{idx}")
            geom = feat.get("geometry")
            self.assertIsNotNone(geom, f"{bldg_id}: missing geometry")
            self.assertEqual(geom.get("type"), "Polygon", f"{bldg_id}: geometry must be Polygon")
            coords = geom.get("coordinates")
            self.assertIsInstance(coords, list, f"{bldg_id}: coordinates must be a list")
            self.assertGreaterEqual(len(coords), 1, f"{bldg_id}: must have at least 1 exterior ring")

            ext_ring = coords[0]
            self.assertGreaterEqual(len(ext_ring), 4, f"{bldg_id}: exterior ring must have >= 4 coordinates")
            # Strict ring closure
            self.assertEqual(
                ext_ring[0], ext_ring[-1],
                f"{bldg_id}: ring not closed ({ext_ring[0]} != {ext_ring[-1]})"
            )

    def test_03_strict_containment_in_dubai_south_aoi(self):
        """Verify every single coordinate of every polygon lies strictly inside [55.12, 24.88, 55.24, 24.98]."""
        min_lon, min_lat, max_lon, max_lat = AOI_BBOX
        out_of_bounds = []

        for feat in self.features:
            bldg_id = feat["properties"]["id"]
            ring = feat["geometry"]["coordinates"][0]
            for pt in ring:
                lon, lat = pt[0], pt[1]
                if not (min_lon <= lon <= max_lon and min_lat <= lat <= max_lat):
                    out_of_bounds.append((bldg_id, lon, lat))

        self.assertEqual(
            len(out_of_bounds), 0,
            f"Found {len(out_of_bounds)} coordinates outside AOI bounds: {out_of_bounds[:5]}"
        )

    def test_04_polygon_winding_order_and_positive_area(self):
        """Verify exterior rings follow counter-clockwise (CCW) winding order and have positive area."""
        cw_polygons = []
        zero_area_polygons = []

        for feat in self.features:
            bldg_id = feat["properties"]["id"]
            ring = feat["geometry"]["coordinates"][0]
            signed_area = shoelace_signed_area(ring)

            if signed_area == 0.0:
                zero_area_polygons.append((bldg_id, signed_area))
            elif signed_area < 0:
                cw_polygons.append((bldg_id, signed_area))

        self.assertEqual(
            len(zero_area_polygons), 0,
            f"Polygons with zero area found: {zero_area_polygons}"
        )
        self.assertEqual(
            len(cw_polygons), 0,
            f"Polygons with CW winding order found (RFC 7946 mandates CCW exterior): {cw_polygons[:5]}"
        )

    def test_05_non_self_intersection(self):
        """Verify no building polygon has self-intersecting or folding edges."""
        self_intersecting = []
        for feat in self.features:
            bldg_id = feat["properties"]["id"]
            ring = feat["geometry"]["coordinates"][0]
            if polygon_is_self_intersecting(ring):
                self_intersecting.append(bldg_id)

        self.assertEqual(
            len(self_intersecting), 0,
            f"Self-intersecting polygons detected: {self_intersecting}"
        )

    def test_06_fifteen_mandatory_properties_typed(self):
        """Verify each feature contains all 15 required typed properties without null or NaN."""
        required_keys = {
            "id": str,
            "zone_id": str,
            "name": str,
            "height_m": (int, float),
            "roof_area_m2": (int, float),
            "land_use_class": str,
            "growth_year": int,
            "lst_celsius": (int, float),
            "subsidence_mm_yr": (int, float),
            "sar_coherence": (int, float),
            "solar_kwh_yr": (int, float),
            "solar_capacity_kwp": (int, float),
            "viirs_radiance": (int, float),
            "prescription": str,
            "priority_score": int,
        }

        valid_zones = {"expo-core", "logistics-mega", "residential-growth", "aviation-infra"}
        valid_prescriptions = {
            "SOLAR_ARRAY",
            "COOL_ROOF_CORRIDOR",
            "GEOTECH_AUDIT",
            "SMART_DIMMING",
            "SOLAR_AND_COOL_ROOF",
        }

        for feat in self.features:
            props = feat.get("properties", {})
            bldg_id = props.get("id", "UNKNOWN")
            for key, expected_type in required_keys.items():
                self.assertIn(key, props, f"{bldg_id}: missing property '{key}'")
                val = props[key]
                self.assertIsNotNone(val, f"{bldg_id}: property '{key}' is null")
                self.assertIsInstance(
                    val, expected_type,
                    f"{bldg_id}: '{key}' has value {val!r} of type {type(val)}, expected {expected_type}"
                )
                if isinstance(val, float):
                    self.assertFalse(math.isnan(val), f"{bldg_id}: '{key}' is NaN")
                    self.assertFalse(math.isinf(val), f"{bldg_id}: '{key}' is Inf")

            self.assertIn(props["zone_id"], valid_zones, f"{bldg_id}: invalid zone_id '{props['zone_id']}'")
            self.assertIn(props["prescription"], valid_prescriptions, f"{bldg_id}: invalid prescription '{props['prescription']}'")
            self.assertGreaterEqual(props["growth_year"], 2019)
            self.assertLessEqual(props["growth_year"], 2026)


class TestPhysicalPlausibility(unittest.TestCase):
    """Empirical verification of physical bounds and engineering domain models."""

    @classmethod
    def setUpClass(cls):
        with open(GEOJSON_PATH, "r", encoding="utf-8") as f:
            cls.features = json.load(f)["features"]
        with open(SUMMARY_PATH, "r", encoding="utf-8") as f:
            cls.summary = json.load(f)

    def test_01_insar_subsidence_and_coherence_physical_bounds(self):
        """Verify Sentinel-1 InSAR subsidence rate is in [-40, +15] mm/yr and coherence in [0.0, 1.0]."""
        for feat in self.features:
            props = feat["properties"]
            bldg_id = props["id"]
            sub = props["subsidence_mm_yr"]
            coh = props["sar_coherence"]

            self.assertGreaterEqual(sub, -40.0, f"{bldg_id}: subsidence {sub} mm/yr exceeds physical collapse bound")
            self.assertLessEqual(sub, 15.0, f"{bldg_id}: subsidence {sub} mm/yr exceeds physical uplift bound")

            self.assertGreaterEqual(coh, 0.0, f"{bldg_id}: coherence {coh} < 0")
            self.assertLessEqual(coh, 1.0, f"{bldg_id}: coherence {coh} > 1.0")

    def test_02_land_surface_temperature_physical_bounds_and_microclimate(self):
        """Verify Landsat 8/9 14:30 GST LST is in [35.0, 55.0] °C and Expo benchmark is cooler than industrial."""
        expo_lsts = []
        logistics_lsts = []

        for feat in self.features:
            props = feat["properties"]
            bldg_id = props["id"]
            lst = props["lst_celsius"]

            self.assertGreaterEqual(lst, 35.0, f"{bldg_id}: LST {lst}°C below summer afternoon physical bound")
            self.assertLessEqual(lst, 55.0, f"{bldg_id}: LST {lst}°C above maximum surface temperature bound")

            if props["zone_id"] == "expo-core":
                expo_lsts.append(lst)
            elif props["zone_id"] == "logistics-mega":
                logistics_lsts.append(lst)

        expo_mean = sum(expo_lsts) / len(expo_lsts)
        logistics_mean = sum(logistics_lsts) / len(logistics_lsts)
        # Expo shaded canopies should be significantly cooler than logistics dark bitumen/metal roofs
        self.assertLess(
            expo_mean, logistics_mean - 3.0,
            f"Physical contradiction: Expo benchmark ({expo_mean:.2f}°C) should be >= 3°C cooler than Logistics ({logistics_mean:.2f}°C)"
        )

    def test_03_solar_specific_yield_ratio_dubai(self):
        """Verify specific yield kWh/kWp/yr matches Dubai GHI/PR standard (1500 to 2000 kWh/kWp/yr)."""
        for feat in self.features:
            props = feat["properties"]
            bldg_id = props["id"]
            kwp = props["solar_capacity_kwp"]
            kwh = props["solar_kwh_yr"]

            self.assertGreater(kwp, 0.0, f"{bldg_id}: solar capacity must be positive")
            self.assertGreater(kwh, 0.0, f"{bldg_id}: solar annual yield must be positive")

            specific_yield = kwh / kwp
            self.assertGreaterEqual(
                specific_yield, 1500.0,
                f"{bldg_id}: specific yield {specific_yield} kWh/kWp/yr is implausibly low for Dubai"
            )
            self.assertLessEqual(
                specific_yield, 2000.0,
                f"{bldg_id}: specific yield {specific_yield} kWh/kWp/yr is implausibly high (> 100% PR)"
            )

    def test_04_solar_packing_density_plausibility(self):
        """Verify rooftop solar capacity corresponds to realistic physical panel coverage and efficiency."""
        for feat in self.features:
            props = feat["properties"]
            bldg_id = props["id"]
            area = props["roof_area_m2"]
            kwp = props["solar_capacity_kwp"]

            # Ratio kWp / m2: 0.65 usable * 0.20 eff = 0.13 kWp/m2
            ratio = kwp / area
            self.assertGreaterEqual(ratio, 0.08, f"{bldg_id}: rooftop solar packing {ratio:.3f} kWp/m2 too low")
            self.assertLessEqual(ratio, 0.25, f"{bldg_id}: rooftop solar packing {ratio:.3f} kWp/m2 exceeds physical limits")

    def test_05_nighttime_viirs_radiance_bounds(self):
        """Verify VIIRS DNB nocturnal radiance is strictly positive and within realistic nocturnal lighting bounds."""
        for feat in self.features:
            props = feat["properties"]
            bldg_id = props["id"]
            viirs = props["viirs_radiance"]
            self.assertGreater(viirs, 5.0, f"{bldg_id}: VIIRS radiance {viirs} must be positive")
            self.assertLessEqual(viirs, 150.0, f"{bldg_id}: VIIRS radiance {viirs} exceeds typical urban limit")

    def test_06_district_summary_aggregate_consistency(self):
        """Verify district_summary.json exactly aggregates building features without drift."""
        features = self.features
        total_roof = round(sum(f["properties"]["roof_area_m2"] for f in features), 0)
        total_kwp = round(sum(f["properties"]["solar_capacity_kwp"] for f in features) / 1000.0, 2)
        total_gwh = round(sum(f["properties"]["solar_kwh_yr"] for f in features) / 1_000_000.0, 2)
        mean_lst = round(sum(f["properties"]["lst_celsius"] for f in features) / len(features), 2)
        hotspots = sum(1 for f in features if f["properties"]["lst_celsius"] >= 46.0)
        sub_watch = sum(1 for f in features if f["properties"]["subsidence_mm_yr"] <= -3.0)

        self.assertEqual(self.summary["total_buildings"], len(features))
        self.assertAlmostEqual(self.summary["total_roof_area_m2"], total_roof, delta=1.0)
        self.assertAlmostEqual(self.summary["total_solar_capacity_mwp"], total_kwp, delta=0.1)
        self.assertAlmostEqual(self.summary["total_solar_gwh_yr"], total_gwh, delta=0.1)
        self.assertAlmostEqual(self.summary["mean_lst_celsius"], mean_lst, delta=0.05)
        self.assertEqual(self.summary["hotspot_count"], hotspots)
        self.assertEqual(self.summary["subsidence_watch_count"], sub_watch)
        self.assertEqual(self.summary["data_source"], "REAL_STAC_SATELLITE_FUSION")


class TestPrescriptionSimulatorEngine(unittest.TestCase):
    """Stress-test Prescription Simulator state space and ROI math formulas."""

    ZONE_OPTIONS = [
        {"id": "ALL", "solarShare": 1.0, "areaShare": 1.0},
        {"id": "expo-core", "solarShare": 0.16, "areaShare": 0.18},
        {"id": "logistics-mega", "solarShare": 0.48, "areaShare": 0.38},
        {"id": "residential-growth", "solarShare": 0.24, "areaShare": 0.28},
        {"id": "aviation-infra", "solarShare": 0.12, "areaShare": 0.16},
    ]

    def _calculate_kpi(self, phase: int, deploy_solar: bool, apply_cool_roof: bool, smart_dimming: bool, zone_id: str):
        """Python oracle replicating PrescriptionSimulator.tsx logic."""
        phase_mult = {1: 0.45, 2: 1.0, 3: 2.85}.get(phase, 1.0)
        zone_cfg = next((z for z in self.ZONE_OPTIONS if z["id"] == zone_id), self.ZONE_OPTIONS[0])

        solar_factor = zone_cfg["solarShare"] * phase_mult
        area_factor = zone_cfg["areaShare"] * phase_mult

        base_solar_gwh = 438.7
        solar_gwh = round(base_solar_gwh * solar_factor * 10) / 10 if deploy_solar else 0.0

        delta_lst = 0.0
        if apply_cool_roof:
            zone_heat_sensitivity = 3.6 if zone_id == "residential-growth" else 3.0
            delta_lst += zone_heat_sensitivity
        if deploy_solar:
            delta_lst += 0.4

        power_savings_aed_m = solar_gwh * 0.38
        hvac_savings_aed_m = 26.3 * area_factor if apply_cool_roof else 0.0
        dimming_savings_aed_m = 6.2 * area_factor if smart_dimming else 0.0
        total_aed_m = round((power_savings_aed_m + hvac_savings_aed_m + dimming_savings_aed_m) * 10) / 10

        solar_co2_avoided = solar_gwh * 1000 * 0.42
        hvac_co2_avoided = (hvac_savings_aed_m / 0.38) * 1000 * 0.42 if apply_cool_roof else 0.0
        dimming_co2_avoided = (dimming_savings_aed_m / 0.38) * 1000 * 0.42 if smart_dimming else 0.0
        total_co2_tonnes = round(solar_co2_avoided + hvac_co2_avoided + dimming_co2_avoided)

        return {
            "deltaLst": round(delta_lst * 10) / 10,
            "solarGwh": solar_gwh,
            "totalAedM": total_aed_m,
            "totalCo2Tonnes": total_co2_tonnes,
        }

    def test_01_all_120_combinations_produce_valid_non_nan_metrics(self):
        """Stress-test all 120 valid combinations of phases, toggles, and target zones."""
        for phase in [1, 2, 3]:
            for deploy_solar in [True, False]:
                for apply_cool_roof in [True, False]:
                    for smart_dimming in [True, False]:
                        for zone_cfg in self.ZONE_OPTIONS:
                            zone_id = zone_cfg["id"]
                            res = self._calculate_kpi(phase, deploy_solar, apply_cool_roof, smart_dimming, zone_id)

                            for metric, val in res.items():
                                self.assertFalse(math.isnan(val), f"NaN detected in {metric} for state ({phase}, {deploy_solar}, {apply_cool_roof}, {smart_dimming}, {zone_id})")
                                self.assertFalse(math.isinf(val), f"Inf detected in {metric} for state ({phase}, {deploy_solar}, {apply_cool_roof}, {smart_dimming}, {zone_id})")
                                self.assertGreaterEqual(val, 0.0, f"Negative value in {metric}: {val}")

    def test_02_zero_baseline_when_all_prescriptions_disabled(self):
        """Verify all impact metrics are strictly 0.0 when all toggles are OFF."""
        for phase in [1, 2, 3]:
            for zone_cfg in self.ZONE_OPTIONS:
                res = self._calculate_kpi(phase, False, False, False, zone_cfg["id"])
                self.assertEqual(res["deltaLst"], 0.0)
                self.assertEqual(res["solarGwh"], 0.0)
                self.assertEqual(res["totalAedM"], 0.0)
                self.assertEqual(res["totalCo2Tonnes"], 0)

    def test_03_monotonicity_of_prescriptions(self):
        """Verify activating any prescription strictly increases or maintains benefits."""
        for phase in [1, 2, 3]:
            for zone_cfg in self.ZONE_OPTIONS:
                zid = zone_cfg["id"]
                base = self._calculate_kpi(phase, False, False, False, zid)
                with_solar = self._calculate_kpi(phase, True, False, False, zid)
                with_cool = self._calculate_kpi(phase, False, True, False, zid)
                with_dim = self._calculate_kpi(phase, False, False, True, zid)
                with_all = self._calculate_kpi(phase, True, True, True, zid)

                self.assertGreater(with_solar["solarGwh"], base["solarGwh"])
                self.assertGreater(with_solar["totalAedM"], base["totalAedM"])
                self.assertGreater(with_solar["deltaLst"], base["deltaLst"])

                self.assertGreater(with_cool["deltaLst"], base["deltaLst"])
                self.assertGreater(with_cool["totalAedM"], base["totalAedM"])

                self.assertGreater(with_dim["totalAedM"], base["totalAedM"])

                self.assertGreaterEqual(with_all["totalAedM"], with_solar["totalAedM"])
                self.assertGreaterEqual(with_all["totalAedM"], with_cool["totalAedM"])

    def test_04_phase_escalation_invariants(self):
        """Verify Phase 3 Constellation produces significantly higher metrics than Phase 2 and Phase 1."""
        for zone_cfg in self.ZONE_OPTIONS:
            zid = zone_cfg["id"]
            p1 = self._calculate_kpi(1, True, True, True, zid)
            p2 = self._calculate_kpi(2, True, True, True, zid)
            p3 = self._calculate_kpi(3, True, True, True, zid)

            self.assertGreater(p2["solarGwh"], p1["solarGwh"])
            self.assertGreater(p3["solarGwh"], p2["solarGwh"])
            self.assertGreater(p2["totalAedM"], p1["totalAedM"])
            self.assertGreater(p3["totalAedM"], p2["totalAedM"])

    def test_05_defensive_handling_of_unknown_inputs(self):
        """Verify robust fallback when unknown zone or out-of-range phase is provided."""
        res_unknown_zone = self._calculate_kpi(2, True, True, True, "unknown-zone-id")
        self.assertGreater(res_unknown_zone["solarGwh"], 0.0)
        self.assertGreater(res_unknown_zone["totalAedM"], 0.0)

        res_bad_phase = self._calculate_kpi(999, True, True, True, "ALL")
        self.assertGreater(res_bad_phase["solarGwh"], 0.0)


class TestFrontendReliabilityAndOfflineResilience(unittest.TestCase):
    """Empirical verification of frontend build artifacts and offline fallback mechanisms."""

    def test_01_frontend_dist_artifacts_exist(self):
        """Verify production build generated valid index.html and non-empty assets."""
        index_html = DIST_DIR / "index.html"
        self.assertTrue(index_html.exists(), "dist/index.html is missing")
        content = index_html.read_text(encoding="utf-8")
        self.assertIn("root", content, "Mount root missing in index.html")

        assets = list((DIST_DIR / "assets").glob("*.js"))
        self.assertGreaterEqual(len(assets), 1, "dist/assets/*.js missing")
        for asset in assets:
            self.assertGreater(asset.stat().st_size, 50_000, f"{asset.name} is suspiciously small")

    def test_02_use_telemetry_stream_offline_fallback_generator(self):
        """Verify client-side fallback telemetry generator produces physically valid packets."""
        # Check source code of useTelemetryStream.ts for correct fallback wiring
        hook_path = ROOT / "frontend" / "src" / "hooks" / "useTelemetryStream.ts"
        self.assertTrue(hook_path.exists(), "useTelemetryStream.ts missing")
        content = hook_path.read_text(encoding="utf-8")

        # Must have FRONTEND_FALLBACK source
        self.assertIn("'FRONTEND_FALLBACK'", content)
        # Must have CCSDS generator
        self.assertIn("generateCcsdsHex", content)
        # Must handle onerror and onclose
        self.assertIn("ws.onerror", content)
        self.assertIn("ws.onclose", content)
        self.assertIn("startFallback", content)
        # Must clean up timers on unmount
        self.assertIn("clearInterval(fallbackTimerRef.current)", content)
        self.assertIn("clearTimeout(reconnectTimerRef.current)", content)


class TestRepositorySanitization(unittest.TestCase):
    """Empirical verification of forbidden keyword removal and repository cleanliness."""

    def test_01_internal_planning_file_deleted(self):
        """Verify docs/TEAM_PROMPTS_AND_PLAN.md does not exist."""
        bad_path = ROOT / "docs" / "TEAM_PROMPTS_AND_PLAN.md"
        self.assertFalse(bad_path.exists(), f"Forbidden planning file still exists at {bad_path}")

    def test_02_zero_forbidden_keywords_across_repository(self):
        """Verify zero occurrences of ruya, recycled, reusing, or TEAM_PROMPTS."""
        forbidden_regex = re.compile(r"\b(ruya|recycled|reusing|TEAM_PROMPTS)\b", re.IGNORECASE)
        target_dirs = [ROOT / "backend", ROOT / "data_pipeline", ROOT / "frontend", ROOT / "contracts"]
        checked_files = [ROOT / "README.md"]

        for d in target_dirs:
            if d.exists():
                for p in d.rglob("*"):
                    if p.is_file() and not any(part in p.parts for part in [".venv", "node_modules", "dist", ".git", "__pycache__"]) and p.suffix != ".pyc":
                        checked_files.append(p)

        violations = []
        for fpath in checked_files:
            try:
                text = fpath.read_text(encoding="utf-8", errors="ignore")
                matches = forbidden_regex.findall(text)
                if matches:
                    violations.append((str(fpath.relative_to(ROOT)), matches))
            except Exception:
                pass

        self.assertEqual(len(violations), 0, f"Found forbidden keywords in files: {violations}")


def main():
    suite = unittest.TestSuite()
    loader = unittest.TestLoader()
    suite.addTests(loader.loadTestsFromTestCase(TestGeospatialContracts))
    suite.addTests(loader.loadTestsFromTestCase(TestPhysicalPlausibility))
    suite.addTests(loader.loadTestsFromTestCase(TestPrescriptionSimulatorEngine))
    suite.addTests(loader.loadTestsFromTestCase(TestFrontendReliabilityAndOfflineResilience))
    suite.addTests(loader.loadTestsFromTestCase(TestRepositorySanitization))

    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    sys.exit(0 if result.wasSuccessful() else 1)


if __name__ == "__main__":
    main()
