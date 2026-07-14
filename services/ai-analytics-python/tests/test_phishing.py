"""Anti-Phishing Shield unit tests (offline — no live HTTP)."""

from __future__ import annotations

import asyncio

import pytest

from app.modules.phishing.schemas import PhishingStatus, ScanRequest
from app.modules.phishing.service import AntiPhishingShield, SignatureStore
from app.modules.phishing.signature import (
    build_signature_from_html,
    is_official_domain,
    registrable_domain,
)
from app.modules.phishing.similarity import compare_signatures, levenshtein_similarity


OFFICIAL_HTML = """
<html><head>
  <title>Bangladesh National Portal</title>
  <meta name="description" content="Official portal of the Government of Bangladesh"/>
  <meta property="og:title" content="bangladesh.gov.bd"/>
  <link rel="icon" href="/favicon-bd.ico"/>
  <style>.brand { color: #006a4e; }</style>
</head>
<body>
  <header class="gov-header national-brand"><nav class="main-nav"></nav></header>
  <img class="logo seal" alt="National Emblem" src="/img/bd-logo.png"/>
  <main><section><article><p>Services</p></article></section></main>
  <footer class="gov-footer"></footer>
</body></html>
"""

PHISH_HTML = """
<html><head>
  <title>Bangladesh National Portal</title>
  <meta name="description" content="Official portal of the Government of Bangladesh"/>
  <meta property="og:title" content="bangladesh.gov.bd"/>
  <link rel="icon" href="/favicon-bd.ico"/>
  <style>.brand { color: #006a4e; }</style>
</head>
<body>
  <header class="gov-header national-brand"><nav class="main-nav"></nav></header>
  <img class="logo seal" alt="National Emblem" src="/img/bd-logo.png"/>
  <main><section><article><p>Login to continue</p></article></section></main>
  <footer class="gov-footer"></footer>
</body></html>
"""

UNRELATED_HTML = """
<html><head><title>Cat Memes Daily</title>
<meta name="description" content="funny cats"/>
</head><body><div class="meme"><img src="/cat.gif" alt="cat"/></div></body></html>
"""


def test_registrable_gov_bd() -> None:
    assert registrable_domain("www.cabinet.gov.bd") == "cabinet.gov.bd"
    assert registrable_domain("portal.bangladesh.gov.bd") == "bangladesh.gov.bd"


def test_levenshtein_identical() -> None:
    assert levenshtein_similarity("abc", "abc") == 1.0
    assert levenshtein_similarity("abc", "abx") < 1.0


def test_clone_triggers_red_flag_offline(monkeypatch: pytest.MonkeyPatch) -> None:
    store = SignatureStore()
    store.upsert(build_signature_from_html("https://bangladesh.gov.bd/", OFFICIAL_HTML))
    shield = AntiPhishingShield(store=store)

    async def fake_fetch(url: str, *, timeout_seconds: float = 12.0):
        return PHISH_HTML, None

    monkeypatch.setattr(shield, "fetch_html", fake_fetch)

    result = asyncio.run(
        shield.scan(
            ScanRequest.model_validate(
                {
                    "url": "https://bangladesh-gov-bd-secure.evil.example/login",
                    "similarity_threshold": 0.90,
                }
            )
        )
    )

    assert result.status == PhishingStatus.RED_FLAG
    assert result.similarity_score >= 0.90
    assert result.domain_details.is_official is False
    payload = result.model_dump()
    assert payload["status"] == "RED_FLAG"
    assert "domain_details" in payload


def test_official_domain_is_clean(monkeypatch: pytest.MonkeyPatch) -> None:
    store = SignatureStore()
    store.upsert(build_signature_from_html("https://bangladesh.gov.bd/", OFFICIAL_HTML))
    shield = AntiPhishingShield(store=store)

    async def fake_fetch(url: str, *, timeout_seconds: float = 12.0):
        return OFFICIAL_HTML, None

    monkeypatch.setattr(shield, "fetch_html", fake_fetch)

    result = asyncio.run(
        shield.scan(
            ScanRequest.model_validate({"url": "https://www.bangladesh.gov.bd/services"})
        )
    )
    assert result.status == PhishingStatus.CLEAN


def test_unrelated_site_clear(monkeypatch: pytest.MonkeyPatch) -> None:
    store = SignatureStore()
    store.upsert(build_signature_from_html("https://bangladesh.gov.bd/", OFFICIAL_HTML))
    shield = AntiPhishingShield(store=store)

    async def fake_fetch(url: str, *, timeout_seconds: float = 12.0):
        return UNRELATED_HTML, None

    monkeypatch.setattr(shield, "fetch_html", fake_fetch)

    result = asyncio.run(
        shield.scan(
            ScanRequest.model_validate(
                {"url": "https://cats.example/", "similarity_threshold": 0.90}
            )
        )
    )
    assert result.status in {PhishingStatus.CLEAR, PhishingStatus.WATCH}
    assert result.similarity_score < 0.90


def test_compare_signatures_high_for_clones() -> None:
    a = build_signature_from_html("https://bangladesh.gov.bd/", OFFICIAL_HTML)
    b = build_signature_from_html("https://evil.example/", PHISH_HTML)
    breakdown = compare_signatures(b, [a])
    assert breakdown.blended >= 0.90


def test_timeout_returns_error(monkeypatch: pytest.MonkeyPatch) -> None:
    store = SignatureStore()
    store.upsert(build_signature_from_html("https://bangladesh.gov.bd/", OFFICIAL_HTML))
    shield = AntiPhishingShield(store=store)

    async def fake_fetch(url: str, *, timeout_seconds: float = 12.0):
        return None, "timeout"

    monkeypatch.setattr(shield, "fetch_html", fake_fetch)

    result = asyncio.run(
        shield.scan(ScanRequest.model_validate({"url": "https://slow.evil.example/"}))
    )
    assert result.status == PhishingStatus.ERROR
    assert result.error == "timeout"


def test_is_official_with_gov_bd_allow() -> None:
    assert is_official_domain("something.gov.bd", frozenset({"gov.bd"})) is True
    assert is_official_domain("evil.example", frozenset({"gov.bd"})) is False
