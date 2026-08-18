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

function foldTitle(title: string): string {
  return title
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "")
    .slice(0, 96);
}

function foldUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./i, "").toLowerCase();
    const path = parsed.pathname.replace(/\/+$/, "").toLowerCase();
    return `${host}${path}`;
  } catch {
    const raw = url.toLowerCase().split("?")[0]?.replace(/\/+$/, "") ?? "";
    return raw || null;
  }
}

/** Drop republished copies of the same headline (article + signal + OSINT). */
export function uniqueLiveIntel(rows: LiveIntelItem[]): LiveIntelItem[] {
  const seen = new Set<string>();
  const out: LiveIntelItem[] = [];
  for (const row of rows) {
    const keys: string[] = [];
    const urlKey = foldUrl(row.url);
    if (urlKey) keys.push(`u:${urlKey}`);
    const titleKey = foldTitle(row.title);
    if (titleKey.length >= 12) keys.push(`t:${titleKey}`);
    if (!keys.length) keys.push(`id:${row.id}`);
    if (keys.some((k) => seen.has(k))) continue;
    for (const k of keys) seen.add(k);
    out.push(row);
  }
  return out;
}

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
