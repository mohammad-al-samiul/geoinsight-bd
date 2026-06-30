from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.core.config import get_settings
from app.infrastructure.redis.client import close_redis_pool, create_redis_pool
from app.infrastructure.messaging.consumer import AiQueueConsumer
from app.infrastructure.messaging.publisher import RabbitPublisher
from app.ml.executor import shutdown_executor, startup_executor
from app.modules.arbitrage.worker import ArbitrageBackgroundWorker


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    settings = get_settings()
    try:
        settings.model_cache_dir.mkdir(parents=True, exist_ok=True)
    except OSError:
        # Docker non-root user may lack write on bundled ml_models/ — use /tmp
        from pathlib import Path
        fallback = Path("/tmp/ml_models/cache")
        fallback.mkdir(parents=True, exist_ok=True)
        settings.model_cache_dir = fallback

    executor = startup_executor(settings.worker_pool_size)
    app.state.executor = executor
    app.state.settings = settings
    app.state.redis = create_redis_pool(settings)

    publisher = RabbitPublisher(settings)
    await publisher.connect()
    app.state.publisher = publisher

    consumer = AiQueueConsumer(settings, publisher)
    await consumer.start()
    app.state.consumer = consumer

    arb_worker = ArbitrageBackgroundWorker(settings, publisher, executor, app.state.redis)
    await arb_worker.start()
    app.state.arb_worker = arb_worker

    yield

    await arb_worker.stop()
    await consumer.stop()
    await publisher.close()
    await close_redis_pool()
    shutdown_executor(executor)
