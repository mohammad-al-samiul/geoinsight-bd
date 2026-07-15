import { pipelineService } from "../pipeline/pipeline.service";
import { fetchAi } from "../../shared/http/fetch-ai";

export interface ProcurementAdviseParams {
  commodity: string;
  quantity_mt: number;
  urgency_days?: number;
  lang?: "bn" | "en";
}

function buildAiPayload(params: ProcurementAdviseParams, withQuotes: boolean) {
  const base = {
    commodity: params.commodity,
    quantity_mt: params.quantity_mt,
    urgency_days: params.urgency_days ?? 30,
    lang: params.lang ?? "bn",
  };

  if (!withQuotes) return base;

  return base;
}

export class ProcurementService {
  private async mapLiveQuotes(commodity: string) {
    const rows = await pipelineService.getLatestCommodityQuotes(commodity, 80);
    const byCountry = new Map<string, (typeof rows)[number]>();
    for (const row of rows) {
      if (!byCountry.has(row.countryCode)) byCountry.set(row.countryCode, row);
    }

    return [...byCountry.values()].slice(0, 40).map((q) => {
      const unitPrice = Number(q.unitPriceUsd);
      const shipping = Number(q.shippingCostUsd ?? 0);
      const tariffRate = Number(q.tariffRate ?? 0.05);
      return {
        country_code: q.countryCode,
        country_name: q.countryName,
        commodity,
        unit_price_usd: unitPrice,
        shipping_cost_usd: shipping,
        tariff_rate: Number.isFinite(tariffRate) ? tariffRate : 0.05,
        reliability_score: 0.85,
      };
    });
  }

  private async callAi(payload: Record<string, unknown>) {
    return fetchAi(`/api/v1/procurement/advise`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  }

  async advise(params: ProcurementAdviseParams) {
    const marketQuotes = await this.mapLiveQuotes(params.commodity);

    let payload: Record<string, unknown> = {
      ...buildAiPayload(params, true),
      ...(marketQuotes.length > 0 && { market_quotes: marketQuotes }),
    };

    let res = await this.callAi(payload);

    if (!res.ok && marketQuotes.length > 0) {
      payload = buildAiPayload(params, false);
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
