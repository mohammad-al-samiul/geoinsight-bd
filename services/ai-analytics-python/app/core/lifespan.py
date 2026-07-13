from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI

from app.core.config import get_settings
from app.infrastructure.redis.client import close_redis_pool, create_redis_pool
from app.infrastructure.messaging.consumer import AiQueueConsumer
from app.infrastructure.messaging.publisher import RabbitPublisher
from app.ml.executor import shutdown_executor, startup_executor
from app.modules.arbitrage.worker import ArbitrageBackgroundWorker


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Boot AI service without blocking health on optional infra (Rabbit/Ollama)."""
    settings = get_settings()
    try:
        settings.model_cache_dir.mkdir(parents=True, exist_ok=True)
    except OSError:
        fallback = Path("/tmp/ml_models/cache")
        fallback.mkdir(parents=True, exist_ok=True)
        settings.model_cache_dir = fallback

    executor = startup_executor(settings.worker_pool_size)
    app.state.executor = executor
    app.state.settings = settings

    try:
        app.state.redis = create_redis_pool(settings)
    except Exception as exc:  # noqa: BLE001 — keep HTTP up on Redis blip
        print(f"[lifespan] Redis unavailable at boot: {exc}")
        app.state.redis = None

    publisher = RabbitPublisher(settings)
    try:
        await publisher.connect()
        app.state.publisher = publisher
    except Exception as exc:  # noqa: BLE001
        print(f"[lifespan] RabbitMQ unavailable at boot: {exc}")
        app.state.publisher = None
        publisher = None

    consumer = None
    arb_worker = None
    if publisher is not None:
        try:
            consumer = AiQueueConsumer(settings, publisher)
            await consumer.start()
            app.state.consumer = consumer
        except Exception as exc:  # noqa: BLE001
            print(f"[lifespan] AI queue consumer failed: {exc}")
            app.state.consumer = None

        if app.state.redis is not None:
            try:
                arb_worker = ArbitrageBackgroundWorker(
                    settings, publisher, executor, app.state.redis
                )
                await arb_worker.start()
                app.state.arb_worker = arb_worker
            except Exception as exc:  # noqa: BLE001
                print(f"[lifespan] Arbitrage worker failed: {exc}")
                app.state.arb_worker = None

    # Health endpoint is available as soon as we yield
    yield

    if arb_worker is not None:
        await arb_worker.stop()
    if consumer is not None:
        await consumer.stop()
    if publisher is not None:
        await publisher.close()
    if app.state.redis is not None:
        await close_redis_pool()
    shutdown_executor(executor)
