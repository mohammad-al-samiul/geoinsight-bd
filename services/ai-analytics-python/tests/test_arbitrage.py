from app.modules.arbitrage.schemas import CommodityQuote
from app.modules.arbitrage.service import compute_landed_cost, optimize_arbitrage


def test_optimize_picks_cheapest_landed_cost() -> None:
    quotes = [
        CommodityQuote(
            country_code="IN",
            country_name="India",
            commodity="rice",
            unit_price_usd=400,
            shipping_cost_usd=2000,
            tariff_rate=0.05,
            reliability_score=0.9,
        ),
        CommodityQuote(
            country_code="VN",
            country_name="Vietnam",
            commodity="rice",
            unit_price_usd=380,
            shipping_cost_usd=5000,
            tariff_rate=0.08,
            reliability_score=0.85,
        ),
    ]
    result = optimize_arbitrage(quotes, quantity_mt=100)
    assert result.cheapest.country_code == "IN"
    assert result.cheapest.landed_cost_usd == compute_landed_cost(quotes[0], 100).landed_cost_usd
