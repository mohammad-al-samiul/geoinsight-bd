"""HTTP routes for Narrative Shield — তথ্য প্রতিরক্ষা ঢাল (/api/v1/narrative-shield/...)."""

from __future__ import annotations

from fastapi import APIRouter, Request

from app.modules.narrative_shield.schemas import (
    BatchClassifyRequest,
    BatchClassifyResponse,
    ClassifyRequest,
    ClassifyResponse,
    DebunkRequest,
    DebunkResponse,
    FeedIngestResponse,
)
from app.modules.narrative_shield.service import NarrativeShieldService

router = APIRouter(prefix="/narrative-shield", tags=["Narrative Shield"])


def _svc(req: Request) -> NarrativeShieldService:
    return NarrativeShieldService(req.app.state.settings)


@router.post("/classify", response_model=ClassifyResponse)
async def classify_signal(body: ClassifyRequest, req: Request) -> ClassifyResponse:
    """
    Classify a single piece of content as a hostile narrative signal.

    Returns threat level, category, confidence score and (optionally) Bengali title.
    """
    return await _svc(req).classify(body)


@router.post("/classify/batch", response_model=BatchClassifyResponse)
async def classify_batch(
    body: BatchClassifyRequest, req: Request
) -> BatchClassifyResponse:
    """Classify up to 50 items in one request."""
    return await _svc(req).classify_batch(body)


@router.post("/debunk", response_model=DebunkResponse)
async def debunk_signal(body: DebunkRequest, req: Request) -> DebunkResponse:
    """
    Generate an official-source RAG rebuttal for a detected hostile narrative.

    Uses Ollama LLM when available; falls back to rule-based templates.
    """
    return await _svc(req).debunk(body)


@router.post("/ingest-feed", response_model=FeedIngestResponse)
async def ingest_feed(req: Request, limit: int = 20) -> FeedIngestResponse:
    """
    Pull the latest hostile narrative signals from open-source feeds.

    `limit` controls how many new signals to ingest per call (max 50).
    """
    limit = min(max(limit, 1), 50)
    return await _svc(req).ingest_feed(limit=limit)
