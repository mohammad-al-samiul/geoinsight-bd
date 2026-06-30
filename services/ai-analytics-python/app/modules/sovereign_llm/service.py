from __future__ import annotations

from app.core.config import Settings
from app.ml.ollama_client import OllamaClient
from app.modules.sovereign_llm.schemas import LlmChatRequest, LlmChatResponse

_SOVEREIGN_SYSTEM_BN = (
    "আপনি GeoInsight BD সার্বভৌম সহায়ক। শুধু বাংলায় সংক্ষিপ্ত, তথ্যভিত্তিক উত্তর দিন। "
    "কোনো তথ্য বিদেশি সার্ভারে যায় না। সরকারি KPI, প্রকল্প, red flag, নাগরিক অভিযোগ নিয়ে পরামর্শ দিন।"
)
_SOVEREIGN_SYSTEM_EN = (
    "You are the GeoInsight BD sovereign assistant. Answer concisely using government data context only. "
    "No data leaves the NDC perimeter. Advise on KPIs, projects, red flags, and citizen grievances."
)


class SovereignLlmService:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._ollama = OllamaClient(settings)

    async def chat(self, req: LlmChatRequest) -> LlmChatResponse:
        if self._ollama.enabled:
            system = _SOVEREIGN_SYSTEM_BN if req.lang == "bn" else _SOVEREIGN_SYSTEM_EN
            messages: list[dict[str, str]] = [{"role": "system", "content": system}]
            if req.context:
                messages.append({"role": "system", "content": f"Structured context:\n{req.context}"})
            messages.extend({"role": m.role, "content": m.content} for m in req.messages)

            reply = await self._ollama.chat(messages)
            if reply:
                return LlmChatResponse(
                    reply=reply,
                    provider="ollama",
                    sovereign=True,
                    model=self._ollama.model,
                    lang=req.lang,
                )

        user_msg = next((m.content for m in reversed(req.messages) if m.role == "user"), "")
        reply = self._template_reply(user_msg, req.lang, req.context)
        return LlmChatResponse(
            reply=reply,
            provider="sovereign_template",
            sovereign=self._settings.sovereign_mode,
            model="geoinsight-bn-template-v1",
            lang=req.lang,
        )

    def _template_reply(self, user_msg: str, lang: str, context: str | None) -> str:
        bn = lang == "bn"
        if any(w in user_msg.lower() for w in ["remittance", "রেমিট্যান্স", "প্রবাস"]):
            return (
                "মধ্যপ্রাচ্য সংকট বাড়লে রেমিট্যান্স প্রবাহ ৮–১২% কমতে পারে। Impact Simulator দেখুন।"
                if bn
                else "Middle East escalation may reduce remittance inflows 8–12%. See Impact Simulator."
            )
        if any(w in user_msg.lower() for w in ["budget", "বাজেট", "completion", "সমাপ্তি"]):
            return (
                "Digital Twin মডিউলে বিভাগভিত্তিক বাজেট পুনঃবিন্যাস সিমুলেট করুন।"
                if bn
                else "Use the Digital Twin module to simulate division-level budget shifts."
            )
        if context:
            return (
                f"প্রশ্ন: {user_msg[:120]}…\nডেটা: {context[:280]}…"
                if bn
                else f"Q: {user_msg[:120]}…\nData: {context[:280]}…"
            )
        return (
            "আমি GeoInsight BD সার্বভৌম সহায়ক। KPI, প্রকল্প, red flag সম্পর্কে জিজ্ঞাসা করুন।"
            if bn
            else "GeoInsight BD sovereign assistant. Ask about KPIs, projects, or red flags."
        )
