"""HTTP routes for Anti-Phishing Shield (`/api/v1/phishing/...`)."""

from __future__ import annotations

from fastapi import APIRouter, BackgroundTasks, Request

from app.infrastructure.messaging.publisher import RabbitPublisher
from app.modules.phishing.schemas import (
    BatchScanRequest,
    BatchScanResponse,
    RegisterOfficialRequest,
    RegisterOfficialResponse,
    ScanRequest,
    ScanResponse,
)
from app.modules.phishing.service import AntiPhishingShield, get_signature_store
from app.modules.phishing.official_domains import DEFAULT_OFFICIAL_URLS

router = APIRouter(prefix="/phishing", tags=["Anti-Phishing Shield"])


@router.get("/official-domains")
async def list_official_domains() -> dict:
    store = get_signature_store()
    return {
        "domains": sorted(store.allow_list),
        "signature_count": len(store.signatures),
        "seed_url_count": len(DEFAULT_OFFICIAL_URLS),
        "seed_urls": DEFAULT_OFFICIAL_URLS,
        "signatures": [
            {
                "registrable_domain": s.registrable_domain,
                "signature_hash": s.signature_hash,
                "source_url": s.source_url,
                "captured_at": s.captured_at,
            }
            for s in store.signatures
        ],
    }


@router.post("/register", response_model=RegisterOfficialResponse)
async def register_official_urls(body: RegisterOfficialRequest) -> RegisterOfficialResponse:
    """Crawl official gov URLs and store digital signatures."""
    shield = AntiPhishingShield()
    return await shield.register_official(body)


@router.post("/register/defaults", response_model=RegisterOfficialResponse)
async def register_default_official_urls(
    timeout_seconds: float = 8.0,
) -> RegisterOfficialResponse:
    """নিবন্ধন: curated Bangladesh government seed list (all ministries / portals)."""
    shield = AntiPhishingShield()
    return await shield.register_defaults(timeout_seconds=timeout_seconds)


@router.post("/scan", response_model=ScanResponse)
async def scan_suspicious_url(
    body: ScanRequest,
    req: Request,
    publish: bool = False,
) -> ScanResponse:
    """
    Compare a suspicious URL against official signatures.

    Returns status RED_FLAG when similarity ≥ threshold and domain is not verified.
    """
    shield = AntiPhishingShield()
    result = await shield.scan(body)

    if publish and result.status.value == "RED_FLAG":
        publisher: RabbitPublisher = req.app.state.publisher
        await publisher.publish(
            routing_key="ai.phishing",
            payload=shield.to_alert_payload(result),
        )

    return result


@router.post("/scan/batch", response_model=BatchScanResponse)
async def scan_batch(body: BatchScanRequest) -> BatchScanResponse:
    shield = AntiPhishingShield()
    return await shield.scan_batch(body)


@router.post("/scan/async")
async def scan_async(
    body: ScanRequest,
    req: Request,
    background_tasks: BackgroundTasks,
) -> dict:
    """
    Fire-and-forget scan using FastAPI BackgroundTasks.

    Preferred production path in this monorepo: publish
    ``{"type": "phishing_scan", "data": {...}}`` to ``ai_analytics_queue``
    (see ``AiQueueConsumer`` — RabbitMQ is the single async bus; no Celery/BullMQ).
    """

    async def _run() -> None:
        shield = AntiPhishingShield()
        result = await shield.scan(body)
        if result.status.value == "RED_FLAG":
            publisher: RabbitPublisher = req.app.state.publisher
            await publisher.publish(
                routing_key="ai.phishing",
                payload=shield.to_alert_payload(result),
            )

    background_tasks.add_task(_run)
    return {
        "accepted": True,
        "url": str(body.url),
        "hint": "RED_FLAG results publish to routing key ai.phishing",
    }
