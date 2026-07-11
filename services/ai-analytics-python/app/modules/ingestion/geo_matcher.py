"""Match Bangladesh districts/divisions from article text."""

from __future__ import annotations

import json
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

_DATA_FILE = Path(__file__).parent / "data" / "bd-districts.json"

_DIVISION_EN: dict[str, str] = {
    "1": "Barishal",
    "2": "Chattogram",
    "3": "Dhaka",
    "4": "Khulna",
    "5": "Rajshahi",
    "6": "Rangpur",
    "7": "Sylhet",
    "8": "Mymensingh",
}


@dataclass(frozen=True, slots=True)
class DistrictRef:
    name_en: str
    name_bn: str
    division_en: str


NATIONAL_KEYWORDS = (
    "বাংলাদেশ",
    "bangladesh",
    "জাতীয়",
    "national",
    "সরকার",
    "cabinet",
    "মন্ত্রিসভা",
    "prime minister",
    "প্রধানমন্ত্রী",
)


@lru_cache(maxsize=1)
def _load_districts() -> tuple[DistrictRef, ...]:
    if not _DATA_FILE.exists():
        return _fallback_districts()

    raw = json.loads(_DATA_FILE.read_text(encoding="utf-8"))
    refs: list[DistrictRef] = []
    for row in raw.get("districts", []):
        div_id = str(row.get("division_id", ""))
        refs.append(
            DistrictRef(
                name_en=str(row.get("name", "")),
                name_bn=str(row.get("bn_name", "")),
                division_en=_DIVISION_EN.get(div_id, "National"),
            ),
        )
    refs.sort(key=lambda d: max(len(d.name_en), len(d.name_bn)), reverse=True)
    return tuple(refs)


def _fallback_districts() -> tuple[DistrictRef, ...]:
    return (
        DistrictRef("Dhaka", "ঢাকা", "Dhaka"),
        DistrictRef("Chattogram", "চট্টগ্রাম", "Chattogram"),
        DistrictRef("Khulna", "খুলনা", "Khulna"),
        DistrictRef("Rajshahi", "রাজশাহী", "Rajshahi"),
        DistrictRef("Sylhet", "সিলেট", "Sylhet"),
        DistrictRef("Barishal", "বরিশাল", "Barishal"),
        DistrictRef("Rangpur", "রংপুর", "Rangpur"),
        DistrictRef("Mymensingh", "ময়মনসিংহ", "Mymensingh"),
    )


def match_location(text: str) -> tuple[str | None, str | None]:
    """Return (district_en, division_en) from article text."""
    if not text:
        return None, None

    lowered = text.lower()
    best: DistrictRef | None = None
    best_len = 0

    for d in _load_districts():
        for label in (d.name_en, d.name_bn):
            if not label:
                continue
            if label.lower() in lowered or label in text:
                if len(label) > best_len:
                    best = d
                    best_len = len(label)

    if best:
        return best.name_en, best.division_en

    if "chittagong" in lowered or "chittagong" in text.lower():
        return "Chattogram", "Chattogram"
    if "cox's bazar" in lowered or "coxs bazar" in lowered or "cox bazar" in lowered:
        return "Cox's Bazar", "Chattogram"
    if "sandwip" in lowered:
        return "Sandwip", "Chattogram"

    if any(kw in text or kw in lowered for kw in NATIONAL_KEYWORDS):
        return "National", "National"

    return None, None
