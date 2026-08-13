from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

Tone = Literal["danger", "warn", "ok", "info"]
ComplaintCategory = Literal[
    "INFRASTRUCTURE",
    "DRAINAGE",
    "WASTE",
    "SAFETY",
    "TRAFFIC",
    "HILL_CUTTING",
    "HERITAGE",
    "OTHER",
]
ComplaintSeverity = Literal["CRITICAL", "HIGH", "MEDIUM", "LOW"]
VisitReason = Literal["WPI_DROP", "RED_ALERT", "OVERDUE", "OUTAGE", "MANUAL"]


class LocalBriefBulletIn(BaseModel):
    en: str
    bn: str
    tone: Tone = "info"


class LocalBriefActionIn(BaseModel):
    id: str
    kind: str
    priority: int = 50
    title: str
    title_bn: str = ""
    detail: str = ""
    detail_bn: str = ""


class LocalBriefRequest(BaseModel):
    entity_name: str
    entity_name_bn: str | None = None
    summary: dict[str, object] = Field(default_factory=dict)
    bullets: list[LocalBriefBulletIn] = Field(default_factory=list)
    action_queue: list[LocalBriefActionIn] = Field(default_factory=list)
    lang: Literal["bn", "en"] = "bn"


class LocalBriefBulletOut(BaseModel):
    en: str
    bn: str
    tone: Tone = "info"


class LocalBriefResponse(BaseModel):
    bullets: list[LocalBriefBulletOut]
    narrative_en: str | None = None
    narrative_bn: str | None = None
    llm_used: bool = False
    model_tier: str = "quality"


class ComplaintTriageRequest(BaseModel):
    title: str = Field(min_length=2, max_length=500)
    description: str | None = None
    lang: Literal["bn", "en"] = "bn"


class ComplaintTriageResponse(BaseModel):
    category: ComplaintCategory
    severity: ComplaintSeverity
    sla_hours: int = 24
    is_red_alert: bool = False
    rationale_en: str
    rationale_bn: str
    confidence: float = 0.7
    llm_used: bool = False
    model_tier: str = "fast"


class WpiWhyIn(BaseModel):
    code: str
    en: str
    bn: str
    weight: float = 0


class WpiExplainRequest(BaseModel):
    ward_name: str
    ward_name_bn: str | None = None
    score: float
    service_score: float
    infra_score: float
    resolution_score: float
    open_complaints: int = 0
    why: list[WpiWhyIn] = Field(default_factory=list)
    lang: Literal["bn", "en"] = "bn"


class WpiExplainResponse(BaseModel):
    narrative_en: str
    narrative_bn: str
    llm_used: bool = False
    model_tier: str = "quality"


class VisitCandidateIn(BaseModel):
    reason: VisitReason
    title: str
    title_bn: str = ""
    ward_id: str | None = None
    ward_name: str | None = None
    priority: int = 50
    meta: dict[str, object] = Field(default_factory=dict)


class VisitRecommendRequest(BaseModel):
    entity_name: str
    candidates: list[VisitCandidateIn] = Field(default_factory=list)
    lang: Literal["bn", "en"] = "bn"
    top_n: int = 3


class VisitRecommendItem(BaseModel):
    reason: VisitReason
    title: str
    title_bn: str
    ward_id: str | None = None
    ward_name: str | None = None
    priority: int = 50
    meta: dict[str, object] = Field(default_factory=dict)
    rank: int = 1


class VisitRecommendResponse(BaseModel):
    items: list[VisitRecommendItem]
    llm_used: bool = False
    model_tier: str = "fast"


class PropagandaClassifyRequest(BaseModel):
    text: str = Field(min_length=1, max_length=4000)
    title: str | None = None


class PropagandaClassifyResponse(BaseModel):
    is_propaganda: bool
    confidence: float
    note: str
    backend: str = "bangla_bert"


class ScorecardRowIn(BaseModel):
    name: str
    name_bn: str | None = None
    wpi: float = 0
    open: int = 0
    overdue: int = 0
    red_alerts: int = 0
    vs_average: float | None = None


class ScorecardCommentRequest(BaseModel):
    mode: Literal["wards", "entities"] = "wards"
    entity_name: str = ""
    average_wpi: float | None = None
    rows: list[ScorecardRowIn] = Field(default_factory=list)
    lang: Literal["bn", "en"] = "bn"


class ScorecardCommentResponse(BaseModel):
    narrative_en: str
    narrative_bn: str
    highlights: list[str] = Field(default_factory=list)
    llm_used: bool = False
    model_tier: str = "quality"


class DigestCompressRequest(BaseModel):
    entity_name: str
    bullets: list[LocalBriefBulletIn] = Field(default_factory=list)
    action_titles: list[str] = Field(default_factory=list)
    lang: Literal["bn", "en"] = "bn"
    max_chars: int = 420


class DigestCompressResponse(BaseModel):
    text: str
    text_bn: str
    llm_used: bool = False
    model_tier: str = "fast"


class PhotoQaRequest(BaseModel):
    title: str = ""
    description: str | None = None
    before_photo_url: str | None = None
    after_photo_url: str | None = None
    resolution_note: str | None = None


class PhotoQaResponse(BaseModel):
    status: Literal["PASS", "WARN", "FAIL"]
    score: float
    note_en: str
    note_bn: str
    llm_used: bool = False
    model_tier: str = "fast"


class AnomalyExplainRequest(BaseModel):
    title: str
    title_bn: str | None = None
    detail: str | None = None
    metric_label: str | None = None
    metric_value: float | None = None
    metric_unit: str | None = None
    status: str = "WATCH"
    lang: Literal["bn", "en"] = "bn"


class AnomalyExplainResponse(BaseModel):
    severity: Literal["WATCH", "ALERT", "CRITICAL"]
    narrative_en: str
    narrative_bn: str
    should_alert: bool = False
    llm_used: bool = False
    model_tier: str = "fast"


class LocalCitizenAssistRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    entity_name: str = ""
    entity_name_bn: str | None = None
    summary: dict[str, object] = Field(default_factory=dict)
    open_titles: list[str] = Field(default_factory=list)
    lang: Literal["bn", "en"] = "bn"


class LocalCitizenAssistResponse(BaseModel):
    reply: str
    reply_bn: str
    intent: Literal["status", "create_draft", "triage", "general"] = "general"
    draft_title: str | None = None
    draft_category: str | None = None
    draft_severity: str | None = None
    llm_used: bool = False
    model_tier: str = "fast"


class PmoEntitySnapIn(BaseModel):
    code: str = ""
    name: str
    name_bn: str | None = None
    wpi_average: float = 0
    open: int = 0
    overdue: int = 0
    red_alerts: int = 0
    bottom_ward: str | None = None


class PmoMultiBriefRequest(BaseModel):
    entities: list[PmoEntitySnapIn] = Field(default_factory=list)
    top_actions: list[LocalBriefActionIn] = Field(default_factory=list)
    lang: Literal["bn", "en"] = "bn"


class PmoMultiBriefResponse(BaseModel):
    bullets: list[LocalBriefBulletOut]
    narrative_en: str | None = None
    narrative_bn: str | None = None
    llm_used: bool = False
    model_tier: str = "quality"


class BudgetProjectIn(BaseModel):
    title: str
    status: str = "ONGOING"
    allocated: float = 0
    spent: float = 0
    progress_pct: float = 0
    red_flags: int = 0


class BudgetRiskRequest(BaseModel):
    entity_name: str = ""
    summary: dict[str, object] = Field(default_factory=dict)
    projects: list[BudgetProjectIn] = Field(default_factory=list)
    lang: Literal["bn", "en"] = "bn"


class BudgetRiskItem(BaseModel):
    project_title: str
    reason_en: str
    reason_bn: str
    score: float = 0


class BudgetRiskResponse(BaseModel):
    risk_level: Literal["LOW", "MEDIUM", "HIGH"] = "MEDIUM"
    narrative_en: str
    narrative_bn: str
    top_risks: list[BudgetRiskItem] = Field(default_factory=list)
    llm_used: bool = False
    model_tier: str = "fast"


class FieldQueueItemIn(BaseModel):
    title: str
    severity: str = "MEDIUM"
    status: str = "OPEN"
    ward_name: str | None = None
    is_red_alert: bool = False


class FieldSummaryRequest(BaseModel):
    entity_name: str = ""
    queue: list[FieldQueueItemIn] = Field(default_factory=list)
    visits: list[VisitCandidateIn] = Field(default_factory=list)
    outages: list[str] = Field(default_factory=list)
    lang: Literal["bn", "en"] = "bn"
    max_chars: int = 500


class FieldSummaryResponse(BaseModel):
    summary_en: str
    summary_bn: str
    checklist: list[str] = Field(default_factory=list)
    llm_used: bool = False
    model_tier: str = "fast"


class CrowdEstimateRequest(BaseModel):
    image_base64: str = Field(min_length=32)
    note: str | None = None


class CrowdEstimateResponse(BaseModel):
    face_count: int
    density_band: Literal["LOW", "MEDIUM", "HIGH"]
    note_en: str
    note_bn: str
    face_boxes: list[list[int]] = Field(default_factory=list)
    engine: str = "haar"
