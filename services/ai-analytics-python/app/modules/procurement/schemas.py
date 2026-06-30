from pydantic import BaseModel, Field


class ProcurementOption(BaseModel):
    country_code: str
    country_name: str
    landed_cost_usd: float
    unit_price_usd: float
    shipping_cost_usd: float
    tariff_usd: float
    lead_time_days: int
    port_congestion: str
    reliability_score: float


class ProcurementAdviceRequest(BaseModel):
    commodity: str = Field(min_length=1)
    quantity_mt: float = Field(gt=0)
    urgency_days: int = Field(default=30, ge=7, le=180)
    lang: str = Field(default="bn", pattern="^(bn|en)$")


class ProcurementAdviceResponse(BaseModel):
    commodity: str
    quantity_mt: float
    recommendation: str
    recommendation_bn: str
    best_option: ProcurementOption
    alternatives: list[ProcurementOption]
    narrative: str
    narrative_bn: str
