from fastapi import APIRouter, Request

from app.core.config import Settings
from app.modules.documents.schemas import DocumentAnalyzeRequest, DocumentAnalyzeResponse
from app.modules.documents.service import DocumentIntelligenceEngine

router = APIRouter(prefix="/documents", tags=["Documents"])


@router.post("/analyze", response_model=DocumentAnalyzeResponse)
async def analyze_document(body: DocumentAnalyzeRequest, req: Request) -> DocumentAnalyzeResponse:
    settings: Settings = req.app.state.settings
    engine = DocumentIntelligenceEngine(settings)
    return await engine.analyze_async(body)
