from fastapi import APIRouter, Request

from app.modules.ingestion.schemas import IngestionRunRequest, IngestionRunResponse
from app.modules.ingestion.service import IngestionService
from app.modules.ingestion.sources import (
    ALL_FEEDS,
    GOOGLE_NEWS_SITE_FEEDS,
    GOOGLE_NEWS_TOPIC_FEEDS,
    RSS_NEWSPAPER_FEEDS,
)

router = APIRouter(prefix="/ingestion", tags=["Ingestion"])


def _service(req: Request) -> IngestionService:
    return IngestionService(req.app.state.settings, req.app.state.executor)


@router.post("/fetch", response_model=IngestionRunResponse)
async def fetch_online_news(body: IngestionRunRequest, req: Request) -> IngestionRunResponse:
    """Fetch RSS + Google News, geo-match districts, classify sentiment."""
    return await _service(req).run(body)


@router.get("/sources")
async def list_sources() -> dict[str, object]:
    return {
        "newspaper_rss": [{"name": f.name, "url": f.url} for f in RSS_NEWSPAPER_FEEDS],
        "google_news_sites": [{"name": f.name, "url": f.url} for f in GOOGLE_NEWS_SITE_FEEDS],
        "google_news_topics": [{"name": f.name, "url": f.url} for f in GOOGLE_NEWS_TOPIC_FEEDS],
        "total_feeds": len(ALL_FEEDS),
    }
