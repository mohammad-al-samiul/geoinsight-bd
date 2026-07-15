import { AdminUnitType } from "@prisma/client";

const ROOM_PREFIX = "room";

export const SOCKET_EVENTS = {
  KPI_UPDATE: "kpi:update",
  METADATA_UPDATE: "gov:metadata",
  DASHBOARD_REFRESH: "dashboard:refresh",
  ALERT_CREATED: "alert:created",
  ARBITRAGE_UPDATE: "arbitrage:update",
  CONNECTED: "connected",
} as const;

export function nationalRoom(): string {
  return `${ROOM_PREFIX}:national`;
}

export function unitRoom(type: AdminUnitType, unitId: string): string {
  return `${ROOM_PREFIX}:${type.toLowerCase()}:${unitId}`;
}

export async function resolveBroadcastRooms(
  unitId: string,
  getChain: (id: string) => Promise<Array<{ id: string; type: AdminUnitType }>>,
): Promise<string[]> {
  const chain = await getChain(unitId);
  const rooms = chain.map((node) => unitRoom(node.type, node.id));
  rooms.push(nationalRoom());
  return [...new Set(rooms)];
}

export function mapGovEventType(type: string): string {
  const map: Record<string, string> = {
    kpi_update: SOCKET_EVENTS.KPI_UPDATE,
    metadata_update: SOCKET_EVENTS.METADATA_UPDATE,
    dashboard_refresh: SOCKET_EVENTS.DASHBOARD_REFRESH,
    alert_created: SOCKET_EVENTS.ALERT_CREATED,
  };
  return map[type] ?? SOCKET_EVENTS.METADATA_UPDATE;
}
