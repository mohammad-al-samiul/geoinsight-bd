from __future__ import annotations

from app.core.config import Settings
from app.ml.ollama_client import OllamaClient
from app.modules.citizen.schemas import CitizenChatRequest, CitizenChatResponse

_ROUTES: dict[str, tuple[str, str]] = {
    "Grievance": ("Ministry of Public Administration", "জনপ্রশাসন মন্ত্রণালয়"),
    "Demand": ("Ministry of Planning", "পরিকল্পনা মন্ত্রণালয়"),
    "Neutral": ("Cabinet Division", "মন্ত্রিপরিষদ বিভাগ"),
}

_REPLIES_BN: dict[str, str] = {
    "Grievance": "আপনার অভিযোগ গ্রহণ করা হয়েছে। সংশ্লিষ্ট জেলা প্রশাসকের কার্যালয়ে রুট করা হচ্ছে।",
    "Demand": "আপনার দাবি নথিভুক্ত হয়েছে। পরিকল্পনা মন্ত্রণালয়ের মনিটরিং সেলে পাঠানো হচ্ছে।",
    "Neutral": "আপনার বার্তা রেকর্ড করা হয়েছে। প্রয়োজনে আপনার সাথে যোগাযোগ করা হবে।",
}

_REPLIES_EN: dict[str, str] = {
    "Grievance": "Your grievance has been logged and routed to the District Commissioner office.",
    "Demand": "Your demand is recorded and forwarded to the Planning Ministry monitoring cell.",
    "Neutral": "Your message is recorded. We will contact you if follow-up is required.",
}


class CitizenChatbotService:
    def __init__(self, sentiment_service: object, settings: Settings) -> None:
        self._sentiment = sentiment_service
        self._ollama = OllamaClient(settings)

    async def chat(self, req: CitizenChatRequest, settings: Settings) -> CitizenChatResponse:
        from app.modules.sentiment.schemas import SentimentAnalyzeRequest

        item = await self._sentiment.analyze_one(
            SentimentAnalyzeRequest(
                text=req.message,
                district=req.district or "Dhaka",
                upazila=req.upazila or "Central",
            ),
        )

        category = item.category
        ministry_en, ministry_bn = _ROUTES.get(category, _ROUTES["Neutral"])

        reply_bn = _REPLIES_BN.get(category, _REPLIES_BN["Neutral"])
        reply_en = _REPLIES_EN.get(category, _REPLIES_EN["Neutral"])

        if self._ollama.enabled:
            district = req.district or item.district
            system = (
                "তুমি বাংলাদেশ সরকারি ৩৩৩/৯৯৯ চ্যাটবট। নাগরিকের বার্তার উত্তর বাংলায় দাও, "
                f"শ্রেণি: {category}, মন্ত্রণালয়: {ministry_bn}, জেলা: {district}। সংক্ষিপ্ত ও সৌজন্যমূলক।"
                if req.lang == "bn"
                else f"You are Bangladesh govt 333/999 chatbot. Category: {category}, ministry: {ministry_en}. Be brief."
            )
            llm_reply = await self._ollama.complete(system, req.message)
            if llm_reply:
                if req.lang == "bn":
                    reply_bn = llm_reply
                else:
                    reply_en = llm_reply

        if req.channel == "999" and category == "Grievance":
            reply_bn += " (ইউনিয়ন পর্যায় — ৯৯৯)"
            reply_en += " (Union level — 999)"

        return CitizenChatResponse(
            category=category,
            confidence=item.confidence,
            route_ministry=ministry_en,
            route_ministry_bn=ministry_bn,
            route_district=req.district or item.district,
            route_upazila=req.upazila or item.upazila,
            reply=reply_en if req.lang == "en" else reply_bn,
            reply_bn=reply_bn,
            channel=req.channel,
            sovereign=settings.sovereign_mode,
        )
