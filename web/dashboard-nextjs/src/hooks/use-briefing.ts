"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { useAdminFilter } from "@/hooks/use-admin-filter";
import { useRealtimeRefresh } from "@/hooks/use-realtime-refresh";

export interface BriefingBullet {
  text: string;
  category: string;
  priority: number;
}

export interface MorningBriefing {
  lang: string;
  scope_label: string;
  generated_at: string;
  bullets: BriefingBullet[];
  narrative: string;
  voice_text: string;
  metrics_snapshot?: {
    completionRate: number;
    openAlerts: number;
    projects: number;
  };
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

export function useMorningBriefing(lang: "bn" | "en") {
  const { filter } = useAdminFilter();
  const [briefing, setBriefing] = useState<MorningBriefing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasDataRef = useRef(false);

  const load = useCallback(async () => {
    // Blocking loader only before the first payload; refreshes swap in place.
    if (!hasDataRef.current) setLoading(true);
    setError(null);
    try {
      const qs = scopeQuery(filter);
      const sep = qs ? `${qs}&` : "?";
      const json = await apiClient<{ success: boolean; data: MorningBriefing }>(
        `briefing/morning${sep}lang=${lang}`,
      );
      setBriefing(json.data);
      hasDataRef.current = true;
    } catch (err) {
      setBriefing(null);
      hasDataRef.current = false;
      setError(err instanceof Error ? err.message : "Briefing unavailable");
    } finally {
      setLoading(false);
    }
  }, [filter, lang]);

  useEffect(() => {
    void load();
  }, [load]);
  useRealtimeRefresh(load, true, true);

  return { briefing, loading, error, reload: load };
}
