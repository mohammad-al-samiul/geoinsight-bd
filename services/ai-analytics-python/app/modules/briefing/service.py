from __future__ import annotations

import json
from datetime import UTC, datetime

from app.core.config import Settings
from app.ml.ollama_client import OllamaClient
from app.modules.briefing.schemas import (
    BriefingBullet,
    BriefingInput,
    BriefingResponse,
)


class BriefingService:
    """Morning briefing — structured data + local Ollama (llama3.1) narrative."""

    def __init__(self, settings: Settings) -> None:
        self._ollama = OllamaClient(settings)

    async def generate(self, data: BriefingInput) -> BriefingResponse:
        bullets = self._build_bullets(data)
        bullets.sort(key=lambda b: b.priority)
        bullets = bullets[:5]

        narrative = self._narrative(data, bullets)
        voice_text = self._voice_text(data, bullets)
        llm_used = False

        if self._ollama.enabled:
            context = json.dumps(
                {
                    "scope": data.scope_label_bn if data.lang == "bn" else data.scope_label,
                    "completion_rate": data.completion_rate,
                    "open_alerts": data.open_alerts,
                    "bullets": [b.text for b in bullets],
                    "news_headlines": [h.model_dump() for h in data.news_headlines[:5]],
                },
                ensure_ascii=False,
            )
            system = (
                "তুমি PMO ব্রিফিং লেখক। দেওয়া JSON ডেটা থেকে ৫ বুলেট সহ সংক্ষিপ্ত বাংলা ব্রিফিং লেখ।"
                if data.lang == "bn"
                else "You are a PMO briefing writer. Write a concise briefing from the JSON data with 5 bullets."
            )
            llm_narrative = await self._ollama.complete(system, context)
            if llm_narrative:
                narrative = llm_narrative
                voice_text = llm_narrative[:1200]
                llm_used = True

        return BriefingResponse(
            lang=data.lang,
            scope_label=data.scope_label if data.lang == "en" else data.scope_label_bn,
            generated_at=datetime.now(UTC).isoformat(),
            bullets=bullets,
            narrative=narrative,
            voice_text=voice_text,
            llm_used=llm_used,
        )

    def _build_bullets(self, data: BriefingInput) -> list[BriefingBullet]:
        bn = data.lang == "bn"
        out: list[BriefingBullet] = []

        for drop in data.completion_drops[:2]:
            name = drop.name_bn if bn and drop.name_bn else drop.name
            if bn:
                text = (
                    f"{name} বিভাগে প্রকল্প সমাপ্তির হার {drop.drop_pct:.1f}% কমে "
                    f"{drop.current_rate:.1f}% এ দাঁড়িয়েছে।"
                )
            else:
                text = (
                    f"{name} division completion dropped {drop.drop_pct:.1f}% "
                    f"to {drop.current_rate:.1f}%."
                )
            out.append(BriefingBullet(text=text, category="completion", priority=2))

        for proj in data.budget_overruns[:2]:
            if bn:
                text = (
                    f"«{proj.title}» প্রকল্পে বাজেট ওভাররান "
                    f"{proj.variance_pct:.1f}% — তাৎক্ষণিক পর্যবেক্ষণ প্রয়োজন।"
                )
            else:
                text = (
                    f"Project «{proj.title}» shows budget overrun of "
                    f"{proj.variance_pct:.1f}%."
                )
            out.append(BriefingBullet(text=text, category="budget", priority=1))

        for flag in data.new_red_flags[:2]:
            if bn:
                text = (
                    f"নতুন red flag: {flag.project_title} — "
                    f"{flag.flag_type.replace('_', ' ').lower()} (severity {flag.severity})."
                )
            else:
                text = (
                    f"New red flag on {flag.project_title}: "
                    f"{flag.flag_type.replace('_', ' ').lower()} (severity {flag.severity})."
                )
            out.append(BriefingBullet(text=text, category="alert", priority=1))

        for arb in data.arbitrage_insights[:2]:
            commodity = arb.commodity_bn if bn else arb.commodity
            if bn:
                text = (
                    f"আরবিট্রেজ: {commodity} সবচেয়ে সস্তা {arb.cheapest_market} থেকে "
                    f"(মার্জিন {arb.margin_pct:.1f}%)।"
                )
            else:
                text = (
                    f"Arbitrage: {commodity} cheapest via {arb.cheapest_market} "
                    f"(margin {arb.margin_pct:.1f}%)."
                )
            out.append(BriefingBullet(text=text, category="arbitrage", priority=3))

        for headline in data.news_headlines[:2]:
            district = headline.district or ("জাতীয়" if bn else "National")
            if bn:
                text = f"সংবাদ ({headline.source}): {headline.title[:120]}"
                if headline.district:
                    text += f" — {district}"
            else:
                text = f"News ({headline.source}): {headline.title[:120]}"
                if headline.district:
                    text += f" — {district}"
            out.append(BriefingBullet(text=text, category="news", priority=2))

        if not out:
            if bn:
                fallback = (
                    f"স্কোপ {data.scope_label_bn}: সমাপ্তির হার {data.completion_rate:.1f}%, "
                    f"{data.open_alerts}টি খোলা red flag — গুরুতর অনিয়ম নেই।"
                )
            else:
                fallback = (
                    f"Scope {data.scope_label}: completion {data.completion_rate:.1f}%, "
                    f"{data.open_alerts} open red flags — no critical anomalies."
                )
            out.append(BriefingBullet(text=fallback, category="summary", priority=5))

        return out

    def _narrative(self, data: BriefingInput, bullets: list[BriefingBullet]) -> str:
        bn = data.lang == "bn"
        header = (
            f"আজ সকালের ব্রিফিং — {data.scope_label_bn}"
            if bn
            else f"Morning briefing — {data.scope_label}"
        )
        body = "\n".join(f"• {b.text}" for b in bullets)
        return f"{header}\n\n{body}"

    def _voice_text(self, data: BriefingInput, bullets: list[BriefingBullet]) -> str:
        bn = data.lang == "bn"
        intro = (
            f"শুভ সকাল। {data.scope_label_bn} স্কোপের সংক্ষিপ্ত ব্রিফিং।"
            if bn
            else f"Good morning. Briefing for {data.scope_label} scope."
        )
        parts = [intro] + [b.text for b in bullets[:5]]
        return " ".join(parts)
