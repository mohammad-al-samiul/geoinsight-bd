from pydantic import BaseModel, Field


class DocumentAnalyzeRequest(BaseModel):
    text: str = Field(min_length=50, max_length=50000)
    doc_type: str = Field(default="tender", pattern="^(tender|contract)$")
    contractor_nid: str | None = None
    lang: str = Field(default="bn", pattern="^(bn|en)$")


class ExtractedClause(BaseModel):
    clause_type: str
    text: str
    risk_level: str


class DocumentAnomaly(BaseModel):
    anomaly_type: str
    description: str
    description_bn: str
    severity: int = Field(ge=1, le=5)


class DocumentAnalyzeResponse(BaseModel):
    doc_type: str
    clauses: list[ExtractedClause]
    anomalies: list[DocumentAnomaly]
    contractor_pattern_match: bool
    summary: str
    summary_bn: str
