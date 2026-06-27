"""Redis distributed lock (Redlock subset) for scrape coordination."""

from __future__ import annotations

import asyncio
import time
import uuid
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from redis.asyncio import Redis

LOCK_PREFIX = "geoinsight:ai:lock:"
RELEASE_LUA = """
if redis.call('get', KEYS[1]) == ARGV[1] then
  return redis.call('del', KEYS[1])
else
  return 0
end
"""


@asynccontextmanager
async def distributed_lock(
    redis: Redis | None,
    resource: str,
    *,
    ttl_seconds: int = 300,
    wait_seconds: float = 0.0,
    poll_interval: float = 0.25,
) -> AsyncIterator[bool]:
    """Yield True when lock acquired; False when Redis unavailable (caller may proceed)."""
    if redis is None:
        yield True
        return

    key = f"{LOCK_PREFIX}{resource}"
    token = uuid.uuid4().hex
    deadline = time.monotonic() + wait_seconds

    acquired = False
    while True:
        acquired = await redis.set(key, token, nx=True, ex=ttl_seconds)
        if acquired:
            break
        if time.monotonic() >= deadline:
            break
        await asyncio.sleep(poll_interval)

    try:
        yield bool(acquired)
    finally:
        if acquired:
            await redis.eval(RELEASE_LUA, 1, key, token)
