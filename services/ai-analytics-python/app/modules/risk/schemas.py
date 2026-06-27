from pydantic import BaseModel, Field


class ConflictInput(BaseModel):
    conflict_intensity: float = Field(ge=0, le=1, description="Active conflict severity")
    sanctions_level: float = Field(ge=0, le=1, description="Trade/financial sanctions pressure")
    trade_disruption: float = Field(ge=0, le=1, description="Shipping & supply-chain disruption")
    migration_pressure: float = Field(ge=0, le=1, description="Forced migration / refugee flows")
    oil_price_shock: float = Field(ge=0, le=1, default=0.0, description="Energy market volatility")
    region: str = Field(default="Middle East", max_length=120)


class SectorImpact(BaseModel):
    sector: str
    impact_score: float = Field(ge=0, le=100)
    direction: str
    narrative: str


class GeopoliticalRiskResponse(BaseModel):
    overall_risk_score: float = Field(ge=0, le=100)
    risk_band: str
    remittance_impact: SectorImpact
    rmg_impact: SectorImpact
    contributing_factors: dict[str, float]
    computed_at: str
