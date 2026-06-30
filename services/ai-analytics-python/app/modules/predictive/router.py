from fastapi import APIRouter

from app.modules.predictive.schemas import PredictiveScoreRequest, PredictiveScoreResponse
from app.modules.predictive.service import PredictiveRedFlagEngine

router = APIRouter(prefix="/predictive", tags=["Predictive"])
_engine = PredictiveRedFlagEngine()


@router.post("/score", response_model=PredictiveScoreResponse)
async def score_projects(body: PredictiveScoreRequest) -> PredictiveScoreResponse:
    return _engine.score_batch(body)
