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

/**
 * One physical socket connection per auth token, shared across all hook
 * consumers (dashboard, anomaly feed, realtime refresh) with ref-counting.
 * Previously each consumer opened its own connection.
 */
interface SharedSocketEntry {
  socket: Socket;
  refCount: number;
}

const sharedSockets = new Map<string, SharedSocketEntry>();

function acquireSocket(token: string | null | undefined): Socket {
  const key = token ?? "";
  let entry = sharedSockets.get(key);
  if (!entry) {
    entry = {
      socket: io(SOCKET_URL, {
        autoConnect: true,
        transports: ["websocket", "polling"],
        auth: token ? { token } : undefined,
        reconnection: true,
        reconnectionAttempts: 8,
        reconnectionDelay: 1500,
      }),
      refCount: 0,
    };
    sharedSockets.set(key, entry);
  }
  entry.refCount += 1;
  return entry.socket;
}

function releaseSocket(token: string | null | undefined) {
  const key = token ?? "";
  const entry = sharedSockets.get(key);
  if (!entry) return;
  entry.refCount -= 1;
  if (entry.refCount <= 0) {
    entry.socket.removeAllListeners();
    entry.socket.disconnect();
    sharedSockets.delete(key);
  }
}

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

    const socket = acquireSocket(token);
    socketRef.current = socket;
    setStatus(socket.connected ? "connected" : "connecting");

    const onConnect = () => setStatus("connected");
    const onDisconnect = () => setStatus("disconnected");
    const onConnectError = () => setStatus("error");

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);

    const dataEvents = [...KPI_EVENTS, ...ALERT_EVENTS, "dashboard:refresh"];
    const dataHandlers = dataEvents.map((event) => {
      const handler = (data: GovSocketEnvelope | Record<string, unknown>) => {
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
      };
      socket.on(event, handler);
      return { event, handler };
    });

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
      dataHandlers.forEach(({ event, handler }) => socket.off(event, handler));
      socketRef.current = null;
      releaseSocket(token);
    };
  }, [enabled, token, handleEnvelope]);

  return { status, socket: socketRef };
}
