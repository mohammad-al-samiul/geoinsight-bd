from fastapi import APIRouter, Query, Request

from app.modules.sentiment.heatmap_schemas import SentimentHeatmapResponse
from app.modules.sentiment.heatmap_service import SentimentHeatmapService
from app.modules.sentiment.schemas import (
    SentimentAnalyzeRequest,
    SentimentBatchResponse,
    SentimentItem,
    StreamAnalyzeRequest,
)
from app.modules.sentiment.service import SentimentService

router = APIRouter(prefix="/sentiment", tags=["Sentiment"])


def _service(req: Request) -> SentimentService:
    return SentimentService(req.app.state.settings, req.app.state.executor)


@router.post("/analyze", response_model=SentimentItem)
async def analyze_sentiment(body: SentimentAnalyzeRequest, req: Request) -> SentimentItem:
    return await _service(req).analyze_one(body)


@router.post("/stream", response_model=SentimentBatchResponse)
async def analyze_mock_stream(body: StreamAnalyzeRequest, req: Request) -> SentimentBatchResponse:
    return await _service(req).analyze_stream(body.limit)


@router.get("/heatmap", response_model=SentimentHeatmapResponse)
async def sentiment_heatmap(
    req: Request,
    limit: int = Query(default=100, ge=10, le=200),
    level: str = Query(default="district", pattern="^(district|upazila)$"),
) -> SentimentHeatmapResponse:
    heatmap = SentimentHeatmapService(_service(req))
    return await heatmap.build_heatmap(limit=limit, level=level)
