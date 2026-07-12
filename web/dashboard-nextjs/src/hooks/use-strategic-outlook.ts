"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { apiClient } from "@/lib/api-client";

export interface OutlookChallenge {
  domain: "politics" | "economy" | string;
  title: string;
  severity: number;
  summary: string;
  evidence: string[];
}

export interface OutlookDirection {
  domain: string;
  trajectory: string;
  summary: string;
  drivers: string[];
}

export interface OutlookScenario {
  label: string;
  horizon: string;
  probability_band: string;
  politics: string;
  economy: string;
  watchpoints: string[];
}

export interface OutlookSource {
  title: string;
  source: string;
  url: string;
  domain: string;
  published_at: string;
  analyst_like?: boolean;
}

export interface StrategicOutlook {
  challenges: OutlookChallenge[];
  direction: OutlookDirection[];
  scenarios: OutlookScenario[];
  narrative: string;
  disclaimer: string;
  source_count: number;
  llm_used?: boolean;
  sources: OutlookSource[];
  unrest?: Record<string, unknown>;
  refreshed_at?: string;
}

export function useStrategicOutlook() {
  const locale = useLocale();
  const lang = locale === "bn" ? "bn" : "en";
  const [data, setData] = useState<StrategicOutlook | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const json = await apiClient<{ success: boolean; data: StrategicOutlook }>(
        `outlook/strategic?lang=${lang}`,
      );
      setData(json.data);
    } catch (err) {
      setData(null);
      setError(err instanceof Error ? err.message : "Outlook unavailable");
    } finally {
      setLoading(false);
    }
  }, [lang]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await apiClient("outlook/refresh", { method: "POST" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Refresh failed");
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, loading, error, reload: load, refresh, refreshing };
}
