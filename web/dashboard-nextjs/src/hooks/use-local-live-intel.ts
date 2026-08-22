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
  | "UNREST"
  | "PARTY"
  | "ISSUE";

export const CROSS_TOPIC_FILTERS = ["UNREST", "PARTY", "ISSUE"] as const;
export type CrossTopicFilter = (typeof CROSS_TOPIC_FILTERS)[number];

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
  places?: string[];
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
  const seen = new Map<string, LiveIntelItem>();
  const alias = new Map<string, string>();
  const out: LiveIntelItem[] = [];

  const keysOf = (row: LiveIntelItem) => {
    const keys: string[] = [];
    const urlKey = foldUrl(row.url);
    if (urlKey) keys.push(`u:${urlKey}`);
    const titleKey = foldTitle(row.title);
    if (titleKey.length >= 12) keys.push(`t:${titleKey}`);
    if (!keys.length) keys.push(`id:${row.id}`);
    return keys;
  };

  for (const row of rows) {
    const keys = keysOf(row);
    const existingCanon = keys.map((k) => alias.get(k)).find(Boolean);
    const canon = existingCanon ?? keys[0];
    for (const k of keys) alias.set(k, canon);
    const prev = seen.get(canon);
    if (!prev) {
      seen.set(canon, { ...row, topics: [...row.topics], places: [...(row.places ?? [])] });
      continue;
    }
    prev.topics = [...new Set([...prev.topics, ...row.topics])];
    prev.places = [...new Set([...(prev.places ?? []), ...(row.places ?? [])])].slice(0, 4);
    if (!prev.url && row.url) prev.url = row.url;
    if (!prev.summary && row.summary) prev.summary = row.summary;
  }
  for (const row of seen.values()) out.push(row);
  return out;
}

export function itemHasCrossTopic(
  row: { topics?: string[] },
  filter: "ALL" | CrossTopicFilter,
): boolean {
  if (filter === "ALL") return true;
  const tags = row.topics ?? [];
  if (filter === "UNREST") return tags.includes("UNREST") || tags.includes("PULSE");
  if (filter === "ISSUE") return tags.includes("ISSUE") || tags.includes("CIVIC") || tags.includes("OUTAGE");
  return tags.includes(filter);
}

interface ApiOk<T> {
  success: boolean;
  data: T;
}

export function useLocalLiveIntel(
  arg1?: string | null | DeskTopic,
  arg2?: DeskTopic | boolean,
  arg3?: number | boolean,
) {
  const defaultEntityId = useLocalEntityId();

  let entityId: string | null = defaultEntityId;
  let topic: DeskTopic = "ALL";
  let enabled = true;
  let limit = 40;

  if (typeof arg1 === "string" && (arg1.startsWith("cm") || arg1.includes("-") || arg1.length > 15)) {
    // Call style: useLocalLiveIntel(entityId, topic, limit)
    entityId = arg1;
    if (typeof arg2 === "string") topic = arg2 as DeskTopic;
    if (typeof arg3 === "number") limit = arg3;
  } else {
    // Call style: useLocalLiveIntel(topic, enabled)
    if (typeof arg1 === "string") topic = arg1 as DeskTopic;
    if (typeof arg2 === "boolean") enabled = arg2;
    if (typeof arg3 === "number") limit = arg3;
  }

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
      const parts = [`topic=${encodeURIComponent(topic)}`, `limit=${limit}`];
      if (entityId) parts.push(`entityId=${encodeURIComponent(entityId)}`);
      const res = await apiClient<ApiOk<LiveIntelFeed>>(`local-entity/live-intel?${parts.join("&")}`);
      setData(res.data);
      hasDataRef.current = true;
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Live intel failed");
    } finally {
      setLoading(false);
    }
  }, [enabled, entityId, topic, limit]);

  useEffect(() => {
    void reload();
  }, [reload]);
  useRealtimeRefresh(reload, enabled, true);

  return { data, error, loading, reload };
}
