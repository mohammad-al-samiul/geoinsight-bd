"use client";

import { useCallback, useEffect, useState } from "react";
import type { AdminFilterState } from "@/types";
import type { AnomalyAlert } from "@/types/alerts";
import { fetchAnomalyAlerts, mapSocketPayloadToAlert } from "@/lib/alerts-data";
import { useSocket } from "@/hooks/use-socket";
import type { SocketAlertPayload } from "@/types/dashboard";

export function useAnomalyFeed(filter: AdminFilterState) {
  const [alerts, setAlerts] = useState<AnomalyAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [socketToken, setSocketToken] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/socket-token", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (json?.success) setSocketToken(json.data.token);
      })
      .catch(() => setSocketToken(null));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAnomalyAlerts(filter);
      setAlerts(data);
    } catch (err) {
      setAlerts([]);
      setError(err instanceof Error ? err.message : "Failed to load alerts");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
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
    onDashboardRefresh: () => load(),
  });

  return { alerts, loading, error, refresh: load };
}
