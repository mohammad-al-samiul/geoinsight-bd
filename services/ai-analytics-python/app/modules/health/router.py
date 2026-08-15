import asyncio
import logging

from fastapi import APIRouter, Response

from app.core.config import get_settings

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Health"])


async def _check_redis() -> str:
    settings = get_settings()
    if not settings.redis_url:
        return "skip"
    try:
        from app.infrastructure.redis.client import get_redis

        redis = await get_redis()
        await redis.ping()
        return "ok"
    except Exception:
        logger.debug("Redis readiness check failed", exc_info=True)
        return "fail"


async def _check_rabbitmq() -> str:
    settings = get_settings()
    try:
        import aio_pika

        connection = await asyncio.wait_for(
            aio_pika.connect_robust(settings.rabbitmq_url),
            timeout=3.0,
        )
        await connection.close()
        return "ok"
    except Exception:
        logger.debug("RabbitMQ readiness check failed", exc_info=True)
        return "fail"


@router.get("/health")
async def health() -> dict[str, object]:
    settings = get_settings()
    return {
        "status": "healthy",
        "service": "geoinsight-ai-analytics",
        "sentiment_mock": settings.sentiment_use_mock,
    }


@router.get("/health/live")
async def health_live() -> dict[str, object]:
    settings = get_settings()
    return {
        "status": "healthy",
        "service": "geoinsight-ai-analytics",
        "sentiment_mock": settings.sentiment_use_mock,
    }


@router.get("/health/ready")
async def health_ready(response: Response) -> dict[str, object]:
    checks = {
        "redis": await _check_redis(),
        "rabbitmq": await _check_rabbitmq(),
    }
    failed = [name for name, status in checks.items() if status == "fail"]
    status = "unhealthy" if failed else "healthy"
    if failed:
        response.status_code = 503
    return {
        "status": status,
        "service": "geoinsight-ai-analytics",
        "checks": checks,
    }
