"""
Celery task mockup for Anti-Phishing Shield.

GeoInsight BD today runs async AI work via **aio-pika** (`AiQueueConsumer`),
not Celery. Keep this file as a drop-in pattern if / when you add a Celery worker
alongside RabbitMQ (broker = same AMQP URL).

Usage (once celery is installed and a worker is running)::

    from app.modules.phishing.celery_tasks import scan_url_for_phishing
    scan_url_for_phishing.delay("https://bangladesh-gov-login.example.com")

RabbitMQ-native equivalent (already wired in ``consumer.py``)::

    await publisher.publish(
        routing_key="ai.phishing",
        payload={
            "type": "phishing_scan",
            "data": {
                "url": "https://bangladesh-gov-login.example.com",
                "similarity_threshold": 0.90,
            },
        },
    )
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any

logger = logging.getLogger(__name__)

# Optional Celery import — module must still load when Celery is not installed.
try:
    import os

    from celery import Celery

    celery_app = Celery(
        "geoinsight_phishing",
        broker=os.getenv("RABBITMQ_URL", "amqp://guest:guest@localhost:5672//"),
        backend="rpc://",
    )
    celery_app.conf.task_default_queue = "ai_analytics_queue"
except ImportError:  # pragma: no cover
    celery_app = None  # type: ignore[assignment]


def _run_scan_sync(url: str, similarity_threshold: float = 0.90) -> dict[str, Any]:
    from app.modules.phishing.schemas import ScanRequest
    from app.modules.phishing.service import AntiPhishingShield

    shield = AntiPhishingShield()
    result = asyncio.run(
        shield.scan(
            ScanRequest(url=url, similarity_threshold=similarity_threshold)  # type: ignore[arg-type]
        )
    )
    return result.model_dump()


if celery_app is not None:

    @celery_app.task(name="phishing.scan_url", bind=True, max_retries=2)
    def scan_url_for_phishing(
        self,
        url: str,
        similarity_threshold: float = 0.90,
    ) -> dict[str, Any]:
        """
        Background task: fingerprint *url* and return ScanResponse JSON.

        On RED_FLAG the caller (or a Celery chord) should notify PMO ops.
        """
        try:
            payload = _run_scan_sync(url, similarity_threshold)
            if payload.get("status") == "RED_FLAG":
                logger.warning(
                    "Phishing RED_FLAG domain=%s score=%.4f",
                    payload.get("domain_details", {}).get("hostname"),
                    payload.get("similarity_score", 0.0),
                )
            return payload
        except Exception as exc:  # noqa: BLE001
            logger.exception("Celery phishing scan failed for %s", url)
            raise self.retry(exc=exc, countdown=30) from exc

else:

    def scan_url_for_phishing(  # type: ignore[misc]
        url: str,
        similarity_threshold: float = 0.90,
    ) -> dict[str, Any]:
        """Sync fallback used in unit tests / when Celery is absent."""
        return _run_scan_sync(url, similarity_threshold)


def enqueue_phishing_scan_example() -> None:
    """Developer mockup — how a Django / FastAPI view would trigger work."""
    suspicious = "https://bangladesh-gov-bd-secure-login.example"
    if celery_app is not None:
        async_result = scan_url_for_phishing.delay(suspicious, 0.90)
        print("queued celery id:", async_result.id)
    else:
        print("Celery not installed — calling sync fallback / use RabbitMQ phishing_scan")
        print(scan_url_for_phishing(suspicious, 0.90))
