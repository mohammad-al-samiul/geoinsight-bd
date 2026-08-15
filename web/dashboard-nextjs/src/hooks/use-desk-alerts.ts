"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { useLocalEntityId } from "@/hooks/use-local-entity-id";
import { useRealtimeRefresh } from "@/hooks/use-realtime-refresh";

export interface DeskAlertItem {
  id: string;
  kind: "RED_ALERT" | "SLA_OVERDUE" | "OUTAGE_OVERDUE" | "DELIVERY_FAILED";
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  headline: string;
  headlineBn: string;
  detail: string;
  detailBn: string;
  href: string;
  createdAt: string;
}

interface DeskAlertFeed {
  entityId: string;
  generatedAt: string;
  summary: {
    red: number;
    slaOverdue: number;
    outageOverdue: number;
    deliveryFailed: number;
  };
  items: DeskAlertItem[];
}

interface ApiOk<T> {
  success: boolean;
  data: T;
}

export function useDeskAlerts() {
  const entityId = useLocalEntityId();
  const [data, setData] = useState<DeskAlertFeed | null>(null);
  const [loading, setLoading] = useState(true);
  const hasDataRef = useRef(false);

  const load = useCallback(
    async (options?: { silent?: boolean }) => {
      const silent = options?.silent || hasDataRef.current;
      if (!silent) setLoading(true);
      try {
        const qs = entityId ? `?entityId=${entityId}` : "";
        const res = await apiClient<ApiOk<DeskAlertFeed>>(
          `local-entity/desk-alerts${qs}`,
        );
        setData(res.data);
        hasDataRef.current = true;
      } catch (err) {
        if (!hasDataRef.current) setData(null);
        if (!(err instanceof ApiClientError)) {
          setData(null);
        }
      } finally {
        setLoading(false);
      }
    },
    [entityId],
  );

  useEffect(() => {
    void load();
  }, [load]);
  useRealtimeRefresh(() => void load({ silent: true }), true, true);

  return {
    items: data?.items ?? [],
    summary: data?.summary,
    loading,
    refresh: load,
  };
}
