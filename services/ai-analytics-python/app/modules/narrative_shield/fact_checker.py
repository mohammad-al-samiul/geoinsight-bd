"""Automatic fact-checker for Narrative Shield signals.

Pipeline:
  1) Build Google verify URL from title + speaker
  2) Domain trust (allow / block)
  3) Optional live search corroboration (Serper / Google CSE)
  4) Heuristic claim markers + optional LLM assist
"""

from __future__ import annotations

import logging
import re
from datetime import UTC, datetime
from enum import Enum
from typing import Any
from urllib.parse import quote_plus, urlparse

import httpx

from app.core.config import Settings
from app.ml.ollama_client import OllamaClient
from app.modules.narrative_shield.trust_lists import (
    BLOCKED_DOMAINS,
    DISINFO_MARKERS_BN,
    DISINFO_MARKERS_EN,
    TRUSTED_DOMAINS,
)

logger = logging.getLogger(__name__)


class FactCheckStatus(str, Enum):
    AUTHENTIC = "AUTHENTIC"
    NEEDS_REVIEW = "NEEDS_REVIEW"
    LIKELY_DISINFO = "LIKELY_DISINFO"
    UNVERIFIED = "UNVERIFIED"


def build_google_verify_url(
    title: str,
    speaker_name: str | None = None,
    *,
    title_bn: str | None = None,
) -> str:
    """Google News (Bangla) search URL from claim title + speaker.

    Prefers Bengali title when available so verification searches run in BN.
    """
    claim = (title_bn or title or "").strip()
    parts = [claim] if claim else []
    if speaker_name and speaker_name.strip():
        parts.append(speaker_name.strip())
    q = " ".join(parts)
    return (
        "https://news.google.com/search?q="
        f"{quote_plus(q)}&hl=bn&gl=BD&ceid=BD:bn"
    )


def build_google_web_url(
    title: str,
    speaker_name: str | None = None,
    *,
    title_bn: str | None = None,
) -> str:
    """Google Web search in Bangla locale — prefers Bengali title."""
    claim = (title_bn or title or "").strip()
    parts: list[str] = []
    if claim:
        parts.append(f'"{claim}"')
    if speaker_name and speaker_name.strip():
        parts.append(f'"{speaker_name.strip()}"')
    q = " ".join(parts) if parts else "বাংলাদেশ"
    return (
        "https://www.google.com/search?q="
        f"{quote_plus(q)}&hl=bn&gl=BD&lr=lang_bn"
    )


def _registrable_hint(url: str | None) -> str | None:
    if not url:
        return None
    try:
        host = urlparse(url).hostname or ""
    except Exception:
        return None
    host = host.lower().removeprefix("www.")
    return host or None


def _domain_trust(host: str | None) -> tuple[float, str]:
    """Return (score 0-1, reason)."""
    if not host:
        return 0.35, "No publisher domain — treated as aggregator/unverified"
    if any(host == d or host.endswith("." + d) for d in BLOCKED_DOMAINS):
        return 0.05, f"Blocked domain: {host}"
    if any(host == d or host.endswith("." + d) for d in TRUSTED_DOMAINS):
        # Google News is an aggregator — mid-high, not full trust alone
        if "google" in host:
            return 0.55, f"Trusted aggregator: {host}"
        if host.endswith(".gov.bd") or host.endswith("gov.bd"):
            return 0.95, f"Official government domain: {host}"
        return 0.82, f"Trusted publisher: {host}"
    return 0.40, f"Unknown publisher domain: {host}"


def _marker_penalty(title: str, body: str | None) -> tuple[float, list[str]]:
    text = f"{title} {body or ''}".lower()
    hits: list[str] = []
    for m in DISINFO_MARKERS_BN:
        if m.lower() in text:
            hits.append(m)
    for m in DISINFO_MARKERS_EN:
        if m.lower() in text:
            hits.append(m)
    if not hits:
        return 0.0, []
    # Each hit pulls authenticity down
    return min(0.15 * len(hits), 0.55), hits


def _status_from_score(score: float, blocked: bool) -> FactCheckStatus:
    if blocked:
        return FactCheckStatus.LIKELY_DISINFO
    if score >= 0.72:
        return FactCheckStatus.AUTHENTIC
    if score >= 0.45:
        return FactCheckStatus.NEEDS_REVIEW
    if score < 0.28:
        return FactCheckStatus.LIKELY_DISINFO
    return FactCheckStatus.UNVERIFIED


class FactChecker:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._ollama = OllamaClient(settings)

    async def check(
        self,
        *,
        title: str,
        body: str | None = None,
        speaker_name: str | None = None,
        source_url: str | None = None,
        source_name: str | None = None,
        organization: str | None = None,
        title_bn: str | None = None,
        lang: str = "bn",
        use_llm: bool = True,
        use_live_search: bool = True,
    ) -> dict[str, Any]:
        # Always prefer Bengali claim text for Google verify / corroboration
        search_title = (title_bn or title).strip()
        google_verify = build_google_verify_url(title, speaker_name, title_bn=title_bn)
        google_web = build_google_web_url(title, speaker_name, title_bn=title_bn)
        host = _registrable_hint(source_url)
        domain_score, domain_reason = _domain_trust(host)
        blocked = domain_score <= 0.08

        penalty, markers = _marker_penalty(f"{title} {title_bn or ''}", body)
        score = max(0.0, min(1.0, domain_score - penalty))

        evidence: list[str] = [google_verify, google_web]
        if source_url:
            evidence.insert(0, source_url)

        corroboration_hits = 0
        search_note = "Live search skipped (no API key) — heuristic + domain trust only"
        if use_live_search:
            live = await self._live_corroborate(search_title, speaker_name)
            if live is not None:
                corroboration_hits = live["trusted_hits"]
                evidence.extend(live["urls"][:5])
                search_note = live["note"]
                # Boost / cut based on corroboration
                if corroboration_hits >= 2:
                    score = min(1.0, score + 0.18)
                elif corroboration_hits == 1:
                    score = min(1.0, score + 0.08)
                elif live.get("total", 0) > 0 and corroboration_hits == 0:
                    score = max(0.0, score - 0.12)
        else:
            search_note = "Bulk ingest — domain trust + markers only"

        llm_note = ""
        if use_llm and self._ollama.enabled and score < 0.75:
            llm_note = await self._llm_assist(search_title, body, markers, lang) or ""

        status = _status_from_score(score, blocked)
        # Hostile rumour markers with weak corroboration → disinfo lean
        if markers and corroboration_hits == 0 and score < 0.6:
            status = FactCheckStatus.LIKELY_DISINFO
            score = min(score, 0.32)

        bn = lang == "bn"
        summary_parts = [
            domain_reason,
            search_note,
        ]
        if markers:
            summary_parts.append(
                ("সন্দেহজনক দাবি-চিহ্ন: " if bn else "Suspicious claim markers: ")
                + ", ".join(markers[:4])
            )
        if organization:
            summary_parts.append(
                ("দলীয় পরিচয়: " if bn else "Party attribution: ") + organization
            )
        if llm_note:
            summary_parts.append(llm_note)

        return {
            "fact_check_status": status.value,
            "authenticity_score": round(score, 4),
            "google_verify_url": google_verify,
            "fact_check_summary": " · ".join(summary_parts),
            "evidence_urls": list(dict.fromkeys(evidence))[:8],
            "fact_checked_at": datetime.now(UTC).isoformat(),
            "corroboration_hits": corroboration_hits,
            "blocked": blocked,
        }

    async def _live_corroborate(
        self, title: str, speaker_name: str | None
    ) -> dict[str, Any] | None:
        """Optional Serper or Google CSE search."""
        q = title.strip()
        if speaker_name:
            q = f"{q} {speaker_name.strip()}"

        serper = self._settings.serper_api_key
        if serper:
            try:
                async with httpx.AsyncClient(timeout=12.0) as client:
                    res = await client.post(
                        "https://google.serper.dev/news",
                        headers={"X-API-KEY": serper, "Content-Type": "application/json"},
                        json={"q": q, "gl": "bd", "hl": "bn", "num": 8},
                    )
                    if res.status_code == 200:
                        data = res.json()
                        items = data.get("news") or data.get("organic") or []
                        urls = [i.get("link") for i in items if i.get("link")]
                        trusted = sum(
                            1
                            for u in urls
                            if _domain_trust(_registrable_hint(u))[0] >= 0.75
                        )
                        return {
                            "trusted_hits": trusted,
                            "total": len(urls),
                            "urls": urls,
                            "note": f"Serper corroboration: {trusted}/{len(urls)} trusted hits",
                        }
            except Exception as exc:
                logger.warning("Serper corroboration failed: %s", exc)

        cse_key = self._settings.google_cse_api_key
        cse_cx = self._settings.google_cse_cx
        if cse_key and cse_cx:
            try:
                async with httpx.AsyncClient(timeout=12.0) as client:
                    res = await client.get(
                        "https://www.googleapis.com/customsearch/v1",
                        params={"key": cse_key, "cx": cse_cx, "q": q, "num": 8},
                    )
                    if res.status_code == 200:
                        items = res.json().get("items") or []
                        urls = [i.get("link") for i in items if i.get("link")]
                        trusted = sum(
                            1
                            for u in urls
                            if _domain_trust(_registrable_hint(u))[0] >= 0.75
                        )
                        return {
                            "trusted_hits": trusted,
                            "total": len(urls),
                            "urls": urls,
                            "note": f"Google CSE corroboration: {trusted}/{len(urls)} trusted hits",
                        }
            except Exception as exc:
                logger.warning("Google CSE corroboration failed: %s", exc)

        return None

    async def _llm_assist(
        self,
        title: str,
        body: str | None,
        markers: list[str],
        lang: str,
    ) -> str | None:
        bn = lang == "bn"
        system = (
            "তুমি সরকারি fact-checker। ১ বাক্যে বলো দাবিটি যাচাইযোগ্য/সন্দেহজনক কেন।"
            if bn
            else "You are a government fact-checker. In one sentence say why the claim is verifiable or suspicious."
        )
        user = f"TITLE: {title}\nBODY: {body or ''}\nMARKERS: {markers}"
        try:
            reply = await self._ollama.complete(system, user)
            if not reply:
                return None
            clean = re.sub(r"\s+", " ", reply).strip()
            return clean[:280]
        except Exception:
            return None
