from __future__ import annotations

from app.core.config import Settings
from app.ml.ollama_client import OllamaClient
from app.modules.sovereign_llm.schemas import LlmChatRequest, LlmChatResponse

_SOVEREIGN_SYSTEM_BN = """আপনি GeoInsight BD সার্বভৌম সহায়ক — বাংলাদেশ সরকারের জাতীয় তথ্য প্ল্যাটফর্ম।

নিয়ম:
1. শুধুমাত্র নিচে দেওয়া VERIFIED DATABASE context ব্যবহার করুন।
2. context-এ না থাকা সংখ্যা, প্রকল্প বা KPI উদ্ভাবন করবেন না।
3. উত্তর সুন্দর Markdown-এ লিখুন:
   - ## শিরোনাম
   - বুলেট তালিকা (- পয়েন্ট)
   - গুরুত্বপূর্ণ সংখ্যা **বোল্ড**
   - প্রতিটি বিষয় আলাদা অনুচ্ছেদে
4. সংক্ষিপ্ত কিন্তু পূর্ণাঙ্গ উত্তর দিন (৮–১৫ লাইন)।
5. ডেটা না থাকলে স্পষ্ট বলুন: "ভেরিফাইড ডেটা পাওয়া যায়নি।"
"""

_SOVEREIGN_SYSTEM_EN = """You are the GeoInsight BD sovereign assistant — Bangladesh national governance platform.

Rules:
1. Use ONLY the VERIFIED DATABASE context provided below.
2. Never invent statistics, project names, or KPI values not in context.
3. Format answers in clean Markdown:
   - ## Section headings
   - Bullet lists (- item)
   - **Bold** key numbers
   - Blank line between sections
4. Be concise but complete (8–15 lines).
5. If no matching data, say clearly: "No verified GeoInsight records found."
"""


class SovereignLlmService:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._ollama = OllamaClient(settings)

    async def chat(self, req: LlmChatRequest) -> LlmChatResponse:
        if self._ollama.enabled:
            system = _SOVEREIGN_SYSTEM_BN if req.lang == "bn" else _SOVEREIGN_SYSTEM_EN
            messages: list[dict[str, str]] = [{"role": "system", "content": system}]
            if req.context:
                messages.append({
                    "role": "system",
                    "content": f"VERIFIED DATABASE CONTEXT (use only this data):\n\n{req.context}",
                })
            messages.extend({"role": m.role, "content": m.content} for m in req.messages)

            reply = await self._ollama.chat(messages, temperature=0.25)
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
        if context and ("ADMINISTRATIVE" in context or "PROJECTS" in context):
            header = "## ভেরিফাইড তথ্য" if bn else "## Verified Data"
            body = context[:1200]
            return f"{header}\n\n{body}\n\n---\n\n*{'টেমপ্লেট মোড — Ollama চালু করলে আরও ভালো উত্তর পাবেন' if bn else 'Template mode — start Ollama for richer answers'}*"

        if any(w in user_msg.lower() for w in ["remittance", "রেমিট্যান্স", "প্রবাস"]):
            return (
                "## রেমিট্যান্স প্রভাব\n\n- মধ্যপ্রাচ্য সংকট বাড়লে প্রবাহ ৮–১২% কমতে পারে\n- **Impact Simulator** মডিউল দেখুন"
                if bn
                else "## Remittance Impact\n\n- Middle East escalation may cut flows **8–12%**\n- See **Impact Simulator**"
            )
        return (
            "## সহায়ক\n\nভেরিফাইড ডেটা পাওয়া যায়নি। KPI, প্রকল্প বা red flag সম্পর্কে আরও নির্দিষ্ট জিজ্ঞাসা করুন।"
            if bn
            else "## Assistant\n\nNo verified data found. Ask specifically about KPIs, projects, or red flags."
        )
