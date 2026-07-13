import asyncio
import json
from datetime import UTC, datetime
from typing import Any

import aio_pika

from app.core.config import Settings


async def connect_with_retry(connect_func: Any, retries: int = 6, delay_seconds: float = 2.0) -> Any:
    last_error: Exception | None = None
    for attempt in range(retries):
        try:
            return await connect_func()
        except Exception as exc:  # pragma: no cover - simple retry wrapper
            last_error = exc
            if attempt == retries - 1:
                raise
            await asyncio.sleep(delay_seconds)
    if last_error is not None:
        raise last_error
    raise RuntimeError("RabbitMQ connection retry loop exited without a result")


class RabbitPublisher:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._connection: aio_pika.RobustConnection | None = None
        self._channel: aio_pika.Channel | None = None
        self._exchange: aio_pika.Exchange | None = None

    async def connect(self) -> None:
        self._connection = await connect_with_retry(
            lambda: aio_pika.connect_robust(self._settings.rabbitmq_url),
            retries=8,
            delay_seconds=2.0,
        )
        self._channel = await self._connection.channel()
        self._exchange = await self._channel.declare_exchange(
            self._settings.rabbitmq_exchange,
            aio_pika.ExchangeType.TOPIC,
            durable=True,
        )

    async def publish(self, routing_key: str, payload: dict[str, Any]) -> None:
        if not self._exchange or not self._channel:
            raise RuntimeError("RabbitMQ publisher not connected")

        body = json.dumps(
            {
                **payload,
                "published_at": datetime.now(UTC).isoformat(),
            },
        ).encode()

        await self._exchange.publish(
            aio_pika.Message(
                body=body,
                content_type="application/json",
                delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
            ),
            routing_key=routing_key,
        )

    async def close(self) -> None:
        if self._channel and not self._channel.is_closed:
            await self._channel.close()
        if self._connection and not self._connection.is_closed:
            await self._connection.close()
