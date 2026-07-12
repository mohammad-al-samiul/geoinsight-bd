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
}

export interface UnrestPulse {
  districts: DistrictUnrestCell[];
  signals: UnrestSignal[];
  summary: {
    districts_at_risk: number;
    active_protests: number;
    law_hotspots: number;
    social_viral: number;
    total_signals: number;
    top_district: string | null;
    refreshed_at: string;
    sources: string[];
    note_bn: string;
    note_en: string;
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
