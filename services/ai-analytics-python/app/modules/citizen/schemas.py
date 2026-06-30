from pydantic import BaseModel, Field


class CitizenChatRequest(BaseModel):
    message: str = Field(min_length=2, max_length=2000)
    lang: str = Field(default="bn", pattern="^(bn|en)$")
    district: str | None = None
    upazila: str | None = None
    channel: str = Field(default="333", pattern="^(333|999)$")


class CitizenChatResponse(BaseModel):
    category: str
    confidence: float
    route_ministry: str
    route_ministry_bn: str
    route_district: str | None
    route_upazila: str | None
    reply: str
    reply_bn: str
    channel: str
    sovereign: bool
