from __future__ import annotations

from pydantic import BaseModel, Field


class OutlookSourceIn(BaseModel):
    title: str
    source: str
    url: str | None = None
    domain: str = "politics"  # politics | economy | both
    published_at: str | None = None
    summary: str | None = None


class OutlookGenerateRequest(BaseModel):
    lang: str = "bn"
    sources: list[OutlookSourceIn] = Field(default_factory=list)
    unrest_summary: dict | None = None
    metrics: dict | None = None


class ChallengeItem(BaseModel):
    domain: str  # politics | economy
    title: str
    severity: int = Field(ge=1, le=5)
    summary: str
    evidence: list[str] = Field(default_factory=list)


class DirectionItem(BaseModel):
    domain: str
    trajectory: str  # improving | stable | deteriorating | uncertain
    summary: str
    drivers: list[str] = Field(default_factory=list)


class ScenarioItem(BaseModel):
    label: str
    horizon: str  # 3-5 years
    probability_band: str  # base | adverse | reform
    politics: str
    economy: str
    watchpoints: list[str] = Field(default_factory=list)


class OutlookGenerateResponse(BaseModel):
    lang: str
    generated_at: str
    challenges: list[ChallengeItem]
    direction: list[DirectionItem]
    scenarios: list[ScenarioItem]
    narrative: str
    disclaimer: str
    source_count: int
    llm_used: bool = False
