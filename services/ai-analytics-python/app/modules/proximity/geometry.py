"""Polygon geometry helpers — Shapely when available, pure-Python fallback otherwise.

Production Docker installs ``shapely`` (GEOS). Local Windows/dev without GEOS
still runs identical containment / distance semantics via ray-casting.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Protocol

try:
    from shapely.geometry import Point as ShapelyPoint
    from shapely.geometry import Polygon as ShapelyPolygon
    from shapely.ops import nearest_points
    from shapely import prepare as shapely_prepare

    HAS_SHAPELY = True
except ImportError:  # pragma: no cover
    HAS_SHAPELY = False

_LAT0 = 23.78
_M_PER_DEG_LAT = 111_320.0
_M_PER_DEG_LNG = 111_320.0 * math.cos(math.radians(_LAT0))


def meters_to_deg(meters: float) -> float:
    return meters / min(_M_PER_DEG_LAT, _M_PER_DEG_LNG)


@dataclass(frozen=True)
class LonLat:
    lng: float
    lat: float


class FenceGeom(Protocol):
    def contains_point(self, lng: float, lat: float) -> bool: ...
    def distance_m(self, lng: float, lat: float) -> float: ...


class ShapelyFence:
    __slots__ = ("_core", "_approach")

    def __init__(self, ring_lng_lat: list[tuple[float, float]], buffer_m: float) -> None:
        core = ShapelyPolygon(ring_lng_lat)
        if not core.is_valid:
            core = core.buffer(0)
        approach = core.buffer(meters_to_deg(buffer_m))
        shapely_prepare(core)
        shapely_prepare(approach)
        self._core = core
        self._approach = approach

    def contains_point(self, lng: float, lat: float) -> bool:
        p = ShapelyPoint(lng, lat)
        return bool(self._core.contains(p) or self._core.covers(p))

    def in_approach(self, lng: float, lat: float) -> bool:
        return bool(self._approach.contains(ShapelyPoint(lng, lat)))

    def distance_m(self, lng: float, lat: float) -> float:
        p = ShapelyPoint(lng, lat)
        if self.contains_point(lng, lat):
            return 0.0
        p1, p2 = nearest_points(p, self._core)
        dlat = (p1.y - p2.y) * _M_PER_DEG_LAT
        dlng = (p1.x - p2.x) * _M_PER_DEG_LNG
        return float(math.hypot(dlat, dlng))


def _point_in_ring(lng: float, lat: float, ring: list[tuple[float, float]]) -> bool:
    """Ray casting (even-odd). ring is (lng, lat)."""
    inside = False
    n = len(ring)
    if n < 3:
        return False
    j = n - 1
    for i in range(n):
        xi, yi = ring[i]
        xj, yj = ring[j]
        intersect = ((yi > lat) != (yj > lat)) and (
            lng < (xj - xi) * (lat - yi) / ((yj - yi) or 1e-16) + xi
        )
        if intersect:
            inside = not inside
        j = i
    return inside


def _dist_point_segment_m(
    lng: float,
    lat: float,
    a: tuple[float, float],
    b: tuple[float, float],
) -> float:
    """Approximate meters from point to segment in lon/lat."""
    ax, ay = a[0], a[1]
    bx, by = b[0], b[1]
    # Local ENU metres
    ax_m, ay_m = 0.0, 0.0
    bx_m = (bx - ax) * _M_PER_DEG_LNG
    by_m = (by - ay) * _M_PER_DEG_LAT
    px_m = (lng - ax) * _M_PER_DEG_LNG
    py_m = (lat - ay) * _M_PER_DEG_LAT
    ab2 = bx_m * bx_m + by_m * by_m
    if ab2 < 1e-9:
        return math.hypot(px_m, py_m)
    t = max(0.0, min(1.0, (px_m * bx_m + py_m * by_m) / ab2))
    return math.hypot(px_m - t * bx_m, py_m - t * by_m)


class PureFence:
    __slots__ = ("_ring", "_buffer_m")

    def __init__(self, ring_lng_lat: list[tuple[float, float]], buffer_m: float) -> None:
        self._ring = list(ring_lng_lat)
        self._buffer_m = buffer_m

    def contains_point(self, lng: float, lat: float) -> bool:
        return _point_in_ring(lng, lat, self._ring)

    def distance_m(self, lng: float, lat: float) -> float:
        if self.contains_point(lng, lat):
            return 0.0
        ring = self._ring
        best = float("inf")
        for i in range(len(ring) - 1):
            best = min(best, _dist_point_segment_m(lng, lat, ring[i], ring[i + 1]))
        if len(ring) >= 2:
            best = min(best, _dist_point_segment_m(lng, lat, ring[-1], ring[0]))
        return float(best)

    def in_approach(self, lng: float, lat: float) -> bool:
        return self.distance_m(lng, lat) <= self._buffer_m


def build_fence(ring_lng_lat: list[tuple[float, float]], buffer_m: float) -> ShapelyFence | PureFence:
    if HAS_SHAPELY:
        return ShapelyFence(ring_lng_lat, buffer_m)
    return PureFence(ring_lng_lat, buffer_m)
