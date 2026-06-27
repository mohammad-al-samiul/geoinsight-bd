from __future__ import annotations

import asyncio
from concurrent.futures import ProcessPoolExecutor

from app.core.config import Settings
from app.ml.bangla_bert.pipeline import analyze_batch, analyze_text
from app.modules.sentiment.mock_stream import generate_mock_stream
from app.modules.sentiment.schemas import (
    SentimentAnalyzeRequest,
    SentimentBatchResponse,
    SentimentItem,
)


class SentimentService:
    def __init__(self, settings: Settings, executor: ProcessPoolExecutor) -> None:
        self._settings = settings
        self._executor = executor

    async def analyze_one(self, req: SentimentAnalyzeRequest) -> SentimentItem:
        loop = asyncio.get_running_loop()
        result = await loop.run_in_executor(
            self._executor,
            analyze_text,
            req.text,
            req.district,
            req.upazila,
            self._settings.bangla_bert_model_id,
            str(self._settings.model_cache_dir),
            self._settings.sentiment_use_mock,
        )
        return SentimentItem(**result.__dict__)

    async def analyze_stream(self, limit: int) -> SentimentBatchResponse:
        logs = generate_mock_stream(limit)
        batch_input = [(e.text, e.district, e.upazila) for e in logs]

        loop = asyncio.get_running_loop()
        raw_results: list[dict[str, object]] = await loop.run_in_executor(
            self._executor,
            analyze_batch,
            batch_input,
            self._settings.bangla_bert_model_id,
            str(self._settings.model_cache_dir),
            self._settings.sentiment_use_mock,
        )

        items: list[SentimentItem] = []
        for entry, raw in zip(logs, raw_results, strict=True):
            items.append(
                SentimentItem(
                    source_id=entry.source_id,
                    text=str(raw["text"]),
                    category=str(raw["category"]),
                    confidence=float(raw["confidence"]),
                    district=str(raw["district"]),
                    upazila=str(raw["upazila"]),
                    raw_label=str(raw["raw_label"]),
                ),
            )

        grievance = sum(1 for i in items if i.category == "Grievance")
        demand = sum(1 for i in items if i.category == "Demand")
        neutral = sum(1 for i in items if i.category == "Neutral")

        return SentimentBatchResponse(
            total=len(items),
            grievance_count=grievance,
            demand_count=demand,
            neutral_count=neutral,
            items=items,
        )
