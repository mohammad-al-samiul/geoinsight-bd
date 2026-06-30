from fastapi import APIRouter

from app.modules.twin.schemas import TwinSimulateRequest, TwinSimulateResponse
from app.modules.twin.service import NationalKpiTwinEngine

router = APIRouter(prefix="/twin", tags=["Digital Twin"])
_engine = NationalKpiTwinEngine()


@router.post("/simulate", response_model=TwinSimulateResponse)
async def simulate_twin(body: TwinSimulateRequest) -> TwinSimulateResponse:
    return _engine.simulate(body)
