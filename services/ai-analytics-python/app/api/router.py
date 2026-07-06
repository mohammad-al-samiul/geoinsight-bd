from fastapi import APIRouter

from app.modules.citizen.router import router as citizen_router
from app.modules.sovereign_llm.router import compat_router as sovereign_compat_router
from app.modules.sovereign_llm.router import router as sovereign_llm_router
from app.modules.twin.router import router as twin_router
from app.modules.accountability.router import router as accountability_router
from app.modules.arbitrage.router import router as arbitrage_router
from app.modules.briefing.router import router as briefing_router
from app.modules.documents.router import router as documents_router
from app.modules.hazards.router import router as hazards_router
from app.modules.health.router import router as health_router
from app.modules.predictive.router import router as predictive_router
from app.modules.procurement.router import router as procurement_router
from app.modules.risk.router import router as risk_router
from app.modules.sentiment.router import router as sentiment_router
from app.modules.simulator.router import router as simulator_router

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(health_router)
api_router.include_router(arbitrage_router)
api_router.include_router(sentiment_router)
api_router.include_router(risk_router)
api_router.include_router(briefing_router)
api_router.include_router(predictive_router)
api_router.include_router(simulator_router)
api_router.include_router(procurement_router)
api_router.include_router(accountability_router)
api_router.include_router(documents_router)
api_router.include_router(hazards_router)
api_router.include_router(sovereign_llm_router)
api_router.include_router(sovereign_compat_router)
api_router.include_router(twin_router)
api_router.include_router(citizen_router)
