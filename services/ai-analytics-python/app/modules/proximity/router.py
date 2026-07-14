"""Interactive Proximity Alert — geo-fencing HTTP API."""

from __future__ import annotations

from fastapi import APIRouter, Query

from app.modules.proximity.schemas import (
    GeofenceCheckRequest,
    GeofenceCheckResponse,
    LiveTrackRequest,
    LiveTrackResponse,
    ZonesResponse,
)
from app.modules.proximity.service import ProximityGeofenceEngine

router = APIRouter(prefix="/proximity", tags=["Proximity Alerts"])
_engine = ProximityGeofenceEngine()


@router.get("/zones", response_model=ZonesResponse)
async def list_geofence_zones() -> ZonesResponse:
    """Return seeded sensitive-area polygons (PMO, Bangabhaban, etc.)."""
    return _engine.list_zones()


@router.post("/check", response_model=GeofenceCheckResponse)
async def check_geofence(body: GeofenceCheckRequest) -> GeofenceCheckResponse:
    """
    Verify whether lat/lng samples fall inside / approach defined polygons
    using Shapely geometry.
    """
    return _engine.check(body)


@router.post("/live", response_model=LiveTrackResponse)
async def live_proximity_snapshot(body: LiveTrackRequest | None = None) -> LiveTrackResponse:
    """
    Real-time proximity snapshot for the dashboard map.

    If ``include_demo_vips`` is true (default), synthesizes open-source-style
    VIP/aircraft track samples when no external VIP API is configured.
    """
    return _engine.live_snapshot(body or LiveTrackRequest())


@router.get("/live", response_model=LiveTrackResponse)
async def live_proximity_get(
    include_demo_vips: bool = Query(default=True),
) -> LiveTrackResponse:
    """Polling-friendly GET for the Interactive Proximity Alert Map."""
    return _engine.live_snapshot(LiveTrackRequest(include_demo_vips=include_demo_vips))
