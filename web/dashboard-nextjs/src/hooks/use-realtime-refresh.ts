"use client";

import { useCallback, useEffect, useState } from "react";
import { useSocket } from "@/hooks/use-socket";

/** Auto-refresh module data when pipeline broadcasts dashboard:refresh or kpi:update. */
export function useRealtimeRefresh(reload: () => void | Promise<void>, enabled = true) {
  const [socketToken, setSocketToken] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/socket-token", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (json?.success) setSocketToken(json.data.token);
      })
      .catch(() => setSocketToken(null));
  }, []);

  const onRefresh = useCallback(() => {
    void reload();
  }, [reload]);

  const { status } = useSocket({
    token: socketToken,
    enabled: enabled && Boolean(socketToken),
    onDashboardRefresh: onRefresh,
    onKpiUpdate: onRefresh,
  });

  return { socketStatus: status };
}
