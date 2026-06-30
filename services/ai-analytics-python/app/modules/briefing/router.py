from fastapi import APIRouter, Request

from app.modules.briefing.schemas import BriefingInput, BriefingResponse
from app.modules.briefing.service import BriefingService

router = APIRouter(prefix="/briefing", tags=["Briefing"])


@router.post("/generate", response_model=BriefingResponse)
async def generate_briefing(body: BriefingInput, req: Request) -> BriefingResponse:
    service = BriefingService(req.app.state.settings)
    return await service.generate(body)
