from __future__ import annotations

from app.modules.twin.schemas import (
    DivisionProjection,
    TwinSimulateRequest,
    TwinSimulateResponse,
)


class NationalKpiTwinEngine:
    def simulate(self, req: TwinSimulateRequest) -> TwinSimulateResponse:
        if not req.divisions:
            raise ValueError("No divisions provided")

        total_budget = sum(d.budget_allocated for d in req.divisions) or 1.0
        national_before = sum(d.completion_rate * d.budget_allocated for d in req.divisions) / total_budget

        shift_amount = 0.0
        target = None
        for d in req.divisions:
            if d.unit_id == req.target_division_id:
                target = d
                shift_amount = d.budget_allocated * (req.budget_shift_pct / 100)
                break
        if not target:
            raise ValueError("Target division not found")

        projections: list[DivisionProjection] = []
        national_after_weighted = 0.0
        new_total = total_budget

        for d in req.divisions:
            budget = d.budget_allocated
            completion = d.completion_rate

            if d.unit_id == req.target_division_id:
                budget += shift_amount
                # Marginal completion gain from extra budget (diminishing returns)
                completion = min(100, completion + req.budget_shift_pct * 0.35)
            elif shift_amount > 0:
                # Proportional reduction from other divisions
                share = d.budget_allocated / (total_budget - target.budget_allocated or 1)
                budget = max(0, budget - shift_amount * share)
                completion = max(20, completion - share * abs(req.budget_shift_pct) * 0.15)

            delta = completion - d.completion_rate
            projections.append(
                DivisionProjection(
                    unit_id=d.unit_id,
                    name=d.name,
                    name_bn=d.name_bn,
                    before_completion=round(d.completion_rate, 1),
                    after_completion=round(completion, 1),
                    delta_pct=round(delta, 1),
                ),
            )
            national_after_weighted += completion * budget

        national_after = national_after_weighted / (new_total or 1)
        target_name = target.name_bn or target.name

        narrative_bn = (
            f"যদি {target_name}-তে বাজেট {req.budget_shift_pct:+.0f}% বাড়ান, "
            f"ঐ বিভাগের completion {target.completion_rate:.1f}% → "
            f"{min(100, target.completion_rate + req.budget_shift_pct * 0.35):.1f}% হতে পারে। "
            f"জাতীয় সমাপ্তির হার {national_before:.1f}% → {national_after:.1f}%।"
        )
        narrative_en = (
            f"If budget to {target.name} shifts {req.budget_shift_pct:+.0f}%, "
            f"division completion may move {target.completion_rate:.1f}% → "
            f"{min(100, target.completion_rate + req.budget_shift_pct * 0.35):.1f}%. "
            f"National completion {national_before:.1f}% → {national_after:.1f}%."
        )

        return TwinSimulateResponse(
            target_division_id=req.target_division_id,
            budget_shift_pct=req.budget_shift_pct,
            national_completion_before=round(national_before, 1),
            national_completion_after=round(national_after, 1),
            projections=projections,
            narrative=narrative_en if req.lang == "en" else narrative_bn,
            narrative_bn=narrative_bn,
        )
