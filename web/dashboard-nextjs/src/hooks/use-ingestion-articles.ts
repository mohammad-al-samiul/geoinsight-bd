"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiClient } from "@/lib/api-client";

export interface ExternalArticle {
  id: string;
  sourceType: string;
  sourceName: string;
  title: string;
  summary: string | null;
  url: string;
  publishedAt: string | null;
  district: string | null;
  division: string | null;
  sentimentCategory: string | null;
  sentimentScore: string | null;
  language: string;
  fetchedAt: string;
}

export interface IngestionSyncResult {
  fetched: number;
  inserted: number;
  updated: number;
  feeds_ok: number;
  feeds_total: number;
  completed_at: string;
}

export function useIngestionArticles(limit = 20) {
  const [articles, setArticles] = useState<ExternalArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<IngestionSyncResult | null>(null);

  const hasDataRef = useRef(false);

  const load = useCallback(async () => {
    // Blocking loader only before the first payload; refreshes swap in place.
    if (!hasDataRef.current) setLoading(true);
    setError(null);
    try {
      const json = await apiClient<{ success: boolean; data: ExternalArticle[] }>(
        `ingestion/articles?limit=${limit}&days=7`,
      );
      setArticles(json.data ?? []);
      hasDataRef.current = true;
    } catch (err) {
      setArticles([]);
      hasDataRef.current = false;
      setError(err instanceof Error ? err.message : "Articles unavailable");
    } finally {
      setLoading(false);
    }
  }, [limit]);

  const sync = useCallback(async () => {
    setSyncing(true);
    setError(null);
    try {
      const json = await apiClient<{ success: boolean; data: IngestionSyncResult }>(
        "ingestion/sync",
        { method: "POST", body: JSON.stringify({ maxPerFeed: 15 }) },
      );
      setLastSync(json.data);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }, [load]);

  useEffect(() => {
    void load();
  }, [load]);

  return { articles, loading, syncing, error, lastSync, reload: load, sync };
}
