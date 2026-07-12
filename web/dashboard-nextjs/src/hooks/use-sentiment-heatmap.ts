"use client";

import { useCallback, useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";

export interface SentimentHeatmapCell {
  district: string;
  upazila: string | null;
  grievance_count: number;
  demand_count: number;
  neutral_count: number;
  total: number;
  grievance_ratio: number;
  sentiment_score: number;
  trend: "rising" | "stable" | "falling";
  distress_count?: number;
  hardship_hint?: string | null;
}

export interface SentimentHeatmap {
  level: string;
  total_logs: number;
  grievance_total: number;
  demand_total: number;
  cells: SentimentHeatmapCell[];
  source: string;
  narrative_bn?: string;
  narrative_en?: string;
  top_distressed?: string[];
}

export function useSentimentHeatmap(level: "district" | "upazila" = "district") {
  const [data, setData] = useState<SentimentHeatmap | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const json = await apiClient<{ success: boolean; data: SentimentHeatmap }>(
        `intelligence/sentiment/heatmap?level=${level}&limit=120`,
      );
      setData(json.data);
    } catch (err) {
      setData(null);
      setError(err instanceof Error ? err.message : "Heatmap unavailable");
    } finally {
      setLoading(false);
    }
  }, [level]);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, loading, error, reload: load };
}
