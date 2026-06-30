from pydantic import BaseModel, Field


class LlmChatMessage(BaseModel):
    role: str = Field(pattern="^(system|user|assistant)$")
    content: str


class LlmChatRequest(BaseModel):
    messages: list[LlmChatMessage] = Field(min_length=1)
    lang: str = Field(default="bn", pattern="^(bn|en)$")
    context: str | None = Field(default=None, description="Optional structured data context")


class LlmChatResponse(BaseModel):
    reply: str
    provider: str
    sovereign: bool
    model: str
    lang: str
