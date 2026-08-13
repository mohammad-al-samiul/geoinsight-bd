"""Narrative Shield — classification + RAG debunk engine."""

from __future__ import annotations

import hashlib
import json
import logging
import re
from datetime import UTC, datetime

from app.core.config import Settings
from app.ml.ai_policy import LlmTask
from app.ml.ollama_client import OllamaClient
from app.modules.narrative_shield.fact_checker import FactChecker
from app.modules.narrative_shield.keywords import CATEGORY_KW_MAP, POLICY_REFS
from app.modules.narrative_shield.schemas import (
    BatchClassifyRequest,
    BatchClassifyResponse,
    ClassifyRequest,
    ClassifyResponse,
    DebunkRequest,
    DebunkResponse,
    FactCheckRequest,
    FactCheckResponse,
    FeedIngestResponse,
    FeedSignal,
    NarrativeCategory,
    NarrativeFactCheckStatus,
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


def _infer_party(text: str) -> str:
    lower = text.lower()
    if "বিএনপি" in text or "bnp" in lower:
        return "BNP"
    if "জামায়াত" in text or "জামাত" in text or "jamaat" in lower:
        return "JAMAAT"
    if "এনসিপি" in text or "ncp" in lower:
        return "NCP"
    return "OTHER"


def _has_bangla(text: str) -> bool:
    return any("\u0980" <= ch <= "\u09ff" for ch in text)


# Minimum rule score to keep a live article in Narrative Shield (broad monitor)
_INGEST_MIN_SCORE = 0.12


# ── Offline demo fallback — only when NARRATIVE_ALLOW_DEMO=true ───────────────
# organization = political party code: BNP | JAMAAT | NCP | OTHER

_DEMO_SIGNALS: list[dict] = [
    {
        "title": "সরকার দেশের রিজার্ভ শেষ করে দিয়েছে, দুর্ভিক্ষ আসছে",
        "title_bn": "সরকার দেশের রিজার্ভ শেষ করে দিয়েছে, দুর্ভিক্ষ আসছে",
        "body": "গত ৬ মাসে বৈদেশিক মুদ্রার রিজার্ভ শূন্যের কোঠায়। খাদ্য সংকট অনিবার্য।",
        "source_name": "Google News",
        "source_platform": "Google",
        "organization": "BNP",
        "speaker_name": "আব্দুল করিম",
        "district": "Dhaka",
        "division": "Dhaka",
        "source_url": "https://fake-bd-news.xyz/reserves-collapse",
        "published_at": "2026-08-03T10:00:00+06:00",
    },
    {
        "title": "সরকার হটাও, দেশ বাঁচাও — আজই রাজপথে নামুন",
        "title_bn": "সরকার হটাও, দেশ বাঁচাও — আজই রাজপথে নামুন",
        "body": "অবৈধ সরকারের বিরুদ্ধে সশস্ত্র প্রতিরোধ গড়ে তুলতে হবে।",
        "source_name": "Google News",
        "source_platform": "Google",
        "organization": "JAMAAT",
        "speaker_name": "মওলানা রফিকুল হাসান",
        "district": "Dhaka",
        "division": "Dhaka",
        "source_url": "https://rumourhub.bd/call-to-streets",
        "published_at": "2026-08-04T08:30:00+06:00",
    },
    {
        "title": "Bangladesh sovereignty at risk — India controlling our borders",
        "title_bn": "সার্বভৌমত্ব বিপন্ন — ভারত সীমান্ত নিয়ন্ত্রণ করছে",
        "body": "Foreign agents have infiltrated the government. Our territory is being sold piece by piece.",
        "source_name": "Google News",
        "source_platform": "Google",
        "organization": "NCP",
        "speaker_name": "Md. Khurshid Alam",
        "district": "Chattogram",
        "division": "Chattogram",
        "source_url": "https://bd-truth-leaks.example/border-control",
        "published_at": "2026-08-04T15:00:00+06:00",
    },
    {
        "title": "নির্বাচন কারচুপি — ব্যালট বাক্স ভরা হয়েছে রাতের আঁধারে",
        "title_bn": "নির্বাচন কারচুপি — ব্যালট বাক্স ভরা হয়েছে রাতের আঁধারে",
        "body": "নির্বাচন কমিশন দুর্নীতিগ্রস্ত। ফলাফল সম্পূর্ণ জাল।",
        "source_name": "Google News",
        "source_platform": "Google",
        "organization": "OTHER",
        "speaker_name": "স্বতন্ত্র বক্তা সাইফুল ইসলাম",
        "district": "Rajshahi",
        "division": "Rajshahi",
        "source_url": "https://news.google.com/search?q=Bangladesh%20election&hl=bn&gl=BD&ceid=BD:bn",
        "published_at": "2026-08-05T07:00:00+06:00",
    },
    {
        "title": "হিন্দু সম্প্রদায়ের বিরুদ্ধে পরিকল্পিত হামলার আহ্বান",
        "title_bn": "হিন্দু সম্প্রদায়ের বিরুদ্ধে পরিকল্পিত হামলার আহ্বান",
        "body": "সংখ্যালঘুদের বাড়ি জ্বালিয়ে দাও — সাম্প্রদায়িক দাঙ্গা উসকানো হচ্ছে।",
        "source_name": "Google News",
        "source_platform": "Google",
        "organization": "JAMAAT",
        "speaker_name": "আবু বকর সিদ্দিকী",
        "district": "Sylhet",
        "division": "Sylhet",
        "source_url": "https://anonymous-telegram-mirror.test/communal",
        "published_at": "2026-08-05T09:00:00+06:00",
    },
    {
        "title": "সরকারি ব্যাংক থেকে কোটি কোটি টাকা লোপাট — সর্বনাশ হয়ে গেছে",
        "title_bn": "সরকারি ব্যাংক থেকে কোটি কোটি টাকা লোপাট",
        "body": "রাষ্ট্রীয় ব্যাংক থেকে দুর্নীতির মাধ্যমে হাজার কোটি টাকা বিদেশে পাঠানো হয়েছে।",
        "source_name": "Google News · Prothom Alo index",
        "source_platform": "Google",
        "organization": "BNP",
        "speaker_name": "তারেক আহমেদ চৌধুরী",
        "district": "Dhaka",
        "division": "Dhaka",
        "source_url": "https://www.prothomalo.com/",
        "published_at": "2026-08-05T11:00:00+06:00",
    },
    {
        "title": "আসন্ন নির্বাচনে ভোটার তালিকা থেকে বিরোধীদের নাম মুছে দেওয়া হচ্ছে",
        "title_bn": "ভোটার তালিকা থেকে বিরোধীদের নাম মুছে দেওয়া হচ্ছে",
        "body": "নির্বাচন কমিশন পক্ষপাতমূলকভাবে ভোটার তালিকা পরিচালনা করছে।",
        "source_name": "Google News · Dhaka Tribune index",
        "source_platform": "Google",
        "organization": "NCP",
        "speaker_name": "রফিকুল ইসলাম",
        "district": "Khulna",
        "division": "Khulna",
        "source_url": "https://www.dhakatribune.com/",
        "published_at": "2026-08-05T12:00:00+06:00",
    },
    {
        "title": "IMF takeover — Bangladesh economic sovereignty already lost",
        "title_bn": "আইএমএফ দখল — অর্থনৈতিক সার্বভৌমত্ব হারিয়ে গেছে",
        "body": "Every fiscal decision is dictated from Washington. Local industry is being sacrificed.",
        "source_name": "Google News · Reuters index",
        "source_platform": "Google",
        "organization": "OTHER",
        "speaker_name": "Dr. Nasreen Kabir",
        "district": "Dhaka",
        "division": "Dhaka",
        "source_url": "https://www.reuters.com/",
        "published_at": "2026-08-06T09:15:00+06:00",
    },
]


class NarrativeShieldService:
    """Classify hostile narrative signals and generate RAG-backed rebuttals."""

    def __init__(self, settings: Settings) -> None:
        self._ollama = OllamaClient(settings)
        self._fact_checker = FactChecker(settings)

    # ── Classification ────────────────────────────────────────────────────────

    async def classify(
        self, req: ClassifyRequest, *, use_llm: bool = True
    ) -> ClassifyResponse:
        fingerprint = _build_fingerprint(req.title, req.source_name)
        category, rule_score = _classify_rule_based(req.title, req.body)

        confidence = rule_score
        title_bn: str | None = req.title if _has_bangla(req.title) else None
        reason = f"Rule-based keyword match for category {category.value} (score {rule_score:.2f})"

        # LLM enhancement when available (skip on bulk ingest — dead Ollama hangs 180s/item)
        if use_llm and self._ollama.enabled and rule_score > 0.10:
            llm_result = await self._llm_classify(req, category, rule_score)
            if llm_result:
                confidence = llm_result.get("confidence", rule_score)
                title_bn = llm_result.get("title_bn") or title_bn
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

    async def fact_check(self, req: FactCheckRequest) -> FactCheckResponse:
        raw = await self._fact_checker.check(
            title=req.title,
            title_bn=req.title_bn,
            body=req.body,
            speaker_name=req.speaker_name,
            source_url=req.source_url,
            source_name=req.source_name,
            organization=req.organization,
            lang=req.lang,
        )
        return FactCheckResponse(
            fact_check_status=NarrativeFactCheckStatus(raw["fact_check_status"]),
            authenticity_score=raw["authenticity_score"],
            google_verify_url=raw["google_verify_url"],
            fact_check_summary=raw["fact_check_summary"],
            evidence_urls=raw["evidence_urls"],
            fact_checked_at=raw["fact_checked_at"],
            corroboration_hits=raw.get("corroboration_hits", 0),
            blocked=raw.get("blocked", False),
        )

    async def ingest_feed(self, limit: int = 20) -> FeedIngestResponse:
        """
        Ingest hostile narrative signals from live Google News / RSS.

        Bulk path skips Ollama (unreachable Ollama previously hung 180s/item and
        timed out the gateway). Hard-blocked domains are skipped.
        """
        import os

        from app.modules.ingestion.fetcher import fetch_all_feeds
        from app.modules.ingestion.sources import NARRATIVE_SHIELD_FEEDS

        signals: list[FeedSignal] = []
        seen: set[str] = set()
        skipped = 0
        skipped_unauthentic = 0
        skipped_low_score = 0

        limit = max(1, min(limit, 50))
        live_items: list[dict] = []
        used_live = False

        try:
            articles = await fetch_all_feeds(
                NARRATIVE_SHIELD_FEEDS,
                max_per_feed=6,
                timeout_sec=10.0,
                concurrency=8,
            )
            for art in articles:
                live_items.append(
                    {
                        "title": art.title,
                        "title_bn": art.title if art.language == "bn" or _has_bangla(art.title) else None,
                        "body": art.summary or None,
                        "source_name": (
                            art.source_name
                            if art.source_name.lower().startswith("google")
                            else f"Google News · {art.source_name}"
                        ),
                        "source_platform": "Google",
                        "organization": _infer_party(f"{art.title} {art.summary}"),
                        "speaker_name": None,
                        "district": None,
                        "division": None,
                        "source_url": art.url,
                        "published_at": (
                            art.published_at.isoformat() if art.published_at else None
                        ),
                    }
                )
            used_live = len(live_items) > 0
            logger.info(
                "Narrative Shield live fetch: %s articles from %s feeds",
                len(live_items),
                len(NARRATIVE_SHIELD_FEEDS),
            )
        except Exception as exc:
            logger.warning("Narrative Shield live fetch failed: %s", exc)

        allow_demo = os.getenv("NARRATIVE_ALLOW_DEMO", "").strip().lower() in {
            "1",
            "true",
            "yes",
        }
        if not live_items and allow_demo:
            logger.warning("Narrative Shield falling back to demo signals")
            live_items = [
                item
                for item in _DEMO_SIGNALS
                if str(item.get("source_platform", "")).lower().startswith("google")
            ]

        for item in live_items:
            if len(signals) >= limit:
                break

            fp = _build_fingerprint(item["title"], item["source_name"])
            if fp in seen:
                skipped += 1
                continue
            seen.add(fp)

            req = ClassifyRequest(
                title=item["title"],
                body=item.get("body"),
                source_name=item["source_name"],
                source_platform="Google",
                speaker_name=item.get("speaker_name"),
                organization=item.get("organization"),
                district=item.get("district"),
                division=item.get("division"),
                source_url=item.get("source_url"),
            )
            # Fast path: no LLM during ingest
            result = await self.classify(req, use_llm=False)

            # Themed narrative feeds already query protest/disinfo topics —
            # keep borderline items for analyst review instead of dropping all.
            confidence = result.confidence_score
            category = result.category
            threat = result.threat_level
            if confidence < _INGEST_MIN_SCORE:
                if used_live:
                    confidence = max(confidence, _INGEST_MIN_SCORE)
                    threat = _threat_level(confidence)
                    category = NarrativeCategory.SOCIAL_UNREST
                else:
                    skipped_low_score += 1
                    continue

            fc = await self._fact_checker.check(
                title=item["title"],
                title_bn=item.get("title_bn"),
                body=item.get("body"),
                speaker_name=item.get("speaker_name"),
                source_url=item.get("source_url"),
                source_name=item.get("source_name"),
                organization=item.get("organization"),
                lang="bn",
                use_llm=False,
                use_live_search=False,
            )

            # Hard gate: never ingest blocked / known-fake domains
            if fc.get("blocked"):
                skipped_unauthentic += 1
                logger.info(
                    "Skipped blocked source for fingerprint=%s summary=%s",
                    fp[:12],
                    fc.get("fact_check_summary"),
                )
                continue

            signals.append(
                FeedSignal(
                    fingerprint=fp,
                    title=item["title"],
                    title_bn=item.get("title_bn") or result.title_bn,
                    body=item.get("body"),
                    source_url=item.get("source_url"),
                    source_name=item["source_name"],
                    source_platform="Google",
                    speaker_name=item.get("speaker_name"),
                    organization=item.get("organization"),
                    district=item.get("district"),
                    division=item.get("division"),
                    threat_level=threat,
                    category=category,
                    confidence_score=round(confidence, 4),
                    published_at=item.get("published_at") or datetime.now(UTC).isoformat(),
                    fact_check_status=NarrativeFactCheckStatus(fc["fact_check_status"]),
                    authenticity_score=fc["authenticity_score"],
                    google_verify_url=fc["google_verify_url"],
                    fact_check_summary=fc["fact_check_summary"],
                    evidence_urls=fc.get("evidence_urls") or [],
                    fact_checked_at=fc.get("fact_checked_at"),
                )
            )

        if skipped_low_score:
            logger.info("Narrative Shield skipped %s low-score articles", skipped_low_score)

        return FeedIngestResponse(
            ingested=len(signals),
            signals=signals,
            skipped_duplicates=skipped,
            skipped_unauthentic=skipped_unauthentic,
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
        raw = await self._ollama.complete(system, user, temperature=0.2, task=LlmTask.NARRATIVE_DEBUNK)
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
        return await self._ollama.complete(
            system, user, temperature=0.25, task=LlmTask.NARRATIVE_DEBUNK
        )

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
