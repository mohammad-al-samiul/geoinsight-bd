"""Pydantic contracts for Interactive Proximity Alert / geo-fencing."""

from __future__ import annotations

from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class ProximityStatus(str, Enum):
    INSIDE = "INSIDE"
    APPROACHING = "APPROACHING"
    OUTSIDE = "OUTSIDE"


class TrackPoint(BaseModel):
    """Real-time lat/lng sample (VIP convoy, open track, or analyst drop)."""

    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)
    label: str | None = Field(default=None, max_length=120)
    source: str | None = Field(
        default=None,
        max_length=80,
        description="Public/open VIP track feed id, ADS-B, or manual",
    )
    recorded_at: str | None = None
    track_id: str | None = Field(default=None, max_length=64)


class GeofenceCheckRequest(BaseModel):
    points: list[TrackPoint] = Field(min_length=1, max_length=200)
    zone_ids: list[str] | None = Field(
        default=None,
        description="Limit check to these zone_ids; default = all seeded fences",
    )


class ZoneHit(BaseModel):
    zone_id: str
    name: str
    name_bn: str
    category: str
    alert_level: str
    status: ProximityStatus
    distance_m: float = Field(description="0 if INSIDE; else shortest distance to polygon")
    approach_buffer_m: float


class PointCheckResult(BaseModel):
    point: TrackPoint
    hits: list[ZoneHit]
    max_severity: str  # none | elevated | high | critical
    alert: bool


class GeofenceCheckResponse(BaseModel):
    results: list[PointCheckResult]
    alert_count: int
    checked_at: str
    zones_evaluated: int


class ZoneFeature(BaseModel):
    zone_id: str
    name: str
    name_bn: str
    category: str
    alert_level: str
    approach_buffer_m: float
    # Leaflet expects [lat, lng] rings for Polygon components we draw manually
    ring_latlng: list[list[float]]
    geojson: dict[str, Any]


class ZonesResponse(BaseModel):
    zones: list[ZoneFeature]
    geojson: dict[str, Any]
    center: list[float]  # [lat, lng]
    zoom: int = 12


class LiveTrackRequest(BaseModel):
    """Optional override points; otherwise server synthesizes demo VIP tracks."""

    points: list[TrackPoint] | None = Field(default=None, max_length=50)
    include_demo_vips: bool = True
    zone_ids: list[str] | None = None


class LiveTrackResponse(BaseModel):
    tracks: list[PointCheckResult]
    zones: list[ZoneFeature]
    geojson: dict[str, Any]
    alert_count: int
    checked_at: str
    feed: str
