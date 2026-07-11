from pydantic import BaseModel, Field


class CommodityQuote(BaseModel):
    country_code: str
    country_name: str
    commodity: str
    unit_price_usd: float = Field(ge=0)
    shipping_cost_usd: float = Field(ge=0)
    tariff_rate: float = Field(ge=0, le=1, default=0.05, description="0–1 fraction")
    reliability_score: float = Field(ge=0, le=1, default=0.9)


class ArbitrageRequest(BaseModel):
    commodity: str = Field(min_length=1, max_length=64)
    quantity_mt: float = Field(gt=0, description="Quantity in metric tons")
    target_country: str = Field(default="BD", description="Import destination ISO code")


class LandedCostBreakdown(BaseModel):
    country_code: str
    country_name: str
    commodity: str
    unit_price_usd: float
    shipping_cost_usd: float
    tariff_usd: float
    landed_cost_usd: float
    reliability_score: float


class ArbitrageResult(BaseModel):
    commodity: str
    quantity_mt: float
    cheapest: LandedCostBreakdown
    alternatives_count: int
    all_ranked: list[LandedCostBreakdown]


class ScrapeJobResponse(BaseModel):
    job_id: str
    status: str
    message: str
