"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AdminFilterState } from "@/types";
import type { AnomalyAlert } from "@/types/alerts";
import { fetchAnomalyAlerts, mapSocketPayloadToAlert } from "@/lib/alerts-data";
import { useSocket } from "@/hooks/use-socket";
import type { SocketAlertPayload } from "@/types/dashboard";
import { fetchSocketToken } from "@/lib/socket-token";

export function useAnomalyFeed(filter: AdminFilterState) {
  const [alerts, setAlerts] = useState<AnomalyAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [socketToken, setSocketToken] = useState<string | null>(null);
  const hasDataRef = useRef(false);

  useEffect(() => {
    void fetchSocketToken().then(setSocketToken);
  }, []);

  const load = useCallback(
    async (options?: { silent?: boolean }) => {
      const silent = options?.silent || hasDataRef.current;
      if (!silent) setLoading(true);
      setError(null);
      try {
        const data = await fetchAnomalyAlerts(filter);
        setAlerts(data);
        hasDataRef.current = true;
      } catch (err) {
        if (!hasDataRef.current) setAlerts([]);
        setError(err instanceof Error ? err.message : "Failed to load alerts");
      } finally {
        setLoading(false);
      }
    },
    [filter],
  );

  useEffect(() => {
    void load();
  }, [
    filter.divisionId,
    filter.districtId,
    filter.upazilaId,
    filter.unionId,
    load,
  ]);

  const handleRedFlag = useCallback(
    (payload: SocketAlertPayload, envelope: { adminUnitId: string }) => {
      const incoming = mapSocketPayloadToAlert(
        payload as Record<string, unknown>,
        payload.unitId ?? envelope.adminUnitId,
      );
      setAlerts((prev) => {
        if (prev.some((a) => a.id === incoming.id)) return prev;
        return [incoming, ...prev].slice(0, 100);
      });
    },
    [],
  );

  useSocket({
    token: socketToken,
    enabled: Boolean(socketToken),
    onRedFlag: handleRedFlag,
    onDashboardRefresh: () => load({ silent: true }),
  });

  return { alerts, loading, error, refresh: load };
}
