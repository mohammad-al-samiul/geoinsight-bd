"""Sensitive geofence polygons for VIP / critical infrastructure proximity alerts.

Coordinates are WGS84; Shapely rings use (longitude, latitude) order (GeoJSON).
Polygons are approximate public campus footprints — tune with survey GIS as needed.
"""

from __future__ import annotations

from typing import Any, TypedDict


class GeofenceDef(TypedDict):
    zone_id: str
    name: str
    name_bn: str
    category: str  # vip | critical | aviation | government
    alert_level: str  # critical | high | elevated
    # Outer ring — closed or open; service closes if needed
    polygon: list[tuple[float, float]]  # (lng, lat)
    approach_buffer_m: float


# —— Tejgaon: Prime Minister's Office campus (approx.) ——
_PMO: list[tuple[float, float]] = [
    (90.3888, 23.7712),
    (90.3948, 23.7712),
    (90.3948, 23.7660),
    (90.3888, 23.7660),
    (90.3888, 23.7712),
]

# —— Bangabhaban ——
_BANGABHABAN: list[tuple[float, float]] = [
    (90.3955, 23.7398),
    (90.4010, 23.7398),
    (90.4010, 23.7345),
    (90.3955, 23.7345),
    (90.3955, 23.7398),
]

# —— Jatiya Sangsad (Parliament) ——
_PARLIAMENT: list[tuple[float, float]] = [
    (90.3745, 23.7648),
    (90.3810, 23.7648),
    (90.3810, 23.7595),
    (90.3745, 23.7595),
    (90.3745, 23.7648),
]

# —— Bangladesh Secretariat ——
_SECRETARIAT: list[tuple[float, float]] = [
    (90.4035, 23.7335),
    (90.4105, 23.7335),
    (90.4105, 23.7265),
    (90.4035, 23.7265),
    (90.4035, 23.7335),
]

# —— Hazrat Shahjalal International Airport (core airside + terminal) ——
_HSIA: list[tuple[float, float]] = [
    (90.3900, 23.8580),
    (90.4150, 23.8580),
    (90.4150, 23.8350),
    (90.3900, 23.8350),
    (90.3900, 23.8580),
]

# —— GID / Armed Forces Division, Dhaka Cantonment (public approx box) ——
_CANTONMENT: list[tuple[float, float]] = [
    (90.3850, 23.8250),
    (90.4050, 23.8250),
    (90.4050, 23.8050),
    (90.3850, 23.8050),
    (90.3850, 23.8250),
]

DEFAULT_GEOFENCES: list[GeofenceDef] = [
    {
        "zone_id": "pmo-tejgaon",
        "name": "Prime Minister's Office",
        "name_bn": "প্রধানমন্ত্রীর কার্যালয়",
        "category": "vip",
        "alert_level": "critical",
        "polygon": _PMO,
        "approach_buffer_m": 350.0,
    },
    {
        "zone_id": "bangabhaban",
        "name": "Bangabhaban",
        "name_bn": "বঙ্গভবন",
        "category": "vip",
        "alert_level": "critical",
        "polygon": _BANGABHABAN,
        "approach_buffer_m": 300.0,
    },
    {
        "zone_id": "parliament",
        "name": "Jatiya Sangsad",
        "name_bn": "জাতীয় সংসদ",
        "category": "government",
        "alert_level": "high",
        "polygon": _PARLIAMENT,
        "approach_buffer_m": 400.0,
    },
    {
        "zone_id": "secretariat",
        "name": "Bangladesh Secretariat",
        "name_bn": "বাংলাদেশ সচিবালয়",
        "category": "government",
        "alert_level": "high",
        "polygon": _SECRETARIAT,
        "approach_buffer_m": 250.0,
    },
    {
        "zone_id": "hsia",
        "name": "Hazrat Shahjalal International Airport",
        "name_bn": "হযরত শাহজালাল আন্তর্জাতিক বিমানবন্দর",
        "category": "aviation",
        "alert_level": "elevated",
        "polygon": _HSIA,
        "approach_buffer_m": 800.0,
    },
    {
        "zone_id": "dhaka-cantonment",
        "name": "Dhaka Cantonment (AOR)",
        "name_bn": "ঢাকা সেনানিবাস",
        "category": "critical",
        "alert_level": "high",
        "polygon": _CANTONMENT,
        "approach_buffer_m": 500.0,
    },
]


def zone_as_geojson_feature(zone: GeofenceDef) -> dict[str, Any]:
    """Leaflet-friendly GeoJSON Feature (coordinates already lng/lat)."""
    return {
        "type": "Feature",
        "properties": {
            "zone_id": zone["zone_id"],
            "name": zone["name"],
            "name_bn": zone["name_bn"],
            "category": zone["category"],
            "alert_level": zone["alert_level"],
            "approach_buffer_m": zone["approach_buffer_m"],
        },
        "geometry": {
            "type": "Polygon",
            "coordinates": [list(zone["polygon"])],
        },
    }
