import asyncio

import pytest

from app.infrastructure.messaging.publisher import connect_with_retry


def test_connect_with_retry_recovers_after_transient_failure() -> None:
    attempts = 0

    async def flaky_connect() -> str:
        nonlocal attempts
        attempts += 1
        if attempts < 3:
            raise ConnectionError("transient")
        return "connected"

    result = asyncio.run(connect_with_retry(flaky_connect, retries=3, delay_seconds=0))

    assert result == "connected"
    assert attempts == 3


def test_connect_with_retry_raises_after_exhausting_retries() -> None:
    async def failing_connect() -> str:
        raise ConnectionError("still down")

    with pytest.raises(ConnectionError):
        asyncio.run(connect_with_retry(failing_connect, retries=2, delay_seconds=0))
