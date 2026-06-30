from fastapi import APIRouter, Request

from app.modules.citizen.schemas import CitizenChatRequest, CitizenChatResponse
from app.modules.citizen.service import CitizenChatbotService
from app.modules.sentiment.service import SentimentService


router = APIRouter(prefix="/citizen", tags=["Citizen Chatbot"])


@router.post("/chat", response_model=CitizenChatResponse)
async def citizen_chat(body: CitizenChatRequest, req: Request) -> CitizenChatResponse:
    settings = req.app.state.settings
    sentiment = SentimentService(settings, req.app.state.executor)
    bot = CitizenChatbotService(sentiment, settings)
    return await bot.chat(body, settings)
