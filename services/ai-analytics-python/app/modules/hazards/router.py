from fastapi import APIRouter

from app.modules.hazards.schemas import HazardOverlayRequest, HazardOverlayResponse
from app.modules.hazards.service import HazardOverlayEngine

router = APIRouter(prefix="/hazards", tags=["Hazards"])
_engine = HazardOverlayEngine()


@router.post("/overlay", response_model=HazardOverlayResponse)
async def hazard_overlay(body: HazardOverlayRequest) -> HazardOverlayResponse:
    return _engine.compute(body)
