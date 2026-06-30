from __future__ import annotations

from datetime import UTC, datetime

from app.modules.accountability.schemas import (
    AccountabilityBatchRequest,
    AccountabilityBatchResponse,
    AccountabilityScore,
    RepAccountabilityInput,
)


class RepresentativeAccountabilityEngine:
    def score_batch(self, req: AccountabilityBatchRequest) -> AccountabilityBatchResponse:
        scores = [self._score_one(r) for r in req.representatives]
        scores.sort(key=lambda s: s.accountability_score, reverse=True)
        return AccountabilityBatchResponse(
            scores=scores,
            scanned_at=datetime.now(UTC).isoformat(),
        )

    def _score_one(self, rep: RepAccountabilityInput) -> AccountabilityScore:
        grievance = next(
            (k.value for k in rep.kpi_snapshots if "grievance" in k.code.lower()),
            rep.peer_avg_grievance_resolution,
        )
        completion = next(
            (k.value for k in rep.kpi_snapshots if "completion" in k.code.lower() or "project" in k.code.lower()),
            rep.peer_avg_completion,
        )

        score = 50.0
        score += min(25, (grievance / max(rep.peer_avg_grievance_resolution, 1)) * 15)
        score += min(20, (completion / max(rep.peer_avg_completion, 1)) * 12)
        score -= rep.open_alerts * 4
        score -= max(0, rep.project_count - 5) * 1.5
        score = max(15, min(98, score))

        peer_delta = round(
            ((grievance - rep.peer_avg_grievance_resolution) / max(rep.peer_avg_grievance_resolution, 1)) * 100,
            1,
        )

        trend = "improving" if peer_delta > 2 else "declining" if peer_delta < -5 else "stable"

        strengths: list[str] = []
        weaknesses: list[str] = []
        if grievance >= rep.peer_avg_grievance_resolution:
            strengths.append("grievance_resolution_above_peer")
        else:
            weaknesses.append("grievance_resolution_below_peer")
        if completion >= rep.peer_avg_completion:
            strengths.append("project_completion_above_peer")
        else:
            weaknesses.append("project_completion_below_peer")
        if rep.open_alerts > 2:
            weaknesses.append("elevated_red_flags")

        explanation_en = (
            f"{rep.name} ({rep.role}, {rep.admin_unit_name}): accountability {score:.0f}/100. "
            f"Grievance resolution {grievance:.0f}% vs peer avg {rep.peer_avg_grievance_resolution:.0f}% "
            f"({peer_delta:+.1f}%)."
        )
        explanation_bn = (
            f"{rep.name} ({rep.role}, {rep.admin_unit_name}): জবাবদিহিতা স্কোর {score:.0f}/১০০। "
            f"অভিযোগ নিষ্পতি {grievance:.0f}% (গড়ের চেয়ে {abs(peer_delta):.1f}% "
            f"{'বেশি' if peer_delta > 0 else 'কম'})।"
        )

        return AccountabilityScore(
            representative_id=rep.representative_id,
            name=rep.name,
            accountability_score=int(round(score)),
            peer_delta_pct=peer_delta,
            trend=trend,
            strengths=strengths,
            weaknesses=weaknesses,
            explanation=explanation_en if rep.lang == "en" else explanation_bn,
            explanation_bn=explanation_bn,
        )
