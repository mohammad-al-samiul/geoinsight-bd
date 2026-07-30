"use client";

import { useCallback, useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { useAdminFilter } from "@/hooks/use-admin-filter";

export type UnrestCategory =
  | "protest"
  | "govt_discontent"
  | "law_reaction"
  | "social_viral"
  | "general_grievance";

export interface UnrestSignal {
  id: string;
  title: string;
  category: UnrestCategory;
  category_bn: string;
  severity: number;
  district: string | null;
  division: string | null;
  source_name: string;
  url: string;
  published_at: string | null;
  sentiment: string | null;
  impact?: {
    deaths: number;
    civilian_deaths: number;
    injuries: number;
    homes_damaged: number;
    livestock_lost: number;
    damage_mentions: number;
    evidence: string[];
  };
}

export interface DistrictUnrestCell {
  district: string;
  division: string | null;
  protest_count: number;
  govt_discontent_count: number;
  law_reaction_count: number;
  social_viral_count: number;
  grievance_count: number;
  total_signals: number;
  unrest_score: number;
  risk_level: number;
  trend: "rising" | "stable" | "falling";
  top_categories: UnrestCategory[];
  population_pressure: "high" | "medium" | "low";
  deaths?: number;
  injuries?: number;
  civilian_deaths?: number;
  damage_mentions?: number;
}

export interface SegmentedImpactPayload {
  deaths: number;
  civilian_deaths?: number;
  injuries: number;
  damage_mentions: number;
  homes_damaged: number;
  livestock_lost: number;
  death_mentions?: number;
  injury_mentions?: number;
  article_count?: number;
  raw_sum_deaths?: number;
  excluded_historical_articles?: number;
  excluded_historical_peak?: number;
  by_district?: Array<{
    district: string;
    deaths: number;
    injuries: number;
    death_mentions?: number;
    injury_mentions?: number;
  }>;
  by_event?: Array<{
    id: string;
    label: string;
    title: string;
    district: string;
    day: string;
    deaths: number;
    injuries: number;
    civilian_deaths?: number;
    url?: string | null;
  }>;
  evidence: string[];
  disclaimer_bn: string;
  disclaimer_en: string;
  window_days?: number;
  method?: string;
  default_window?: number;
  windows?: Record<string, Omit<SegmentedImpactPayload, "windows" | "default_window">>;
}

export interface GovernmentMandateMeta {
  term_started_on: string;
  ruling_party: string;
  label_bn: string;
  label_en: string;
  election_bn: string;
  election_en: string;
}

export interface ProtestMovement {
  id: string;
  title: string;
  title_bn: string;
  theme_id?: string;
  theme: string;
  theme_bn: string;
  place: string;
  place_bn: string;
  district: string | null;
  division: string | null;
  status: "active" | "recent" | "cooling";
  status_bn: string;
  status_en: string;
  first_seen_at: string;
  last_seen_at: string;
  article_count: number;
  severity: number;
  impact: {
    deaths: number;
    civilian_deaths: number;
    injuries: number;
    homes_damaged: number;
    livestock_lost: number;
    damage_mentions: number;
    evidence: string[];
  };
  summary_bn: string;
  summary_en: string;
  articles: Array<{
    id: string;
    title: string;
    url: string;
    source_name: string;
    published_at: string;
  }>;
}

export interface UnrestPulse {
  districts: DistrictUnrestCell[];
  signals: UnrestSignal[];
  movements?: ProtestMovement[];
  summary: {
    districts_at_risk: number;
    active_protests: number;
    active_movements?: number;
    law_hotspots: number;
    social_viral: number;
    total_signals: number;
    top_district: string | null;
    refreshed_at: string;
    sources: string[];
    note_bn: string;
    note_en: string;
    government?: GovernmentMandateMeta;
    impact?: SegmentedImpactPayload;
  };
  scope?: { divisionName?: string; districtName?: string };
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

export function useUnrestPulse() {
  const { filter } = useAdminFilter();
  const [data, setData] = useState<UnrestPulse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = scopeQuery(filter);
      const json = await apiClient<{ success: boolean; data: UnrestPulse }>(`unrest/pulse${qs}`);
      setData(json.data);
    } catch (err) {
      setData(null);
      setError(err instanceof Error ? err.message : "Unrest pulse unavailable");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, loading, error, reload: load };
}
