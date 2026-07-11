from __future__ import annotations

import json

from app.core.config import Settings
from app.ml.ollama_client import OllamaClient
from app.modules.arbitrage.service import CommodityScraper, optimize_arbitrage
from app.modules.procurement.schemas import (
    ProcurementAdviceRequest,
    ProcurementAdviceResponse,
    ProcurementOption,
)

_PORT_CONGESTION = {
    "IN": "Moderate — Chittagong berth wait 2–4 days",
    "VN": "Low — direct route via Singapore",
    "TH": "Low",
    "CN": "High — Yangshan queue 5–7 days",
    "PK": "Moderate",
    "US": "Low",
    "AU": "Moderate",
}

_LEAD_DAYS = {
    "IN": 12,
    "VN": 18,
    "TH": 14,
    "CN": 16,
    "PK": 10,
    "US": 28,
    "AU": 22,
}


def _lead_time(code: str, urgency: int) -> int:
    base = _LEAD_DAYS.get(code[:2], 20)
    return max(7, base - (1 if urgency < 21 else 0))


class ProcurementAdvisor:
    def __init__(self, settings: Settings | None = None, country_count: int = 50) -> None:
        self._scraper = CommodityScraper(country_count)
        self._ollama = OllamaClient(settings) if settings else None

    async def advise(self, req: ProcurementAdviceRequest) -> ProcurementAdviceResponse:
        if req.market_quotes and len(req.market_quotes) > 0:
            quotes = req.market_quotes
        else:
            quotes = await self._scraper.scrape_commodity(req.commodity.lower())
        arb = optimize_arbitrage(quotes, req.quantity_mt)

        def to_option(row: object) -> ProcurementOption:
            r = row  # LandedCostBreakdown
            code = getattr(r, "country_code", "XX")[:2]
            return ProcurementOption(
                country_code=getattr(r, "country_code"),
                country_name=getattr(r, "country_name"),
                landed_cost_usd=getattr(r, "landed_cost_usd"),
                unit_price_usd=getattr(r, "unit_price_usd"),
                shipping_cost_usd=getattr(r, "shipping_cost_usd"),
                tariff_usd=getattr(r, "tariff_usd"),
                lead_time_days=_lead_time(code, req.urgency_days),
                port_congestion=_PORT_CONGESTION.get(code, "Moderate"),
                reliability_score=getattr(r, "reliability_score"),
            )

        ranked = [to_option(r) for r in arb.all_ranked[:6]]
        best = ranked[0]
        alts = ranked[1:4]

        commodity_label = req.commodity.capitalize()
        commodity_bn = {
            "rice": "চাল",
            "onion": "পেঁয়াজ",
            "wheat": "গম",
            "lentil": "ডাল",
        }.get(req.commodity.lower(), commodity_label)

        rec_en = (
            f"Procure {req.quantity_mt:,.0f} MT {commodity_label} from {best.country_name} — "
            f"landed ${best.landed_cost_usd:,.0f}, {best.lead_time_days}d lead, "
            f"port: {best.port_congestion}."
        )
        rec_bn = (
            f"{commodity_bn} {req.quantity_mt:,.0f} MT — {best.country_name} থেকে আমদানি "
            f"(landed ${best.landed_cost_usd:,.0f}, {best.lead_time_days} দিন, বন্দর: {best.port_congestion})।"
        )

        alt_text_en = "; ".join(
            f"{a.country_name} ${a.landed_cost_usd:,.0f} ({a.lead_time_days}d)"
            for a in alts[:2]
        )
        alt_text_bn = "; ".join(
            f"{a.country_name} ${a.landed_cost_usd:,.0f} ({a.lead_time_days} দিন)"
            for a in alts[:2]
        )

        narrative_en = f"{rec_en} Alternatives: {alt_text_en}."
        narrative_bn = f"{rec_bn} বিকল্প: {alt_text_bn}।"

        if self._ollama and self._ollama.enabled:
            context = json.dumps(
                {
                    "commodity": req.commodity,
                    "quantity_mt": req.quantity_mt,
                    "best": best.model_dump(),
                    "alternatives": [a.model_dump() for a in alts],
                    "lang": req.lang,
                },
                ensure_ascii=False,
            )
            system = (
                "তুমি সরকারি ক্রয় উপদেষ্টা। দেওয়া JSON থেকে সংক্ষিপ্ত বাংলা সুপারিশ লেখ।"
                if req.lang == "bn"
                else "You are a government procurement advisor. Write a concise recommendation from the JSON."
            )
            llm_narrative = await self._ollama.complete(system, context)
            if llm_narrative:
                if req.lang == "bn":
                    narrative_bn = llm_narrative
                else:
                    narrative_en = llm_narrative

        return ProcurementAdviceResponse(
            commodity=req.commodity.lower(),
            quantity_mt=req.quantity_mt,
            recommendation=rec_en,
            recommendation_bn=rec_bn,
            best_option=best,
            alternatives=alts,
            narrative=narrative_en if req.lang == "en" else narrative_bn,
            narrative_bn=narrative_bn,
        )
