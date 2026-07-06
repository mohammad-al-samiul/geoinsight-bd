from pydantic import BaseModel, Field


class DocumentAnalyzeRequest(BaseModel):
    text: str = Field(min_length=50, max_length=50000)
    doc_type: str = Field(default="tender", pattern="^(tender|contract)$")
    contractor_nid: str | None = None
    lang: str = Field(default="bn", pattern="^(bn|en)$")


class ExtractedClause(BaseModel):
    clause_type: str
    label: str
    label_bn: str
    text: str
    risk_level: str
    page_hint: str | None = None


class DocumentAnomaly(BaseModel):
    anomaly_type: str
    description: str
    description_bn: str
    severity: int = Field(ge=1, le=5)
    regulation_ref: str | None = None


class ComplianceCheck(BaseModel):
    code: str
    label: str
    label_bn: str
    status: str = Field(pattern="^(pass|warn|fail)$")
    detail: str
    detail_bn: str
    reference: str | None = None


class KeyEntity(BaseModel):
    entity_type: str
    value: str
    context: str


class DocumentAnalyzeResponse(BaseModel):
    doc_type: str
    clauses: list[ExtractedClause]
    anomalies: list[DocumentAnomaly]
    contractor_pattern_match: bool
    summary: str
    summary_bn: str
    risk_score: int = Field(ge=0, le=100)
    compliance_status: str = Field(pattern="^(COMPLIANT|REVIEW_REQUIRED|NON_COMPLIANT)$")
    compliance_checks: list[ComplianceCheck] = Field(default_factory=list)
    key_entities: list[KeyEntity] = Field(default_factory=list)
    recommendations: list[str] = Field(default_factory=list)
    recommendations_bn: list[str] = Field(default_factory=list)
    executive_brief: str = ""
    executive_brief_bn: str = ""
    engine: str = "rules"
