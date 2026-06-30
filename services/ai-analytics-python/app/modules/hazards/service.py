from __future__ import annotations

import math

from app.modules.hazards.schemas import (
    HazardOverlayRequest,
    HazardOverlayResponse,
    ProjectHazardExposure,
)


def _haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lng2 - lng1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


class HazardOverlayEngine:
    def compute(self, req: HazardOverlayRequest) -> HazardOverlayResponse:
        exposures: list[ProjectHazardExposure] = []

        for project in req.projects:
            best: ProjectHazardExposure | None = None
            for zone in req.zones:
                dist = _haversine_km(project.lat, project.lng, zone.lat, zone.lng)
                if dist > zone.radius_km * 1.5:
                    continue
                proximity = max(0, 1 - dist / (zone.radius_km * 1.5))
                exposure = int(min(100, zone.risk_level * 18 * proximity + zone.risk_level * 8))
                if project.status in ("ONGOING", "PLANNED"):
                    exposure = min(100, exposure + 5)

                candidate = ProjectHazardExposure(
                    project_id=project.project_id,
                    title=project.title,
                    hazard_type=zone.hazard_type,
                    exposure_score=exposure,
                    nearest_zone=zone.name,
                    nearest_zone_bn=zone.name_bn,
                    distance_km=round(dist, 1),
                    season=req.season,
                )
                if best is None or candidate.exposure_score > best.exposure_score:
                    best = candidate

            if best and best.exposure_score >= 35:
                exposures.append(best)

        exposures.sort(key=lambda e: e.exposure_score, reverse=True)
        count = len(exposures)

        narrative_en = (
            f"This {req.season} season: {count} project(s) in flood/cyclone risk zones "
            f"(BMD/FFWC overlay)."
        )
        narrative_bn = (
            f"এই {req.season} মৌসুমে {count}টি প্রকল্প বন্যা/ঘূর্ণিঝড় ঝুঁকিতে "
            f"(BMD/FFWC ওভারলে)।"
        )

        return HazardOverlayResponse(
            season=req.season,
            at_risk_count=count,
            exposures=exposures,
            narrative=narrative_en,
            narrative_bn=narrative_bn,
        )
