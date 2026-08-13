"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
import { fetchSocketToken } from "@/lib/socket-token";
import { loadAdminHierarchy } from "@/lib/admin-hierarchy";
import { useRealtimeRefresh } from "@/hooks/use-realtime-refresh";

export function useDashboardData(filter: AdminFilterState) {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [markers, setMarkers] = useState<RedFlagMarker[]>([]);
  const [loading, setLoading] = useState(true);
  const [pulseKeys, setPulseKeys] = useState<Record<string, number>>({});
  const [socketToken, setSocketToken] = useState<string | null>(null);
  const hasDataRef = useRef(false);

  useEffect(() => {
    // Warm hierarchy + socket token off the critical paint path.
    void loadAdminHierarchy();
    void fetchSocketToken().then(setSocketToken);
  }, []);

  const pulse = useCallback((key: string) => {
    setPulseKeys((prev) => ({ ...prev, [key]: Date.now() }));
  }, []);

  const load = useCallback(
    async (options?: { silent?: boolean }) => {
      const silent = options?.silent || hasDataRef.current;
      if (!silent) setLoading(true);

      // Unblock UI as soon as metrics arrive; markers stream in independently.
      const metricsTask = fetchDashboardMetricsSafe(filter)
        .then((m) => {
          setMetrics(m);
          if (m?.unitScores?.length) {
            applyUnitScoreOverlay(m.unitScores);
          }
          hasDataRef.current = true;
          setLoading(false);
        })
        .catch(() => {
          if (!hasDataRef.current) setLoading(false);
        });

      const markersTask = fetchRedFlagMarkers(filter)
        .then((mk) => setMarkers(mk))
        .catch(() => {
          /* keep previous markers */
        });

      await Promise.allSettled([metricsTask, markersTask]);
      setLoading(false);
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

  useRealtimeRefresh(() => load({ silent: true }), true, true);

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
    onDashboardRefresh: () => load({ silent: true }),
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
