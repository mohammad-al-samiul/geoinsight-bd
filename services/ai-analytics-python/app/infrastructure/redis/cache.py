"""Redis cache-aside for arbitrage engine results."""

from __future__ import annotations

import hashlib
import json
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from redis.asyncio import Redis

from app.modules.arbitrage.schemas import ArbitrageRequest, ArbitrageResult

ARBITRAGE_CACHE_PREFIX = "geoinsight:ai:arbitrage:"
ARBITRAGE_CACHE_TTL_SECONDS = 3600  # 1 hour


def _cache_key(request: ArbitrageRequest) -> str:
    raw = f"{request.commodity.lower()}:{request.quantity_mt}"
    digest = hashlib.sha256(raw.encode()).hexdigest()[:24]
    return f"{ARBITRAGE_CACHE_PREFIX}{digest}"


async def get_cached_arbitrage(
    redis: Redis | None,
    request: ArbitrageRequest,
) -> ArbitrageResult | None:
    if redis is None:
        return None
    raw = await redis.get(_cache_key(request))
    if not raw:
        return None
    return ArbitrageResult.model_validate_json(raw)


async def set_cached_arbitrage(
    redis: Redis | None,
    request: ArbitrageRequest,
    result: ArbitrageResult,
) -> None:
    if redis is None:
        return
    await redis.set(
        _cache_key(request),
        json.dumps(result.model_dump()),
        ex=ARBITRAGE_CACHE_TTL_SECONDS,
    )
