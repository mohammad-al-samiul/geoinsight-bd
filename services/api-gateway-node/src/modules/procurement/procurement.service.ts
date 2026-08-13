import { pipelineService } from "../pipeline/pipeline.service";
import { fetchAi } from "../../shared/http/fetch-ai";

export interface ProcurementAdviseParams {
  commodity: string;
  quantity_mt: number;
  urgency_days?: number;
  lang?: "bn" | "en";
}

/** Fast enough for scraper + rank; LLM is off by default on the AI side. */
const PROCUREMENT_AI_TIMEOUT_MS = 20_000;

function buildAiPayload(params: ProcurementAdviseParams) {
  return {
    commodity: params.commodity,
    quantity_mt: params.quantity_mt,
    urgency_days: params.urgency_days ?? 30,
    lang: params.lang ?? "bn",
  };
}

function sanitizeQuote(q: {
  country_code: string;
  country_name: string;
  commodity: string;
  unit_price_usd: number;
  shipping_cost_usd: number;
  tariff_rate: number;
  reliability_score: number;
}) {
  const unit = Number(q.unit_price_usd);
  const shipping = Number(q.shipping_cost_usd);
  const tariff = Number(q.tariff_rate);
  if (!Number.isFinite(unit) || unit < 0) return null;
  if (!Number.isFinite(shipping) || shipping < 0) return null;
  return {
    ...q,
    unit_price_usd: unit,
    shipping_cost_usd: shipping,
    tariff_rate: Number.isFinite(tariff) && tariff >= 0 && tariff <= 1 ? tariff : 0.05,
    reliability_score: 0.85,
  };
}

export class ProcurementService {
  private async mapLiveQuotes(commodity: string) {
    const rows = await pipelineService.getLatestCommodityQuotes(commodity, 80);
    const byCountry = new Map<string, (typeof rows)[number]>();
    for (const row of rows) {
      if (!byCountry.has(row.countryCode)) byCountry.set(row.countryCode, row);
    }

    return [...byCountry.values()]
      .slice(0, 40)
      .map((q) =>
        sanitizeQuote({
          country_code: q.countryCode,
          country_name: q.countryName,
          commodity,
          unit_price_usd: Number(q.unitPriceUsd),
          shipping_cost_usd: Number(q.shippingCostUsd ?? 0),
          tariff_rate: Number(q.tariffRate ?? 0.05),
          reliability_score: 0.85,
        }),
      )
      .filter((q): q is NonNullable<typeof q> => q != null);
  }

  private async callAi(payload: Record<string, unknown>) {
    return fetchAi(
      `/api/v1/procurement/advise`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
      { timeoutMs: PROCUREMENT_AI_TIMEOUT_MS },
    );
  }

  async advise(params: ProcurementAdviseParams) {
    const marketQuotes = await this.mapLiveQuotes(params.commodity);

    let payload: Record<string, unknown> = {
      ...buildAiPayload(params),
      ...(marketQuotes.length > 0 ? { market_quotes: marketQuotes } : {}),
    };

    let res = await this.callAi(payload);

    // Retry without DB quotes if validation / empty rank failed upstream
    if (!res.ok && marketQuotes.length > 0) {
      payload = buildAiPayload(params);
      res = await this.callAi(payload);
    }

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("[procurement] AI advise failed:", res.status, detail.slice(0, 300));
      throw new Error("Procurement advice unavailable");
    }

    return res.json();
  }
}

export const procurementService = new ProcurementService();
