from __future__ import annotations

from datetime import UTC, datetime

from app.modules.predictive.schemas import (
    PredictiveScore,
    PredictiveScoreRequest,
    PredictiveScoreResponse,
    ProjectScoreInput,
)


class PredictiveRedFlagEngine:
    """Rule + trend scorer — 7–14 day forward risk (sovereign, no external LLM)."""

    def score_batch(self, req: PredictiveScoreRequest) -> PredictiveScoreResponse:
        scores: list[PredictiveScore] = []
        for project in req.projects:
            result = self._score_one(project)
            if result and result.confidence >= 55:
                scores.append(result)

        scores.sort(key=lambda s: s.confidence, reverse=True)
        return PredictiveScoreResponse(
            scores=scores,
            scanned_at=datetime.now(UTC).isoformat(),
        )

    def _score_one(self, p: ProjectScoreInput) -> PredictiveScore | None:
        factors: list[str] = []
        score = 0.0

        allocated = max(p.budget_allocated, 1.0)
        spend_ratio = p.budget_spent / allocated

        if spend_ratio > 0.85 and p.status == "ONGOING":
            score += 28
            factors.append("budget_burn_rate_high")
        if spend_ratio > 1.05:
            score += 22
            factors.append("budget_overrun_trajectory")

        if p.status == "STALLED":
            score += 25
            factors.append("project_stalled")

        if p.open_alerts >= 2:
            score += 15
            factors.append("existing_alert_cluster")

        if p.contractor_prior_flags >= 1:
            score += 18
            factors.append("contractor_history_pattern")

        if p.days_since_start > 365 and p.status == "ONGOING" and spend_ratio < 0.4:
            score += 12
            factors.append("delay_risk")

        if score < 55:
            return None

        confidence = min(98, int(score))
        flag_type = (
            "CORRUPTION_RISK"
            if "contractor_history_pattern" in factors or spend_ratio > 1.05
            else "DELAY"
            if "delay_risk" in factors or p.status == "STALLED"
            else "BUDGET_OVERRUN"
        )
        horizon = 14 if confidence >= 75 else 7

        return PredictiveScore(
            project_id=p.project_id,
            title=p.title,
            flag_type=flag_type,
            confidence=confidence,
            horizon_days=horizon,
            risk_factors=factors,
            explanation_bn=(
                f"AI Confidence {confidence}% — {p.title}: "
                f"বাজেট ট্রেন্ড ও ঠিকাদার ইতিহাস বিশ্লেষণে {horizon} দিনের মধ্যে "
                f"{'দুর্নীতি/অনিয়ম' if flag_type == 'CORRUPTION_RISK' else 'বিলম্ব/ওভাররান'} ঝুঁকি।"
            ),
            explanation_en=(
                f"AI Confidence {confidence}% — {p.title}: "
                f"Budget trend + contractor history suggest "
                f"{'corruption/fraud' if flag_type == 'CORRUPTION_RISK' else 'delay/overrun'} "
                f"risk within {horizon} days."
            ),
        )
