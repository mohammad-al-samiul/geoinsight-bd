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

export interface GaugeItem {
  id: string;
  label: string;
  value: number;
  tone: string;
}

export interface PressureItem {
  id: string;
  title: string;
  intensity: number;
  status: string;
  summary: string;
  evidence: string[];
}

export interface RiskItem {
  id: string;
  title: string;
  likelihood: string;
  horizon: string;
  summary: string;
  early_signals: string[];
}

export interface SolutionItem {
  id: string;
  title: string;
  targets: string[];
  steps: string[];
  expected_effect: string;
  timeframe: string;
}

export interface PreventionItem {
  id: string;
  title: string;
  actions: string[];
  owner_hint: string;
}

export interface PriceOutlookItem {
  item: string;
  direction: string;
  magnitude: string;
  reason: string;
  confidence: string;
}

export interface InvestmentItem {
  sector: string;
  outlook: string;
  rationale: string;
  risk: string;
  horizon: string;
}

export interface GdpLever {
  sector: string;
  action: string;
  gdp_impact: string;
  feasibility: string;
  score: number;
}

export interface PoliticsDeep {
  narrative: string;
  gauges: GaugeItem[];
  current_pressures: PressureItem[];
  upcoming_issues: RiskItem[];
  solutions: SolutionItem[];
  prevention: PreventionItem[];
}

export interface EconomyDeep {
  narrative: string;
  gauges: GaugeItem[];
  current_pressures: PressureItem[];
  upcoming_issues: RiskItem[];
  price_outlook: PriceOutlookItem[];
  gdp_levers: GdpLever[];
  investments: InvestmentItem[];
  solutions: SolutionItem[];
  prevention: PreventionItem[];
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
  politics_deep?: PoliticsDeep;
  economy_deep?: EconomyDeep;
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
