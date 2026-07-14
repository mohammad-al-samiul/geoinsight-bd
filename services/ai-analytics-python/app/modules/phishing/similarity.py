"""Similarity indexing: TF-IDF cosine (sklearn or pure-Python) + Levenshtein."""

from __future__ import annotations

from collections import Counter
from dataclasses import dataclass
from math import sqrt

from app.modules.phishing.schemas import DigitalSignature
from app.modules.phishing.signature import signature_corpus_text

try:
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity as sk_cosine_similarity

    _HAS_SKLEARN = True
except ImportError:  # pragma: no cover — Docker image installs scikit-learn
    _HAS_SKLEARN = False


@dataclass(frozen=True)
class SimilarityBreakdown:
    blended: float
    cosine: float
    levenshtein: float
    best_index: int


def _levenshtein_distance(a: str, b: str) -> int:
    """Classic DP Levenshtein (no external C lib — portable in Docker CPU image)."""
    if a == b:
        return 0
    if not a:
        return len(b)
    if not b:
        return len(a)
    a = a[:2500]
    b = b[:2500]
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, start=1):
        curr = [i]
        for j, cb in enumerate(b, start=1):
            ins = curr[j - 1] + 1
            delete = prev[j] + 1
            sub = prev[j - 1] + (0 if ca == cb else 1)
            curr.append(min(ins, delete, sub))
        prev = curr
    return prev[-1]


def levenshtein_similarity(a: str, b: str) -> float:
    """Map edit distance → [0, 1] similarity."""
    if not a and not b:
        return 1.0
    dist = _levenshtein_distance(a, b)
    denom = max(len(a), len(b), 1)
    return max(0.0, 1.0 - (dist / denom))


def _char_ngrams(text: str, n: int = 3) -> Counter[str]:
    text = f" {text.lower()} "
    return Counter(text[i : i + n] for i in range(max(0, len(text) - n + 1)))


def _cosine_counters(a: Counter[str], b: Counter[str]) -> float:
    if not a or not b:
        return 0.0
    dot = sum(a[k] * b[k] for k in a if k in b)
    na = sqrt(sum(v * v for v in a.values()))
    nb = sqrt(sum(v * v for v in b.values()))
    if na == 0 or nb == 0:
        return 0.0
    return float(dot / (na * nb))


def _cosine_matrix_sklearn(docs: list[str]) -> list[float]:
    vectorizer = TfidfVectorizer(
        analyzer="char_wb",
        ngram_range=(3, 5),
        min_df=1,
        lowercase=True,
    )
    matrix = vectorizer.fit_transform(docs)
    row = sk_cosine_similarity(matrix[-1], matrix[:-1]).flatten()
    return [float(x) for x in row]


def _cosine_matrix_pure(docs: list[str]) -> list[float]:
    """Lightweight TF-style cosine when scikit-learn is unavailable."""
    candidate = _char_ngrams(docs[-1])
    # Simple IDF: rarer n-grams across gallery weigh more
    df: Counter[str] = Counter()
    grams = [_char_ngrams(d) for d in docs[:-1]]
    for g in grams:
        df.update(g.keys())
    n_docs = max(len(grams), 1)

    def tfidf(c: Counter[str]) -> Counter[str]:
        out: Counter[str] = Counter()
        for k, v in c.items():
            idf = 1.0 + (n_docs / (1 + df.get(k, 0)))
            out[k] = v * idf
        return out

    cand_v = tfidf(candidate)
    return [_cosine_counters(cand_v, tfidf(g)) for g in grams]


def compare_signatures(
    candidate: DigitalSignature,
    gallery: list[DigitalSignature],
    *,
    cosine_weight: float = 0.55,
    levenshtein_weight: float = 0.45,
) -> SimilarityBreakdown:
    """Return best match of *candidate* against official *gallery* signatures.

    Blended score = w_c * cosine(TF-IDF) + w_l * Levenshtein(structure+meta).
    """
    if not gallery:
        return SimilarityBreakdown(blended=0.0, cosine=0.0, levenshtein=0.0, best_index=-1)

    docs = [signature_corpus_text(s) for s in gallery] + [signature_corpus_text(candidate)]
    cosine_row = _cosine_matrix_sklearn(docs) if _HAS_SKLEARN else _cosine_matrix_pure(docs)

    struct_meta_c = f"{candidate.structure_fingerprint}|{candidate.meta_fingerprint}"
    best_i = 0
    best_blend = -1.0
    best_cos = 0.0
    best_lev = 0.0

    for i, official in enumerate(gallery):
        cos = float(cosine_row[i])
        struct_meta_o = f"{official.structure_fingerprint}|{official.meta_fingerprint}"
        lev = levenshtein_similarity(struct_meta_c, struct_meta_o)
        vis = levenshtein_similarity(
            candidate.visual_fingerprint,
            official.visual_fingerprint,
        )
        lev_combined = 0.7 * lev + 0.3 * vis
        blend = cosine_weight * cos + levenshtein_weight * lev_combined
        if blend > best_blend:
            best_blend = blend
            best_i = i
            best_cos = cos
            best_lev = lev_combined

    return SimilarityBreakdown(
        blended=round(min(1.0, max(0.0, best_blend)), 4),
        cosine=round(float(best_cos), 4),
        levenshtein=round(float(best_lev), 4),
        best_index=best_i,
    )
