from fastapi import APIRouter

from app.modules.anti_phishing.schemas import DomainScanRequest, DomainScanResponse
from app.modules.anti_phishing.service import anti_phishing_service

router = APIRouter(prefix="/anti-phishing", tags=["Anti-Phishing Shield"])


@router.post("/scan", response_model=DomainScanResponse)
async def scan_domain(body: DomainScanRequest) -> DomainScanResponse:
    """Compare a submitted URL against the approved government domain registry."""
    return anti_phishing_service.scan(str(body.url))
