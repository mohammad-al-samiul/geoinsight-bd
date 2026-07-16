from __future__ import annotations

from pydantic import BaseModel, Field


class DivisionCompletionDrop(BaseModel):
    name: str
    name_bn: str | None = None
    current_rate: float
    previous_rate: float
    drop_pct: float


class BudgetOverrunProject(BaseModel):
    project_id: str
    title: str
    variance_pct: float
    admin_unit_name: str | None = None


class RedFlagSummary(BaseModel):
    id: str
    flag_type: str
    severity: int
    project_title: str
    ai_explanation: str | None = None


class ArbitrageInsight(BaseModel):
    commodity: str
    commodity_bn: str
    cheapest_market: str
    margin_pct: float


class NewsHeadline(BaseModel):
    title: str
    source: str
    district: str | None = None
    sentiment: str | None = None
    url: str | None = None


class BriefingInput(BaseModel):
    lang: str = Field(default="bn", pattern="^(bn|en)$")
    scope_label: str = "National"
    scope_label_bn: str = "জাতীয়"
    completion_rate: float
    open_alerts: int
    completion_drops: list[DivisionCompletionDrop] = Field(default_factory=list)
    budget_overruns: list[BudgetOverrunProject] = Field(default_factory=list)
    new_red_flags: list[RedFlagSummary] = Field(default_factory=list)
    arbitrage_insights: list[ArbitrageInsight] = Field(default_factory=list)
    news_headlines: list[NewsHeadline] = Field(default_factory=list)


class BriefingBullet(BaseModel):
    text: str
    category: str
    priority: int = Field(ge=1, le=5)


class BriefingResponse(BaseModel):
    lang: str
    scope_label: str
    generated_at: str
    bullets: list[BriefingBullet]
    narrative: str
    voice_text: str
    llm_used: bool = False
