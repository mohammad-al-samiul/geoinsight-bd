"use client";

import { useCallback, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { useAdminFilter } from "@/hooks/use-admin-filter";

export interface PredictiveScore {
  project_id: string;
  title: string;
  flag_type: string;
  confidence: number;
  horizon_days: number;
  risk_factors: string[];
  explanation_bn: string;
  explanation_en: string;
}

export interface PredictiveScanResult {
  scanned_at: string;
  scores: PredictiveScore[];
  alerts_created: number;
  created: Array<{ alertId: string; projectId: string; confidence: number }>;
}

function scopeQuery(filter: ReturnType<typeof useAdminFilter>["filter"]): string {
  const params = new URLSearchParams();
  if (filter.divisionId) params.set("divisionId", filter.divisionId);
  if (filter.districtId) params.set("districtId", filter.districtId);
  if (filter.upazilaId) params.set("upazilaId", filter.upazilaId);
  if (filter.unionId) params.set("unionId", filter.unionId);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function usePredictiveScan(lang: "bn" | "en" = "bn") {
  const { filter } = useAdminFilter();
  const [result, setResult] = useState<PredictiveScanResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scan = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = scopeQuery(filter);
      const sep = qs ? `${qs}&` : "?";
      const json = await apiClient<{ success: boolean; data: PredictiveScanResult }>(
        `intelligence/predictive/scan${sep}lang=${lang}`,
        { method: "POST" },
      );
      setResult(json.data);
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : "Predictive scan failed");
    } finally {
      setLoading(false);
    }
  }, [filter, lang]);

  return { result, loading, error, scan };
}
