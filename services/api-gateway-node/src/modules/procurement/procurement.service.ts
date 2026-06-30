import { env } from "../../core/config/env";

export interface ProcurementAdviseParams {
  commodity: string;
  quantity_mt: number;
  urgency_days?: number;
  lang?: "bn" | "en";
}

export class ProcurementService {
  async advise(params: ProcurementAdviseParams) {
    const res = await fetch(`${env.AI_SERVICE_URL}/api/v1/procurement/advise`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        commodity: params.commodity,
        quantity_mt: params.quantity_mt,
        urgency_days: params.urgency_days ?? 30,
        lang: params.lang ?? "bn",
      }),
    });
    if (!res.ok) throw new Error("Procurement advice unavailable");
    return res.json();
  }
}

export const procurementService = new ProcurementService();
