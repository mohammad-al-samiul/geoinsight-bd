"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { useRealtimeRefresh } from "@/hooks/use-realtime-refresh";
import { useLocalEntityId } from "@/hooks/use-local-entity-id";

export type DeskTopic =
  | "ALL"
  | "EDUCATION"
  | "HEALTH"
  | "EMPLOYMENT"
  | "CRIME"
  | "CORRUPTION"
  | "OUTAGE"
  | "CIVIC"
  | "OSINT"
  | "PULSE"
  | "SPECIALTY"
  | "BUDGET"
  | "UNREST";

export type LiveIntelOrigin = "news" | "ops" | "related";

export type LiveIntelItem = {
  id: string;
  title: string;
  summary: string | null;
  sourceName: string;
  url: string | null;
  publishedAt: string;
  topic: Exclude<DeskTopic, "ALL">;
  topics: Array<Exclude<DeskTopic, "ALL">>;
  local: boolean;
  related: boolean;
  origin: LiveIntelOrigin;
  sentiment: "POSITIVE" | "NEUTRAL" | "NEGATIVE";
  keyword: string | null;
  matchScore: number;
  actionEn: string | null;
  actionBn: string | null;
};

export type LiveIntelFeed = {
  entityId: string;
  entityCode: string;
  entityName: string;
  topic: DeskTopic;
  generatedAt: string;
  sourceNote: string;
  summary: {
    total: number;
    last24h: number;
    last7d: number;
    localHits: number;
    related: number;
    ops: number;
    news: number;
    negative: number;
    byTopic: Record<string, number>;
    bySource: Record<string, number>;
    keywords: Array<{ name: string; value: number }>;
    sentiment: { positive: number; neutral: number; negative: number };
    daily: Array<{ name: string; value: number }>;
    actions: Array<{ en: string; bn: string }>;
  };
  items: LiveIntelItem[];
};

interface ApiOk<T> {
  success: boolean;
  data: T;
}

export function useLocalLiveIntel(topic: DeskTopic, enabled = true) {
  const entityId = useLocalEntityId();
  const [data, setData] = useState<LiveIntelFeed | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(enabled);
  const hasDataRef = useRef(false);

  const reload = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    if (!hasDataRef.current) setLoading(true);
    setError(null);
    try {
      const parts = [`topic=${encodeURIComponent(topic)}`, "limit=40"];
      if (entityId) parts.push(`entityId=${encodeURIComponent(entityId)}`);
      const res = await apiClient<ApiOk<LiveIntelFeed>>(`local-entity/live-intel?${parts.join("&")}`);
      setData(res.data);
      hasDataRef.current = true;
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Live intel failed");
    } finally {
      setLoading(false);
    }
  }, [enabled, entityId, topic]);

  useEffect(() => {
    void reload();
  }, [reload]);
  useRealtimeRefresh(reload, enabled, true);

  return { data, error, loading, reload };
}
