from __future__ import annotations

from pydantic import BaseModel, Field, HttpUrl


class DomainScanRequest(BaseModel):
    url: HttpUrl


class DomainScanResponse(BaseModel):
    scanned_url: str
    scanned_domain: str
    official_domain: str | None = None
    official_name: str | None = None
    official_name_bn: str | None = None
    similarity_score: float = Field(ge=0, le=100)
    digital_signature: str
    verified_official: bool
    risk_level: str = Field(pattern="^(SAFE|REVIEW|RED_FLAG)$")
    red_flag: bool
    reasons: list[str]
    reasons_bn: list[str]
    scanned_at: str
    engine: str = "offline-domain-similarity-v1"
