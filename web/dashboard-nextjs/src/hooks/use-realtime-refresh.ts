"use client";

import { useCallback, useEffect, useState } from "react";
import { useSocket } from "@/hooks/use-socket";
import { fetchSocketToken } from "@/lib/socket-token";

const POLL_INTERVAL_MS = 5 * 60 * 1000;

/**
 * Refreshes when the backend broadcasts an update and polls as a safety net
 * while the tab is visible. The poll covers sources that cannot emit sockets
 * (RSS, weather, public feeds) without wasting requests in background tabs.
 */
export function useRealtimeRefresh(
  reload: () => void | Promise<void>,
  enabled = true,
  poll = false,
) {
  const [socketToken, setSocketToken] = useState<string | null>(null);

  useEffect(() => {
    void fetchSocketToken().then(setSocketToken);
  }, []);

  const onRefresh = useCallback(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (!enabled || !poll) return;

    const refreshIfVisible = () => {
      if (document.visibilityState === "visible") void reload();
    };
    const interval = window.setInterval(refreshIfVisible, POLL_INTERVAL_MS);
    window.addEventListener("focus", refreshIfVisible);
    document.addEventListener("visibilitychange", refreshIfVisible);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshIfVisible);
      document.removeEventListener("visibilitychange", refreshIfVisible);
    };
  }, [enabled, poll, reload]);

  const { status } = useSocket({
    token: socketToken,
    enabled: enabled && Boolean(socketToken),
    onDashboardRefresh: onRefresh,
    onKpiUpdate: onRefresh,
  });

  return { socketStatus: status };
}
