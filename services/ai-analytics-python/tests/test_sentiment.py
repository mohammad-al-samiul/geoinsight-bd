"""Sentiment inference tests — mocked Bangla-BERT with latency SLAs."""

from __future__ import annotations

import statistics
import time
from types import SimpleNamespace
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from app.ml.bangla_bert.pipeline import SentimentResult


def _slow_mock_analyze(*_args, **_kwargs) -> SimpleNamespace:
    time.sleep(0.02)
    return SimpleNamespace(
        text="অভিযোগ: পানির সমস্যা",
        category="Grievance",
        confidence=0.88,
        district="Dhaka",
        upazila="Keraniganj",
        raw_label="NEGATIVE",
    )


class TestSentimentAnalyzeEndpoint:
    @patch("app.modules.sentiment.service.analyze_text", side_effect=_slow_mock_analyze)
    def test_analyze_returns_category_and_confidence(
        self,
        _mock_analyze,
        client: TestClient,
    ) -> None:
        response = client.post(
            "/api/v1/sentiment/analyze",
            json={
                "text": "অভিযোগ: পানির সমস্যা",
                "district": "Dhaka",
                "upazila": "Keraniganj",
            },
        )
        assert response.status_code == 200
        body = response.json()
        assert body["category"] == "Grievance"
        assert 0.0 <= body["confidence"] <= 1.0
        assert body["district"] == "Dhaka"
        assert body["raw_label"] == "NEGATIVE"

    @patch("app.modules.sentiment.service.analyze_text", side_effect=_slow_mock_analyze)
    def test_analyze_latency_under_sla(self, _mock_analyze, client: TestClient) -> None:
        samples_ms: list[float] = []
        payload = {
            "text": "দাবি: নতুন স্কুল প্রয়োজন",
            "district": "Rajshahi",
            "upazila": "Paba",
        }
        for _ in range(10):
            start = time.perf_counter()
            response = client.post("/api/v1/sentiment/analyze", json=payload)
            elapsed_ms = (time.perf_counter() - start) * 1000
            assert response.status_code == 200
            samples_ms.append(elapsed_ms)

        p95 = statistics.quantiles(samples_ms, n=20)[18]
        assert p95 < 500, f"p95 latency {p95:.1f}ms exceeds 500ms SLA"


class TestSentimentStreamEndpoint:
    def _batch_result(self, limit: int) -> list[dict[str, object]]:
        return [
            {
                "text": f"sample {i}",
                "category": "Neutral",
                "confidence": 0.75,
                "district": "Dhaka",
                "upazila": "Savar",
                "raw_label": "NEUTRAL",
            }
            for i in range(limit)
        ]

    @patch("app.modules.sentiment.service.analyze_batch")
    def test_stream_batch_counts(self, mock_batch, client: TestClient) -> None:
        mock_batch.return_value = self._batch_result(5)
        response = client.post("/api/v1/sentiment/stream", json={"limit": 5})
        assert response.status_code == 200
        body = response.json()
        assert body["total"] == 5
        assert len(body["items"]) == 5
        assert body["grievance_count"] + body["demand_count"] + body["neutral_count"] == 5

    @patch("app.modules.sentiment.service.analyze_batch")
    def test_stream_batch_latency_sla(self, mock_batch, client: TestClient) -> None:
        def _fast_batch(batch_input, *_args, **_kwargs):
            time.sleep(0.01 * len(batch_input))
            return self._batch_result(len(batch_input))

        mock_batch.side_effect = _fast_batch

        start = time.perf_counter()
        response = client.post("/api/v1/sentiment/stream", json={"limit": 20})
        elapsed_ms = (time.perf_counter() - start) * 1000

        assert response.status_code == 200
        assert elapsed_ms < 2000, f"stream batch took {elapsed_ms:.0f}ms (SLA 2000ms)"


class TestBanglaBertPipelineMock:
    def test_mock_classify_grievance_keyword(self) -> None:
        from app.ml.bangla_bert.pipeline import analyze_text

        result = analyze_text(
            "অভিযোগ: অনিয়ম হয়েছে",
            "Dhaka",
            "Savar",
            "mock-model",
            "/tmp/cache",
            use_mock=True,
        )
        assert result.category == "Grievance"
        assert result.confidence > 0.5

    def test_mock_classify_demand_keyword(self) -> None:
        from app.ml.bangla_bert.pipeline import analyze_text

        result = analyze_text(
            "আমাদের রাস্তা উন্নয়ন চাই",
            "Chattogram",
            "Patiya",
            "mock-model",
            "/tmp/cache",
            use_mock=True,
        )
        assert result.category == "Demand"
