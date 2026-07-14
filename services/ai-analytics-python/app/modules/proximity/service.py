"""Geo-fencing engine — Shapely (or pure-Python) polygon containment + approach buffers."""

from __future__ import annotations

import math
import time
from datetime import UTC, datetime
from functools import lru_cache

from app.modules.proximity.geometry import HAS_SHAPELY, build_fence
from app.modules.proximity.schemas import (
    GeofenceCheckRequest,
    GeofenceCheckResponse,
    LiveTrackRequest,
    LiveTrackResponse,
    PointCheckResult,
    ProximityStatus,
    TrackPoint,
    ZoneFeature,
    ZoneHit,
    ZonesResponse,
)
from app.modules.proximity.zones import DEFAULT_GEOFENCES, GeofenceDef, zone_as_geojson_feature

_SEVERITY_RANK = {"none": 0, "elevated": 1, "high": 2, "critical": 3}


def _now_iso() -> str:
    return datetime.now(UTC).isoformat()


def _ring_latlng(zone: GeofenceDef) -> list[list[float]]:
    return [[lat, lng] for lng, lat in zone["polygon"]]


def _to_zone_feature(zone: GeofenceDef) -> ZoneFeature:
    return ZoneFeature(
        zone_id=zone["zone_id"],
        name=zone["name"],
        name_bn=zone["name_bn"],
        category=zone["category"],
        alert_level=zone["alert_level"],
        approach_buffer_m=zone["approach_buffer_m"],
        ring_latlng=_ring_latlng(zone),
        geojson=zone_as_geojson_feature(zone),
    )


@lru_cache(maxsize=1)
def _compiled_fences() -> tuple[tuple[GeofenceDef, object], ...]:
    out: list[tuple[GeofenceDef, object]] = []
    for z in DEFAULT_GEOFENCES:
        fence = build_fence(z["polygon"], z["approach_buffer_m"])
        out.append((z, fence))
    return tuple(out)


def _max_severity(hits: list[ZoneHit]) -> str:
    best = "none"
    for h in hits:
        if h.status == ProximityStatus.OUTSIDE:
            continue
        if h.status == ProximityStatus.INSIDE:
            level = h.alert_level
        else:
            level = (
                "elevated"
                if h.alert_level == "elevated"
                else "high"
                if h.alert_level == "critical"
                else "elevated"
            )
        if _SEVERITY_RANK.get(level, 0) > _SEVERITY_RANK.get(best, 0):
            best = level
        if h.status == ProximityStatus.INSIDE and _SEVERITY_RANK.get(h.alert_level, 0) > _SEVERITY_RANK.get(
            best, 0
        ):
            best = h.alert_level
    return best


class ProximityGeofenceEngine:
    """Polygon geo-fence verifier + live VIP track orchestrator."""

    def list_zones(self) -> ZonesResponse:
        features = [_to_zone_feature(z) for z, _ in _compiled_fences()]
        collection = {
            "type": "FeatureCollection",
            "features": [f.geojson for f in features],
        }
        return ZonesResponse(
            zones=features,
            geojson=collection,
            center=[23.7685, 90.3918],
            zoom=12,
        )

    def check(self, body: GeofenceCheckRequest) -> GeofenceCheckResponse:
        wanted = set(body.zone_ids) if body.zone_ids else None
        fences = [
            (z, fence)
            for z, fence in _compiled_fences()
            if wanted is None or z["zone_id"] in wanted
        ]

        results: list[PointCheckResult] = []
        alert_count = 0
        for pt in body.points:
            hits: list[ZoneHit] = []
            for z, fence in fences:
                dist = fence.distance_m(pt.lng, pt.lat)  # type: ignore[attr-defined]
                if fence.contains_point(pt.lng, pt.lat) or dist <= 1.0:  # type: ignore[attr-defined]
                    status = ProximityStatus.INSIDE
                    dist = 0.0
                elif fence.in_approach(pt.lng, pt.lat) or dist <= z["approach_buffer_m"]:  # type: ignore[attr-defined]
                    status = ProximityStatus.APPROACHING
                else:
                    status = ProximityStatus.OUTSIDE
                hits.append(
                    ZoneHit(
                        zone_id=z["zone_id"],
                        name=z["name"],
                        name_bn=z["name_bn"],
                        category=z["category"],
                        alert_level=z["alert_level"],
                        status=status,
                        distance_m=round(float(dist), 1),
                        approach_buffer_m=z["approach_buffer_m"],
                    )
                )
            meaningful = [h for h in hits if h.status != ProximityStatus.OUTSIDE]
            if not meaningful and hits:
                meaningful = [min(hits, key=lambda h: h.distance_m)]

            severity = _max_severity(meaningful)
            alert = any(
                h.status in (ProximityStatus.INSIDE, ProximityStatus.APPROACHING) for h in meaningful
            )
            if alert:
                alert_count += 1
            results.append(
                PointCheckResult(
                    point=pt,
                    hits=meaningful,
                    max_severity=severity,
                    alert=alert,
                )
            )

        return GeofenceCheckResponse(
            results=results,
            alert_count=alert_count,
            checked_at=_now_iso(),
            zones_evaluated=len(fences),
        )

    def _demo_vip_tracks(self) -> list[TrackPoint]:
        t = time.time()
        phase = (t % 120.0) / 120.0 * 2 * math.pi
        pmo_lat, pmo_lng = 23.7686, 90.3918
        r_lat = 0.0018 * math.sin(phase)
        r_lng = 0.0022 * math.cos(phase * 1.3)

        bang_lat, bang_lng = 23.7372, 90.3982
        b_phase = phase + 1.1
        hsia_lat = 23.8430 + 0.004 * math.sin(phase * 0.7)
        hsia_lng = 90.4000 + 0.006 * math.cos(phase * 0.7)

        iso = _now_iso()
        return [
            TrackPoint(
                lat=pmo_lat + r_lat,
                lng=pmo_lng + r_lng,
                label="VIP Motorcade · Alpha",
                source="open_track_sim",
                track_id="vip-alpha",
                recorded_at=iso,
            ),
            TrackPoint(
                lat=bang_lat + 0.0012 * math.cos(b_phase),
                lng=bang_lng + 0.0015 * math.sin(b_phase),
                label="Protective detail · Bangabhaban",
                source="open_track_sim",
                track_id="vip-bravo",
                recorded_at=iso,
            ),
            TrackPoint(
                lat=hsia_lat,
                lng=hsia_lng,
                label="Incoming flight track · HSIA",
                source="adsb_open_proxy",
                track_id="adsb-hsia-1",
                recorded_at=iso,
            ),
            TrackPoint(
                lat=23.7620,
                lng=90.3780,
                label="Parliamentary convoy",
                source="open_track_sim",
                track_id="vip-parliament",
                recorded_at=iso,
            ),
        ]

    def live_snapshot(self, body: LiveTrackRequest) -> LiveTrackResponse:
        zones_resp = self.list_zones()
        points: list[TrackPoint] = list(body.points or [])
        feed = "client_points"
        if body.include_demo_vips or not points:
            points = self._demo_vip_tracks() + points
            feed = "open_track_sim+adsb_proxy" if body.include_demo_vips else feed
            if body.points:
                feed = "hybrid"

        checked = self.check(GeofenceCheckRequest(points=points, zone_ids=body.zone_ids))
        return LiveTrackResponse(
            tracks=checked.results,
            zones=zones_resp.zones,
            geojson=zones_resp.geojson,
            alert_count=checked.alert_count,
            checked_at=checked.checked_at,
            feed=f"{feed}|engine={'shapely' if HAS_SHAPELY else 'pure'}",
        )
