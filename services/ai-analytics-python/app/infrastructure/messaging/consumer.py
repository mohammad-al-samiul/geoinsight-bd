import json
import logging
from typing import Any

import aio_pika

from app.core.config import Settings
from app.infrastructure.messaging.publisher import RabbitPublisher
from app.modules.arbitrage.schemas import ArbitrageRequest
from app.modules.arbitrage.service import CommodityScraper
from app.modules.risk.schemas import ConflictInput
from app.modules.risk.service import GeopoliticalRiskEngine
from app.modules.sentiment.service import SentimentService

logger = logging.getLogger(__name__)


class AiQueueConsumer:
    """Consumes ai_analytics_queue and dispatches CPU/IO work asynchronously."""

    def __init__(self, settings: Settings, publisher: RabbitPublisher) -> None:
        self._settings = settings
        self._publisher = publisher
        self._connection: aio_pika.RobustConnection | None = None
        self._risk_engine = GeopoliticalRiskEngine()

    async def start(self) -> None:
        self._connection = await aio_pika.connect_robust(self._settings.rabbitmq_url)
        channel = await self._connection.channel()
        await channel.set_qos(prefetch_count=5)

        queue = await channel.declare_queue(self._settings.rabbitmq_ai_queue, durable=True)
        await queue.consume(self._on_message)
        logger.info("Consuming queue: %s", self._settings.rabbitmq_ai_queue)

    async def stop(self) -> None:
        if self._connection and not self._connection.is_closed:
            await self._connection.close()

    async def _on_message(self, message: aio_pika.IncomingMessage) -> None:
        async with message.process(requeue=False):
            try:
                payload: dict[str, Any] = json.loads(message.body.decode())
                await self._dispatch(payload)
            except Exception:
                logger.exception("Failed to process message")

    async def _dispatch(self, payload: dict[str, Any]) -> None:
        task_type = payload.get("type", "")

        # Outbound events (legacy routing via agro.*); drain without reprocessing.
        if task_type in ("arbitrage_update", "arbitrage_result"):
            logger.debug("Skipping outbound event: %s", task_type)
            return

        if task_type == "arbitrage_request":
            scraper = CommodityScraper(self._settings.mock_country_count)
            req = ArbitrageRequest(**payload["data"])
            result = await scraper.run_arbitrage(req)
            await self._publisher.publish(
                routing_key="gov.arbitrage",
                payload={"type": "arbitrage_result", "result": result.model_dump()},
            )
            return

        if task_type == "sentiment_batch":
            from app.ml.executor import get_executor

            service = SentimentService(self._settings, get_executor())
            limit = int(payload.get("limit", 50))
            batch = await service.analyze_stream(limit)
            await self._publisher.publish(
                routing_key="ai.sentiment",
                payload={"type": "sentiment_batch", "summary": batch.model_dump()},
            )
            return

        if task_type == "risk_score_request":
            inputs = ConflictInput(**payload["data"])
            result = self._risk_engine.score(inputs)
            await self._publisher.publish(
                routing_key="ai.risk",
                payload={"type": "risk_result", "result": result.model_dump()},
            )
            return

        logger.warning("Unknown task type: %s", task_type)
