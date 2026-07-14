"""Build a digital signature from remote HTML (structure + meta + visual cues)."""

from __future__ import annotations

import hashlib
import logging
import re
from datetime import UTC, datetime
from urllib.parse import urlparse

from bs4 import BeautifulSoup, Tag

from app.modules.phishing.schemas import DigitalSignature

logger = logging.getLogger(__name__)

_MAX_STRUCTURE_DEPTH = 4
_MAX_STRUCTURE_SIBLINGS = 12
_WHITESPACE = re.compile(r"\s+")


def normalize_hostname(url_or_host: str) -> str:
    raw = url_or_host.strip().lower()
    if "://" not in raw:
        raw = f"https://{raw}"
    host = urlparse(raw).hostname or ""
    if host.startswith("www."):
        host = host[4:]
    return host


def registrable_domain(hostname: str) -> str:
    """Heuristic eTLD+1 for Bangladesh gov / common BD public suffixes.

    Not a full Public Suffix List — sufficient for *.gov.bd / *.org.bd / *.ac.bd.
    """
    host = hostname.lower().lstrip(".")
    if host.startswith("www."):
        host = host[4:]
    parts = host.split(".")
    if len(parts) >= 3 and parts[-2] in {"gov", "org", "ac", "edu", "mil"} and parts[-1] == "bd":
        return ".".join(parts[-3:])
    if len(parts) >= 2:
        return ".".join(parts[-2:])
    return host


def is_official_domain(hostname: str, allow_list: set[str] | frozenset[str]) -> bool:
    """True if host or its registrable domain is verified."""
    host = normalize_hostname(hostname)
    reg = registrable_domain(host)
    if host in allow_list or reg in allow_list:
        return True
    # Explicit policy: any *.gov.bd under national digital identity root
    if reg.endswith(".gov.bd") or host.endswith(".gov.bd"):
        if "gov.bd" in allow_list:
            return True
    return False


def _clean_token(text: str | None, limit: int = 120) -> str:
    if not text:
        return ""
    return _WHITESPACE.sub(" ", text).strip().lower()[:limit]


def _walk_structure(node: Tag, depth: int = 0) -> str:
    """Skeletal DOM path: tag names only (ignores text noise / ads)."""
    if depth > _MAX_STRUCTURE_DEPTH:
        return ""
    bits: list[str] = [node.name or "?"]
    children = [c for c in node.children if isinstance(c, Tag)][:_MAX_STRUCTURE_SIBLINGS]
    for child in children:
        nested = _walk_structure(child, depth + 1)
        if nested:
            bits.append(nested)
    return "(" + "".join(bits) + ")" if len(bits) > 1 else bits[0]


def _meta_fingerprint(soup: BeautifulSoup) -> str:
    tokens: list[str] = []
    title = soup.find("title")
    if title:
        tokens.append(f"title:{_clean_token(title.get_text())}")

    for tag in soup.find_all("meta"):
        name = (tag.get("name") or tag.get("property") or tag.get("http-equiv") or "").lower()
        content = _clean_token(tag.get("content"))
        if not name or not content:
            continue
        # Skip volatile / tracking metas
        if name.startswith(("google", "fb:", "twitter:site")):
            continue
        tokens.append(f"{name}:{content}")

    tokens.sort()
    return " | ".join(tokens[:40])


def _visual_fingerprint(soup: BeautifulSoup) -> str:
    tokens: list[str] = []

    # Favicon / apple-touch
    for link in soup.find_all("link", href=True):
        rel = " ".join(link.get("rel") or []).lower()
        if "icon" in rel or "apple-touch" in rel:
            tokens.append(f"icon:{_clean_token(link['href'], 80)}")

    # Likely logos
    for img in soup.find_all("img", src=True)[:25]:
        alt = _clean_token(img.get("alt"), 60)
        src = _clean_token(img.get("src"), 80)
        cls = _clean_token(" ".join(img.get("class") or []), 40)
        if any(k in f"{alt} {src} {cls}" for k in ("logo", "emblem", "crest", "seal", "brand")):
            tokens.append(f"logo:{alt or src}")

    # Header / nav class hooks (stable brand chrome)
    for sel in ("header", "nav", "footer"):
        el = soup.find(sel)
        if el and el.get("class"):
            tokens.append(f"{sel}-class:{_clean_token(' '.join(el.get('class')), 60)}")

    # Inline brand-ish hex colors (first few)
    style_blob = " ".join(s.get_text() for s in soup.find_all("style")[:3])
    for color in re.findall(r"#[0-9a-fA-F]{3,8}\b", style_blob)[:8]:
        tokens.append(f"color:{color.lower()}")

    tokens.sort()
    return " | ".join(tokens[:30])


def build_signature_from_html(url: str, html: str) -> DigitalSignature:
    """Hash HTML structure, meta tags, and visual cues into a DigitalSignature."""
    host = normalize_hostname(url)
    reg = registrable_domain(host)

    # html.parser avoids lxml compile issues on slim images; good enough for fingerprinting
    soup = BeautifulSoup(html or "", "html.parser")
    body = soup.body or soup

    structure = _walk_structure(body) if isinstance(body, Tag) else ""
    meta = _meta_fingerprint(soup)
    visual = _visual_fingerprint(soup)
    combined = f"{structure}\n{meta}\n{visual}"
    digest = hashlib.sha256(combined.encode("utf-8", errors="replace")).hexdigest()

    return DigitalSignature(
        source_url=url,
        hostname=host,
        registrable_domain=reg,
        structure_fingerprint=structure[:4000],
        meta_fingerprint=meta[:4000],
        visual_fingerprint=visual[:4000],
        signature_hash=digest,
        captured_at=datetime.now(UTC).isoformat(),
        raw_features={
            "structure_len": len(structure),
            "meta_tokens": meta.count("|") + (1 if meta else 0),
            "visual_tokens": visual.count("|") + (1 if visual else 0),
        },
    )


def signature_corpus_text(sig: DigitalSignature) -> str:
    """Flatten fingerprints for TF-IDF vectorization."""
    return " ".join(
        [
            sig.structure_fingerprint,
            sig.meta_fingerprint,
            sig.visual_fingerprint,
            sig.registrable_domain,
            sig.hostname,
        ]
    )
