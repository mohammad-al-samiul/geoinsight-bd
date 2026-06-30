from pydantic import BaseModel, Field


class HazardZoneInput(BaseModel):
    zone_id: str
    name: str
    name_bn: str
    hazard_type: str
    risk_level: int = Field(ge=1, le=5)
    division: str
    lat: float
    lng: float
    radius_km: float = Field(default=25, gt=0)


class ProjectGeoInput(BaseModel):
    project_id: str
    title: str
    status: str
    lat: float
    lng: float
    division: str | None = None


class ProjectHazardExposure(BaseModel):
    project_id: str
    title: str
    hazard_type: str
    exposure_score: int = Field(ge=0, le=100)
    nearest_zone: str
    nearest_zone_bn: str
    distance_km: float
    season: str


class HazardOverlayRequest(BaseModel):
    zones: list[HazardZoneInput]
    projects: list[ProjectGeoInput]
    season: str = Field(default="monsoon")


class HazardOverlayResponse(BaseModel):
    season: str
    at_risk_count: int
    exposures: list[ProjectHazardExposure]
    narrative: str
    narrative_bn: str
