"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { useRealtimeRefresh } from "@/hooks/use-realtime-refresh";

interface ApiOk<T> {
  success: boolean;
  data: T;
}

function entityQs(entityId?: string | null, extra?: string) {
  const parts: string[] = [];
  if (entityId) parts.push(`entityId=${encodeURIComponent(entityId)}`);
  if (extra) parts.push(extra);
  return parts.length ? `?${parts.join("&")}` : "";
}

export interface OsintItem {
  id: string;
  source: "curated" | "live_news";
  title: string;
  titleBn: string | null;
  summary: string | null;
  sourceName: string;
  sourceUrl: string | null;
  channel: string;
  matchedKeyword: string;
  sentiment: "POSITIVE" | "NEUTRAL" | "NEGATIVE";
  propagandaFlag: boolean;
  propagandaNote: string | null;
  propagandaConfidence?: number;
  publishedAt: string;
  ward: { id: string; code: string; name: string; nameBn: string | null } | null;
}

export interface OsintFeedResponse {
  entityId: string;
  entityCode: string;
  keywords: string[];
  summary: {
    total: number;
    curated: number;
    liveNews: number;
    propagandaFlagged: number;
    sentiment: { positive: number; neutral: number; negative: number };
  };
  items: OsintItem[];
}

export interface PulseInfluencer {
  id: string;
  name: string;
  nameBn: string | null;
  roleType: string;
  phone: string | null;
  organization: string | null;
  influenceScore: number;
  notes: string | null;
  ward: { id: string; code: string; name: string; nameBn: string | null } | null;
}

export interface PulsePollingCenter {
  id: string;
  name: string;
  nameBn: string | null;
  code: string | null;
  registeredVoters: number;
  newVoters: number;
  address: string | null;
  ward: { id: string; code: string; name: string; nameBn: string | null } | null;
}

export interface PulseResponse {
  entityId: string;
  summary: {
    influencerCount: number;
    pollingCenterCount: number;
    registeredVoters: number;
    newVoters: number;
    newVoterPct: number;
    byRole: Record<string, number>;
  };
  influencers: PulseInfluencer[];
  pollingCenters: PulsePollingCenter[];
}

export function useLocalOsint(entityId?: string | null, propagandaOnly = false) {
  const [data, setData] = useState<OsintFeedResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const hasDataRef = useRef(false);

  const reload = useCallback(async () => {
    if (!hasDataRef.current) setLoading(true);
    setError(null);
    try {
      const extra = propagandaOnly ? "propagandaOnly=true" : undefined;
      const json = await apiClient<ApiOk<OsintFeedResponse>>(
        `local-entity/osint${entityQs(entityId, extra)}`,
        { cache: "no-store" },
      );
      setData(json.data);
      hasDataRef.current = true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load OSINT");
      if (!hasDataRef.current) setData(null);
    } finally {
      setLoading(false);
    }
  }, [entityId, propagandaOnly]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useRealtimeRefresh(reload, true, true);

  return { data, error, loading, reload };
}

export function useLocalPulse(entityId?: string | null) {
  const [data, setData] = useState<PulseResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const hasDataRef = useRef(false);

  const reload = useCallback(async () => {
    if (!hasDataRef.current) setLoading(true);
    setError(null);
    try {
      const json = await apiClient<ApiOk<PulseResponse>>(
        `local-entity/pulse${entityQs(entityId)}`,
        { cache: "no-store" },
      );
      setData(json.data);
      hasDataRef.current = true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load pulse");
      if (!hasDataRef.current) setData(null);
    } finally {
      setLoading(false);
    }
  }, [entityId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useRealtimeRefresh(reload, true, true);

  return { data, error, loading, reload };
}
