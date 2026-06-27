"""Mock public sentiment log stream (333 Upazila / 999 Union simulation)."""

from __future__ import annotations

import random
from dataclasses import dataclass

_MOCK_LOGS: list[tuple[str, str, str]] = [
    (
        "আমাদের ইউনিয়নে পানি সরবরাহ বন্ধ, অবিলম্বে ব্যবস্থা চাই।",
        "Dhaka",
        "Savar",
    ),
    (
        "স্থানীয় বাজারে চালের দাম অস্বাভাবিক বেড়েছে, তদন্ত চাই।",
        "Chattogram",
        "Patiya",
    ),
    (
        "রাস্তা মেরামতের দাবি জানাচ্ছি, শিক্ষার্থীরা কষ্টে যাচ্ছে।",
        "Rajshahi",
        "Puthia",
    ),
    (
        "স্বাস্থ্যকেন্দ্রে ডাক্তার নেই, এটি বড় সমস্যা।",
        "Khulna",
        "Dumuria",
    ),
    (
        "বিদ্যুৎ বিভ্রাট কমাতে সোলার প্রকল্প চাই।",
        "Sylhet",
        "Beanibazar",
    ),
    (
        "আজ বাজারে সবকিছু ঠিক ছিল, কোনো অভিযোগ নেই।",
        "Barishal",
        "Babuganj",
    ),
    (
        "অনিয়মের অভিযোগে ঠিকাদারের বিরুদ্ধে তদন্ত দাবি।",
        "Rangpur",
        "Pirgachha",
    ),
    (
        "কৃষকদের সার ও বীজ সহজ শর্তে চাই।",
        "Mymensingh",
        "Gouripur",
    ),
]


@dataclass(frozen=True, slots=True)
class MockLogEntry:
    text: str
    district: str
    upazila: str
    source_id: str


def generate_mock_stream(count: int = 50) -> list[MockLogEntry]:
    rng = random.Random(42)
    entries: list[MockLogEntry] = []
    for i in range(count):
        text, district, upazila = rng.choice(_MOCK_LOGS)
        entries.append(
            MockLogEntry(
                text=text,
                district=district,
                upazila=upazila,
                source_id=f"log-{333 if i % 3 == 0 else 999}-{i:04d}",
            ),
        )
    return entries
