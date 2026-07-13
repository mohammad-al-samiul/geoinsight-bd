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
    government_context: dict | None = None


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


class PressureItem(BaseModel):
    id: str
    title: str
    intensity: int = Field(ge=0, le=100)
    status: str = "active"  # active | rising | easing
    summary: str
    evidence: list[str] = Field(default_factory=list)


class RiskItem(BaseModel):
    id: str
    title: str
    likelihood: str  # high | medium | low
    horizon: str
    summary: str
    early_signals: list[str] = Field(default_factory=list)


class SolutionItem(BaseModel):
    id: str
    title: str
    targets: list[str] = Field(default_factory=list)
    steps: list[str] = Field(default_factory=list)
    expected_effect: str
    timeframe: str = ""


class PreventionItem(BaseModel):
    id: str
    title: str
    actions: list[str] = Field(default_factory=list)
    owner_hint: str = ""


class GaugeItem(BaseModel):
    id: str
    label: str
    value: int = Field(ge=0, le=100)
    tone: str = "neutral"  # good | warn | bad | neutral


class PriceOutlookItem(BaseModel):
    item: str
    direction: str  # up | down | stable
    magnitude: str  # mild | moderate | sharp
    reason: str
    confidence: str  # high | medium | low


class InvestmentItem(BaseModel):
    sector: str
    outlook: str  # profit | loss | mixed
    rationale: str
    risk: str
    horizon: str = "1–3 years"


class GdpLever(BaseModel):
    sector: str
    action: str
    gdp_impact: str
    feasibility: str  # high | medium | low
    score: int = Field(ge=0, le=100)


class PoliticsDeep(BaseModel):
    narrative: str = ""
    gauges: list[GaugeItem] = Field(default_factory=list)
    current_pressures: list[PressureItem] = Field(default_factory=list)
    upcoming_issues: list[RiskItem] = Field(default_factory=list)
    solutions: list[SolutionItem] = Field(default_factory=list)
    prevention: list[PreventionItem] = Field(default_factory=list)


class EconomyDeep(BaseModel):
    narrative: str = ""
    gauges: list[GaugeItem] = Field(default_factory=list)
    current_pressures: list[PressureItem] = Field(default_factory=list)
    upcoming_issues: list[RiskItem] = Field(default_factory=list)
    price_outlook: list[PriceOutlookItem] = Field(default_factory=list)
    gdp_levers: list[GdpLever] = Field(default_factory=list)
    investments: list[InvestmentItem] = Field(default_factory=list)
    solutions: list[SolutionItem] = Field(default_factory=list)
    prevention: list[PreventionItem] = Field(default_factory=list)


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
    politics_deep: PoliticsDeep = Field(default_factory=PoliticsDeep)
    economy_deep: EconomyDeep = Field(default_factory=EconomyDeep)
