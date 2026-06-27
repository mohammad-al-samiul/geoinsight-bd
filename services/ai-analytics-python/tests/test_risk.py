from app.modules.risk.schemas import ConflictInput
from app.modules.risk.service import GeopoliticalRiskEngine


def test_risk_score_within_bounds() -> None:
    engine = GeopoliticalRiskEngine()
    result = engine.score(
        ConflictInput(
            conflict_intensity=0.8,
            sanctions_level=0.6,
            trade_disruption=0.7,
            migration_pressure=0.5,
            oil_price_shock=0.4,
        ),
    )
    assert 0 <= result.overall_risk_score <= 100
    assert result.remittance_impact.sector == "Remittance"
    assert result.rmg_impact.sector == "RMG"
    assert result.risk_band in {"Low", "Moderate", "High", "Critical"}
