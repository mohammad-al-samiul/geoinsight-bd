import { BD_TRADE_HUB, resolveCountryCoords } from "@/lib/country-coordinates";
import type { ArbitrageCell, TradeFlow } from "@/types/dashboard";

interface CommodityRow {
  commodity_code: string;
  country_code: string;
  country_name: string;
  unit_price_usd: number;
  landed_cost_usd: number;
}

function formatCommodity(code: string): string {
  return code.charAt(0) + code.slice(1).toLowerCase().replace(/_/g, " ");
}

/** Build import/export arcs when API tradeFlows is empty (client fallback). */
export function buildTradeFlowsFromMatrix(matrix: ArbitrageCell[]): TradeFlow[] {
  if (!matrix.length) return buildDemoTradeFlows();

  const byCommodity = new Map<string, ArbitrageCell[]>();
  for (const cell of matrix) {
    const list = byCommodity.get(cell.commodity) ?? [];
    list.push(cell);
    byCommodity.set(cell.commodity, list);
  }

  const flows: TradeFlow[] = [];
  for (const [commodity, cells] of byCommodity) {
    const sorted = [...cells].sort((a, b) => a.marginPct - b.marginPct);
    const cheapest = sorted[0];
    const expensive = sorted[sorted.length - 1];
    if (!cheapest) continue;

    const importCoords = resolveCountryCoords(null, cheapest.market);
    if (importCoords) {
      flows.push({
        id: `import-${commodity}-${cheapest.market}`,
        commodity,
        flowType: "import",
        countryCode: cheapest.market.slice(0, 3).toUpperCase(),
        countryName: cheapest.market,
        countryLat: importCoords[0],
        countryLng: importCoords[1],
        marginPct: Math.max(4, 12 - cheapest.marginPct),
        unitPriceUsd: 0,
        landedCostUsd: 0,
      });
    }

    if (expensive && expensive.market !== cheapest.market) {
      const exportCoords = resolveCountryCoords(null, expensive.market);
      if (exportCoords) {
        flows.push({
          id: `export-${commodity}-${expensive.market}`,
          commodity,
          flowType: "export",
          countryCode: expensive.market.slice(0, 3).toUpperCase(),
          countryName: expensive.market,
          countryLat: exportCoords[0],
          countryLng: exportCoords[1],
          marginPct: expensive.marginPct,
          unitPriceUsd: 0,
          landedCostUsd: 0,
        });
      }
    }
  }
  return flows.length ? flows : buildDemoTradeFlows();
}

export function buildTradeFlowsFromRows(rows: CommodityRow[]): TradeFlow[] {
  const byCommodity = new Map<string, CommodityRow[]>();
  for (const row of rows) {
    const key = row.commodity_code;
    const list = byCommodity.get(key) ?? [];
    list.push(row);
    byCommodity.set(key, list);
  }

  const flows: TradeFlow[] = [];
  for (const [code, entries] of byCommodity) {
    if (entries.length < 2) continue;
    const sorted = [...entries].sort(
      (a, b) => a.landed_cost_usd - b.landed_cost_usd,
    );
    const cheapest = sorted[0];
    const priciest = sorted[sorted.length - 1];
    const commodity = formatCommodity(code);
    const minCost = cheapest.landed_cost_usd;
    const maxCost = priciest.landed_cost_usd;
    const spreadPct =
      minCost > 0 ? Math.round(((maxCost - minCost) / minCost) * 1000) / 10 : 0;

    const importCoords = resolveCountryCoords(
      cheapest.country_code,
      cheapest.country_name,
    );
    if (importCoords && cheapest.country_code !== "BGD") {
      flows.push({
        id: `import-${code}-${cheapest.country_code}`,
        commodity,
        flowType: "import",
        countryCode: cheapest.country_code,
        countryName: cheapest.country_name,
        countryLat: importCoords[0],
        countryLng: importCoords[1],
        marginPct: Math.max(3, spreadPct * 0.4),
        unitPriceUsd: cheapest.unit_price_usd,
        landedCostUsd: cheapest.landed_cost_usd,
      });
    }

    const exportCoords = resolveCountryCoords(
      priciest.country_code,
      priciest.country_name,
    );
    if (
      exportCoords &&
      priciest.country_code !== "BGD" &&
      priciest.country_code !== cheapest.country_code
    ) {
      flows.push({
        id: `export-${code}-${priciest.country_code}`,
        commodity,
        flowType: "export",
        countryCode: priciest.country_code,
        countryName: priciest.country_name,
        countryLat: exportCoords[0],
        countryLng: exportCoords[1],
        marginPct: spreadPct,
        unitPriceUsd: priciest.unit_price_usd,
        landedCostUsd: priciest.landed_cost_usd,
      });
    }
  }

  return flows.length ? flows.slice(0, 24) : buildDemoTradeFlows();
}

export function buildDemoTradeFlows(): TradeFlow[] {
  const demos: Array<Omit<TradeFlow, "id">> = [
    {
      commodity: "Rice",
      flowType: "import",
      countryCode: "MMR",
      countryName: "Myanmar",
      countryLat: 19.7633,
      countryLng: 96.0785,
      marginPct: 8.2,
      unitPriceUsd: 410,
      landedCostUsd: 487,
    },
    {
      commodity: "Rice",
      flowType: "export",
      countryCode: "NPL",
      countryName: "Nepal",
      countryLat: 27.7172,
      countryLng: 85.324,
      marginPct: 11.4,
      unitPriceUsd: 445,
      landedCostUsd: 512,
    },
    {
      commodity: "Wheat",
      flowType: "import",
      countryCode: "IND",
      countryName: "India",
      countryLat: 28.6139,
      countryLng: 77.209,
      marginPct: 6.5,
      unitPriceUsd: 280,
      landedCostUsd: 324,
    },
    {
      commodity: "Wheat",
      flowType: "export",
      countryCode: "QAT",
      countryName: "Qatar",
      countryLat: 25.2854,
      countryLng: 51.531,
      marginPct: 14.2,
      unitPriceUsd: 320,
      landedCostUsd: 398,
    },
    {
      commodity: "Onion",
      flowType: "import",
      countryCode: "TUR",
      countryName: "Turkey",
      countryLat: 39.9334,
      countryLng: 32.8597,
      marginPct: 9.1,
      unitPriceUsd: 340,
      landedCostUsd: 418,
    },
    {
      commodity: "Lentil",
      flowType: "export",
      countryCode: "ARE",
      countryName: "UAE",
      countryLat: 24.4539,
      countryLng: 54.3773,
      marginPct: 12.8,
      unitPriceUsd: 560,
      landedCostUsd: 648,
    },
  ];
  return demos.map((d, i) => ({ ...d, id: `demo-${i}` }));
}

export { BD_TRADE_HUB };
