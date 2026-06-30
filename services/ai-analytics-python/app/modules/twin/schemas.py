from pydantic import BaseModel, Field


class DivisionTwinInput(BaseModel):
    unit_id: str
    name: str
    name_bn: str | None = None
    performance_score: float
    project_count: int
    budget_allocated: float
    completion_rate: float


class TwinSimulateRequest(BaseModel):
    divisions: list[DivisionTwinInput]
    target_division_id: str
    budget_shift_pct: float = Field(ge=-20, le=20)
    lang: str = Field(default="bn", pattern="^(bn|en)$")


class DivisionProjection(BaseModel):
    unit_id: str
    name: str
    name_bn: str | None
    before_completion: float
    after_completion: float
    delta_pct: float


class TwinSimulateResponse(BaseModel):
    target_division_id: str
    budget_shift_pct: float
    national_completion_before: float
    national_completion_after: float
    projections: list[DivisionProjection]
    narrative: str
    narrative_bn: str
