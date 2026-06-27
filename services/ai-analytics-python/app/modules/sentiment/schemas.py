from pydantic import BaseModel, Field


class SentimentAnalyzeRequest(BaseModel):
    text: str = Field(min_length=1, max_length=2000)
    district: str = Field(min_length=1, max_length=120)
    upazila: str = Field(min_length=1, max_length=120)


class SentimentItem(BaseModel):
    text: str
    category: str
    confidence: float
    district: str
    upazila: str
    raw_label: str
    source_id: str | None = None


class SentimentBatchResponse(BaseModel):
    total: int
    grievance_count: int
    demand_count: int
    neutral_count: int
    items: list[SentimentItem]


class StreamAnalyzeRequest(BaseModel):
    limit: int = Field(default=50, ge=1, le=500)
