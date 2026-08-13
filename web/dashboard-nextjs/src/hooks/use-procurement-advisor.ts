"use client";

import { useCallback, useState } from "react";
import { apiClient } from "@/lib/api-client";

export interface ProcurementOption {
  country_code: string;
  country_name: string;
  landed_cost_usd: number;
  lead_time_days: number;
  port_congestion: string;
  reliability_score: number;
}

export interface ProcurementAdvice {
  commodity: string;
  quantity_mt: number;
  recommendation: string;
  recommendation_bn: string;
  best_option: ProcurementOption;
  alternatives: ProcurementOption[];
  narrative: string;
  narrative_bn: string;
}

export function useProcurementAdvisor() {
  const [advice, setAdvice] = useState<ProcurementAdvice | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const advise = useCallback(
    async (commodity: string, quantityMt: number, lang: "bn" | "en" = "bn") => {
      setLoading(true);
      setError(null);
      try {
        const json = await apiClient<{ success: boolean; data: ProcurementAdvice }>(
          "procurement/advise",
          {
            method: "POST",
            body: JSON.stringify({
              commodity,
              quantity_mt: quantityMt,
              urgency_days: 30,
              lang,
            }),
          },
        );
        setAdvice(json.data);
        return json.data;
      } catch (err) {
        setAdvice(null);
        setError(err instanceof Error ? err.message : "Procurement advice failed");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return { advice, loading, error, advise };
}
