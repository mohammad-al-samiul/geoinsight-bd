"""Shapely geo-fence containment tests (no network)."""

from __future__ import annotations

from app.modules.proximity.schemas import GeofenceCheckRequest, LiveTrackRequest, TrackPoint
from app.modules.proximity.service import ProximityGeofenceEngine


def test_point_inside_pmo() -> None:
    engine = ProximityGeofenceEngine()
    # Center of PMO box
    resp = engine.check(
        GeofenceCheckRequest(
            points=[TrackPoint(lat=23.7686, lng=90.3918, label="test-inside")],
            zone_ids=["pmo-tejgaon"],
        )
    )
    assert resp.alert_count == 1
    hit = resp.results[0].hits[0]
    assert hit.status.value == "INSIDE"
    assert hit.distance_m == 0.0
    assert resp.results[0].max_severity == "critical"


def test_point_outside_clear() -> None:
    engine = ProximityGeofenceEngine()
    resp = engine.check(
        GeofenceCheckRequest(
            points=[TrackPoint(lat=22.3, lng=91.8, label="ctg")],  # Chattogram
            zone_ids=["pmo-tejgaon"],
        )
    )
    assert resp.results[0].alert is False
    assert resp.results[0].hits[0].status.value == "OUTSIDE"


def test_approach_buffer() -> None:
    engine = ProximityGeofenceEngine()
    # Just outside PMO box but within ~350m approach buffer (north of fence)
    resp = engine.check(
        GeofenceCheckRequest(
            points=[TrackPoint(lat=23.7730, lng=90.3918, label="approach")],
            zone_ids=["pmo-tejgaon"],
        )
    )
    status = resp.results[0].hits[0].status.value
    assert status in {"APPROACHING", "INSIDE"}


def test_zones_geojson() -> None:
    engine = ProximityGeofenceEngine()
    zones = engine.list_zones()
    assert len(zones.zones) >= 4
    assert zones.geojson["type"] == "FeatureCollection"
    assert zones.zones[0].ring_latlng[0][0]  # lat


def test_live_snapshot_demo() -> None:
    engine = ProximityGeofenceEngine()
    snap = engine.live_snapshot(LiveTrackRequest(include_demo_vips=True))
    assert len(snap.tracks) >= 1
    assert snap.feed
    assert snap.checked_at
