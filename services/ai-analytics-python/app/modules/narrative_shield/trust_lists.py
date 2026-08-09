"""Trusted / blocked publisher lists for Narrative Shield fact-checking."""

from __future__ import annotations

# High-trust Bangladesh + official sources (domain suffixes)
TRUSTED_DOMAINS: frozenset[str] = frozenset(
    {
        "bangladesh.gov.bd",
        "pmo.gov.bd",
        "cabinet.gov.bd",
        "bbs.gov.bd",
        "nidw.gov.bd",
        "bangladeshbank.org.bd",
        "bb.org.bd",
        "prothomalo.com",
        "bdnews24.com",
        "dhakatribune.com",
        "thedailystar.net",
        "tbsnews.net",
        "jugantor.com",
        "ittefaq.com.bd",
        "banglatribune.com",
        "somoynews.tv",
        "channelionline.com",
        "jamuna.tv",
        "jagonews24.com",
        "risingbd.com",
        "kalerkantho.com",
        "mzamin.com",
        "samakal.com",
        "theindependentbd.com",
        "thefinancialexpress.com.bd",
        "newagebd.net",
        "bonikbarta.net",
        "bbc.co.uk",
        "bbc.com",
        "reuters.com",
        "apnews.com",
        "aljazeera.com",
        "news.google.com",
        "google.com",
    }
)

# Explicitly low-trust / known disinfo-style domains (demo + real patterns)
BLOCKED_DOMAINS: frozenset[str] = frozenset(
    {
        "bd-truth-leaks.example",
        "fake-bd-news.xyz",
        "rumourhub.bd",
        "anonymous-telegram-mirror.test",
    }
)

# Phrases that strongly suggest unverified rumour / incitement (heuristic)
DISINFO_MARKERS_BN: tuple[str, ...] = (
    "দুর্ভিক্ষ আসছে",
    "রিজার্ভ শেষ",
    "সরকার হটাও",
    "সশস্ত্র প্রতিরোধ",
    "ব্যালট বাক্স ভরা",
    "জিহাদ ঘোষণা",
    "বাড়ি জ্বালিয়ে",
)

DISINFO_MARKERS_EN: tuple[str, ...] = (
    "famine coming",
    "reserves finished",
    "armed resistance",
    "ballot stuffing",
    "sovereignty at risk",
    "imf takeover",
)
