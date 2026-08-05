from __future__ import annotations

import json
import re
from collections import Counter
from datetime import UTC, datetime

from app.core.config import Settings
from app.ml.ollama_client import OllamaClient
from app.modules.outlook.schemas import (
    ChallengeItem,
    DirectionItem,
    OutlookGenerateRequest,
    OutlookGenerateResponse,
    ScenarioItem,
)

POLITICS_THEME_KW: dict[str, tuple[str, ...]] = {
    "governance_legitimacy": (
        "interim", "election", "reform", "constitution", "caretaker",
        "অন্তর্বর্তী", "নির্বাচন", "সংস্কার", "সংবিধান",
    ),
    "security_unrest": (
        "protest", "violence", "clash", "security", "police",
        "আন্দোলন", "বিক্ষোভ", "সহিংস", "নিরাপত্তা",
    ),
    "institutional_reform": (
        "commission", "judiciary", "police reform", "anti-corruption",
        "কমিশন", "বিচার", "দুর্নীতি",
    ),
    "foreign_policy": (
        "india", "china", "usa", "geopolitic", "diplomacy",
        "ভারত", "চীন", "কূটনীতি",
    ),
}

ECONOMY_THEME_KW: dict[str, tuple[str, ...]] = {
    "macro_stability": (
        "imf", "reserves", "inflation", "taka", "forex", "balance of payment",
        "মূল্যস্ফীতি", "রিজার্ভ", "টাকা", "মুদ্রা",
    ),
    "banking_finance": (
        "banking", "npl", "default", "loan", "liquidity", "central bank",
        "ব্যাংক", "ঋণ", "খেলাপি",
    ),
    "export_jobs": (
        "rmg", "garment", "export", "remittance", "job", "unemployment",
        "পোশাক", "রপ্তানি", "রেমিট্যান্স", "বেকার",
    ),
    "energy_infra": (
        "energy", "power", "fuel", "infrastructure", "investment",
        "জ্বালানি", "বিদ্যুৎ", "বিনিয়োগ",
    ),
}


def _text_blob(title: str, summary: str | None) -> str:
    return f"{title} {summary or ''}".lower()


def _theme_hits(blob: str, themes: dict[str, tuple[str, ...]]) -> Counter[str]:
    hits: Counter[str] = Counter()
    for theme, kws in themes.items():
        for kw in kws:
            if kw.lower() in blob:
                hits[theme] += 1
    return hits


class OutlookService:
    def __init__(self, settings: Settings) -> None:
        self._ollama = OllamaClient(settings)

    async def generate(self, req: OutlookGenerateRequest) -> OutlookGenerateResponse:
        bn = req.lang == "bn"
        politics_sources = [s for s in req.sources if s.domain in ("politics", "both")]
        economy_sources = [s for s in req.sources if s.domain in ("economy", "both")]

        challenges = self._build_challenges(req, bn)
        direction = self._build_direction(req, bn)
        scenarios = self._build_scenarios(req, bn)
        narrative = self._build_narrative(challenges, direction, scenarios, bn)
        llm_used = False

        if self._ollama.enabled and req.sources:
            llm_narrative = await self._llm_polish(req, challenges, direction, scenarios, bn)
            if llm_narrative:
                # Reject meta-responses that don't look like an outlook
                bad = ("provided text appears", "list of news articles", "the topics covered")
                if not any(b in llm_narrative.lower() for b in bad):
                    narrative = llm_narrative
                    llm_used = True

        disclaimer = (
            "এটি খোলা সংবাদ/বিশ্লেষক রিপোর্ট ও মডেল-ভিত্তিক দৃশ্যপট — পূর্বাভাস বা একাডেমিক থিসিসের প্রতিস্থাপন নয়। "
            "প্রতিটি দাবি ইনজেস্টেড সোর্সের উপর ভিত্তি করে।"
            if bn
            else "Open-source news/analyst reporting + model scenarios — not a forecast or substitute for academic theses. "
            "Claims are grounded in ingested sources only."
        )

        return OutlookGenerateResponse(
            lang=req.lang,
            generated_at=datetime.now(UTC).isoformat(),
            challenges=challenges,
            direction=direction,
            scenarios=scenarios,
            narrative=narrative,
            disclaimer=disclaimer,
            source_count=len(req.sources),
            llm_used=llm_used,
        )

    def _build_challenges(self, req: OutlookGenerateRequest, bn: bool) -> list[ChallengeItem]:
        pol_hits: Counter[str] = Counter()
        eco_hits: Counter[str] = Counter()
        evidence: dict[str, list[str]] = {}

        for s in req.sources:
            blob = _text_blob(s.title, s.summary)
            cite = f"{s.source}: {s.title[:100]}"
            if s.domain in ("politics", "both"):
                for theme, n in _theme_hits(blob, POLITICS_THEME_KW).items():
                    pol_hits[theme] += n
                    evidence.setdefault(f"politics:{theme}", []).append(cite)
            if s.domain in ("economy", "both"):
                for theme, n in _theme_hits(blob, ECONOMY_THEME_KW).items():
                    eco_hits[theme] += n
                    evidence.setdefault(f"economy:{theme}", []).append(cite)

        unrest = req.unrest_summary or {}
        if int(unrest.get("districts_at_risk") or 0) >= 1:
            pol_hits["security_unrest"] += 2
            evidence.setdefault("politics:security_unrest", []).append(
                f"Unrest pulse: {unrest.get('districts_at_risk')} districts at risk"
            )

        labels = {
            "governance_legitimacy": ("শাসন ও নির্বাচনী বৈধতা", "Governance & electoral legitimacy"),
            "security_unrest": ("নিরাপত্তা ও জনঅসন্তোষ", "Security & public unrest"),
            "institutional_reform": ("প্রাতিষ্ঠানিক সংস্কার চাপ", "Institutional reform pressure"),
            "foreign_policy": ("পররাষ্ট্র ও ভূরাজনীতি", "Foreign policy & geopolitics"),
            "macro_stability": ("ম্যাক্রো অর্থনৈতিক স্থিতিশীলতা", "Macroeconomic stability"),
            "banking_finance": ("ব্যাংকিং ও আর্থিক খাত", "Banking & financial sector"),
            "export_jobs": ("রপ্তানি ও কর্মসংস্থান", "Exports & employment"),
            "energy_infra": ("জ্বালানি ও অবকাঠামো", "Energy & infrastructure"),
        }

        summaries = {
            "governance_legitimacy": (
                "নির্বাচন/সংস্কার/অন্তর্বর্তী শাসন নিয়ে সংবাদে চাপ — রাজনৈতিক রোডম্যাপের অনিশ্চয়তা সরকারের প্রধান চ্যালেঞ্জ।",
                "News stress around elections/reforms/interim governance — roadmap uncertainty is a core political challenge.",
            ),
            "security_unrest": (
                "বিক্ষোভ/সহিংসতা/জেলাভিত্তিক অসন্তোষ সংকেত সক্রিয় — আইনশৃঙ্খলা ও সামাজিক স্থিতি রক্ষায় চাপ।",
                "Active protest/violence/district discontent signals — pressure on law-and-order and social stability.",
            ),
            "institutional_reform": (
                "বিচার/পুলিশ/দুর্নীতি দমন সংস্কার নিয়ে আলোচনা বাড়ছে — বাস্তবায়ন বিলম্ব রাজনৈতিক ঝুঁকি বাড়ায়।",
                "Rising debate on judiciary/police/anti-corruption reform — delayed delivery raises political risk.",
            ),
            "foreign_policy": (
                "আঞ্চলিক শক্তি ও কূটনৈতিক ভারসাম্য নিয়ে বিশ্লেষণ বাড়ছে — পররাষ্ট্র কৌশল সংবেদনশীল।",
                "More analysis on regional powers and diplomatic balance — foreign policy remains sensitive.",
            ),
            "macro_stability": (
                "IMF/রিজার্ভ/মূল্যস্ফীতি/মুদ্রা চাপ সংবাদে ঘন ঘন উঠছে — ম্যাক্রো স্থিতিশীলতা সরকারের কেন্দ্রীয় অর্থনৈতিক চ্যালেঞ্জ।",
                "Frequent IMF/reserves/inflation/currency stress in reporting — macro stability is the central economic challenge.",
            ),
            "banking_finance": (
                "ব্যাংকিং দুর্বলতা ও খেলাপি ঋণ নিয়ে উদ্বেগ — আর্থিক খাত সংস্কার জরুরি।",
                "Concerns over banking weakness and NPLs — financial-sector reform is urgent.",
            ),
            "export_jobs": (
                "RMG/রপ্তানি/রেমিট্যান্স ও কর্মসংস্থান চাপ — বাহ্যিক চাহিদা ও শ্রমবাজার ঝুঁকি।",
                "RMG/export/remittance and jobs pressure — external demand and labor-market risk.",
            ),
            "energy_infra": (
                "জ্বালানি ও অবকাঠামো/বিনিয়োগ সংকেত — খরচ ও সরবরাহ নিরাপত্তা চ্যালেঞ্জ।",
                "Energy and infrastructure/investment signals — cost and supply-security challenges.",
            ),
        }

        out: list[ChallengeItem] = []
        for theme, n in pol_hits.most_common(4):
            if n <= 0:
                continue
            title = labels[theme][0 if bn else 1]
            summary = summaries[theme][0 if bn else 1]
            out.append(
                ChallengeItem(
                    domain="politics",
                    title=title,
                    severity=min(5, 2 + n),
                    summary=summary,
                    evidence=evidence.get(f"politics:{theme}", [])[:4],
                )
            )
        for theme, n in eco_hits.most_common(4):
            if n <= 0:
                continue
            title = labels[theme][0 if bn else 1]
            summary = summaries[theme][0 if bn else 1]
            out.append(
                ChallengeItem(
                    domain="economy",
                    title=title,
                    severity=min(5, 2 + n),
                    summary=summary,
                    evidence=evidence.get(f"economy:{theme}", [])[:4],
                )
            )

        if not out:
            out = [
                ChallengeItem(
                    domain="politics",
                    title="রাজনৈতিক অনিশ্চয়তা" if bn else "Political uncertainty",
                    severity=3,
                    summary=(
                        "পর্যাপ্ত বিশ্লেষক/সংবাদ সোর্স নেই — নিউজ সিঙ্ক বাড়ান।"
                        if bn
                        else "Insufficient analyst/news coverage — sync more feeds."
                    ),
                    evidence=[],
                ),
                ChallengeItem(
                    domain="economy",
                    title="অর্থনৈতিক চাপ পর্যবেক্ষণ" if bn else "Economic pressure watch",
                    severity=3,
                    summary=(
                        "অর্থনীতি-সম্পর্কিত খোলা সোর্স সীমিত — IMF/রপ্তানি ফিড সিঙ্ক করুন।"
                        if bn
                        else "Limited open economic sources — sync IMF/export feeds."
                    ),
                    evidence=[],
                ),
            ]
        return out[:8]

    def _build_direction(self, req: OutlookGenerateRequest, bn: bool) -> list[DirectionItem]:
        pol = sum(1 for s in req.sources if s.domain in ("politics", "both"))
        eco = sum(1 for s in req.sources if s.domain in ("economy", "both"))
        unrest = req.unrest_summary or {}
        at_risk = int(unrest.get("districts_at_risk") or 0)
        protests = int(unrest.get("active_protests") or 0)

        pol_traj = "deteriorating" if at_risk >= 3 or protests >= 5 else ("stable" if pol < 5 else "uncertain")
        eco_neg = sum(
            1
            for s in req.sources
            if s.domain in ("economy", "both")
            and re.search(r"imf|inflation|crisis|reserves|npl|default|মূল্যস্ফীতি|সংকট|খেলাপি", _text_blob(s.title, s.summary))
        )
        eco_traj = "deteriorating" if eco_neg >= 3 else ("improving" if eco_neg == 0 and eco >= 3 else "uncertain")

        traj_bn = {
            "improving": "উন্নতির দিকে",
            "stable": "স্থিতিশীল",
            "deteriorating": "চাপ বাড়ছে",
            "uncertain": "অনিশ্চিত/মিশ্র",
        }

        return [
            DirectionItem(
                domain="politics",
                trajectory=pol_traj,
                summary=(
                    f"রাজনীতি: {traj_bn[pol_traj]} — নির্বাচন/সংস্কার/অসন্তোষ সংকেত অনুযায়ী দিক নির্ধারণ।"
                    if bn
                    else f"Politics: {pol_traj} — direction inferred from election/reform/unrest signals."
                ),
                drivers=[
                    f"politics sources: {pol}",
                    f"districts_at_risk: {at_risk}",
                    f"protest_signals: {protests}",
                ],
            ),
            DirectionItem(
                domain="economy",
                trajectory=eco_traj,
                summary=(
                    f"অর্থনীতি: {traj_bn[eco_traj]} — IMF/মূল্যস্ফীতি/রপ্তানি-রেমিট্যান্স থিম অনুযায়ী।"
                    if bn
                    else f"Economy: {eco_traj} — based on IMF/inflation/export-remittance themes."
                ),
                drivers=[
                    f"economy sources: {eco}",
                    f"stress_mentions: {eco_neg}",
                ],
            ),
        ]

    def _build_scenarios(self, req: OutlookGenerateRequest, bn: bool) -> list[ScenarioItem]:
        if bn:
            return [
                ScenarioItem(
                    label="ভিত্তি দৃশ্যপট (Base)",
                    horizon="৩–৫ বছর",
                    probability_band="base",
                    politics="ধাপে ধাপে নির্বাচনী/প্রাতিষ্ঠানিক সংস্কার; অসন্তোষ নিয়ন্ত্রণযোগ্য থাকলে স্থিতিশীলতা বাড়ে।",
                    economy="IMF কর্মসূচি ও রেমিট্যান্স/RMG পুনরুদ্ধার ধীর গতিতে ম্যাক্রো স্থিতি ফেরায়; মূল্যস্ফীতি ধীরে কমতে পারে।",
                    watchpoints=["নির্বাচনী রোডম্যাপ", "রিজার্ভ ও মূল্যস্ফীতি", "ব্যাংকিং সংস্কার"],
                ),
                ScenarioItem(
                    label="প্রতিকূল দৃশ্যপট (Adverse)",
                    horizon="৩–৫ বছর",
                    probability_band="adverse",
                    politics="সংস্কার বিলম্ব + বিক্ষোভ/জেলা অসন্তোষ তীব্র হলে শাসন ক্ষমতা ও বৈধতা চাপে পড়ে।",
                    economy="রিজার্ভ চাপ, ব্যাংকিং দুর্বলতা ও রপ্তানি মন্দার সমন্বয়ে প্রবৃদ্ধি ও কর্মসংস্থান ক্ষতিগ্রস্ত।",
                    watchpoints=["সহিংসতা/হরতাল", "IMF শর্ত পূরণ ব্যর্থতা", "RMG অর্ডার পতন"],
                ),
                ScenarioItem(
                    label="সংস্কার দৃশ্যপট (Reform)",
                    horizon="৩–৫ বছর",
                    probability_band="reform",
                    politics="স্বচ্ছ নির্বাচন ও প্রাতিষ্ঠানিক সংস্কার এগোলে রাজনৈতিক অনিশ্চয়তা কমে বিনিয়োগ আস্থা বাড়ে।",
                    economy="আর্থিক খাত পরিচ্ছন্নতা + রপ্তানি বৈচিত্র্য + জ্বালানি স্থিতি থাকলে মধ্যমেয়াদে স্থিতিশীল প্রবৃদ্ধি সম্ভব।",
                    watchpoints=["সংস্কার বাস্তবায়ন গতি", "FDI/বিনিয়োগ প্রবাহ", "শ্রমবাজার স্থিতি"],
                ),
            ]
        return [
            ScenarioItem(
                label="Base case",
                horizon="3–5 years",
                probability_band="base",
                politics="Gradual electoral/institutional reform; stability improves if unrest stays manageable.",
                economy="IMF program plus remittance/RMG recovery slowly restore macro stability; inflation eases gradually.",
                watchpoints=["Election roadmap", "Reserves & inflation", "Banking reform"],
            ),
            ScenarioItem(
                label="Adverse case",
                horizon="3–5 years",
                probability_band="adverse",
                politics="Reform delays plus sharper protests/district unrest weaken governance capacity and legitimacy.",
                economy="Combined reserve stress, banking weakness and export slowdown hit growth and jobs.",
                watchpoints=["Violence/hartals", "IMF program slippage", "RMG order drop"],
            ),
            ScenarioItem(
                label="Reform case",
                horizon="3–5 years",
                probability_band="reform",
                politics="Credible elections and institutional reform reduce uncertainty and lift investment confidence.",
                economy="Financial cleanup + export diversification + energy stability enable steadier medium-term growth.",
                watchpoints=["Reform delivery speed", "FDI inflows", "Labor-market stability"],
            ),
        ]

    def _build_narrative(
        self,
        challenges: list[ChallengeItem],
        direction: list[DirectionItem],
        scenarios: list[ScenarioItem],
        bn: bool,
    ) -> str:
        pol = [c for c in challenges if c.domain == "politics"]
        eco = [c for c in challenges if c.domain == "economy"]

        sev_label_bn = {5: "অত্যন্ত উচ্চ", 4: "উচ্চ", 3: "মাঝারি", 2: "নিম্ন", 1: "সামান্য"}
        sev_label_en = {5: "Critical", 4: "High", 3: "Moderate", 2: "Low", 1: "Minor"}

        if bn:
            lines = [
                "বাংলাদেশের বর্তমান রাজনৈতিক ও অর্থনৈতিক পরিস্থিতি খোলা সোর্স তথ্যের ভিত্তিতে বিশ্লেষণ করা হয়েছে।",
                "",
                "রাজনৈতিক চ্যালেঞ্জ:",
            ]
            for c in pol[:3]:
                sev = sev_label_bn.get(c.severity, "মাঝারি")
                lines.append(f"• {c.title} ({sev} ঝুঁকি) — {c.summary}")
            if eco:
                lines.append("")
                lines.append("অর্থনৈতিক চ্যালেঞ্জ:")
            for c in eco[:3]:
                sev = sev_label_bn.get(c.severity, "মাঝারি")
                lines.append(f"• {c.title} ({sev} ঝুঁকি) — {c.summary}")
            lines.append("")
            lines.append("গতিপথ:")
            for d in direction:
                lines.append(f"• {d.summary}")
            lines.append("")
            lines.append("আগামী ৩–৫ বছরের সম্ভাব্য দৃশ্যপট:")
            for s in scenarios:
                lines.append(f"• {s.label}: {s.politics} অর্থনীতিতে — {s.economy}")
            return "\n".join(lines)

        lines = [
            "Bangladesh's current political and economic situation is analysed on the basis of open-source reporting.",
            "",
            "Political challenges:",
        ]
        for c in pol[:3]:
            sev = sev_label_en.get(c.severity, "Moderate")
            lines.append(f"• {c.title} ({sev} risk) — {c.summary}")
        if eco:
            lines.append("")
            lines.append("Economic challenges:")
        for c in eco[:3]:
            sev = sev_label_en.get(c.severity, "Moderate")
            lines.append(f"• {c.title} ({sev} risk) — {c.summary}")
        lines.append("")
        lines.append("Direction of travel:")
        for d in direction:
            lines.append(f"• {d.summary}")
        lines.append("")
        lines.append("Probable scenarios over the next 3–5 years:")
        for s in scenarios:
            lines.append(f"• {s.label}: {s.politics} On the economy — {s.economy}")
        return "\n".join(lines)

    async def _llm_polish(
        self,
        req: OutlookGenerateRequest,
        challenges: list[ChallengeItem],
        direction: list[DirectionItem],
        scenarios: list[ScenarioItem],
        bn: bool,
    ) -> str | None:
        system = (
            "তুমি GeoInsight BD এর কৌশলগত বিশ্লেষক। নিচের JSON-এ ইতিমধ্যে challenges, direction, scenarios তৈরি আছে। "
            "শুধু সেগুলো ব্যবহার করে বাংলায় ১২–১৮ লাইনের নির্বাহী সারাংশ লেখো। "
            "নতুন পরিসংখ্যান/থিসিস/লেখক বানাবে না। সোর্স তালিকা বর্ণনা করবে না — সরাসরি চ্যালেঞ্জ, দিক ও ৩–৫ বছরের দৃশ্যপট লেখো।"
            if bn
            else "You are GeoInsight BD strategic analyst. The JSON already contains challenges, direction, and scenarios. "
            "Write a 12–18 line executive summary in English using ONLY those fields. "
            "Do not invent stats/papers/authors. Do not describe the source list — cover challenges, direction, and 3–5 year scenarios directly."
        )
        slim = {
            "challenges": [c.model_dump() for c in challenges],
            "direction": [d.model_dump() for d in direction],
            "scenarios": [s.model_dump() for s in scenarios],
            "sample_sources": [
                {"title": s.title, "source": s.source, "domain": s.domain}
                for s in req.sources[:12]
            ],
            "unrest": req.unrest_summary,
        }
        return await self._ollama.complete(
            system,
            json.dumps(slim, ensure_ascii=False)[:8000],
            temperature=0.2,
        )
