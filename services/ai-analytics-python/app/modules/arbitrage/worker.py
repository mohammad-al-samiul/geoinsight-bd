"""Periodic asyncio background worker for commodity arbitrage publishing."""

from __future__ import annotations

import asyncio
import uuid
from concurrent.futures import ProcessPoolExecutor

from app.core.config import Settings
from app.infrastructure.messaging.publisher import RabbitPublisher
from app.modules.arbitrage.orchestrator import run_arbitrage_cached
from app.modules.arbitrage.schemas import ArbitrageRequest
from app.modules.arbitrage.service import CommodityScraper

_DEFAULT_COMMODITIES = ("rice", "wheat", "lentil", "onion")


class ArbitrageBackgroundWorker:
    def __init__(
        self,
        settings: Settings,
        publisher: RabbitPublisher,
        executor: ProcessPoolExecutor,
        redis=None,
    ) -> None:
        self._settings = settings
        self._publisher = publisher
        self._executor = executor
        self._redis = redis
        self._scraper = CommodityScraper(settings.mock_country_count)
        self._task: asyncio.Task[None] | None = None
        self._running = False

    async def start(self) -> None:
        self._running = True
        self._task = asyncio.create_task(self._loop(), name="arbitrage-worker")

    async def stop(self) -> None:
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass

    async def _loop(self) -> None:
        while self._running:
            for commodity in _DEFAULT_COMMODITIES:
                if not self._running:
                    break
                try:
                    result = await run_arbitrage_cached(
                        self._redis,
                        self._scraper,
                        ArbitrageRequest(commodity=commodity, quantity_mt=1000.0),
                    )
                    await self._publisher.publish(
                        routing_key="gov.arbitrage",
                        payload={
                            "type": "arbitrage_update",
                            "job_id": str(uuid.uuid4()),
                            "commodity": result.commodity,
                            "cheapest_country": result.cheapest.country_code,
                            "landed_cost_usd": result.cheapest.landed_cost_usd,
                            "quantity_mt": result.quantity_mt,
                        },
                    )
                except Exception as exc:
                    print(f"[arb-worker] Error for {commodity}: {exc}")
            await asyncio.sleep(self._settings.scrape_interval_sec)

    async def run_once(self, request: ArbitrageRequest) -> dict[str, object]:
        result = await run_arbitrage_cached(self._redis, self._scraper, request)
        return result.model_dump()
