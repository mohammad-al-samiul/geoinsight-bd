from __future__ import annotations

from pydantic import BaseModel, Field


class HeatmapCell(BaseModel):
    district: str
    upazila: str | None = None
    grievance_count: int
    demand_count: int
    neutral_count: int
    total: int
    grievance_ratio: float = Field(ge=0, le=1)
    sentiment_score: int = Field(ge=0, le=100)
    trend: str = Field(description="rising | stable | falling")


class SentimentHeatmapResponse(BaseModel):
    level: str
    total_logs: int
    grievance_total: int
    demand_total: int
    cells: list[HeatmapCell]
    source: str = "333/999"
