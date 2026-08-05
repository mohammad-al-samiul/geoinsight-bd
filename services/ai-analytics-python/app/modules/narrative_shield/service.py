"""Narrative Shield — classification + RAG debunk engine."""

from __future__ import annotations

import hashlib
import json
import logging
import re
from datetime import UTC, datetime

from app.core.config import Settings
from app.ml.ollama_client import OllamaClient
from app.modules.narrative_shield.keywords import CATEGORY_KW_MAP, POLICY_REFS
from app.modules.narrative_shield.schemas import (
    BatchClassifyRequest,
    BatchClassifyResponse,
    ClassifyRequest,
    ClassifyResponse,
    DebunkRequest,
    DebunkResponse,
    FeedIngestResponse,
    FeedSignal,
    NarrativeCategory,
    NarrativeThreatLevel,
)

logger = logging.getLogger(__name__)

# ── Threat-level thresholds ───────────────────────────────────────────────────
_CRITICAL_THRESHOLD = 0.80
_HIGH_THRESHOLD = 0.55
_MEDIUM_THRESHOLD = 0.30


def _build_fingerprint(title: str, source_name: str) -> str:
    """SHA-256 hex digest of normalised title + source — deduplication key."""
    norm = re.sub(r"\s+", " ", title.strip().lower())
    raw = f"{norm}::{source_name.strip().lower()}"
    return hashlib.sha256(raw.encode()).hexdigest()[:64]


def _keyword_score(text: str, keywords: list[str]) -> float:
    """Fraction of keyword matches (capped at 1.0, each hit worth 0.15)."""
    lower = text.lower()
    hits = sum(1 for kw in keywords if kw.lower() in lower)
    return min(hits * 0.15, 1.0)


def _classify_rule_based(
    title: str, body: str | None
) -> tuple[NarrativeCategory, float]:
    """Rule-based classifier — returns (category, confidence_score)."""
    combined = f"{title} {body or ''}".strip()
    scores: dict[str, float] = {}
    for cat, kws in CATEGORY_KW_MAP.items():
        scores[cat] = _keyword_score(combined, kws)

    best_cat = max(scores, key=lambda c: scores[c])
    best_score = scores[best_cat]
    return NarrativeCategory(best_cat), best_score


def _threat_level(score: float) -> NarrativeThreatLevel:
    if score >= _CRITICAL_THRESHOLD:
        return NarrativeThreatLevel.CRITICAL
    if score >= _HIGH_THRESHOLD:
        return NarrativeThreatLevel.HIGH
    if score >= _MEDIUM_THRESHOLD:
        return NarrativeThreatLevel.MEDIUM
    return NarrativeThreatLevel.LOW


# ── MOCK hostile signals for demo / offline mode ──────────────────────────────

_DEMO_SIGNALS: list[dict] = [
    {
        "title": "সরকার দেশের রিজার্ভ শেষ করে দিয়েছে, দুর্ভিক্ষ আসছে",
        "title_bn": "সরকার দেশের রিজার্ভ শেষ করে দিয়েছে, দুর্ভিক্ষ আসছে",
        "body": "গত ৬ মাসে বৈদেশিক মুদ্রার রিজার্ভ শূন্যের কোঠায়। খাদ্য সংকট অনিবার্য।",
        "source_name": "Telegram Channel BD_Truth",
        "source_platform": "Telegram",
        "organization": "অজ্ঞাত",
        "speaker_name": None,
        "district": None,
        "division": None,
        "source_url": None,
        "published_at": "2026-08-03T10:00:00+06:00",
    },
    {
        "title": "সরকার হটাও, দেশ বাঁচাও — আজই রাজপথে নামুন",
        "title_bn": "সরকার হটাও, দেশ বাঁচাও — আজই রাজপথে নামুন",
        "body": "অবৈধ সরকারের বিরুদ্ধে সশস্ত্র প্রতিরোধ গড়ে তুলতে হবে।",
        "source_name": "Facebook Page Bangladesh Change",
        "source_platform": "Facebook",
        "organization": "জামায়াতে ইসলামী (সন্দেহভাজন)",
        "speaker_name": "অজ্ঞাত বক্তা",
        "district": "Dhaka",
        "division": "Dhaka",
        "source_url": None,
        "published_at": "2026-08-04T08:30:00+06:00",
    },
    {
        "title": "Bangladesh sovereignty at risk — India controlling our borders",
        "title_bn": "সার্বভৌমত্ব বিপন্ন — ভারত সীমান্ত নিয়ন্ত্রণ করছে",
        "body": "Foreign agents have infiltrated the government. Our territory is being sold piece by piece.",
        "source_name": "YouTube BD_Patriot",
        "source_platform": "YouTube",
        "organization": "NCP (সন্দেহভাজন)",
        "speaker_name": "Md. Khurshid Alam",
        "district": "Chattogram",
        "division": "Chattogram",
        "source_url": "https://youtube.com/watch?v=demo123",
        "published_at": "2026-08-04T15:00:00+06:00",
    },
    {
        "title": "নির্বাচন কারচুপি — ব্যালট বাক্স ভরা হয়েছে রাতের আঁধারে",
        "title_bn": "নির্বাচন কারচুপি — ব্যালট বাক্স ভরা হয়েছে রাতের আঁধারে",
        "body": "নির্বাচন কমিশন দুর্নীতিগ্রস্ত। ফলাফল সম্পূর্ণ জাল।",
        "source_name": "News Article BD Voice",
        "source_platform": "Web",
        "organization": "স্বাধীন গ্রুপ",
        "speaker_name": None,
        "district": "Rajshahi",
        "division": "Rajshahi",
        "source_url": "https://bdvoice-demo.net/article/123",
        "published_at": "2026-08-05T07:00:00+06:00",
    },
    {
        "title": "হিন্দু সম্প্রদায়ের বিরুদ্ধে পরিকল্পিত হামলার আহ্বান",
        "title_bn": "হিন্দু সম্প্রদায়ের বিরুদ্ধে পরিকল্পিত হামলার আহ্বান",
        "body": "সংখ্যালঘুদের বাড়ি জ্বালিয়ে দাও — সাম্প্রদায়িক দাঙ্গা উসকানো হচ্ছে।",
        "source_name": "Telegram Extremist Channel",
        "source_platform": "Telegram",
        "organization": "উগ্রবাদী চ্যানেল",
        "speaker_name": None,
        "district": "Sylhet",
        "division": "Sylhet",
        "source_url": None,
        "published_at": "2026-08-05T09:00:00+06:00",
    },
    {
        "title": "ইসলামি খেলাফত কায়েম করতে জিহাদ ঘোষণা",
        "title_bn": "ইসলামি খেলাফত কায়েম করতে জিহাদ ঘোষণা",
        "body": "কাফের সরকারের বিরুদ্ধে ধর্মযুদ্ধ শুরু করতে হবে।",
        "source_name": "Encrypted Messenger Group",
        "source_platform": "Telegram",
        "organization": "অজ্ঞাত উগ্রবাদী",
        "speaker_name": "অজ্ঞাত",
        "district": "Cox's Bazar",
        "division": "Chattogram",
        "source_url": None,
        "published_at": "2026-08-05T10:30:00+06:00",
    },
    {
        "title": "সরকারি ব্যাংক থেকে কোটি কোটি টাকা লোপাট — সর্বনাশ হয়ে গেছে",
        "title_bn": "সরকারি ব্যাংক থেকে কোটি কোটি টাকা লোপাট",
        "body": "রাষ্ট্রীয় ব্যাংক থেকে দুর্নীতির মাধ্যমে হাজার কোটি টাকা বিদেশে পাঠানো হয়েছে।",
        "source_name": "Facebook Live BD Finance Watch",
        "source_platform": "Facebook",
        "organization": "বিএনপি সমর্থিত পেজ (সন্দেহভাজন)",
        "speaker_name": "আব্দুল করিম",
        "district": "Dhaka",
        "division": "Dhaka",
        "source_url": None,
        "published_at": "2026-08-05T11:00:00+06:00",
    },
    {
        "title": "আসন্ন নির্বাচনে ভোটার তালিকা থেকে বিরোধীদের নাম মুছে দেওয়া হচ্ছে",
        "title_bn": "ভোটার তালিকা থেকে বিরোধীদের নাম মুছে দেওয়া হচ্ছে",
        "body": "নির্বাচন কমিশন পক্ষপাতমূলকভাবে ভোটার তালিকা পরিচালনা করছে।",
        "source_name": "YouTube Channel Democracy BD",
        "source_platform": "YouTube",
        "organization": "NCP",
        "speaker_name": "রফিকুল ইসলাম",
        "district": "Khulna",
        "division": "Khulna",
        "source_url": "https://youtube.com/watch?v=demo456",
        "published_at": "2026-08-05T12:00:00+06:00",
    },
]


class NarrativeShieldService:
    """Classify hostile narrative signals and generate RAG-backed rebuttals."""

    def __init__(self, settings: Settings) -> None:
        self._ollama = OllamaClient(settings)

    # ── Classification ────────────────────────────────────────────────────────

    async def classify(self, req: ClassifyRequest) -> ClassifyResponse:
        fingerprint = _build_fingerprint(req.title, req.source_name)
        category, rule_score = _classify_rule_based(req.title, req.body)

        confidence = rule_score
        title_bn: str | None = None
        reason = f"Rule-based keyword match for category {category.value} (score {rule_score:.2f})"

        # LLM enhancement when available
        if self._ollama.enabled and rule_score > 0.10:
            llm_result = await self._llm_classify(req, category, rule_score)
            if llm_result:
                confidence = llm_result.get("confidence", rule_score)
                title_bn = llm_result.get("title_bn")
                reason = llm_result.get("reason", reason)
                llm_cat = llm_result.get("category")
                if llm_cat and llm_cat in NarrativeCategory.__members__:
                    category = NarrativeCategory(llm_cat)

        # Cap at 1.0, minimum for detected signal
        confidence = min(max(confidence, 0.01), 1.0)
        is_hostile = confidence >= _MEDIUM_THRESHOLD

        return ClassifyResponse(
            fingerprint=fingerprint,
            is_hostile=is_hostile,
            threat_level=_threat_level(confidence),
            category=category,
            confidence_score=round(confidence, 4),
            title_bn=title_bn,
            classification_reason=reason,
        )

    async def classify_batch(
        self, req: BatchClassifyRequest
    ) -> BatchClassifyResponse:
        results = []
        for item in req.items:
            results.append(await self.classify(item))
        hostile = sum(1 for r in results if r.is_hostile)
        critical = sum(
            1 for r in results if r.threat_level == NarrativeThreatLevel.CRITICAL
        )
        return BatchClassifyResponse(
            results=results, hostile_count=hostile, critical_count=critical
        )

    # ── RAG Debunk ────────────────────────────────────────────────────────────

    async def debunk(self, req: DebunkRequest) -> DebunkResponse:
        policy_ref = POLICY_REFS.get(req.category.value)
        source_ref = self._official_source_ref(req.category)

        # Rule-based fallback debunk
        debunk_text = self._rule_debunk(req)
        llm_used = False
        confidence = 0.75

        if self._ollama.enabled:
            llm_text = await self._llm_debunk(req, policy_ref, source_ref)
            if llm_text:
                debunk_text = llm_text
                llm_used = True
                confidence = 0.95

        return DebunkResponse(
            signal_id=req.signal_id,
            debunk_text=debunk_text,
            confidence=confidence,
            policy_ref=policy_ref,
            source_ref=source_ref,
            llm_used=llm_used,
        )

    # ── Feed ingestion (demo / offline mode) ──────────────────────────────────

    async def ingest_feed(self, limit: int = 20) -> FeedIngestResponse:
        """
        Ingest hostile narrative signals from open sources.

        In production this would call real social-media APIs / RSS scrapers.
        For now it classifies the built-in demo set.
        """
        signals: list[FeedSignal] = []
        seen: set[str] = set()
        skipped = 0

        for item in _DEMO_SIGNALS[:limit]:
            fp = _build_fingerprint(item["title"], item["source_name"])
            if fp in seen:
                skipped += 1
                continue
            seen.add(fp)

            req = ClassifyRequest(
                title=item["title"],
                body=item.get("body"),
                source_name=item["source_name"],
                source_platform=item["source_platform"],
                speaker_name=item.get("speaker_name"),
                organization=item.get("organization"),
                district=item.get("district"),
                division=item.get("division"),
                source_url=item.get("source_url"),
            )
            result = await self.classify(req)

            signals.append(
                FeedSignal(
                    fingerprint=fp,
                    title=item["title"],
                    title_bn=item.get("title_bn"),
                    body=item.get("body"),
                    source_url=item.get("source_url"),
                    source_name=item["source_name"],
                    source_platform=item["source_platform"],
                    speaker_name=item.get("speaker_name"),
                    organization=item.get("organization"),
                    district=item.get("district"),
                    division=item.get("division"),
                    threat_level=result.threat_level,
                    category=result.category,
                    confidence_score=result.confidence_score,
                    published_at=item.get("published_at") or datetime.now(UTC).isoformat(),
                )
            )

        return FeedIngestResponse(
            ingested=len(signals),
            signals=signals,
            skipped_duplicates=skipped,
        )

    # ── Private helpers ───────────────────────────────────────────────────────

    async def _llm_classify(
        self,
        req: ClassifyRequest,
        rule_cat: NarrativeCategory,
        rule_score: float,
    ) -> dict | None:
        bn = req.lang == "bn"
        system = (
            "তুমি একজন সরকারি তথ্য-নিরাপত্তা বিশেষজ্ঞ। নিচের বক্তব্যটি কি রাষ্ট্রবিরোধী অপপ্রচার? "
            "JSON-এ উত্তর দাও: {category, confidence (0-1), title_bn, reason}"
            if bn
            else "You are a state information-security analyst. Is this statement hostile propaganda? "
            "Reply in JSON: {category, confidence (0-1), title_bn, reason}"
        )
        user = json.dumps(
            {
                "title": req.title,
                "body": req.body or "",
                "rule_category": rule_cat.value,
                "rule_score": rule_score,
                "categories": list(NarrativeCategory.__members__.keys()),
            },
            ensure_ascii=False,
        )
        raw = await self._ollama.complete(system, user, temperature=0.2)
        if not raw:
            return None
        try:
            start = raw.find("{")
            end = raw.rfind("}") + 1
            if start == -1 or end == 0:
                return None
            return json.loads(raw[start:end])
        except Exception:
            return None

    async def _llm_debunk(
        self,
        req: DebunkRequest,
        policy_ref: str | None,
        source_ref: str | None,
    ) -> str | None:
        bn = req.lang == "bn"
        system = (
            "তুমি বাংলাদেশ সরকারের তথ্য-প্রতিরক্ষা ইউনিটের কর্মকর্তা। "
            "অফিশিয়াল তথ্য ব্যবহার করে সংক্ষিপ্ত ও তথ্যভিত্তিক খণ্ডন তৈরি কর। "
            "সর্বোচ্চ ৩টি বুলেট পয়েন্টে লেখ।"
            if bn
            else "You are an official from Bangladesh Government Information Defense Unit. "
            "Write a concise evidence-based rebuttal using official sources. Max 3 bullet points."
        )
        user = json.dumps(
            {
                "hostile_claim": req.title,
                "body": req.body or "",
                "category": req.category.value,
                "policy_reference": policy_ref or "",
                "official_source": source_ref or "",
            },
            ensure_ascii=False,
        )
        return await self._ollama.complete(system, user, temperature=0.25)

    def _rule_debunk(self, req: DebunkRequest) -> str:
        """Deterministic fallback rebuttal when LLM is unavailable."""
        bn = req.lang == "bn"
        templates: dict[str, tuple[str, str]] = {
            "ECONOMIC_DISINFO": (
                "বাংলাদেশ ব্যাংকের সর্বশেষ তথ্য অনুযায়ী, বৈদেশিক মুদ্রার রিজার্ভ স্বাভাবিক মাত্রায় রয়েছে। "
                "বিবিএস-এর প্রতিবেদন অনুযায়ী জিডিপি প্রবৃদ্ধি ইতিবাচক।",
                "Bangladesh Bank data confirms forex reserves are at normal levels. "
                "BBS GDP report shows positive growth trajectory.",
            ),
            "ANTI_GOVT_INCITEMENT": (
                "এই বক্তব্য রাষ্ট্রবিরোধী উসকানি। ডিজিটাল নিরাপত্তা আইন ২০১৮ এবং সাইবার নিরাপত্তা আইন ২০২৩ "
                "অনুযায়ী এটি শাস্তিযোগ্য অপরাধ।",
                "This content constitutes anti-state incitement, punishable under the "
                "Digital Security Act 2018 and Cyber Security Act 2023.",
            ),
            "SOVEREIGNTY_THREAT": (
                "বাংলাদেশের সার্বভৌমত্ব সংবিধানের ৭ নং অনুচ্ছেদ দ্বারা সুরক্ষিত। "
                "পররাষ্ট্র মন্ত্রণালয় নিশ্চিত করেছে যে কোনো বিদেশী হস্তক্ষেপ নেই।",
                "Bangladesh's sovereignty is protected under Article 7 of the Constitution. "
                "Ministry of Foreign Affairs confirms no foreign interference.",
            ),
            "SOCIAL_UNREST": (
                "সাম্প্রদায়িক সম্প্রীতি রক্ষায় সরকার প্রতিশ্রুতিবদ্ধ। "
                "স্বরাষ্ট্র মন্ত্রণালয়ের নির্দেশনা অনুযায়ী আইন-শৃঙ্খলা বাহিনী সজাগ রয়েছে।",
                "The government is committed to communal harmony. "
                "Security forces are on high alert per Ministry of Home Affairs directive.",
            ),
            "RELIGIOUS_EXTREMISM": (
                "সন্ত্রাসবিরোধী আইন ২০০৯ অনুযায়ী ধর্মীয় উগ্রবাদী বক্তব্য শাস্তিযোগ্য। "
                "CTTC এই বিষয়ে তদন্ত পরিচালনা করছে।",
                "Religious extremist content is punishable under the Anti-Terrorism Act 2009. "
                "CTTC is conducting an investigation into this matter.",
            ),
            "ELECTORAL_MANIPULATION": (
                "বাংলাদেশ নির্বাচন কমিশন আইন ২০২২ অনুযায়ী নির্বাচনী প্রক্রিয়া স্বচ্ছ ও আইনসম্মত। "
                "মিথ্যা তথ্য প্রচার ফৌজদারি কার্যবিধির ১৮২ ধারায় শাস্তিযোগ্য।",
                "The electoral process follows the Bangladesh Election Commission Act 2022. "
                "Spreading false electoral information is punishable under CrPC §182.",
            ),
        }
        pair = templates.get(req.category.value, ("এই বক্তব্য যাচাই করা হয়নি।", "This claim is unverified."))
        return pair[0] if bn else pair[1]

    def _official_source_ref(self, category: NarrativeCategory) -> str:
        refs: dict[str, str] = {
            "ECONOMIC_DISINFO": "https://www.bb.org.bd | https://www.bbs.gov.bd",
            "ANTI_GOVT_INCITEMENT": "https://www.minlaw.gov.bd | https://www.cirt.gov.bd",
            "SOVEREIGNTY_THREAT": "https://www.mofa.gov.bd | https://www.mod.gov.bd",
            "SOCIAL_UNREST": "https://www.mha.gov.bd | https://nhrc.org.bd",
            "RELIGIOUS_EXTREMISM": "https://www.cttc.gov.bd | https://www.mora.gov.bd",
            "ELECTORAL_MANIPULATION": "https://www.ecs.gov.bd",
        }
        return refs.get(category.value, "https://www.bangladesh.gov.bd")
