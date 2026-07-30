"""Anti-Phishing Shield — fetch, fingerprint, and flag lookalike gov domains."""

from __future__ import annotations

import asyncio
import logging
from typing import Any
from urllib.parse import urlparse

import httpx

from app.modules.phishing.official_domains import (
    DEFAULT_OFFICIAL_DOMAINS,
    DEFAULT_OFFICIAL_URLS,
)
from app.modules.phishing.schemas import (
    BatchScanRequest,
    BatchScanResponse,
    DigitalSignature,
    DomainDetails,
    PhishingStatus,
    RegisterOfficialRequest,
    RegisterOfficialResponse,
    ScanRequest,
    ScanResponse,
)
from app.modules.phishing.signature import (
    analyze_url_heuristics,
    build_signature_from_html,
    is_official_domain,
    normalize_hostname,
    registrable_domain,
)
from app.modules.phishing.similarity import compare_signatures

logger = logging.getLogger(__name__)

_USER_AGENT = (
    "GeoInsightBD-AntiPhishingShield/1.0 (+https://geoinsight.gov.bd; security-research)"
)


class SignatureStore:
    """Process-local gallery of official digital signatures.

    For multi-replica deploys, persist in Redis/Postgres; this is the AI-service MVP store.
    """

    def __init__(self) -> None:
        self._by_domain: dict[str, DigitalSignature] = {}
        self._allow_list: set[str] = set(DEFAULT_OFFICIAL_DOMAINS)

    @property
    def signatures(self) -> list[DigitalSignature]:
        return list(self._by_domain.values())

    @property
    def allow_list(self) -> set[str]:
        return set(self._allow_list)

    def upsert(self, sig: DigitalSignature) -> None:
        self._by_domain[sig.registrable_domain] = sig
        self._allow_list.add(sig.registrable_domain)
        self._allow_list.add(sig.hostname)

    def allow_domain(self, hostname_or_url: str) -> None:
        host = normalize_hostname(hostname_or_url)
        self._allow_list.add(host)
        self._allow_list.add(registrable_domain(host))

    def clear(self) -> None:
        self._by_domain.clear()
        self._allow_list = set(DEFAULT_OFFICIAL_DOMAINS)


# Singleton gallery for the uvicorn process
_STORE = SignatureStore()


def get_signature_store() -> SignatureStore:
    return _STORE


class AntiPhishingShield:
    """Orchestrates URL fetch → digital signature → similarity RED_FLAG policy."""

    def __init__(self, store: SignatureStore | None = None) -> None:
        self._store = store or get_signature_store()

    async def fetch_html(
        self,
        url: str,
        *,
        timeout_seconds: float = 12.0,
        client: httpx.AsyncClient | None = None,
    ) -> tuple[str | None, str | None]:
        """Return (html, error_message). Handles timeouts and broken endpoints."""
        try:
            parsed = urlparse(url)
            if parsed.scheme not in {"http", "https"}:
                return None, "unsupported_scheme"

            async def _get(c: httpx.AsyncClient) -> tuple[str | None, str | None]:
                resp = await c.get(url)
                if resp.status_code >= 400:
                    return None, f"http_{resp.status_code}"
                ctype = (resp.headers.get("content-type") or "").lower()
                if "html" not in ctype and "text/" not in ctype and ctype:
                    logger.debug("Unexpected content-type %s for %s", ctype, url)
                return resp.text, None

            if client is not None:
                return await _get(client)

            async with httpx.AsyncClient(
                follow_redirects=True,
                timeout=httpx.Timeout(timeout_seconds, connect=min(5.0, timeout_seconds)),
                headers={"User-Agent": _USER_AGENT, "Accept": "text/html,application/xhtml+xml"},
                max_redirects=5,
            ) as owned:
                return await _get(owned)
        except httpx.TimeoutException:
            logger.warning("Timeout fetching %s", url)
            return None, "timeout"
        except httpx.HTTPError as exc:
            logger.warning("HTTP error fetching %s: %s", url, exc)
            return None, f"http_error:{exc.__class__.__name__}"
        except Exception as exc:  # noqa: BLE001 — surface unexpected parse/DNS issues
            logger.exception("Unexpected fetch failure for %s", url)
            return None, f"error:{exc.__class__.__name__}"

    async def register_official(self, body: RegisterOfficialRequest) -> RegisterOfficialResponse:
        registered: list[DigitalSignature] = []
        failed: list[dict[str, str]] = []
        urls = [str(u) for u in body.urls]
        # Always seed allow-list first (even if crawl fails / times out)
        for url in urls:
            self._store.allow_domain(url)

        sem = asyncio.Semaphore(8)

        async with httpx.AsyncClient(
            follow_redirects=True,
            timeout=httpx.Timeout(body.timeout_seconds, connect=min(5.0, body.timeout_seconds)),
            headers={"User-Agent": _USER_AGENT, "Accept": "text/html,application/xhtml+xml"},
            max_redirects=5,
        ) as client:

            async def _one(url: str) -> tuple[str, DigitalSignature | None, str | None]:
                async with sem:
                    html, err = await self.fetch_html(
                        url,
                        timeout_seconds=body.timeout_seconds,
                        client=client,
                    )
                    if err or html is None:
                        return url, None, err or "empty_body"
                    try:
                        return url, build_signature_from_html(url, html), None
                    except Exception as exc:  # noqa: BLE001
                        logger.exception("Signature build failed for %s", url)
                        return url, None, f"parse:{exc.__class__.__name__}"

            results = await asyncio.gather(*[_one(u) for u in urls])

        for url, sig, err in results:
            if sig is not None:
                self._store.upsert(sig)
                registered.append(sig)
            else:
                failed.append({"url": url, "error": err or "unknown"})

        return RegisterOfficialResponse(
            registered=registered,
            failed=failed,
            official_domains=sorted(self._store.allow_list),
        )

    async def register_defaults(self, *, timeout_seconds: float = 8.0) -> RegisterOfficialResponse:
        """Register the full curated Bangladesh government seed list."""
        return await self.register_official(
            RegisterOfficialRequest.model_validate(
                {"urls": DEFAULT_OFFICIAL_URLS, "timeout_seconds": timeout_seconds}
            )
        )

    async def _ensure_gallery(self, official_urls: list[str] | None, timeout: float) -> None:
        if official_urls:
            await self.register_official(
                RegisterOfficialRequest.model_validate(
                    {"urls": official_urls, "timeout_seconds": timeout}
                )
            )
            return
        if self._store.signatures:
            return
        # Bootstrap once from defaults (may partially fail offline — domains still seed)
        await self.register_official(
            RegisterOfficialRequest.model_validate(
                {"urls": DEFAULT_OFFICIAL_URLS, "timeout_seconds": timeout}
            )
        )

    def _domain_details(self, url: str) -> DomainDetails:
        host = normalize_hostname(url)
        reg = registrable_domain(host)
        official = is_official_domain(host, self._store.allow_list)
        matched = reg if official else None
        parsed = urlparse(url if "://" in url else f"https://{url}")
        return DomainDetails(
            input_url=url,
            hostname=host,
            registrable_domain=reg,
            scheme=parsed.scheme or "https",
            is_official=official,
            matched_official_domain=matched,
        )

    async def scan(self, body: ScanRequest) -> ScanResponse:
        url = str(body.url)
        official_urls = [str(u) for u in body.official_urls] if body.official_urls else None
        await self._ensure_gallery(official_urls, body.timeout_seconds)

        details = self._domain_details(url)
        
        heuristics = analyze_url_heuristics(url, details.is_official)

        # Verified domain → never RED_FLAG even if self-similar
        if details.is_official:
            return ScanResponse(
                status=PhishingStatus.CLEAN,
                similarity_score=1.0,
                domain_details=details,
                heuristics=heuristics,
                message="Domain is on the official verified allow-list.",
            )

        html, err = await self.fetch_html(url, timeout_seconds=body.timeout_seconds)
        if err or html is None:
            # If fetch fails but heuristics are very high, it might be a dead phishing link
            status = PhishingStatus.WATCH if heuristics.risk_score > 0.5 else PhishingStatus.ERROR
            return ScanResponse(
                status=status,
                similarity_score=0.0,
                domain_details=details,
                heuristics=heuristics,
                message="Unable to fetch or parse the suspicious URL.",
                error=err,
            )

        try:
            candidate = build_signature_from_html(url, html)
        except Exception as exc:  # noqa: BLE001
            return ScanResponse(
                status=PhishingStatus.ERROR,
                similarity_score=0.0,
                domain_details=details,
                heuristics=heuristics,
                message="HTML fingerprinting failed.",
                error=f"parse:{exc.__class__.__name__}",
            )

        gallery = self._store.signatures
        if not gallery:
            return ScanResponse(
                status=PhishingStatus.WATCH if heuristics.risk_score > 0.3 else PhishingStatus.ERROR,
                similarity_score=0.0,
                domain_details=details,
                heuristics=heuristics,
                candidate_signature=candidate,
                message=(
                    "No official signatures available (offline bootstrap). "
                    "Domain is not verified — register official URLs and rescan."
                ),
            )

        breakdown = compare_signatures(candidate, gallery)
        best = gallery[breakdown.best_index] if breakdown.best_index >= 0 else None
        score = breakdown.blended
        threshold = body.similarity_threshold

        # Policy: lookalike chrome on a NON-official domain → RED_FLAG
        if score >= threshold:
            return ScanResponse(
                status=PhishingStatus.RED_FLAG,
                similarity_score=score,
                domain_details=details,
                heuristics=heuristics,
                best_match=best,
                cosine_score=breakdown.cosine,
                levenshtein_score=breakdown.levenshtein,
                candidate_signature=candidate,
                message=(
                    "Similarity ≥ threshold against an official government fingerprint "
                    "but the domain is NOT on the verified list."
                ),
            )

        # Heuristic boost: If URL looks highly suspicious and we have SOME similarity, flag it
        if score >= max(0.40, threshold - 0.35) and heuristics.risk_score >= 0.7:
            return ScanResponse(
                status=PhishingStatus.RED_FLAG,
                similarity_score=score,
                domain_details=details,
                heuristics=heuristics,
                best_match=best,
                cosine_score=breakdown.cosine,
                levenshtein_score=breakdown.levenshtein,
                candidate_signature=candidate,
                message=(
                    "Heuristic risk is VERY HIGH combined with moderate visual similarity. "
                    "Strong indicator of a targeted phishing attack."
                ),
            )

        if score >= max(0.55, threshold - 0.25) or heuristics.risk_score >= 0.5:
            status = PhishingStatus.WATCH
            msg = "Moderate similarity or suspicious URL pattern — recommend analyst review."
        else:
            status = PhishingStatus.CLEAR
            msg = "Low similarity to official government digital signatures and no suspicious URL patterns."

        return ScanResponse(
            status=status,
            similarity_score=score,
            domain_details=details,
            heuristics=heuristics,
            best_match=best,
            cosine_score=breakdown.cosine,
            levenshtein_score=breakdown.levenshtein,
            candidate_signature=candidate,
            message=msg,
        )

    async def scan_batch(self, body: BatchScanRequest) -> BatchScanResponse:
        results: list[ScanResponse] = []
        for raw in body.urls:
            one = await self.scan(
                ScanRequest(
                    url=raw,
                    similarity_threshold=body.similarity_threshold,
                    timeout_seconds=body.timeout_seconds,
                )
            )
            results.append(one)
            # Small yield so a burst of scans does not starve the event loop
            await asyncio.sleep(0)
        red = sum(1 for r in results if r.status == PhishingStatus.RED_FLAG)
        return BatchScanResponse(results=results, red_flag_count=red)

    def to_alert_payload(self, result: ScanResponse) -> dict[str, Any]:
        """Shape suitable for RabbitMQ publish (ai.phishing)."""
        return {
            "type": "phishing_result",
            "status": result.status.value,
            "similarity_score": result.similarity_score,
            "domain_details": result.domain_details.model_dump(),
            "best_match_domain": result.best_match.registrable_domain if result.best_match else None,
            "message": result.message,
        }
