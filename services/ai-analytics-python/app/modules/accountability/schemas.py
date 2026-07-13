from pydantic import BaseModel, Field
from requests import get


class KpiSnapshot(BaseModel):
    code: str
    name: str
    value: float
    unit: str


class RepAccountabilityInput(BaseModel):
    representative_id: str
    name: str
    role: str
    admin_unit_name: str
    kpi_snapshots: list[KpiSnapshot] = Field(default_factory=list)
    peer_avg_grievance_resolution: float = Field(default=72, ge=0, le=100)
    peer_avg_completion: float = Field(default=68, ge=0, le=100)
    open_alerts: int = Field(default=0, ge=0)
    project_count: int = Field(default=0, ge=0)
    lang: str = Field(default="bn", pattern="^(bn|en)$")


class AccountabilityScore(BaseModel):
    representative_id: str
    name: str
    accountability_score: int = Field(ge=0, le=100)
    peer_delta_pct: float
    trend: str
    strengths: list[str]
    weaknesses: list[str]
    explanation: str
    explanation_bn: str


class AccountabilityBatchRequest(BaseModel):
    representatives: list[RepAccountabilityInput]


class AccountabilityBatchResponse(BaseModel):
    scores: list[AccountabilityScore]
    scanned_at: str
