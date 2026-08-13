"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { useRealtimeRefresh } from "@/hooks/use-realtime-refresh";

export interface AuditTimelineItem {
  type: "ai_alert" | "audit";
  id: string;
  timestamp: string;
  [key: string]: unknown;
}

export function useAuditTrail() {
  const [timeline, setTimeline] = useState<AuditTimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasDataRef = useRef(false);

  const load = useCallback(async () => {
    // Blocking loader only before the first payload; refreshes swap in place.
    if (!hasDataRef.current) setLoading(true);
    setError(null);
    try {
      const json = await apiClient<{
        success: boolean;
        data: { timeline: AuditTimelineItem[] };
      }>("audit-trail?limit=40");
      setTimeline(json.data.timeline ?? []);
      hasDataRef.current = true;
    } catch (err) {
      setTimeline([]);
      hasDataRef.current = false;
      setError(err instanceof Error ? err.message : "Audit trail unavailable");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);
  useRealtimeRefresh(load, true, true);

  return { timeline, loading, error, reload: load };
}
