from __future__ import annotations

from pydantic import BaseModel, Field


class ProjectScoreInput(BaseModel):
    project_id: str
    title: str
    budget_allocated: float
    budget_spent: float
    status: str
    contractor_nid: str | None = None
    open_alerts: int = 0
    contractor_prior_flags: int = 0
    days_since_start: int = 0


class PredictiveScore(BaseModel):
    project_id: str
    title: str
    flag_type: str
    confidence: int = Field(ge=0, le=100)
    horizon_days: int = Field(ge=7, le=14)
    risk_factors: list[str]
    explanation_bn: str
    explanation_en: str


class PredictiveScoreRequest(BaseModel):
    projects: list[ProjectScoreInput]


class PredictiveScoreResponse(BaseModel):
    scores: list[PredictiveScore]
    scanned_at: str
