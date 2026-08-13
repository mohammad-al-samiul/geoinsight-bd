"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { apiClient } from "@/lib/api-client";
import { useRealtimeRefresh } from "@/hooks/use-realtime-refresh";

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
  const hasDataRef = useRef(false);

  const load = useCallback(async () => {
    // Blocking loader only before the first payload; refreshes swap in place.
    if (!hasDataRef.current) setLoading(true);
    setError(null);
    try {
      const json = await apiClient<{ success: boolean; data: StrategicOutlook }>(
        `outlook/strategic?lang=${lang}`,
      );
      setData(json.data);
      hasDataRef.current = true;
    } catch (err) {
      // If backend is not available in local dev, provide a mock preview so UI can be inspected.
      if (process.env.NODE_ENV === "development") {
        const mock: StrategicOutlook = {
          challenges: [
            { domain: "politics", title: "Election tensions", severity: 4, summary: "Heightened rhetoric around upcoming elections.", evidence: ["Local paper: report 1", "Local paper: report 2"] },
            { domain: "economy", title: "Fuel price shock", severity: 3, summary: "Import cost increases affecting transport.", evidence: ["Financial section: analysis"] },
          ],
          direction: [
            { domain: "politics", trajectory: "deteriorating", summary: "Polarisation increasing.", drivers: ["polarised media", "opposition protests"] },
            { domain: "economy", trajectory: "improving", summary: "Remittances stabilising currency.", drivers: ["remittances", "crop yields"] },
          ],
          scenarios: [
            { label: "Adverse: Political unrest", horizon: "3 months", probability_band: "adverse", politics: "High", economy: "Moderate", watchpoints: ["Strike action", "Roadblocks"] },
            { label: "Reform: Fiscal consolidation", horizon: "12 months", probability_band: "reform", politics: "Moderate", economy: "High", watchpoints: ["Budget law", "IMF talks"] },
          ],
          narrative: "Mock narrative: This preview shows the Strategic Outlook components when backend is unavailable.",
          disclaimer: "This is mock data for local development only.",
          source_count: 6,
          llm_used: false,
          sources: [
            { title: "Election update from The Daily Star", source: "The Daily Star", url: "https://thedailystar.net/news/election-update", domain: "news", published_at: new Date().toISOString(), analyst_like: false },
            { title: "Fuel price analysis - Prothom Alo", source: "Prothom Alo", url: "https://www.prothomalo.com/economy/fuel-price", domain: "news", published_at: new Date().toISOString(), analyst_like: false },
          ],
        };
        setData(mock);
      } else {
        setData(null);
        setError(err instanceof Error ? err.message : "Outlook unavailable");
      }
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

  useRealtimeRefresh(load, true, true);

  return { data, loading, error, reload: load, refresh, refreshing };
}
