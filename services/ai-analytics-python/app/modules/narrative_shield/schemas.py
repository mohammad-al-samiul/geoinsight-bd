"""Pydantic contracts for the Narrative Shield (তথ্য প্রতিরক্ষা ঢাল) module."""

from __future__ import annotations

from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


# ── Enums (mirror Prisma enums) ───────────────────────────────────────────────

class NarrativeThreatLevel(str, Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class NarrativeCategory(str, Enum):
    ANTI_GOVT_INCITEMENT = "ANTI_GOVT_INCITEMENT"
    SOVEREIGNTY_THREAT = "SOVEREIGNTY_THREAT"
    ECONOMIC_DISINFO = "ECONOMIC_DISINFO"
    SOCIAL_UNREST = "SOCIAL_UNREST"
    RELIGIOUS_EXTREMISM = "RELIGIOUS_EXTREMISM"
    ELECTORAL_MANIPULATION = "ELECTORAL_MANIPULATION"


class NarrativeSignalStatus(str, Enum):
    ACTIVE = "ACTIVE"
    DEBUNKED = "DEBUNKED"
    ESCALATED = "ESCALATED"
    DISMISSED = "DISMISSED"


# ── Incoming classification request ──────────────────────────────────────────

class ClassifyRequest(BaseModel):
    """Classify a single piece of content as a hostile narrative signal."""
    title: str = Field(min_length=5, max_length=2000)
    body: str | None = Field(default=None, max_length=10000)
    source_name: str = Field(default="unknown", max_length=128)
    source_platform: str = Field(default="web", max_length=64)
    speaker_name: str | None = Field(default=None, max_length=255)
    organization: str | None = Field(default=None, max_length=255)
    district: str | None = Field(default=None, max_length=64)
    division: str | None = Field(default=None, max_length=64)
    source_url: str | None = Field(default=None, max_length=2048)
    lang: str = Field(default="bn", pattern="^(bn|en)$")


class ClassifyResponse(BaseModel):
    fingerprint: str
    is_hostile: bool
    threat_level: NarrativeThreatLevel
    category: NarrativeCategory
    confidence_score: float = Field(ge=0.0, le=1.0)
    title_bn: str | None = None
    classification_reason: str


# ── RAG debunk request / response ─────────────────────────────────────────────

class DebunkRequest(BaseModel):
    """Generate an official-source RAG rebuttal for a detected hostile narrative."""
    signal_id: str
    title: str
    body: str | None = None
    category: NarrativeCategory
    lang: str = Field(default="bn", pattern="^(bn|en)$")


class DebunkResponse(BaseModel):
    signal_id: str
    debunk_text: str
    confidence: float = Field(ge=0.0, le=1.0)
    policy_ref: str | None = None
    source_ref: str | None = None
    llm_used: bool = False


# ── Batch scan ────────────────────────────────────────────────────────────────

class BatchClassifyRequest(BaseModel):
    items: list[ClassifyRequest] = Field(min_length=1, max_length=50)
    lang: str = Field(default="bn", pattern="^(bn|en)$")


class BatchClassifyResponse(BaseModel):
    results: list[ClassifyResponse]
    hostile_count: int
    critical_count: int


# ── Feed ingestion result (returned by Node → store in DB) ────────────────────

class FeedSignal(BaseModel):
    fingerprint: str
    title: str
    title_bn: str | None = None
    body: str | None = None
    source_url: str | None = None
    source_name: str
    source_platform: str
    speaker_name: str | None = None
    organization: str | None = None
    district: str | None = None
    division: str | None = None
    threat_level: NarrativeThreatLevel
    category: NarrativeCategory
    confidence_score: float
    published_at: str | None = None


class FeedIngestResponse(BaseModel):
    ingested: int
    signals: list[FeedSignal]
    skipped_duplicates: int


# ── Stats ─────────────────────────────────────────────────────────────────────

class ShieldStats(BaseModel):
    total_active: int
    critical_count: int
    high_count: int
    debunked_today: int
    escalated_pending: int
    top_category: str | None = None
    top_organization: str | None = None
