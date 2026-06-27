"""Predictive Geopolitical Shock Scoring for Bangladesh macro sectors."""

from __future__ import annotations

from datetime import UTC, datetime

from app.modules.risk.schemas import (
    ConflictInput,
    GeopoliticalRiskResponse,
    SectorImpact,
)

# Sector-specific sensitivity weights (sum ≈ 1 per sector)
_REMITTANCE_WEIGHTS = {
    "conflict_intensity": 0.30,
    "sanctions_level": 0.15,
    "trade_disruption": 0.10,
    "migration_pressure": 0.35,
    "oil_price_shock": 0.10,
}

_RMG_WEIGHTS = {
    "conflict_intensity": 0.15,
    "sanctions_level": 0.25,
    "trade_disruption": 0.35,
    "migration_pressure": 0.05,
    "oil_price_shock": 0.20,
}


def _weighted_score(inputs: ConflictInput, weights: dict[str, float]) -> float:
    values = {
        "conflict_intensity": inputs.conflict_intensity,
        "sanctions_level": inputs.sanctions_level,
        "trade_disruption": inputs.trade_disruption,
        "migration_pressure": inputs.migration_pressure,
        "oil_price_shock": inputs.oil_price_shock,
    }
    return sum(values[k] * w for k, w in weights.items())


def _risk_band(score: float) -> str:
    if score < 25:
        return "Low"
    if score < 50:
        return "Moderate"
    if score < 75:
        return "High"
    return "Critical"


def _direction(score: float) -> str:
    if score < 30:
        return "stable"
    if score < 60:
        return "adverse"
    return "severe_adverse"


class GeopoliticalRiskEngine:
    def score(self, inputs: ConflictInput) -> GeopoliticalRiskResponse:
        factors = {
            "conflict_intensity": inputs.conflict_intensity,
            "sanctions_level": inputs.sanctions_level,
            "trade_disruption": inputs.trade_disruption,
            "migration_pressure": inputs.migration_pressure,
            "oil_price_shock": inputs.oil_price_shock,
        }

        remittance_raw = _weighted_score(inputs, _REMITTANCE_WEIGHTS)
        rmg_raw = _weighted_score(inputs, _RMG_WEIGHTS)

        # Overall = max sector exposure with regional amplification
        regional_amp = 1.05 if inputs.region.lower() in {"middle east", "europe", "east asia"} else 1.0
        overall = min(100.0, max(remittance_raw, rmg_raw) * 100 * regional_amp)

        remittance_score = min(100.0, remittance_raw * 100 * regional_amp)
        rmg_score = min(100.0, rmg_raw * 100 * regional_amp)

        return GeopoliticalRiskResponse(
            overall_risk_score=round(overall, 2),
            risk_band=_risk_band(overall),
            remittance_impact=SectorImpact(
                sector="Remittance",
                impact_score=round(remittance_score, 2),
                direction=_direction(remittance_score),
                narrative=(
                    f"Gulf & diaspora corridor exposure via {inputs.region}; "
                    f"migration pressure amplifies inflow volatility."
                ),
            ),
            rmg_impact=SectorImpact(
                sector="RMG",
                impact_score=round(rmg_score, 2),
                direction=_direction(rmg_score),
                narrative=(
                    "Export orders sensitive to trade disruption and input-cost shocks "
                    "(cotton, energy, shipping)."
                ),
            ),
            contributing_factors={k: round(v, 3) for k, v in factors.items()},
            computed_at=datetime.now(UTC).isoformat(),
        )
