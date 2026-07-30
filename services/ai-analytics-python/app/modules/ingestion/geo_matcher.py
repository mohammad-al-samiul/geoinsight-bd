"""Match Bangladesh upazilas / districts / divisions from article text."""

from __future__ import annotations

import json
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

_DISTRICTS_FILE = Path(__file__).parent / "data" / "bd-districts.json"
_UPAZILAS_FILE = Path(__file__).parent / "data" / "bd-upazilas.json"

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


@dataclass(frozen=True, slots=True)
class UpazilaRef:
    name_en: str
    name_bn: str
    district_en: str
    division_en: str


# Require a clear BD national anchor — bare "সরকার"/"national" matches foreign copy too.
NATIONAL_KEYWORDS = (
    "বাংলাদেশ",
    "bangladesh",
    "গণপ্রজাতন্ত্রী বাংলাদেশ",
    "people's republic of bangladesh",
    "bangladesh government",
    "বাংলাদেশ সরকার",
    "interim government of bangladesh",
    "অন্তর্বর্তী সরকার",
)

# Localities often in flood headlines (city areas, not upazila gazetteer)
_LOCALITIES: tuple[tuple[tuple[str, ...], str, str, str, str], ...] = (
    (("bahaddarhat", "bohoddarhat", "বহদ্দারহাট"), "Bohoddarhat", "বহদ্দারহাট", "Chattogram", "Chattogram"),
    (("banshkhali", "banskhali", "বাঁশখালী", "বাঁশখালি", "বাশখালি", "বাশখালী"), "Banshkhali", "বাঁশখালী", "Chattogram", "Chattogram"),
    (("satkania", "সাতকানিয়া", "সাতকানিয়া"), "Satkania", "সাতকানিয়া", "Chattogram", "Chattogram"),
    (("agrabad", "আগ্রাবাদ"), "Agrabad", "আগ্রাবাদ", "Chattogram", "Chattogram"),
    (("halishahar", "হালিশহর"), "Halishahar", "হালিশহর", "Chattogram", "Chattogram"),
    (("chandgaon", "চান্দগাঁও", "চান্দগাও"), "Chandgaon", "চান্দগাঁও", "Chattogram", "Chattogram"),
)


@lru_cache(maxsize=1)
def _load_districts() -> tuple[DistrictRef, ...]:
    if not _DISTRICTS_FILE.exists():
        return _fallback_districts()

    raw = json.loads(_DISTRICTS_FILE.read_text(encoding="utf-8"))
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


@lru_cache(maxsize=1)
def _load_upazilas() -> tuple[UpazilaRef, ...]:
    if not _UPAZILAS_FILE.exists() or not _DISTRICTS_FILE.exists():
        return ()

    districts_raw = json.loads(_DISTRICTS_FILE.read_text(encoding="utf-8"))
    by_id = {
        str(d["id"]): d
        for d in districts_raw.get("districts", [])
        if d.get("id") is not None
    }
    raw = json.loads(_UPAZILAS_FILE.read_text(encoding="utf-8"))
    refs: list[UpazilaRef] = []
    for row in raw.get("upazilas", []):
        dist = by_id.get(str(row.get("district_id", "")))
        if not dist:
            continue
        name_en = str(row.get("name", "")).strip()
        name_bn = str(row.get("bn_name", "")).strip()
        if len(name_en) < 4 and len(name_bn) < 3:
            continue
        div_id = str(dist.get("division_id", ""))
        refs.append(
            UpazilaRef(
                name_en=name_en,
                name_bn=name_bn or name_en,
                district_en=str(dist.get("name", "")),
                division_en=_DIVISION_EN.get(div_id, "National"),
            ),
        )
    refs.sort(key=lambda u: max(len(u.name_en), len(u.name_bn)), reverse=True)
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


def _normalize_bn(s: str) -> str:
    import unicodedata

    t = unicodedata.normalize("NFC", s).lower()
    t = t.replace("\u09df", "\u09af")  # য় → য
    t = t.replace("ঁ", "")
    t = t.replace("\u200c", "").replace("\u200d", "")
    return "".join(t.split())


def _label_in_text(text: str, lowered: str, label: str) -> bool:
    if not label:
        return False
    if any("\u0980" <= ch <= "\u09ff" for ch in label):
        return _normalize_bn(label) in _normalize_bn(text)
    lab = label.lower()
    if len(lab) <= 3:
        return False
    return lab in lowered


def match_location(text: str) -> tuple[str | None, str | None]:
    """Return (district_en, division_en) from article text.

    Prefer upazila/locality → maps to its parent district for DB storage.
    """
    if not text:
        return None, None

    lowered = text.lower()

    # 1) Named urban localities
    for labels, _en, _bn, district, division in _LOCALITIES:
        if any(_label_in_text(text, lowered, lab) for lab in labels):
            return district, division

    # 2) Upazila → parent district (finest admin unit for storage)
    best_u: UpazilaRef | None = None
    best_u_len = 0
    for u in _load_upazilas():
        for label in (u.name_en, u.name_bn):
            if _label_in_text(text, lowered, label) and len(label) > best_u_len:
                best_u = u
                best_u_len = len(label)
    if best_u:
        return best_u.district_en, best_u.division_en

    # 3) District
    best: DistrictRef | None = None
    best_len = 0
    for d in _load_districts():
        for label in (d.name_en, d.name_bn):
            if _label_in_text(text, lowered, label) and len(label) > best_len:
                best = d
                best_len = len(label)

    if best:
        return best.name_en, best.division_en

    if "chittagong" in lowered:
        return "Chattogram", "Chattogram"
    if "cox's bazar" in lowered or "coxs bazar" in lowered or "cox bazar" in lowered or "কক্সবাজার" in text:
        return "Cox's Bazar", "Chattogram"
    if "sandwip" in lowered or "সন্দ্বীপ" in text:
        return "Chattogram", "Chattogram"

    if any(kw in text or kw in lowered for kw in NATIONAL_KEYWORDS):
        return "National", "National"

    return None, None


def match_places(text: str) -> list[dict[str, str]]:
    """Return all upazila/locality/district hits for charting (finer first)."""
    if not text:
        return []

    lowered = text.lower()
    hits: list[dict[str, str]] = []
    seen: set[str] = set()

    for labels, name_en, name_bn, district, division in _LOCALITIES:
        if any(_label_in_text(text, lowered, lab) for lab in labels):
            key = f"loc:{name_en.lower()}"
            if key not in seen:
                seen.add(key)
                hits.append(
                    {
                        "label": name_bn,
                        "kind": "locality",
                        "district": district,
                        "division": division,
                    },
                )

    for u in _load_upazilas():
        if any(_label_in_text(text, lowered, lab) for lab in (u.name_en, u.name_bn)):
            key = f"upz:{u.name_en.lower()}"
            if key in seen:
                continue
            seen.add(key)
            hits.append(
                {
                    "label": u.name_bn or u.name_en,
                    "kind": "upazila",
                    "district": u.district_en,
                    "division": u.division_en,
                },
            )

    finer_districts = {h["district"].lower() for h in hits if h["kind"] in ("upazila", "locality")}

    for d in _load_districts():
        if any(_label_in_text(text, lowered, lab) for lab in (d.name_en, d.name_bn)):
            if d.name_en.lower() in finer_districts:
                continue
            key = f"dst:{d.name_en.lower()}"
            if key in seen:
                continue
            seen.add(key)
            hits.append(
                {
                    "label": d.name_bn or d.name_en,
                    "kind": "district",
                    "district": d.name_en,
                    "division": d.division_en,
                },
            )

    return hits
