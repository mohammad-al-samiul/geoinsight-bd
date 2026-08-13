"use client";

import { useCallback, useEffect, useState } from "react";
import { useSocket } from "@/hooks/use-socket";
import { fetchSocketToken } from "@/lib/socket-token";

const POLL_INTERVAL_MS = 90 * 1000;

/**
 * Refreshes when the backend broadcasts an update and polls on a fixed interval
 * whenever the app is open (including background tabs). Focus/visibility also
 * triggers an immediate reload when the user returns to the page.
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

    const refresh = () => {
      void reload();
    };
    const interval = window.setInterval(refresh, POLL_INTERVAL_MS);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
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
