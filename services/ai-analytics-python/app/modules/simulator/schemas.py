from pydantic import BaseModel, Field

from app.modules.risk.schemas import ConflictInput, SectorImpact


class ScenarioInput(ConflictInput):
    budget_reallocation_pct: float = Field(default=0, ge=-20, le=20)
    agriculture_shock: float = Field(default=0, ge=0, le=1)
    energy_shock: float = Field(default=0, ge=0, le=1)
    lang: str = Field(default="bn", pattern="^(bn|en)$")


class MinistryImpact(BaseModel):
    ministry: str
    ministry_bn: str
    impact_score: float = Field(ge=0, le=100)
    direction: str
    narrative: str
    narrative_bn: str


class ScenarioResult(BaseModel):
    scenario_label: str
    scenario_label_bn: str
    overall_risk_score: float
    risk_band: str
    remittance_impact: SectorImpact
    rmg_impact: SectorImpact
    ministry_impacts: list[MinistryImpact]
    narrative: str
    narrative_bn: str
    contributing_factors: dict[str, float]
    computed_at: str
