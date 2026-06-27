"""Arbitrage orchestration with Redis cache-aside + distributed scrape locks."""

from __future__ import annotations

from typing import TYPE_CHECKING

from app.infrastructure.redis.cache import get_cached_arbitrage, set_cached_arbitrage
from app.infrastructure.redis.lock import distributed_lock
from app.modules.arbitrage.schemas import ArbitrageRequest, ArbitrageResult
from app.modules.arbitrage.service import CommodityScraper

if TYPE_CHECKING:
    from redis.asyncio import Redis


async def run_arbitrage_cached(
    redis: Redis | None,
    scraper: CommodityScraper,
    request: ArbitrageRequest,
) -> ArbitrageResult:
    cached = await get_cached_arbitrage(redis, request)
    if cached is not None:
        return cached

    lock_resource = f"scrape:{request.commodity.lower()}"
    async with distributed_lock(redis, lock_resource, ttl_seconds=600, wait_seconds=30) as acquired:
        if not acquired:
            cached_retry = await get_cached_arbitrage(redis, request)
            if cached_retry is not None:
                return cached_retry
            raise RuntimeError(f"Could not acquire scrape lock for {request.commodity}")

        cached_after_lock = await get_cached_arbitrage(redis, request)
        if cached_after_lock is not None:
            return cached_after_lock

        result = await scraper.run_arbitrage(request)
        await set_cached_arbitrage(redis, request, result)
        return result
