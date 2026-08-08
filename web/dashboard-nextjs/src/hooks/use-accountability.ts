"use client";

import { useCallback, useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { useAdminFilter } from "@/hooks/use-admin-filter";
import { useRealtimeRefresh } from "@/hooks/use-realtime-refresh";

export interface AccountabilityScore {
  representative_id: string;
  name: string;
  accountability_score: number;
  peer_delta_pct: number;
  trend: string;
  explanation: string;
  explanation_bn: string;
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

export function useAccountabilityScores(lang: "bn" | "en" = "bn") {
  const { filter } = useAdminFilter();
  const [scores, setScores] = useState<AccountabilityScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = scopeQuery(filter);
      const sep = qs ? `${qs}&` : "?";
      const json = await apiClient<{
        success: boolean;
        data: { scores: AccountabilityScore[] };
      }>(`intelligence/accountability/score${sep}lang=${lang}`, { method: "POST" });
      setScores(json.data.scores ?? []);
    } catch (err) {
      setScores([]);
      setError(err instanceof Error ? err.message : "Accountability scoring failed");
    } finally {
      setLoading(false);
    }
  }, [filter, lang]);

  useEffect(() => {
    void load();
  }, [load]);
  useRealtimeRefresh(load);

  return { scores, loading, error, reload: load };
}
