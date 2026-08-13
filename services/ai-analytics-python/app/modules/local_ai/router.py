from fastapi import APIRouter, Request

from app.modules.local_ai.schemas import (
    AnomalyExplainRequest,
    AnomalyExplainResponse,
    BudgetRiskRequest,
    BudgetRiskResponse,
    ComplaintTriageRequest,
    ComplaintTriageResponse,
    CrowdEstimateRequest,
    CrowdEstimateResponse,
    DigestCompressRequest,
    DigestCompressResponse,
    FieldSummaryRequest,
    FieldSummaryResponse,
    LocalBriefRequest,
    LocalBriefResponse,
    LocalCitizenAssistRequest,
    LocalCitizenAssistResponse,
    PhotoQaRequest,
    PhotoQaResponse,
    PmoMultiBriefRequest,
    PmoMultiBriefResponse,
    PropagandaClassifyRequest,
    PropagandaClassifyResponse,
    ScorecardCommentRequest,
    ScorecardCommentResponse,
    VisitRecommendRequest,
    VisitRecommendResponse,
    WpiExplainRequest,
    WpiExplainResponse,
)
from app.modules.local_ai.service import LocalAiService

router = APIRouter(prefix="/local-ai", tags=["Local AI"])


def _svc(req: Request) -> LocalAiService:
    return LocalAiService(req.app.state.settings)


@router.post("/morning-brief", response_model=LocalBriefResponse)
async def morning_brief(body: LocalBriefRequest, req: Request) -> LocalBriefResponse:
    return await _svc(req).morning_brief(body)


@router.post("/complaint-triage", response_model=ComplaintTriageResponse)
async def complaint_triage(
    body: ComplaintTriageRequest, req: Request
) -> ComplaintTriageResponse:
    return await _svc(req).complaint_triage(body)


@router.post("/wpi-explain", response_model=WpiExplainResponse)
async def wpi_explain(body: WpiExplainRequest, req: Request) -> WpiExplainResponse:
    return await _svc(req).wpi_explain(body)


@router.post("/visit-recommend", response_model=VisitRecommendResponse)
async def visit_recommend(
    body: VisitRecommendRequest, req: Request
) -> VisitRecommendResponse:
    return await _svc(req).visit_recommend(body)


@router.post("/propaganda", response_model=PropagandaClassifyResponse)
async def classify_propaganda(
    body: PropagandaClassifyRequest, req: Request
) -> PropagandaClassifyResponse:
    """BanglaBERT / keyword classify — never Ollama."""
    from app.ml.bangla_bert.pipeline import classify_propaganda as classify_fn

    settings = req.app.state.settings
    result = classify_fn(
        body.text,
        title=body.title,
        model_id=settings.bangla_bert_model_id,
        cache_dir=str(settings.model_cache_dir),
        use_mock=settings.sentiment_use_mock,
    )
    return PropagandaClassifyResponse(**result)


@router.post("/scorecard-comment", response_model=ScorecardCommentResponse)
async def scorecard_comment(
    body: ScorecardCommentRequest, req: Request
) -> ScorecardCommentResponse:
    return await _svc(req).scorecard_comment(body)


@router.post("/digest-compress", response_model=DigestCompressResponse)
async def digest_compress(
    body: DigestCompressRequest, req: Request
) -> DigestCompressResponse:
    return await _svc(req).digest_compress(body)


@router.post("/photo-qa", response_model=PhotoQaResponse)
async def photo_qa(body: PhotoQaRequest, req: Request) -> PhotoQaResponse:
    return await _svc(req).photo_qa(body)


@router.post("/anomaly-explain", response_model=AnomalyExplainResponse)
async def anomaly_explain(
    body: AnomalyExplainRequest, req: Request
) -> AnomalyExplainResponse:
    return await _svc(req).anomaly_explain(body)


@router.post("/citizen-assist", response_model=LocalCitizenAssistResponse)
async def citizen_assist(
    body: LocalCitizenAssistRequest, req: Request
) -> LocalCitizenAssistResponse:
    return await _svc(req).citizen_assist(body)


@router.post("/pmo-multi-brief", response_model=PmoMultiBriefResponse)
async def pmo_multi_brief(
    body: PmoMultiBriefRequest, req: Request
) -> PmoMultiBriefResponse:
    return await _svc(req).pmo_multi_brief(body)


@router.post("/budget-risk", response_model=BudgetRiskResponse)
async def budget_risk(body: BudgetRiskRequest, req: Request) -> BudgetRiskResponse:
    return await _svc(req).budget_risk(body)


@router.post("/field-summary", response_model=FieldSummaryResponse)
async def field_summary(
    body: FieldSummaryRequest, req: Request
) -> FieldSummaryResponse:
    return await _svc(req).field_summary(body)


@router.post("/crowd-estimate", response_model=CrowdEstimateResponse)
async def crowd_estimate(body: CrowdEstimateRequest) -> CrowdEstimateResponse:
    """Haar face-count density band — not generative LLM."""
    import base64
    import re

    import cv2
    import numpy as np

    from app.modules.face_intel.vision import detect_faces

    raw = body.image_base64
    if "," in raw and raw.strip().lower().startswith("data:"):
        raw = raw.split(",", 1)[1]
    raw = re.sub(r"\s+", "", raw)
    data = base64.b64decode(raw)
    arr = np.frombuffer(data, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        return CrowdEstimateResponse(
            face_count=0,
            density_band="LOW",
            note_en="Could not decode image.",
            note_bn="ছবি ডিকোড হয়নি।",
            face_boxes=[],
        )
    boxes = detect_faces(img)
    count = len(boxes)
    if count >= 12:
        band = "HIGH"
    elif count >= 5:
        band = "MEDIUM"
    else:
        band = "LOW"
    return CrowdEstimateResponse(
        face_count=count,
        density_band=band,  # type: ignore[arg-type]
        note_en=f"Detected {count} face(s) — density {band}.",
        note_bn=f"{count}টি মুখ শনাক্ত — ঘনত্ব {band}।",
        face_boxes=[list(b) for b in boxes],
        engine="haar",
    )
