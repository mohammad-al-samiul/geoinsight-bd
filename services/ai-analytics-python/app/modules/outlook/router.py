from fastapi import APIRouter, Request

from app.core.config import get_settings
from app.modules.outlook.schemas import OutlookGenerateRequest, OutlookGenerateResponse
from app.modules.outlook.service import OutlookService

router = APIRouter(prefix="/outlook", tags=["Strategic Outlook"])


@router.post("/generate", response_model=OutlookGenerateResponse)
async def generate_outlook(body: OutlookGenerateRequest, req: Request) -> OutlookGenerateResponse:
    settings = get_settings()
    service = OutlookService(settings)
    return await service.generate(body)
