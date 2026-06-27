import uuid

from fastapi import APIRouter, BackgroundTasks, Request

from app.modules.arbitrage.orchestrator import run_arbitrage_cached
from app.modules.arbitrage.schemas import ArbitrageRequest, ArbitrageResult, ScrapeJobResponse
from app.modules.arbitrage.service import CommodityScraper

router = APIRouter(prefix="/arbitrage", tags=["Arbitrage"])


@router.post("/analyze", response_model=ArbitrageResult)
async def analyze_arbitrage(request: ArbitrageRequest, req: Request) -> ArbitrageResult:
    settings = req.app.state.settings
    scraper = CommodityScraper(settings.mock_country_count)
    return await run_arbitrage_cached(req.app.state.redis, scraper, request)


@router.post("/scrape", response_model=ScrapeJobResponse)
async def trigger_scrape(
    request: ArbitrageRequest,
    background_tasks: BackgroundTasks,
    req: Request,
) -> ScrapeJobResponse:
    job_id = str(uuid.uuid4())
    settings = req.app.state.settings
    publisher = req.app.state.publisher

    async def _job() -> None:
        scraper = CommodityScraper(settings.mock_country_count)
        result = await run_arbitrage_cached(req.app.state.redis, scraper, request)
        await publisher.publish(
            routing_key="agro.scrape",
            payload={
                "type": "scrape_complete",
                "job_id": job_id,
                "result": result.model_dump(),
            },
        )

    background_tasks.add_task(_job)
    return ScrapeJobResponse(
        job_id=job_id,
        status="queued",
        message=f"Scraping {settings.mock_country_count} countries for {request.commodity}",
    )
