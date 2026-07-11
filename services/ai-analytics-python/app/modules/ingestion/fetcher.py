"""Fetch and normalize RSS / Google News entries."""

from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime

import feedparser
import httpx

from app.modules.ingestion.sources import FeedSource

_STRIP_HTML = re.compile(r"<[^>]+>")


@dataclass(frozen=True, slots=True)
class RawArticle:
    source_type: str
    source_name: str
    title: str
    summary: str
    url: str
    published_at: datetime | None
    language: str


def _clean_html(text: str) -> str:
    return _STRIP_HTML.sub("", text).strip()


def _parse_published(entry: feedparser.FeedParserDict) -> datetime | None:
    if getattr(entry, "published_parsed", None):
        try:
            return datetime(*entry.published_parsed[:6], tzinfo=timezone.utc)
        except (TypeError, ValueError):
            pass
    if getattr(entry, "updated_parsed", None):
        try:
            return datetime(*entry.updated_parsed[:6], tzinfo=timezone.utc)
        except (TypeError, ValueError):
            pass
    published = getattr(entry, "published", None) or getattr(entry, "updated", None)
    if published:
        try:
            dt = parsedate_to_datetime(published)
            return dt.astimezone(timezone.utc) if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
        except (TypeError, ValueError):
            pass
    return None


def _resolve_link(entry: feedparser.FeedParserDict) -> str:
    link = getattr(entry, "link", "") or ""
    if link and not link.startswith("https://news.google.com"):
        return link[:2048]

    entry_id = getattr(entry, "id", "") or ""
    if entry_id.startswith("http") and "news.google.com" not in entry_id:
        return entry_id[:2048]

    for alt in getattr(entry, "links", []) or []:
        href = alt.get("href", "") if isinstance(alt, dict) else getattr(alt, "href", "")
        if href and "news.google.com" not in href:
            return href[:2048]

    return link[:2048]


async def fetch_feed(source: FeedSource, max_items: int, client: httpx.AsyncClient) -> list[RawArticle]:
    articles: list[RawArticle] = []
    try:
        response = await client.get(source.url, follow_redirects=True)
        response.raise_for_status()
        parsed = feedparser.parse(response.content)
    except Exception as exc:
        print(f"[ingestion] Feed failed {source.name}: {exc}")
        return articles

    for entry in parsed.entries[:max_items]:
        title = _clean_html(getattr(entry, "title", "") or "").strip()
        link = _resolve_link(entry)
        if not title or not link:
            continue

        summary_raw = (
            getattr(entry, "summary", None)
            or getattr(entry, "description", None)
            or title
        )
        summary = _clean_html(str(summary_raw))[:2000]

        articles.append(
            RawArticle(
                source_type=source.source_type,
                source_name=source.name,
                title=title,
                summary=summary,
                url=link,
                published_at=_parse_published(entry),
                language=source.language,
            ),
        )

    return articles


def _round_robin_merge(
    batches: list[tuple[str, list[RawArticle]]],
    max_per_feed: int,
) -> list[RawArticle]:
    """Interleave articles so no single outlet dominates the ingest batch."""
    seen_urls: set[str] = set()
    merged: list[RawArticle] = []

    for round_idx in range(max_per_feed):
        for _name, batch in batches:
            if round_idx >= len(batch):
                continue
            article = batch[round_idx]
            if article.url in seen_urls:
                continue
            seen_urls.add(article.url)
            merged.append(article)

    return merged


async def fetch_all_feeds(
    feeds: tuple[FeedSource, ...],
    max_per_feed: int = 10,
    timeout_sec: float = 25.0,
) -> list[RawArticle]:
    headers = {
        "User-Agent": "Mozilla/5.0 (compatible; GeoInsightBD-Ingestion/1.0; +https://geoinsight.gov.bd)",
        "Accept": "application/rss+xml, application/xml, text/xml, application/atom+xml, */*",
        "Accept-Language": "bn-BD,bn;q=0.9,en;q=0.8",
    }

    batches: list[tuple[str, list[RawArticle]]] = []

    async with httpx.AsyncClient(timeout=timeout_sec, headers=headers) as client:
        for feed in feeds:
            batch = await fetch_feed(feed, max_per_feed, client)
            if batch:
                batches.append((feed.name, batch))
            else:
                print(f"[ingestion] Empty feed: {feed.name}")

    return _round_robin_merge(batches, max_per_feed)
