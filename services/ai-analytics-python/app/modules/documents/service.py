from __future__ import annotations

import re

from app.core.config import Settings
from app.ml.ollama_client import OllamaClient
from app.modules.documents.schemas import (
    DocumentAnalyzeRequest,
    DocumentAnalyzeResponse,
    DocumentAnomaly,
    ExtractedClause,
)

_PAYMENT_PATTERNS = [
    (r"advance\s+payment\s+(\d+)%", "advance_payment"),
    (r"(\d+)%\s+advance", "advance_payment"),
    (r"অগ্রিম\s+পরিশোধ\s+(\d+)%", "advance_payment"),
    (r"penalty\s+clause", "penalty"),
    (r"জরিমানা", "penalty"),
    (r"performance\s+bond", "performance_bond"),
    (r"performance\s+security", "performance_bond"),
]

_UNUSUAL_THRESHOLDS = {
    "advance_payment": 30,
}


class DocumentIntelligenceEngine:
    def __init__(self, settings: Settings | None = None) -> None:
        self._ollama = OllamaClient(settings) if settings else None

    def analyze(self, req: DocumentAnalyzeRequest) -> DocumentAnalyzeResponse:
        text_lower = req.text.lower()
        clauses: list[ExtractedClause] = []
        anomalies: list[DocumentAnomaly] = []

        for pattern, clause_type in _PAYMENT_PATTERNS:
            for match in re.finditer(pattern, text_lower, re.IGNORECASE):
                snippet = req.text[max(0, match.start() - 20) : match.end() + 40].strip()
                risk = "low"
                if clause_type == "advance_payment":
                    pct_match = re.search(r"(\d+)", match.group(0))
                    if pct_match:
                        pct = int(pct_match.group(1))
                        if pct > _UNUSUAL_THRESHOLDS["advance_payment"]:
                            risk = "high"
                            anomalies.append(
                                DocumentAnomaly(
                                    anomaly_type="unusual_advance_payment",
                                    description=f"Advance payment {pct}% exceeds typical 20–25% threshold.",
                                    description_bn=f"অগ্রিম পরিশোধ {pct}% — সাধারণ সীমা ২০–২৫% এর বেশি।",
                                    severity=4 if pct > 40 else 3,
                                ),
                            )
                clauses.append(
                    ExtractedClause(clause_type=clause_type, text=snippet[:200], risk_level=risk),
                )

        if "single source" in text_lower or "একক উৎস" in req.text:
            anomalies.append(
                DocumentAnomaly(
                    anomaly_type="single_source_procurement",
                    description="Single-source procurement language detected.",
                    description_bn="একক উৎস ক্রয়ের ভাষা শনাক্ত — প্রতিযোগিতা সীমিত।",
                    severity=3,
                ),
            )

        if re.search(r"payment.*within\s+(\d+)\s+days", text_lower):
            days_match = re.search(r"within\s+(\d+)\s+days", text_lower)
            if days_match and int(days_match.group(1)) < 7:
                anomalies.append(
                    DocumentAnomaly(
                        anomaly_type="accelerated_payment",
                        description=f"Payment within {days_match.group(1)} days — unusually fast.",
                        description_bn=f"পরিশোধ {days_match.group(1)} দিনের মধ্যে — অস্বাভাবিক দ্রুত।",
                        severity=4,
                    ),
                )

        pattern_match = bool(
            req.contractor_nid
            and (
                "repeat contractor" in text_lower
                or "পুনরাবৃত্ত" in req.text
                or len(anomalies) >= 2
            ),
        )
        if pattern_match:
            anomalies.append(
                DocumentAnomaly(
                    anomaly_type="contractor_pattern",
                    description="Pattern matches prior flagged contracts for this contractor NID.",
                    description_bn="এই ঠিকাদারের আগের ৩ চুক্তিতে একই প্যাটার্ন শনাক্ত।",
                    severity=5,
                ),
            )

        summary_en = (
            f"Extracted {len(clauses)} clauses, {len(anomalies)} anomalies "
            f"from {req.doc_type} document."
        )
        summary_bn = (
            f"{req.doc_type} নথি থেকে {len(clauses)}টি ধারা, {len(anomalies)}টি অনিয়ম শনাক্ত।"
        )

        return DocumentAnalyzeResponse(
            doc_type=req.doc_type,
            clauses=clauses[:12],
            anomalies=anomalies,
            contractor_pattern_match=pattern_match,
            summary=summary_en if req.lang == "en" else summary_bn,
            summary_bn=summary_bn,
        )

    async def analyze_async(self, req: DocumentAnalyzeRequest) -> DocumentAnalyzeResponse:
        base = self.analyze(req)
        if not self._ollama or not self._ollama.enabled:
            return base

        anomaly_lines = "\n".join(
            f"- {a.anomaly_type}: {a.description}" for a in base.anomalies[:6]
        ) or "No anomalies detected."
        lang = "Bengali" if req.lang == "bn" else "English"
        polished = await self._ollama.complete(
            system=(
                f"You are a Bangladesh government procurement auditor. "
                f"Summarize document analysis in {lang} in 2-3 sentences. Be factual."
            ),
            user=(
                f"Document type: {req.doc_type}\n"
                f"Clauses found: {len(base.clauses)}\n"
                f"Anomalies:\n{anomaly_lines}"
            ),
            temperature=0.25,
        )
        if polished:
            if req.lang == "bn":
                base.summary_bn = polished
                base.summary = polished
            else:
                base.summary = polished
        return base
