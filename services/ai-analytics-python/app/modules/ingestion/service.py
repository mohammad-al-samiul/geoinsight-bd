"""Orchestrate RSS/Google News fetch, geo match, and Bangla-BERT sentiment."""

from __future__ import annotations

import asyncio
from concurrent.futures import ProcessPoolExecutor
from datetime import datetime, timezone

from app.core.config import Settings
from app.ml.bangla_bert.pipeline import analyze_batch, sentiment_to_dict
from app.modules.ingestion.fetcher import fetch_all_feeds
from app.modules.ingestion.geo_matcher import match_location
from app.modules.ingestion.schemas import IngestedArticle, IngestionRunRequest, IngestionRunResponse
from app.modules.ingestion.sources import ALL_FEEDS


def _keyword_sentiment(text: str) -> tuple[str, float]:
    """Fast fallback when BERT is unavailable."""
    grievance_kw = ("অভিযোগ", "দুর্নীতি", "অনিয়ম", "হতাশ", "protest", "corruption", "scandal", "fraud")
    demand_kw = ("দাবি", "চাই", "আশা", "demand", "request", "need", "call for")
    lowered = text.lower()
    g = sum(1 for k in grievance_kw if k in text or k in lowered)
    d = sum(1 for k in demand_kw if k in text or k in lowered)
    if g > d and g > 0:
        return "Grievance", min(0.95, 0.55 + g * 0.1)
    if d > 0:
        return "Demand", min(0.9, 0.5 + d * 0.1)
    return "Neutral", 0.6


class IngestionService:
    def __init__(self, settings: Settings, executor: ProcessPoolExecutor) -> None:
        self._settings = settings
        self._executor = executor

    async def run(self, req: IngestionRunRequest) -> IngestionRunResponse:
        raw_articles = await fetch_all_feeds(ALL_FEEDS, max_per_feed=req.max_per_feed)
        feeds_total = len(ALL_FEEDS)

        prepared: list[tuple[IngestedArticle, str, str]] = []

        for raw in raw_articles:
            combined = f"{raw.title}. {raw.summary or ''}"
            district, division = match_location(combined)
            prepared.append(
                (
                    IngestedArticle(
                        source_type=raw.source_type,
                        source_name=raw.source_name,
                        title=raw.title,
                        summary=raw.summary,
                        url=raw.url,
                        published_at=raw.published_at,
                        district=district,
                        division=division,
                        language=raw.language,
                    ),
                    combined[:1500],
                    district or "National",
                ),
            )

        if req.analyze_sentiment and prepared:
            await self._analyze_batch(prepared)

        results = [item[0] for item in prepared]
        feeds_ok = len({a.source_name for a in results})

        return IngestionRunResponse(
            fetched=len(results),
            analyzed=len(results) if req.analyze_sentiment else 0,
            feeds_ok=feeds_ok,
            feeds_total=feeds_total,
            articles=results,
            completed_at=datetime.now(timezone.utc),
        )

    async def _analyze_batch(
        self,
        prepared: list[tuple[IngestedArticle, str, str]],
    ) -> None:
        batch_input = [(text, district, "") for _, text, district in prepared]
        loop = asyncio.get_running_loop()
        try:
            raw_results: list[dict[str, object]] = await loop.run_in_executor(
                self._executor,
                analyze_batch,
                batch_input,
                self._settings.bangla_bert_model_id,
                str(self._settings.model_cache_dir),
                False,
            )
            for (article, text, _), raw in zip(prepared, raw_results, strict=True):
                article.sentiment_category = str(raw["category"])
                article.sentiment_score = float(raw["confidence"])
        except Exception as exc:
            print(f"[ingestion] Batch BERT failed ({exc}), using keyword fallback")
            for article, text, _ in prepared:
                cat, score = _keyword_sentiment(text)
                article.sentiment_category = cat
                article.sentiment_score = score
