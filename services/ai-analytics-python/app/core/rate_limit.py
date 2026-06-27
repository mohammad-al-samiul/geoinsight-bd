"""In-process rate limiting for public sentiment feeds (333/999)."""

from __future__ import annotations

import time
from collections import defaultdict
from threading import Lock

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse


class TokenBucket:
    def __init__(self, rate_per_minute: int, burst: int) -> None:
        self.rate = rate_per_minute / 60.0
        self.burst = burst
        self.tokens = float(burst)
        self.updated = time.monotonic()
        self.lock = Lock()

    def allow(self) -> bool:
        with self.lock:
            now = time.monotonic()
            elapsed = now - self.updated
            self.updated = now
            self.tokens = min(self.burst, self.tokens + elapsed * self.rate)
            if self.tokens >= 1:
                self.tokens -= 1
                return True
            return False


class PublicFeedRateLimitMiddleware(BaseHTTPMiddleware):
    """Application-layer DDoS guard for /api/v1/sentiment/* (mirrors nginx zones)."""

    def __init__(self, app, *, feed_333_rpm: int = 30, feed_999_rpm: int = 15) -> None:
        super().__init__(app)
        self._buckets: dict[str, TokenBucket] = defaultdict(
            lambda: TokenBucket(feed_333_rpm, burst=10),
        )
        self._feed_333_rpm = feed_333_rpm
        self._feed_999_rpm = feed_999_rpm

    def _client_key(self, request: Request) -> str:
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            return forwarded.split(",")[0].strip()
        if request.client:
            return request.client.host
        return "unknown"

    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        if not path.startswith("/api/v1/sentiment"):
            return await call_next(request)

        key = self._client_key(request)
        is_999 = "999" in path or request.headers.get("x-feed-tier") == "999"
        rpm = self._feed_999_rpm if is_999 else self._feed_333_rpm
        bucket_key = f"{key}:{'999' if is_999 else '333'}"
        bucket = self._buckets[bucket_key]
        bucket.rate = rpm / 60.0

        if not bucket.allow():
            return JSONResponse(
                status_code=429,
                content={
                    "success": False,
                    "message": "Sentiment feed rate limit exceeded",
                    "tier": "999-union" if is_999 else "333-upazila",
                },
            )
        return await call_next(request)
