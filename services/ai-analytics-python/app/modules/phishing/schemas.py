"""Pydantic contracts for the Anti-Phishing Shield module."""

from __future__ import annotations

from enum import Enum
from typing import Any

from pydantic import BaseModel, Field, HttpUrl


class PhishingStatus(str, Enum):
    """Scan verdicts returned to the dashboard / gateway."""

    RED_FLAG = "RED_FLAG"  # ≥ threshold similarity, domain NOT official
    CLEAN = "CLEAN"  # domain is on the verified allow-list
    WATCH = "WATCH"  # medium similarity — human review
    CLEAR = "CLEAR"  # low similarity to any gov fingerprint
    ERROR = "ERROR"  # fetch / parse failure


class DomainDetails(BaseModel):
    """Registrable + host metadata for auditors."""

    input_url: str
    hostname: str
    registrable_domain: str
    scheme: str = "https"
    is_official: bool = False
    matched_official_domain: str | None = None


class DigitalSignature(BaseModel):
    """Fingerprints of an official (or candidate) landing page."""

    source_url: str
    hostname: str
    registrable_domain: str
    structure_fingerprint: str = Field(
        description="Skeletal HTML tag tree (depth-limited)",
    )
    meta_fingerprint: str = Field(description="Sorted meta / title / og tokens")
    visual_fingerprint: str = Field(
        description="Logo, favicon, header class and brand-ish tokens",
    )
    signature_hash: str = Field(description="SHA-256 of combined fingerprints")
    captured_at: str
    raw_features: dict[str, Any] = Field(default_factory=dict)


class RegisterOfficialRequest(BaseModel):
    """Seed or refresh the verified government URL signature store."""

    urls: list[HttpUrl] = Field(
        min_length=1,
        max_length=200,
        description="Official government entry points, e.g. https://bangladesh.gov.bd",
    )
    timeout_seconds: float = Field(default=12.0, ge=2.0, le=60.0)


class RegisterOfficialResponse(BaseModel):
    registered: list[DigitalSignature]
    failed: list[dict[str, str]] = Field(default_factory=list)
    official_domains: list[str]


class ScanRequest(BaseModel):
    """Compare one suspicious URL against stored official signatures."""

    url: HttpUrl
    similarity_threshold: float = Field(
        default=0.90,
        ge=0.5,
        le=1.0,
        description="Cosine/Levenshtein blended score that triggers RED_FLAG",
    )
    timeout_seconds: float = Field(default=12.0, ge=2.0, le=60.0)
    # Optional inline official URLs if caller has not pre-registered a store
    official_urls: list[HttpUrl] | None = Field(
        default=None,
        max_length=200,
        description="If set, rebuild signatures from these before scanning",
    )


class ScanResponse(BaseModel):
    status: PhishingStatus
    similarity_score: float = Field(ge=0.0, le=1.0)
    domain_details: DomainDetails
    best_match: DigitalSignature | None = None
    cosine_score: float | None = None
    levenshtein_score: float | None = None
    message: str
    candidate_signature: DigitalSignature | None = None
    error: str | None = None


class BatchScanRequest(BaseModel):
    urls: list[HttpUrl] = Field(min_length=1, max_length=25)
    similarity_threshold: float = Field(default=0.90, ge=0.5, le=1.0)
    timeout_seconds: float = Field(default=12.0, ge=2.0, le=60.0)


class BatchScanResponse(BaseModel):
    results: list[ScanResponse]
    red_flag_count: int
