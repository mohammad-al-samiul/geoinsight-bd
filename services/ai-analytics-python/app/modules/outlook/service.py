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
    EconomyDeep,
    GaugeItem,
    GdpLever,
    InvestmentItem,
    OutlookGenerateRequest,
    OutlookGenerateResponse,
    PoliticsDeep,
    PreventionItem,
    PressureItem,
    PriceOutlookItem,
    RiskItem,
    ScenarioItem,
    SolutionItem,
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
        politics_deep = self._build_politics_deep(req, challenges, direction, bn)
        economy_deep = self._build_economy_deep(req, challenges, direction, bn)
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
            politics_deep=politics_deep,
            economy_deep=economy_deep,
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
        if bn:
            lines = [
                "বাংলাদেশ — রাজনৈতিক ও অর্থনৈতিক কৌশলগত আউটলুক (খোলা সোর্স ভিত্তিক)।",
                "",
                "বর্তমান সরকারের প্রধান চ্যালেঞ্জ:",
            ]
            for c in pol[:3]:
                lines.append(f"• [রাজনীতি L{c.severity}] {c.title}: {c.summary}")
            for c in eco[:3]:
                lines.append(f"• [অর্থনীতি L{c.severity}] {c.title}: {c.summary}")
            lines.append("")
            lines.append("দিকনির্দেশনা:")
            for d in direction:
                lines.append(f"• {d.summary}")
            lines.append("")
            lines.append("আগামী ৩–৫ বছর (দৃশ্যপট):")
            for s in scenarios:
                lines.append(f"• {s.label}: {s.politics} | {s.economy}")
            return "\n".join(lines)

        lines = [
            "Bangladesh — Political & Economic Strategic Outlook (open-source grounded).",
            "",
            "Current government challenges:",
        ]
        for c in pol[:3]:
            lines.append(f"• [Politics L{c.severity}] {c.title}: {c.summary}")
        for c in eco[:3]:
            lines.append(f"• [Economy L{c.severity}] {c.title}: {c.summary}")
        lines.append("")
        lines.append("Direction of travel:")
        for d in direction:
            lines.append(f"• {d.summary}")
        lines.append("")
        lines.append("Next 3–5 years (scenarios):")
        for s in scenarios:
            lines.append(f"• {s.label}: {s.politics} | {s.economy}")
        return "\n".join(lines)

    def _cite_for(self, req: OutlookGenerateRequest, domain: str, limit: int = 3) -> list[str]:
        rows = [
            f"{s.source}: {s.title[:90]}"
            for s in req.sources
            if s.domain in (domain, "both")
        ]
        return rows[:limit]

    def _build_politics_deep(
        self,
        req: OutlookGenerateRequest,
        challenges: list[ChallengeItem],
        direction: list[DirectionItem],
        bn: bool,
    ) -> PoliticsDeep:
        unrest = req.unrest_summary or {}
        at_risk = int(unrest.get("districts_at_risk") or 0)
        protests = int(unrest.get("active_protests") or 0)
        pol_dir = next((d for d in direction if d.domain == "politics"), None)
        cites = self._cite_for(req, "politics")
        sev = {c.title: c.severity for c in challenges if c.domain == "politics"}

        def intensity_from(theme_key: str, base: int) -> int:
            bump = 0
            for title, s in sev.items():
                blob = title.lower()
                if theme_key in blob or any(k in blob for k in theme_key.split("_")):
                    bump = max(bump, s * 12)
            return min(100, base + bump)

        unrest_i = min(100, 25 + at_risk * 12 + protests * 6)
        gov_i = intensity_from("নির্বাচন", 45) if bn else intensity_from("governance", 45)
        reform_i = intensity_from("সংস্কার", 40) if bn else intensity_from("reform", 40)
        foreign_i = intensity_from("পররাষ্ট্র", 35) if bn else intensity_from("foreign", 35)

        if bn:
            pressures = [
                PressureItem(
                    id="pol_unrest",
                    title="জেলাভিত্তিক অসন্তোষ ও আইনশৃঙ্খলা চাপ",
                    intensity=unrest_i,
                    status="rising" if unrest_i >= 55 else "active",
                    summary=(
                        f"অসন্তোষ পাল্সে {at_risk} জেলা ঝুঁকিতে, প্রতিবাদ সংকেত {protests}। "
                        "স্থানীয় সহিংসতা/বিক্ষোভ শাসন ক্ষমতা ও জনআস্থা কেড়ে নেয়।"
                    ),
                    evidence=cites
                    + ([f"Unrest: {at_risk} districts, {protests} protests"] if at_risk or protests else []),
                ),
                PressureItem(
                    id="pol_election",
                    title="নির্বাচনী রোডম্যাপ ও বৈধতা চাপ",
                    intensity=gov_i,
                    status="active",
                    summary="নির্বাচন/অন্তর্বর্তী শাসন/সংবিধান সংস্কার নিয়ে অনিশ্চয়তা রাজনৈতিক বৈধতার কেন্দ্রীয় চাপ।",
                    evidence=cites,
                ),
                PressureItem(
                    id="pol_institutions",
                    title="প্রাতিষ্ঠানিক সংস্কার বাস্তবায়ন চাপ",
                    intensity=reform_i,
                    status="rising" if reform_i >= 50 else "active",
                    summary="পুলিশ/বিচার/দুর্নীতি দমন সংস্কার বিলম্ব হলে জনঅসন্তোষ ও বিরোধী চাপ বাড়ে।",
                    evidence=cites,
                ),
                PressureItem(
                    id="pol_foreign",
                    title="আঞ্চলিক কূটনীতি ও বাহ্যিক চাপ",
                    intensity=foreign_i,
                    status="active",
                    summary="ভারত–চীন–পশ্চিম ভারসাম্য, সাহায্য/ঋণ শর্ত ও অভিবাসন ইস্যু পররাষ্ট্র কৌশলকে সংবেদনশীল রাখে।",
                    evidence=cites,
                ),
            ]
            upcoming = [
                RiskItem(
                    id="risk_election_delay",
                    title="নির্বাচন/রোডম্যাপ বিলম্ব",
                    likelihood="high" if gov_i >= 50 else "medium",
                    horizon="৬–১৮ মাস",
                    summary="রোডম্যাপ অস্পষ্ট থাকলে রাস্তার চাপ ও দলীয় মেরুকরণ তীব্র হতে পারে।",
                    early_signals=["নির্বাচন কমিশন বিতর্ক", "বড় বিক্ষোভ", "সংস্কার বিলম্ব সংবাদ"],
                ),
                RiskItem(
                    id="risk_local_violence",
                    title="স্থানীয় সহিংসতা/হরতাল চক্র",
                    likelihood="high" if unrest_i >= 50 else "medium",
                    horizon="৩–১২ মাস",
                    summary="জেলা অসন্তোষ দমন না হলে পরিবহন/বাজার ও প্রশাসনিক কার্যক্রম ব্যাহত হতে পারে।",
                    early_signals=["জেলা হিটম্যাপ উষ্ণতা", "পুলিশ–জনতা সংঘাত", "হরতাল ঘোষণা"],
                ),
                RiskItem(
                    id="risk_reform_backlash",
                    title="সংস্কার বাস্তবায়নে প্রাতিষ্ঠানিক প্রতিরোধ",
                    likelihood="medium",
                    horizon="১–৩ বছর",
                    summary="কমিশন/আইন পাস হলেও বাস্তবায়ন আটকে গেলে আস্থা সংকট গভীর হয়।",
                    early_signals=["কমিটি গঠন কিন্তু অগ্রগতি নেই", "দুর্নীতি মামলা স্থবির"],
                ),
                RiskItem(
                    id="risk_geopolitics",
                    title="ভূরাজনৈতিক টানাপোড়েন",
                    likelihood="medium",
                    horizon="১–৫ বছর",
                    summary="বাণিজ্য/নিরাপত্তা জোট চাপ অভ্যন্তরীণ রাজনীতিতে স্পিলওভার করতে পারে।",
                    early_signals=["সীমান্ত উত্তেজনা", "সাহায্য শর্ত কঠোর", "কূটনৈতিক সমালোচনা"],
                ),
            ]
            solutions = [
                SolutionItem(
                    id="sol_roadmap",
                    title="স্বচ্ছ নির্বাচনী রোডম্যাপ প্রকাশ",
                    targets=["pol_election", "risk_election_delay"],
                    steps=[
                        "তারিখ/ধাপসহ রোডম্যাপ জনসমক্ষে প্রকাশ",
                        "নির্বাচন কমিশনের স্বাধীনতা নিশ্চিত করার দৃশ্যমান পদক্ষেপ",
                        "পর্যবেক্ষক ও নাগরিক সমাজের সাথে নিয়মিত ব্রিফিং",
                    ],
                    expected_effect="অনিশ্চয়তা কমে বৈধতা চাপ ও রাস্তার উত্তেজনা কমতে পারে।",
                    timeframe="৩–৯ মাস",
                ),
                SolutionItem(
                    id="sol_unrest",
                    title="জেলা অসন্তোষ ডি-এস্কেলেশন সেল",
                    targets=["pol_unrest", "risk_local_violence"],
                    steps=[
                        "উচ্চ-ঝুঁকি জেলায় দ্রুত অভিযোগ নিষ্পত্তি সেল",
                        "অতিরিক্ত বলপ্রয়োগ এড়িয়ে সংলাপ + স্থানীয় মধ্যস্থতা",
                        "খাদ্য/জ্বালানি/চাকরি অভিযোগের সাথে সমন্বিত সাড়া",
                    ],
                    expected_effect="সহিংসতা ও হরতাল চক্র ভাঙতে সাহায্য করে।",
                    timeframe="তাৎক্ষণিক–৬ মাস",
                ),
                SolutionItem(
                    id="sol_reform",
                    title="সংস্কার ডেলিভারি স্কোরকার্ড",
                    targets=["pol_institutions", "risk_reform_backlash"],
                    steps=[
                        "পুলিশ/বিচার/দুর্নীতি দমনে মাসিক পাবলিক স্কোরকার্ড",
                        "সময়সীমাসহ দায়িত্বপ্রাপ্ত প্রতিষ্ঠান নির্ধারণ",
                        "নাগরিক ফিডব্যাক চ্যানেল খোলা",
                    ],
                    expected_effect="‘শুধু ঘোষণা’ ধারণা কমে আস্থা বাড়ে।",
                    timeframe="৬–২৪ মাস",
                ),
            ]
            prevention = [
                PreventionItem(
                    id="prev_early_warn",
                    title="রাজনৈতিক আর্লি-ওয়ার্নিং",
                    actions=[
                        "জেলা অসন্তোষ হিটম্যাপ সাপ্তাহিক পর্যালোচনা",
                        "বড় বিক্ষোভের আগে স্থানীয় সংলাপ টিম মোতায়েন",
                        "গুজব/বিভ্রান্তি মোকাবিলায় দ্রুত তথ্য সেল",
                    ],
                    owner_hint="স্বরাষ্ট্র + স্থানীয় প্রশাসন",
                ),
                PreventionItem(
                    id="prev_inclusive",
                    title="অন্তর্ভুক্তিমূলক রাজনৈতিক সংলাপ",
                    actions=[
                        "প্রধান দল/নাগরিক সমাজের সাথে নিয়মিত টেবিল",
                        "যুব ও নারী প্রতিনিধিত্ব নিশ্চিত করা",
                        "নির্বাচনী আচরণবিধি আগে থেকে চূড়ান্ত করা",
                    ],
                    owner_hint="মন্ত্রিপরিষদ / নির্বাচন কমিশন",
                ),
                PreventionItem(
                    id="prev_comms",
                    title="স্বচ্ছ যোগাযোগ নীতি",
                    actions=[
                        "বড় সিদ্ধান্তের আগে জনব্রিফিং",
                        "অর্থনীতি–রাজনীতি যৌথ বার্তা (মূল্যস্ফীতি + নিরাপত্তা)",
                        "গুজব দমনে ঘণ্টাভিত্তিক ফ্যাক্টচেক",
                    ],
                    owner_hint="তথ্য মন্ত্রণালয় / পিএমও",
                ),
            ]
            narrative = (
                f"রাজনৈতিক চাপ এখন মূলত নির্বাচনী অনিশ্চয়তা, প্রাতিষ্ঠানিক সংস্কার বিলম্ব ও জেলা অসন্তোষকে ঘিরে। "
                f"দিক: {(pol_dir.trajectory if pol_dir else 'uncertain')}। "
                "সমাধান = স্বচ্ছ রোডম্যাপ + ডি-এস্কেলেশন + দৃশ্যমান সংস্কার ডেলিভারি; প্রতিরোধ = আর্লি-ওয়ার্নিং ও অন্তর্ভুক্তিমূলক সংলাপ।"
            )
        else:
            pressures = [
                PressureItem(
                    id="pol_unrest",
                    title="District unrest & law-and-order pressure",
                    intensity=unrest_i,
                    status="rising" if unrest_i >= 55 else "active",
                    summary=f"{at_risk} districts at risk, {protests} protest signals — local unrest erodes governance capacity.",
                    evidence=cites,
                ),
                PressureItem(
                    id="pol_election",
                    title="Election roadmap & legitimacy pressure",
                    intensity=gov_i,
                    status="active",
                    summary="Uncertainty around elections/interim governance/constitutional reform is the core legitimacy stress.",
                    evidence=cites,
                ),
                PressureItem(
                    id="pol_institutions",
                    title="Institutional reform delivery pressure",
                    intensity=reform_i,
                    status="rising" if reform_i >= 50 else "active",
                    summary="Delayed police/judiciary/anti-corruption reform fuels discontent and opposition pressure.",
                    evidence=cites,
                ),
                PressureItem(
                    id="pol_foreign",
                    title="Regional diplomacy & external pressure",
                    intensity=foreign_i,
                    status="active",
                    summary="India–China–West balancing, aid conditionality and migration issues keep foreign policy sensitive.",
                    evidence=cites,
                ),
            ]
            upcoming = [
                RiskItem(
                    id="risk_election_delay",
                    title="Election/roadmap slippage",
                    likelihood="high" if gov_i >= 50 else "medium",
                    horizon="6–18 months",
                    summary="Vague roadmap can sharpen street pressure and partisan polarization.",
                    early_signals=["EC controversies", "mass protests", "reform delay headlines"],
                ),
                RiskItem(
                    id="risk_local_violence",
                    title="Local violence/hartal cycles",
                    likelihood="high" if unrest_i >= 50 else "medium",
                    horizon="3–12 months",
                    summary="Unmanaged district unrest can disrupt transport, markets and administration.",
                    early_signals=["Heatmap warming", "police–crowd clashes", "hartal calls"],
                ),
                RiskItem(
                    id="risk_reform_backlash",
                    title="Institutional resistance to reform",
                    likelihood="medium",
                    horizon="1–3 years",
                    summary="Laws/commissions without delivery deepen trust deficits.",
                    early_signals=["Committees without progress", "stalled corruption cases"],
                ),
                RiskItem(
                    id="risk_geopolitics",
                    title="Geopolitical spillover",
                    likelihood="medium",
                    horizon="1–5 years",
                    summary="Trade/security alignment pressure can spill into domestic politics.",
                    early_signals=["Border tension", "tighter aid terms", "diplomatic criticism"],
                ),
            ]
            solutions = [
                SolutionItem(
                    id="sol_roadmap",
                    title="Publish a credible election roadmap",
                    targets=["pol_election", "risk_election_delay"],
                    steps=[
                        "Public dated roadmap",
                        "Visible steps for EC independence",
                        "Regular briefings with observers and civil society",
                    ],
                    expected_effect="Lower uncertainty and street temperature.",
                    timeframe="3–9 months",
                ),
                SolutionItem(
                    id="sol_unrest",
                    title="District de-escalation cells",
                    targets=["pol_unrest", "risk_local_violence"],
                    steps=[
                        "Rapid grievance cells in high-risk districts",
                        "Dialogue-first posture; avoid excess force",
                        "Link response to food/fuel/jobs complaints",
                    ],
                    expected_effect="Break violence/hartal cycles.",
                    timeframe="Immediate–6 months",
                ),
                SolutionItem(
                    id="sol_reform",
                    title="Reform delivery scorecard",
                    targets=["pol_institutions", "risk_reform_backlash"],
                    steps=[
                        "Monthly public scorecard for police/justice/anti-corruption",
                        "Named owners and deadlines",
                        "Open citizen feedback channel",
                    ],
                    expected_effect="Shift from announcements to delivery trust.",
                    timeframe="6–24 months",
                ),
            ]
            prevention = [
                PreventionItem(
                    id="prev_early_warn",
                    title="Political early-warning",
                    actions=[
                        "Weekly district unrest heatmap review",
                        "Pre-protest local dialogue teams",
                        "Rapid fact cell against rumor spikes",
                    ],
                    owner_hint="Home + local admin",
                ),
                PreventionItem(
                    id="prev_inclusive",
                    title="Inclusive political dialogue",
                    actions=[
                        "Regular table with major parties/civil society",
                        "Youth and women representation",
                        "Finalize electoral code of conduct early",
                    ],
                    owner_hint="Cabinet / Election Commission",
                ),
                PreventionItem(
                    id="prev_comms",
                    title="Transparent communications",
                    actions=[
                        "Public briefings before major decisions",
                        "Joint politics–economy messaging",
                        "Hourly fact-checks during rumor waves",
                    ],
                    owner_hint="Info Ministry / PMO",
                ),
            ]
            narrative = (
                f"Political pressure centers on election uncertainty, reform delivery lags and district unrest. "
                f"Trajectory: {(pol_dir.trajectory if pol_dir else 'uncertain')}. "
                "Solution stack = roadmap + de-escalation + visible reform delivery; prevention = early-warning and inclusive dialogue."
            )

        gauges = [
            GaugeItem(id="g_legitimacy", label="নির্বাচনী চাপ" if bn else "Electoral pressure", value=gov_i, tone="bad" if gov_i >= 60 else "warn"),
            GaugeItem(id="g_unrest", label="অসন্তোষ চাপ" if bn else "Unrest pressure", value=unrest_i, tone="bad" if unrest_i >= 60 else "warn"),
            GaugeItem(id="g_reform", label="সংস্কার চাপ" if bn else "Reform pressure", value=reform_i, tone="warn"),
            GaugeItem(id="g_foreign", label="কূটনৈতিক চাপ" if bn else "Diplomatic pressure", value=foreign_i, tone="neutral"),
        ]
        return PoliticsDeep(
            narrative=narrative,
            gauges=gauges,
            current_pressures=pressures,
            upcoming_issues=upcoming,
            solutions=solutions,
            prevention=prevention,
        )

    def _build_economy_deep(
        self,
        req: OutlookGenerateRequest,
        challenges: list[ChallengeItem],
        direction: list[DirectionItem],
        bn: bool,
    ) -> EconomyDeep:
        cites = self._cite_for(req, "economy")
        eco_dir = next((d for d in direction if d.domain == "economy"), None)
        blob = " ".join(_text_blob(s.title, s.summary) for s in req.sources if s.domain in ("economy", "both"))
        infl = len(re.findall(r"inflation|মূল্যস্ফীতি|price|দাম", blob))
        reserve = len(re.findall(r"reserve|রিজার্ভ|forex|imf", blob))
        bank = len(re.findall(r"npl|default|bank|ব্যাংক|খেলাপি", blob))
        export = len(re.findall(r"rmg|export|রপ্তানি|remittance|রেমিট্যান্স", blob))
        energy = len(re.findall(r"energy|fuel|power|জ্বালানি|বিদ্যুৎ", blob))

        infl_g = min(100, 35 + infl * 8)
        reserve_g = min(100, 30 + reserve * 7)
        bank_g = min(100, 30 + bank * 9)
        export_g = min(100, 25 + export * 6)
        energy_g = min(100, 30 + energy * 8)

        if bn:
            pressures = [
                PressureItem(
                    id="eco_inflation",
                    title="মূল্যস্ফীতি ও জীবনযাত্রার ব্যয়",
                    intensity=infl_g,
                    status="rising" if infl_g >= 55 else "active",
                    summary="খাদ্য/জ্বালানি দামের চাপ পরিবার ও রাজনৈতিক স্থিতি উভয়কেই চাপে ফেলে।",
                    evidence=cites,
                ),
                PressureItem(
                    id="eco_fx",
                    title="রিজার্ভ, মুদ্রা ও IMF শর্ত",
                    intensity=reserve_g,
                    status="active",
                    summary="রিজার্ভ ও টাকার চাপ আমদানি/ঋণ পরিশোধ ও নীতিনির্ধারণকে সীমাবদ্ধ করে।",
                    evidence=cites,
                ),
                PressureItem(
                    id="eco_banking",
                    title="ব্যাংকিং দুর্বলতা ও খেলাপি ঋণ",
                    intensity=bank_g,
                    status="rising" if bank_g >= 50 else "active",
                    summary="দুর্বল ব্যাংক ও NPL বিনিয়োগ ও ঋণপ্রবাহ আটকে রাখে।",
                    evidence=cites,
                ),
                PressureItem(
                    id="eco_external",
                    title="রপ্তানি/রেমিট্যান্স ও কর্মসংস্থান",
                    intensity=export_g,
                    status="active",
                    summary="RMG অর্ডার ও রেমিট্যান্স ওঠানামা প্রবৃদ্ধি ও চাকরির বাজারকে প্রভাবিত করে।",
                    evidence=cites,
                ),
            ]
            upcoming = [
                RiskItem(
                    id="risk_food_fuel",
                    title="খাদ্য–জ্বালানি মূল্য ঝাঁকুনি",
                    likelihood="high" if infl_g >= 50 else "medium",
                    horizon="৩–১২ মাস",
                    summary="বৈশ্বিক পণ্যমূল্য বা অভ্যন্তরীণ সরবরাহ বিঘ্ন হলে মূল্যস্ফীতি আবার তীব্র হতে পারে।",
                    early_signals=["জ্বালানি মূল্যবৃদ্ধি", "খাদ্য মজুত সংকট", "টাকা দুর্বলতা"],
                ),
                RiskItem(
                    id="risk_banking",
                    title="ব্যাংকিং খাতের তারল্য চাপ",
                    likelihood="medium",
                    horizon="৬–২৪ মাস",
                    summary="খেলাপি ঋণ ও দুর্বল গভর্ন্যান্স আমানতকারী আস্থা ও ঋণপ্রবাহ কমাতে পারে।",
                    early_signals=["NPL বৃদ্ধি", "তারল্য সহায়তা চাহিদা", "মার্জার চাপ"],
                ),
                RiskItem(
                    id="risk_rmg",
                    title="RMG অর্ডার/প্রতিযোগিতা চাপ",
                    likelihood="medium",
                    horizon="১–৩ বছর",
                    summary="বৈশ্বিক চাহিদা কমলে রপ্তানি আয় ও কর্মসংস্থান ক্ষতিগ্রস্ত হতে পারে।",
                    early_signals=["অর্ডার বাতিল", "কারখানা বন্ধ", "প্রতিযোগী দেশে স্থানান্তর"],
                ),
            ]
            prices = [
                PriceOutlookItem(item="চাল/খাদ্যশস্য", direction="up", magnitude="moderate", reason="সরবরাহ ও পরিবহন খরচ + মুদ্রা চাপ", confidence="medium"),
                PriceOutlookItem(item="জ্বালানি/বিদ্যুৎ", direction="up", magnitude="moderate" if energy_g >= 40 else "mild", reason="আমদানি নির্ভরতা ও সাবসিডি সমন্বয়", confidence="medium"),
                PriceOutlookItem(item="পোশাক রপ্তানি একক মূল্য", direction="stable", magnitude="mild", reason="ক্রেতা চাপ বনাম খরচ বৃদ্ধি — মিশ্র", confidence="low"),
                PriceOutlookItem(item="নির্মাণ সামগ্রী", direction="up", magnitude="mild", reason="ডলার ও আমদানি খরচ", confidence="medium"),
                PriceOutlookItem(item="রেমিট্যান্স প্রবাহ", direction="up", magnitude="mild", reason="প্রণোদনা ও বৈধ চ্যানেল জোর — ওঠানামাসহ", confidence="medium"),
                PriceOutlookItem(item="ব্যাংক ঋণ সুদ", direction="stable", magnitude="mild", reason="মূল্যস্ফীতি নিয়ন্ত্রণ বনাম প্রবৃদ্ধি লক্ষ্য", confidence="low"),
            ]
            gdp = [
                GdpLever(sector="RMG ও রপ্তানি বৈচিত্র্য", action="নতুন পণ্য/বাজার + কমপ্লায়েন্স", gdp_impact="উচ্চ — রপ্তানি আয় ও কর্মসংস্থান", feasibility="high", score=82),
                GdpLever(sector="রেমিট্যান্স", action="বৈধ চ্যানেল ও দক্ষতা রপ্তানি", gdp_impact="উচ্চ — চলতি হিসাব স্থিতি", feasibility="high", score=78),
                GdpLever(sector="কৃষি–খাদ্য প্রক্রিয়াকরণ", action="কোল্ড চেইন ও কৃষিপণ্য রপ্তানি", gdp_impact="মাঝারি–উচ্চ — গ্রামীণ আয়", feasibility="medium", score=70),
                GdpLever(sector="ডিজিটাল/আইটি সার্ভিস", action="ফ্রিল্যান্স/বিপিও/সফটওয়্যার রপ্তানি", gdp_impact="মাঝারি–উচ্চ — বৈদেশিক মুদ্রা", feasibility="high", score=74),
                GdpLever(sector="বিদ্যুৎ ও লজিস্টিক্স", action="খরচ কমানো + পোর্ট/রেল দক্ষতা", gdp_impact="উচ্চ — উৎপাদনশীলতা", feasibility="medium", score=68),
                GdpLever(sector="ব্যাংকিং সংস্কার", action="NPL কমানো + সুশাসন", gdp_impact="মাঝারি — বিনিয়োগ সক্ষমতা", feasibility="medium", score=65),
            ]
            invest = [
                InvestmentItem(sector="রপ্তানিমুখী ম্যানুফ্যাকচারিং (কমপ্লায়েন্ট)", outlook="profit", rationale="বৈদেশিক মুদ্রা আয় ও কর্মসংস্থান — নীতি সহায়তা থাকলে লাভের সম্ভাবনা বেশি", risk="বৈশ্বিক চাহিদা ও শ্রম অস্থিরতা", horizon="২–৫ বছর"),
                InvestmentItem(sector="কৃষি প্রক্রিয়াকরণ ও কোল্ড স্টোরেজ", outlook="profit", rationale="খাদ্য অপচয় কমিয়ে দাম স্থিতি ও রপ্তানি সম্ভাবনা", risk="বিদ্যুৎ/লজিস্টিক্স খরচ", horizon="৩–৭ বছর"),
                InvestmentItem(sector="নবায়নযোগ্য জ্বালানি", outlook="mixed", rationale="দীর্ঘমেয়াদে খরচ কমায়; অগ্রিম ক্যাপেক্স বেশি", risk="ট্যারিফ/নীতি অনিশ্চয়তা", horizon="৫–১০ বছর"),
                InvestmentItem(sector="দুর্বল/অস্বচ্ছ আর্থিক পণ্য", outlook="loss", rationale="NPL ও গভর্ন্যান্স ঝুঁকিতে মূলধন ক্ষতির সম্ভাবনা", risk="খেলাপি ও তারল্য", horizon="১–৩ বছর"),
                InvestmentItem(sector="আইটি/বিপিও/ফ্রিল্যান্স ইকোসিস্টেম", outlook="profit", rationale="কম ক্যাপেক্স, উচ্চ রপ্তানি সম্ভাবনা", risk="দক্ষতা ঘাটতি ও ইন্টারনেট নির্ভরতা", horizon="১–৪ বছর"),
                InvestmentItem(sector="অপরিকল্পিত রিয়েল এস্টেট জল্পনা", outlook="mixed", rationale="মুদ্রাস্ফীতি হেজিং হতে পারে কিন্তু তারল্য ও নিয়ন্ত্রণ ঝুঁকি", risk="মূল্য সংশোধন", horizon="৩–৮ বছর"),
            ]
            solutions = [
                SolutionItem(
                    id="eco_sol_infl",
                    title="লক্ষ্যভিত্তিক মূল্যস্ফীতি নিয়ন্ত্রণ প্যাকেজ",
                    targets=["eco_inflation", "risk_food_fuel"],
                    steps=["খাদ্য মজুত ও বাজার মনিটরিং", "জ্বালানি সাবসিডি টার্গেটিং", "মুদ্রানীতি–রাজস্ব সমন্বয়"],
                    expected_effect="জীবনযাত্রার চাপ ও সামাজিক অসন্তোষ কমায়।",
                    timeframe="৩–১২ মাস",
                ),
                SolutionItem(
                    id="eco_sol_bank",
                    title="ব্যাংকিং পরিচ্ছন্নতা ও তদারকি",
                    targets=["eco_banking", "risk_banking"],
                    steps=["NPL স্বীকৃতি ও পুনরুদ্ধার", "দুর্বল ব্যাংক মার্জার/পুনঃপুঁজিকরণ", "ঋণ সুশাসন জোর"],
                    expected_effect="ঋণপ্রবাহ ও বিনিয়োগ আস্থা ফেরায়।",
                    timeframe="১–৩ বছর",
                ),
                SolutionItem(
                    id="eco_sol_gdp",
                    title="জিডিপি চালক প্যাকেজ",
                    targets=["eco_external"],
                    steps=["রপ্তানি বৈচিত্র্য", "রেমিট্যান্স চ্যানেল", "লজিস্টিক্স খরচ কমানো", "দক্ষতা উন্নয়ন"],
                    expected_effect="টেকসই প্রবৃদ্ধি ও কর্মসংস্থান বাড়ায়।",
                    timeframe="২–৫ বছর",
                ),
            ]
            prevention = [
                PreventionItem(
                    id="eco_prev_shock",
                    title="মূল্য ঝাঁকুনি বাফার",
                    actions=["কৌশলগত খাদ্য মজুত", "জ্বালানি হেজিং/বিকল্প সরবরাহ", "সামাজিক সুরক্ষা টার্গেটিং"],
                    owner_hint="অর্থ/খাদ্য/জ্বালানি মন্ত্রণালয়",
                ),
                PreventionItem(
                    id="eco_prev_fx",
                    title="বৈদেশিক মুদ্রা প্রতিরোধক্ষমতা",
                    actions=["রপ্তানি ও রেমিট্যান্স জোর", "অপ্রয়োজনীয় আমদানি নিয়ন্ত্রণ", "IMF কর্মসূচি শর্ত পূরণ"],
                    owner_hint="বাংলাদেশ ব্যাংক / অর্থ",
                ),
                PreventionItem(
                    id="eco_prev_invest",
                    title="বিনিয়োগ ঝুঁকি গেটকিপিং",
                    actions=["খাতভিত্তিক ঝুঁকি স্কোরকার্ড", "স্বচ্ছ প্রকল্প মূল্যায়ন", "FDI ওয়ান-স্টপ সহায়তা"],
                    owner_hint="বিওআই / পরিকল্পনা",
                ),
            ]
            narrative = (
                f"অর্থনৈতিক চাপ মূল্যস্ফীতি, রিজার্ভ/মুদ্রা, ব্যাংকিং ও রপ্তানি চক্রকে ঘিরে। "
                f"দিক: {(eco_dir.trajectory if eco_dir else 'uncertain')}। "
                "জিডিপি বাড়াতে RMG বৈচিত্র্য, রেমিট্যান্স, কৃষি প্রক্রিয়াকরণ, আইটি ও লজিস্টিক্স অগ্রাধিকার; "
                "দুর্বল আর্থিক পণ্য ও অস্বচ্ছ জল্পনা এড়িয়ে কমপ্লায়েন্ট রপ্তানি/কৃষি/আইটিতে বিনিয়োগ লাভের সম্ভাবনা বেশি।"
            )
        else:
            pressures = [
                PressureItem(id="eco_inflation", title="Inflation & cost of living", intensity=infl_g, status="rising" if infl_g >= 55 else "active", summary="Food/fuel price stress hits households and political stability.", evidence=cites),
                PressureItem(id="eco_fx", title="Reserves, currency & IMF terms", intensity=reserve_g, status="active", summary="Reserve/taka pressure constrains imports, debt service and policy space.", evidence=cites),
                PressureItem(id="eco_banking", title="Banking weakness & NPLs", intensity=bank_g, status="rising" if bank_g >= 50 else "active", summary="Weak banks and NPLs choke credit and investment.", evidence=cites),
                PressureItem(id="eco_external", title="Exports/remittances & jobs", intensity=export_g, status="active", summary="RMG orders and remittance swings shape growth and employment.", evidence=cites),
            ]
            upcoming = [
                RiskItem(id="risk_food_fuel", title="Food–fuel price spike", likelihood="high" if infl_g >= 50 else "medium", horizon="3–12 months", summary="Global commodities or domestic supply shocks can re-accelerate inflation.", early_signals=["fuel hikes", "food stock stress", "taka weakness"]),
                RiskItem(id="risk_banking", title="Banking liquidity stress", likelihood="medium", horizon="6–24 months", summary="NPLs and weak governance can erode depositor confidence and credit.", early_signals=["NPL rise", "liquidity support demand", "merger pressure"]),
                RiskItem(id="risk_rmg", title="RMG order/competitiveness pressure", likelihood="medium", horizon="1–3 years", summary="Weaker global demand can cut export earnings and jobs.", early_signals=["order cancellations", "factory closures", "relocation to rivals"]),
            ]
            prices = [
                PriceOutlookItem(item="Rice/staples", direction="up", magnitude="moderate", reason="Supply/logistics costs + currency pressure", confidence="medium"),
                PriceOutlookItem(item="Fuel/power", direction="up", magnitude="moderate" if energy_g >= 40 else "mild", reason="Import dependence and subsidy realignment", confidence="medium"),
                PriceOutlookItem(item="Apparel export unit prices", direction="stable", magnitude="mild", reason="Buyer pressure vs rising costs — mixed", confidence="low"),
                PriceOutlookItem(item="Construction materials", direction="up", magnitude="mild", reason="USD and import costs", confidence="medium"),
                PriceOutlookItem(item="Remittance inflows", direction="up", magnitude="mild", reason="Incentives and formal channels — still volatile", confidence="medium"),
                PriceOutlookItem(item="Bank lending rates", direction="stable", magnitude="mild", reason="Inflation control vs growth objectives", confidence="low"),
            ]
            gdp = [
                GdpLever(sector="RMG & export diversification", action="New products/markets + compliance", gdp_impact="High — FX and jobs", feasibility="high", score=82),
                GdpLever(sector="Remittances", action="Formal channels + skills export", gdp_impact="High — current-account buffer", feasibility="high", score=78),
                GdpLever(sector="Agro-processing", action="Cold chain & agri-export", gdp_impact="Medium–high — rural incomes", feasibility="medium", score=70),
                GdpLever(sector="Digital/IT services", action="Freelance/BPO/software exports", gdp_impact="Medium–high — FX", feasibility="high", score=74),
                GdpLever(sector="Power & logistics", action="Cut costs + port/rail efficiency", gdp_impact="High — productivity", feasibility="medium", score=68),
                GdpLever(sector="Banking reform", action="Cut NPLs + governance", gdp_impact="Medium — investment capacity", feasibility="medium", score=65),
            ]
            invest = [
                InvestmentItem(sector="Compliant export manufacturing", outlook="profit", rationale="FX earnings and jobs — stronger if policy support holds", risk="Global demand and labor unrest", horizon="2–5 years"),
                InvestmentItem(sector="Agro-processing & cold storage", outlook="profit", rationale="Cut waste, stabilize prices, enable exports", risk="Power/logistics costs", horizon="3–7 years"),
                InvestmentItem(sector="Renewables", outlook="mixed", rationale="Lowers long-run costs; high upfront capex", risk="Tariff/policy uncertainty", horizon="5–10 years"),
                InvestmentItem(sector="Opaque/weak financial products", outlook="loss", rationale="NPL and governance risk can destroy capital", risk="Defaults and liquidity", horizon="1–3 years"),
                InvestmentItem(sector="IT/BPO/freelance ecosystem", outlook="profit", rationale="Low capex, high export potential", risk="Skills gap and connectivity", horizon="1–4 years"),
                InvestmentItem(sector="Speculative real estate", outlook="mixed", rationale="May hedge inflation but liquidity/regulation risk", risk="Price correction", horizon="3–8 years"),
            ]
            solutions = [
                SolutionItem(id="eco_sol_infl", title="Targeted inflation control package", targets=["eco_inflation", "risk_food_fuel"], steps=["Food stock & market monitoring", "Targeted fuel subsidy", "Monetary–fiscal coordination"], expected_effect="Ease living-cost and social stress.", timeframe="3–12 months"),
                SolutionItem(id="eco_sol_bank", title="Banking clean-up & supervision", targets=["eco_banking", "risk_banking"], steps=["NPL recognition & recovery", "Weak-bank merger/recap", "Credit governance"], expected_effect="Restore credit and investor confidence.", timeframe="1–3 years"),
                SolutionItem(id="eco_sol_gdp", title="GDP driver package", targets=["eco_external"], steps=["Export diversification", "Remittance channels", "Logistics cost cut", "Skills"], expected_effect="More durable growth and jobs.", timeframe="2–5 years"),
            ]
            prevention = [
                PreventionItem(id="eco_prev_shock", title="Price-shock buffers", actions=["Strategic food stocks", "Fuel hedging/alternatives", "Targeted social protection"], owner_hint="Finance/Food/Energy"),
                PreventionItem(id="eco_prev_fx", title="FX resilience", actions=["Push exports & remittances", "Prioritize essential imports", "Meet IMF program terms"], owner_hint="Bangladesh Bank / Finance"),
                PreventionItem(id="eco_prev_invest", title="Investment risk gatekeeping", actions=["Sector risk scorecards", "Transparent project appraisal", "FDI one-stop support"], owner_hint="BOI / Planning"),
            ]
            narrative = (
                f"Economic pressure centers on inflation, reserves/currency, banking and the export cycle. "
                f"Trajectory: {(eco_dir.trajectory if eco_dir else 'uncertain')}. "
                "Raise GDP via RMG diversification, remittances, agro-processing, IT and logistics; "
                "prefer compliant export/agri/IT investments over weak financial products and opaque speculation."
            )

        gauges = [
            GaugeItem(id="g_infl", label="মূল্যস্ফীতি চাপ" if bn else "Inflation pressure", value=infl_g, tone="bad" if infl_g >= 60 else "warn"),
            GaugeItem(id="g_fx", label="রিজার্ভ/মুদ্রা চাপ" if bn else "FX/reserve pressure", value=reserve_g, tone="bad" if reserve_g >= 60 else "warn"),
            GaugeItem(id="g_bank", label="ব্যাংকিং চাপ" if bn else "Banking pressure", value=bank_g, tone="warn"),
            GaugeItem(id="g_export", label="রপ্তানি চাপ" if bn else "Export pressure", value=export_g, tone="neutral"),
        ]
        return EconomyDeep(
            narrative=narrative,
            gauges=gauges,
            current_pressures=pressures,
            upcoming_issues=upcoming,
            price_outlook=prices,
            gdp_levers=gdp,
            investments=invest,
            solutions=solutions,
            prevention=prevention,
        )

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
