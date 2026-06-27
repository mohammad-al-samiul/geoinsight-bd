"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { SOCKET_URL } from "@/lib/config";
import type { SocketAlertPayload, SocketKpiPayload } from "@/types/dashboard";

export type SocketConnectionStatus =
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

interface GovSocketEnvelope<T = Record<string, unknown>> {
  type: string;
  adminUnitId: string;
  payload: T;
  timestamp: string;
}

interface UseSocketOptions {
  token?: string | null;
  enabled?: boolean;
  onKpiUpdate?: (payload: SocketKpiPayload, envelope: GovSocketEnvelope) => void;
  onRedFlag?: (payload: SocketAlertPayload, envelope: GovSocketEnvelope) => void;
  onDashboardRefresh?: (envelope: GovSocketEnvelope) => void;
}

const KPI_EVENTS = ["kpi:update", "kpi_update"] as const;
const ALERT_EVENTS = ["alert:created", "ai_red_flag"] as const;

export function useSocket({
  token,
  enabled = true,
  onKpiUpdate,
  onRedFlag,
  onDashboardRefresh,
}: UseSocketOptions) {
  const socketRef = useRef<Socket | null>(null);
  const [status, setStatus] = useState<SocketConnectionStatus>("connecting");

  const onKpiRef = useRef(onKpiUpdate);
  const onRedFlagRef = useRef(onRedFlag);
  const onRefreshRef = useRef(onDashboardRefresh);
  onKpiRef.current = onKpiUpdate;
  onRedFlagRef.current = onRedFlag;
  onRefreshRef.current = onDashboardRefresh;

  const handleEnvelope = useCallback((envelope: GovSocketEnvelope) => {
    if (KPI_EVENTS.includes(envelope.type as (typeof KPI_EVENTS)[number])) {
      onKpiRef.current?.(envelope.payload as SocketKpiPayload, envelope);
      return;
    }
    if (ALERT_EVENTS.includes(envelope.type as (typeof ALERT_EVENTS)[number])) {
      onRedFlagRef.current?.(envelope.payload as SocketAlertPayload, envelope);
      return;
    }
    if (envelope.type === "dashboard:refresh") {
      onRefreshRef.current?.(envelope);
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      setStatus("disconnected");
      return;
    }

    const socket = io(SOCKET_URL, {
      autoConnect: true,
      transports: ["websocket", "polling"],
      auth: token ? { token } : undefined,
      reconnection: true,
      reconnectionAttempts: 8,
      reconnectionDelay: 1500,
    });

    socketRef.current = socket;
    setStatus("connecting");

    socket.on("connect", () => setStatus("connected"));
    socket.on("disconnect", () => setStatus("disconnected"));
    socket.on("connect_error", () => setStatus("error"));

    const bind = (event: string) => {
      socket.on(event, (data: GovSocketEnvelope | Record<string, unknown>) => {
        const envelope: GovSocketEnvelope =
          "payload" in data && "adminUnitId" in data
            ? (data as GovSocketEnvelope)
            : {
                type: event,
                adminUnitId: String((data as SocketAlertPayload).unitId ?? ""),
                payload: data as Record<string, unknown>,
                timestamp: new Date().toISOString(),
              };
        handleEnvelope(envelope);
      });
    };

    [...KPI_EVENTS, ...ALERT_EVENTS, "dashboard:refresh"].forEach(bind);

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [enabled, token, handleEnvelope]);

  return { status, socket: socketRef };
}
