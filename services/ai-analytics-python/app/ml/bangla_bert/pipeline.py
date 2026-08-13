"""Bangla-BERT sentiment pipeline with CPU offloading via process pool."""

from __future__ import annotations

import re
from dataclasses import asdict, dataclass
from enum import Enum
from functools import lru_cache
from typing import Literal

GrievanceCategory = Literal["Grievance", "Demand", "Neutral"]


class SentimentLabel(str, Enum):
    GRIEVANCE = "Grievance"
    DEMAND = "Demand"
    NEUTRAL = "Neutral"


@dataclass(frozen=True, slots=True)
class SentimentResult:
    text: str
    category: GrievanceCategory
    confidence: float
    district: str
    upazila: str
    raw_label: str


_GRIEVANCE_KW = re.compile(
    r"অভিযোগ|সমস্যা|ন্যায়|অনিয়ম|দুর্নীতি|হয়রানি|বঞ্চিত|"
    r"অসন্তোষ|ক্ষোভ|কষ্ট|দুর্ভোগ|ভোগান্তি|দুর্দশা|সংকট|"
    r"আন্দোলন|বিক্ষোভ|হরতাল|প্রতিবাদ|বিরোধিতা|"
    r"হত্যা|খুন|ধর্ষণ|সহিংস|সংঘর্ষ|আক্রমণ|"
    r"দুর্ঘটনা|মৃত্যু|নিহত|আহত|নিখোঁজ|"
    r"দারিদ্র্য|বেকার|মূল্যস্ফীতি|দাম বৃদ্ধি|খাদ্য সংকট|"
    r"বন্যা|জলোচ্ছ্বাস|ঘূর্ণিঝড়|ভূমিধস|"
    r"corruption|protest|scandal|fraud|violence|killed|murder|"
    r"outrage|anger|suffer|crisis|strike|hartal|clash|assault",
    re.IGNORECASE,
)
_DEMAND_KW = re.compile(
    r"চাই|দাবি|প্রয়োজন|সংযোগ|উন্নয়ন|সেবা|পানি|রাস্তা|বিদ্যুৎ|"
    r"demand|request|call for|need|seek|appeal",
    re.IGNORECASE,
)


def _load_hf_pipeline(model_id: str, cache_dir: str):
    from transformers import pipeline

    return pipeline(
        "sentiment-analysis",
        model=model_id,
        tokenizer=model_id,
        truncation=True,
        max_length=256,
        device=-1,
        model_kwargs={"cache_dir": cache_dir},
    )


@lru_cache(maxsize=1)
def _get_pipeline(model_id: str, cache_dir: str):
    return _load_hf_pipeline(model_id, cache_dir)


def _map_to_category(text: str, raw_label: str, score: float) -> tuple[GrievanceCategory, float]:
    # Keyword override always wins for governance distress signals
    if _GRIEVANCE_KW.search(text):
        return "Grievance", min(max(score, 0.7) + 0.15, 1.0)
    if _DEMAND_KW.search(text):
        return "Demand", min(max(score, 0.65) + 0.1, 1.0)

    label_lower = raw_label.lower()
    if "negative" in label_lower or "neg" == label_lower or label_lower in {"1", "label_0"}:
        return "Grievance", min(score + 0.1, 1.0)
    if "positive" in label_lower or "pos" == label_lower or label_lower in {"2", "label_2"}:
        return "Demand", min(score + 0.05, 1.0)
    return "Neutral", score


def analyze_text(
    text: str,
    district: str,
    upazila: str,
    model_id: str,
    cache_dir: str,
    use_mock: bool,
) -> SentimentResult:
    if use_mock:
        category, confidence = _mock_classify(text)
        return SentimentResult(
            text=text,
            category=category,
            confidence=confidence,
            district=district,
            upazila=upazila,
            raw_label="mock",
        )

    try:
        pipe = _get_pipeline(model_id, cache_dir)
        output = pipe(text)[0]
        raw_label = str(output["label"])
        score = float(output["score"])
        category, confidence = _map_to_category(text, raw_label, score)
    except Exception:
        category, confidence = _mock_classify(text)
        raw_label = "fallback"

    return SentimentResult(
        text=text,
        category=category,
        confidence=confidence,
        district=district,
        upazila=upazila,
        raw_label=raw_label,
    )


def sentiment_to_dict(result: SentimentResult | object) -> dict[str, object]:
    if isinstance(result, SentimentResult):
        return asdict(result)
    if hasattr(result, "__dict__"):
        return dict(result.__dict__)
    return {
        "text": getattr(result, "text", ""),
        "category": getattr(result, "category", "Neutral"),
        "confidence": getattr(result, "confidence", 0.0),
        "district": getattr(result, "district", ""),
        "upazila": getattr(result, "upazila", ""),
        "raw_label": getattr(result, "raw_label", ""),
    }


def _mock_classify(text: str) -> tuple[GrievanceCategory, float]:
    if _GRIEVANCE_KW.search(text):
        return "Grievance", 0.88
    if _DEMAND_KW.search(text):
        return "Demand", 0.85
    return "Neutral", 0.72


def analyze_batch(
    items: list[tuple[str, str, str]],
    model_id: str,
    cache_dir: str,
    use_mock: bool,
) -> list[dict[str, object]]:
    """Entry point for ProcessPoolExecutor (must be top-level picklable)."""
    return [
        sentiment_to_dict(analyze_text(text, district, upazila, model_id, cache_dir, use_mock))
        for text, district, upazila in items
    ]


_PROPAGANDA_KW = re.compile(
    r"জাল|গুজব|মিথ্যা|ভুয়া|অপপ্রচার|ফেক|fake\s*news|rumour|rumor|disinfo|"
    r"propaganda|deepfake|fabricat|hoax|misleading|false\s*claim|"
    r"ভ্রান্ত|বিভ্রান্ত|বানোয়াট|অপতথ্য",
    re.IGNORECASE,
)


def classify_propaganda(
    text: str,
    *,
    title: str | None = None,
    model_id: str,
    cache_dir: str,
    use_mock: bool,
) -> dict[str, object]:
    """Propaganda / disinfo classify — BanglaBERT-assisted, never Ollama.

    Uses keyword hits for hard flags + sentiment model score as confidence prior.
    """
    blob = f"{title or ''} {text}".strip()
    kw_hit = bool(_PROPAGANDA_KW.search(blob))

    # Reuse sentiment pipeline as a distress/negativity prior (not generative).
    sent = analyze_text(
        blob[:500] or text[:500],
        district="",
        upazila="",
        model_id=model_id,
        cache_dir=cache_dir,
        use_mock=use_mock,
    )
    grievance_boost = 0.12 if sent.category == "Grievance" else 0.0
    base = float(sent.confidence)

    if kw_hit:
        confidence = min(0.98, max(0.78, base + 0.2 + grievance_boost))
        return {
            "is_propaganda": True,
            "confidence": round(confidence, 3),
            "note": "Propaganda/disinfo lexical + BanglaBERT prior",
            "backend": "bangla_bert" if not use_mock else "mock_rules",
        }

    # Soft flag only when strongly grievance-like with high confidence
    if sent.category == "Grievance" and base >= 0.9 and len(blob) > 80:
        return {
            "is_propaganda": False,
            "confidence": round(min(0.55, base * 0.5), 3),
            "note": "High grievance signal — review manually; no propaganda lexeme",
            "backend": "bangla_bert" if not use_mock else "mock_rules",
        }

    return {
        "is_propaganda": False,
        "confidence": round(max(0.15, 1.0 - base * 0.4), 3),
        "note": "No propaganda indicators",
        "backend": "bangla_bert" if not use_mock else "mock_rules",
    }
