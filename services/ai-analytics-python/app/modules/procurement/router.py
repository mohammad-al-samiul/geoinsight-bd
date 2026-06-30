from fastapi import APIRouter, Request

from app.modules.procurement.schemas import ProcurementAdviceRequest, ProcurementAdviceResponse
from app.modules.procurement.service import ProcurementAdvisor

router = APIRouter(prefix="/procurement", tags=["Procurement"])


@router.post("/advise", response_model=ProcurementAdviceResponse)
async def procurement_advise(body: ProcurementAdviceRequest, req: Request) -> ProcurementAdviceResponse:
    settings = req.app.state.settings
    advisor = ProcurementAdvisor(country_count=min(settings.mock_country_count, 50))
    return await advisor.advise(body)
