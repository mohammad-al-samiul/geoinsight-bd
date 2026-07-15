from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse
import logging

from app.api.router import api_router
from app.core.config import get_settings
from app.core.exceptions import AppError, app_error_handler
from app.core.lifespan import lifespan
from app.core.metrics import setup_metrics
from app.core.rate_limit import PublicFeedRateLimitMiddleware

logger = logging.getLogger(__name__)
settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    lifespan=lifespan,
    docs_url=None if settings.sovereign_mode else "/docs",
    redoc_url=None if settings.sovereign_mode else "/redoc",
    openapi_url=None if settings.sovereign_mode else "/openapi.json",
)

app.add_middleware(PublicFeedRateLimitMiddleware, feed_333_rpm=settings.public_feed_333_rate_max, feed_999_rpm=settings.public_feed_999_rate_max)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_exception_handler(AppError, app_error_handler)


@app.exception_handler(Exception)
async def unhandled_exception_handler(_request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled exception")
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "message": "Internal server error" if settings.environment == "production" else str(exc),
        },
    )


@app.get("/", include_in_schema=False)
async def root() -> RedirectResponse:
    return RedirectResponse(url="/api/v1/health")


app.include_router(api_router)
setup_metrics(app)
