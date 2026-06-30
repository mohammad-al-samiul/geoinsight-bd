from __future__ import annotations

from datetime import UTC, datetime

from app.modules.risk.service import GeopoliticalRiskEngine, _direction, _risk_band
from app.modules.simulator.schemas import MinistryImpact, ScenarioInput, ScenarioResult


class CrossMinistrySimulator:
    def run(self, inputs: ScenarioInput) -> ScenarioResult:
        base = GeopoliticalRiskEngine().score(inputs)

        ag_score = min(
            100,
            (inputs.agriculture_shock * 0.6 + inputs.trade_disruption * 0.25 + inputs.oil_price_shock * 0.15)
            * 100,
        )
        energy_score = min(
            100,
            (inputs.energy_shock * 0.5 + inputs.oil_price_shock * 0.35 + inputs.sanctions_level * 0.15) * 100,
        )
        food_score = min(100, ag_score * 0.7 + inputs.trade_disruption * 30)
        finance_score = min(
            100,
            max(base.remittance_impact.impact_score, base.rmg_impact.impact_score) * 0.85
            + abs(inputs.budget_reallocation_pct) * 1.2,
        )

        ministries = [
            MinistryImpact(
                ministry="Ministry of Expatriates' Welfare",
                ministry_bn="প্রবাসী কল্যাণ মন্ত্রণালয়",
                impact_score=round(base.remittance_impact.impact_score, 1),
                direction=base.remittance_impact.direction,
                narrative=base.remittance_impact.narrative,
                narrative_bn=(
                    f"{inputs.region} অঞ্চলে সংঘাত বৃদ্ধি প্রবাসী আয় ও রেমিট্যান্স প্রবাহকে প্রভাবিত করবে।"
                ),
            ),
            MinistryImpact(
                ministry="Ministry of Commerce (RMG)",
                ministry_bn="বাণিজ্য মন্ত্রণালয় (রপ্তানি)",
                impact_score=round(base.rmg_impact.impact_score, 1),
                direction=base.rmg_impact.direction,
                narrative=base.rmg_impact.narrative,
                narrative_bn="রপ্তানি অর্ডার ও শিপিং ব্যয় বৃদ্ধির ঝুঁকি — RMG সেক্টরে চাপ।",
            ),
            MinistryImpact(
                ministry="Ministry of Agriculture",
                ministry_bn="কৃষি মন্ত্রণালয়",
                impact_score=round(food_score, 1),
                direction=_direction(food_score),
                narrative="Food import costs and domestic supply chain stress under trade disruption.",
                narrative_bn="খাদ্য আমদানি ব্যয় ও সরবরাহ শৃঙ্খলে চাপ — খাদ্য নিরাপত্তা ঝুঁকি।",
            ),
            MinistryImpact(
                ministry="Ministry of Power, Energy & Mineral Resources",
                ministry_bn="বিদ্যুৎ, জ্বালানি ও খনিজ সম্পদ মন্ত্রণালয়",
                impact_score=round(energy_score, 1),
                direction=_direction(energy_score),
                narrative="Fuel and electricity input costs rise with oil shock and sanctions.",
                narrative_bn="জ্বালানি মূল্য ও বিদ্যুৎ উৎপাদন ব্যয় বৃদ্ধির সম্ভাবনা।",
            ),
            MinistryImpact(
                ministry="Ministry of Finance",
                ministry_bn="অর্থ মন্ত্রণালয়",
                impact_score=round(finance_score, 1),
                direction=_direction(finance_score),
                narrative=f"Budget reallocation of {inputs.budget_reallocation_pct:+.0f}% shifts fiscal pressure across ministries.",
                narrative_bn=f"বাজেট পুনঃবিন্যাস {inputs.budget_reallocation_pct:+.0f}% — মন্ত্রণালয়ভিত্তিক ব্যয় চাপ পরিবর্তন।",
            ),
        ]

        overall = min(
            100,
            max(m.impact_score for m in ministries) + inputs.conflict_intensity * 5,
        )

        scenario_en = f"If {inputs.region} conflict intensifies (conflict={inputs.conflict_intensity:.0%})"
        scenario_bn = f"যদি {inputs.region} সংঘাত বৃদ্ধি পায় (তীব্রতা {inputs.conflict_intensity:.0%})"

        narrative_en = (
            f"{scenario_en}, national risk reaches {overall:.0f}/100 ({_risk_band(overall)}). "
            f"Remittance {base.remittance_impact.impact_score:.0f}, RMG {base.rmg_impact.impact_score:.0f}, "
            f"Agriculture {food_score:.0f}, Energy {energy_score:.0f}."
        )
        narrative_bn = (
            f"{scenario_bn}, জাতীয় ঝুঁকি স্কোর {overall:.0f}/১০০ ({_risk_band(overall)}). "
            f"রেমিট্যান্স {base.remittance_impact.impact_score:.0f}, RMG {base.rmg_impact.impact_score:.0f}, "
            f"কৃষি {food_score:.0f}, জ্বালানি {energy_score:.0f}।"
        )

        return ScenarioResult(
            scenario_label=scenario_en,
            scenario_label_bn=scenario_bn,
            overall_risk_score=round(overall, 2),
            risk_band=_risk_band(overall),
            remittance_impact=base.remittance_impact,
            rmg_impact=base.rmg_impact,
            ministry_impacts=ministries,
            narrative=narrative_en if inputs.lang == "en" else narrative_bn,
            narrative_bn=narrative_bn,
            contributing_factors=base.contributing_factors,
            computed_at=datetime.now(UTC).isoformat(),
        )
