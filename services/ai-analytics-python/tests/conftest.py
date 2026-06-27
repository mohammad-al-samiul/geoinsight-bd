"""Shared pytest fixtures for AI analytics service."""

from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from collections.abc import Generator

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.core.config import Settings, get_settings
from app.ml.bangla_bert.pipeline import SentimentResult
from app.modules.sentiment.router import router as sentiment_router


@pytest.fixture(scope="session")
def settings() -> Settings:
    s = get_settings()
    s.sentiment_use_mock = True
    return s


@pytest.fixture
def sentiment_app(settings: Settings) -> FastAPI:
    app = FastAPI(title="GeoInsight AI Test")
    app.state.settings = settings
    app.state.executor = ThreadPoolExecutor(max_workers=4)
    app.include_router(sentiment_router, prefix="/api/v1")
    return app


@pytest.fixture
def client(sentiment_app: FastAPI) -> Generator[TestClient, None, None]:
    with TestClient(sentiment_app) as test_client:
        yield test_client
    sentiment_app.state.executor.shutdown(wait=True)


@pytest.fixture
def mock_bert_result() -> SentimentResult:
    return SentimentResult(
        text="রাস্তা মেরামত চাই",
        category="Demand",
        confidence=0.91,
        district="Dhaka",
        upazila="Savar",
        raw_label="POSITIVE",
    )
