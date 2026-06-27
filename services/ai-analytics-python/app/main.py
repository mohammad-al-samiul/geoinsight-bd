from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import get_settings
from app.core.exceptions import AppError, app_error_handler
from app.core.lifespan import lifespan
from app.core.metrics import setup_metrics
from app.core.rate_limit import PublicFeedRateLimitMiddleware

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
app.include_router(api_router)
setup_metrics(app)
