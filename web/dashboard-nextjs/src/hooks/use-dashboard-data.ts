"use client";

import { useCallback, useEffect, useState } from "react";
import type { AdminFilterState } from "@/types";
import { fetchDashboardMetricsSafe, fetchRedFlagMarkers } from "@/lib/dashboard-data";
import type {
  DashboardMetrics,
  RedFlagMarker,
  SocketAlertPayload,
  SocketKpiPayload,
} from "@/types/dashboard";
import { applyUnitScoreOverlay, getUnitCentroid } from "@/lib/geojson-bd";
import { useSocket } from "@/hooks/use-socket";

export function useDashboardData(filter: AdminFilterState) {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [markers, setMarkers] = useState<RedFlagMarker[]>([]);
  const [loading, setLoading] = useState(true);
  const [pulseKeys, setPulseKeys] = useState<Record<string, number>>({});
  const [socketToken, setSocketToken] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/socket-token", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (json?.success) setSocketToken(json.data.token);
      })
      .catch(() => setSocketToken(null));
  }, []);

  const pulse = useCallback((key: string) => {
    setPulseKeys((prev) => ({ ...prev, [key]: Date.now() }));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [m, mk] = await Promise.all([
        fetchDashboardMetricsSafe(filter),
        fetchRedFlagMarkers(filter),
      ]);
      setMetrics(m);
      setMarkers(mk);
      if (m?.unitScores?.length) {
        applyUnitScoreOverlay(m.unitScores);
      }
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

  const handleKpiUpdate = useCallback(
    (payload: SocketKpiPayload) => {
      setMetrics((prev) => {
        if (!prev) return prev;
        const next = { ...prev, timestamp: new Date().toISOString() };

        if (payload.metric === "completion_rate" && payload.value != null) {
          next.completionRate = payload.value;
          pulse("completion");
        }
        if (payload.trend?.length) {
          next.completionTrend = payload.trend;
          pulse("completion");
        }
        if (payload.variance?.length) {
          next.budgetVariance = payload.variance;
          pulse("budget");
        }
        if (payload.metric === "compliance") {
          pulse("arbitrage");
        }
        if (payload.value != null && !payload.metric) {
          next.completionRate = payload.value;
          pulse("completion");
        }
        return next;
      });
    },
    [pulse],
  );

  const handleRedFlag = useCallback(
    (payload: SocketAlertPayload, adminUnitId: string) => {
      const centroid = getUnitCentroid(payload.unitId ?? adminUnitId);
      const marker: RedFlagMarker = {
        id: payload.alertId ?? `live-${Date.now()}`,
        unitId: payload.unitId ?? adminUnitId,
        lat: payload.lat ?? centroid?.[1] ?? 23.7,
        lng: payload.lng ?? centroid?.[0] ?? 90.4,
        severity: payload.severity ?? "HIGH",
        flagType: payload.flagType ?? "AI_RED_FLAG",
        message: payload.aiExplanation ?? "AI-detected anomaly",
        createdAt: new Date().toISOString(),
      };
      setMarkers((prev) => [marker, ...prev].slice(0, 30));
      pulse("map");
    },
    [pulse],
  );

  const { status: socketStatus } = useSocket({
    token: socketToken,
    enabled: Boolean(socketToken),
    onKpiUpdate: (payload) => handleKpiUpdate(payload),
    onRedFlag: (payload, envelope) =>
      handleRedFlag(payload, envelope.adminUnitId),
    onDashboardRefresh: () => load(),
  });

  return {
    metrics,
    markers,
    loading,
    socketStatus,
    pulseKeys,
    refresh: load,
  };
}
