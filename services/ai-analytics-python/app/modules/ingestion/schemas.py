from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class IngestionRunRequest(BaseModel):
    max_per_feed: int = Field(default=15, ge=1, le=50)
    analyze_sentiment: bool = True


class IngestedArticle(BaseModel):
    source_type: str
    source_name: str
    title: str
    summary: str | None = None
    url: str
    published_at: datetime | None = None
    district: str | None = None
    division: str | None = None
    sentiment_category: str | None = None
    sentiment_score: float | None = None
    language: str = "bn"


class IngestionRunResponse(BaseModel):
    fetched: int
    analyzed: int
    feeds_ok: int
    feeds_total: int
    articles: list[IngestedArticle]
    completed_at: datetime
