from fastapi import APIRouter

from app.modules.arbitrage.router import router as arbitrage_router
from app.modules.health.router import router as health_router
from app.modules.risk.router import router as risk_router
from app.modules.sentiment.router import router as sentiment_router

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(health_router)
api_router.include_router(arbitrage_router)
api_router.include_router(sentiment_router)
api_router.include_router(risk_router)
