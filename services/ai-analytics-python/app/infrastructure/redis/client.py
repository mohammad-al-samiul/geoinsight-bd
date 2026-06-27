"""Redis connection pool for FastAPI (cache + distributed locks)."""

from __future__ import annotations

from redis.asyncio import ConnectionPool, Redis

from app.core.config import Settings

_pool: ConnectionPool | None = None
_redis: Redis | None = None


def create_redis_pool(settings: Settings) -> Redis | None:
    global _pool, _redis
    if not settings.redis_url:
        return None
    _pool = ConnectionPool.from_url(
        settings.redis_url,
        max_connections=settings.redis_max_connections,
        decode_responses=True,
    )
    _redis = Redis(connection_pool=_pool)
    return _redis


async def get_redis() -> Redis | None:
    return _redis


async def close_redis_pool() -> None:
    global _pool, _redis
    if _redis is not None:
        await _redis.aclose()
        _redis = None
    if _pool is not None:
        await _pool.aclose()
        _pool = None
