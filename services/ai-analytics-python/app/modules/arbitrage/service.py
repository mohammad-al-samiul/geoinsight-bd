"""Global Trade Arbitrage Engine — landed-cost optimization across 195 countries."""

from __future__ import annotations

import asyncio
import hashlib
import random
from dataclasses import dataclass

import httpx

from app.modules.arbitrage.schemas import (
    ArbitrageRequest,
    ArbitrageResult,
    CommodityQuote,
    LandedCostBreakdown,
)

# ISO-like mock country catalog (subset expanded programmatically to 195)
_BASE_COUNTRIES: list[tuple[str, str]] = [
    ("US", "United States"),
    ("IN", "India"),
    ("CN", "China"),
    ("VN", "Vietnam"),
    ("TH", "Thailand"),
    ("AU", "Australia"),
    ("BR", "Brazil"),
    ("AR", "Argentina"),
    ("UA", "Ukraine"),
    ("RU", "Russia"),
    ("ID", "Indonesia"),
    ("MY", "Malaysia"),
    ("PK", "Pakistan"),
    ("TR", "Turkey"),
    ("EG", "Egypt"),
    ("ET", "Ethiopia"),
    ("KE", "Kenya"),
    ("NG", "Nigeria"),
    ("ZA", "South Africa"),
    ("DE", "Germany"),
]

_COMMODITY_BASE_PRICES: dict[str, float] = {
    "rice": 420.0,
    "wheat": 280.0,
    "maize": 210.0,
    "lentil": 680.0,
    "onion": 320.0,
    "potato": 180.0,
    "cotton": 1550.0,
    "jute": 520.0,
}


@dataclass(frozen=True, slots=True)
class _CountrySeed:
    code: str
    name: str


def _expand_countries(target: int) -> list[_CountrySeed]:
    countries = [_CountrySeed(c, n) for c, n in _BASE_COUNTRIES]
    idx = 0
    while len(countries) < target:
        base = _BASE_COUNTRIES[idx % len(_BASE_COUNTRIES)]
        suffix = len(countries)
        countries.append(_CountrySeed(f"{base[0]}{suffix % 10}", f"{base[1]} ({suffix})"))
        idx += 1
    return countries[:target]


def compute_landed_cost(quote: CommodityQuote, quantity_mt: float) -> LandedCostBreakdown:
    goods_cost = quote.unit_price_usd * quantity_mt
    tariff_usd = goods_cost * quote.tariff_rate
    landed = goods_cost + quote.shipping_cost_usd + tariff_usd
    return LandedCostBreakdown(
        country_code=quote.country_code,
        country_name=quote.country_name,
        commodity=quote.commodity,
        unit_price_usd=round(quote.unit_price_usd, 4),
        shipping_cost_usd=round(quote.shipping_cost_usd, 2),
        tariff_usd=round(tariff_usd, 2),
        landed_cost_usd=round(landed, 2),
        reliability_score=round(quote.reliability_score, 3),
    )


def optimize_arbitrage(quotes: list[CommodityQuote], quantity_mt: float) -> ArbitrageResult:
    if not quotes:
        raise ValueError("No commodity quotes to optimize")

    ranked = sorted(
        [compute_landed_cost(q, quantity_mt) for q in quotes],
        key=lambda x: (x.landed_cost_usd, -x.reliability_score),
    )

    commodity = quotes[0].commodity
    return ArbitrageResult(
        commodity=commodity,
        quantity_mt=quantity_mt,
        cheapest=ranked[0],
        alternatives_count=len(ranked) - 1,
        all_ranked=ranked,
    )


class CommodityScraper:
    """Async mock scraper simulating global price feeds."""

    def __init__(self, country_count: int = 195) -> None:
        self._countries = _expand_countries(country_count)

    async def _mock_fetch_country(
        self,
        _client: httpx.AsyncClient,
        country: _CountrySeed,
        commodity: str,
    ) -> CommodityQuote:
        await asyncio.sleep(random.uniform(0.001, 0.012))

        base = _COMMODITY_BASE_PRICES.get(commodity.lower(), 400.0)
        seed = int(hashlib.md5(f"{country.code}:{commodity}".encode()).hexdigest(), 16)
        rng = random.Random(seed)

        unit_price = base * rng.uniform(0.72, 1.35)
        shipping = rng.uniform(800, 12_000)
        tariff = rng.uniform(0.02, 0.22)
        reliability = rng.uniform(0.55, 0.99)

        return CommodityQuote(
            country_code=country.code,
            country_name=country.name,
            commodity=commodity,
            unit_price_usd=round(unit_price, 4),
            shipping_cost_usd=round(shipping, 2),
            tariff_rate=round(tariff, 4),
            reliability_score=round(reliability, 3),
        )

    async def scrape_commodity(self, commodity: str) -> list[CommodityQuote]:
        async with httpx.AsyncClient(timeout=5.0) as client:
            tasks = [
                self._mock_fetch_country(client, country, commodity)
                for country in self._countries
            ]
            return await asyncio.gather(*tasks)

    async def run_arbitrage(self, request: ArbitrageRequest) -> ArbitrageResult:
        quotes = await self.scrape_commodity(request.commodity)
        return optimize_arbitrage(quotes, request.quantity_mt)
