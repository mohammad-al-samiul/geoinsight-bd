"""Proximity geo-fencing & VIP track alerts."""

__all__ = ["ProximityGeofenceEngine", "HAS_SHAPELY"]


def __getattr__(name: str):
    if name == "ProximityGeofenceEngine":
        from app.modules.proximity.service import ProximityGeofenceEngine

        return ProximityGeofenceEngine
    if name == "HAS_SHAPELY":
        from app.modules.proximity.geometry import HAS_SHAPELY

        return HAS_SHAPELY
    raise AttributeError(name)
