"use client";

import { useCallback, useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";

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

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const json = await apiClient<{
        success: boolean;
        data: { timeline: AuditTimelineItem[] };
      }>("audit-trail?limit=40");
      setTimeline(json.data.timeline ?? []);
    } catch (err) {
      setTimeline([]);
      setError(err instanceof Error ? err.message : "Audit trail unavailable");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { timeline, loading, error, reload: load };
}
