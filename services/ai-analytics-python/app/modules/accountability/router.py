from fastapi import APIRouter

from app.modules.accountability.schemas import AccountabilityBatchRequest, AccountabilityBatchResponse
from app.modules.accountability.service import RepresentativeAccountabilityEngine

router = APIRouter(prefix="/accountability", tags=["Accountability"])
_engine = RepresentativeAccountabilityEngine()


@router.post("/score", response_model=AccountabilityBatchResponse)
async def score_accountability(body: AccountabilityBatchRequest) -> AccountabilityBatchResponse:
    return _engine.score_batch(body)
