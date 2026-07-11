from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class WeatherObservationOut(BaseModel):
    division: str
    district: str | None = None
    name_bn: str
    lat: float
    lng: float
    temp_c: float
    humidity_pct: int
    precipitation_mm: float
    rain_24h_mm: float = 0
    wind_speed_kmh: float
    weather_code: int
    weather_label: str
    weather_label_bn: str
    flood_risk: int = Field(ge=1, le=5)
    cyclone_risk: int = Field(ge=1, le=5)
    heat_stress: int = Field(ge=1, le=5)
    population_at_risk: int
    recorded_at: datetime


class DisasterAlertOut(BaseModel):
    external_id: str
    alert_type: str
    severity: int = Field(ge=1, le=5)
    title: str
    title_bn: str | None = None
    description: str | None = None
    division: str | None = None
    lat: float | None = None
    lng: float | None = None
    population_at_risk: int | None = None
    valid_from: datetime
    valid_to: datetime | None = None
    source: str = "gdacs"


class WeatherFetchResponse(BaseModel):
    observations: list[WeatherObservationOut]
    alerts: list[DisasterAlertOut]
    fetched_at: datetime
    sources: list[str]
