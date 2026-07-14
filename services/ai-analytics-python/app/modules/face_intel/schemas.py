"""Pydantic contracts for Face Intel / Ethical Report Card."""

from __future__ import annotations

from pydantic import BaseModel, Field


class FaceMatchMeta(BaseModel):
    matched: bool
    confidence: float = Field(ge=0, le=1)
    face_detected: bool
    face_boxes: list[list[int]] = Field(default_factory=list)
    vip_id: str | None = None
    nid: str | None = None
    representative_id: str | None = None
    engine: str = "opencv"


class EthicalReportCard(BaseModel):
    """Dashboard contract — exactly the DSS fields required by product."""

    vip_name: str
    designation: str
    ethical_score: int = Field(ge=0, le=100)
    red_flags_count: int = Field(ge=0)
    key_allegations: list[str] = Field(default_factory=list)
    # Enrichment for overlay / audit
    representative_id: str | None = None
    nid: str | None = None
    designation_bn: str | None = None
    party: str | None = None
    window_days: int = 180
    public_activity_count: int = 0
    complaint_proxy_count: int = 0
    match: FaceMatchMeta | None = None
    explanation: str | None = None
    explanation_bn: str | None = None


class IdentifyByNidRequest(BaseModel):
    nid: str = Field(min_length=5, max_length=20)
    lang: str = Field(default="bn", pattern="^(bn|en)$")


class MatchResponse(BaseModel):
    match: FaceMatchMeta
    gallery_size: int
