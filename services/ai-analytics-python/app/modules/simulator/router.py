from fastapi import APIRouter

from app.modules.simulator.schemas import ScenarioInput, ScenarioResult
from app.modules.simulator.service import CrossMinistrySimulator

router = APIRouter(prefix="/simulator", tags=["Simulator"])
_engine = CrossMinistrySimulator()


@router.post("/run", response_model=ScenarioResult)
async def run_scenario(body: ScenarioInput) -> ScenarioResult:
    return _engine.run(body)
