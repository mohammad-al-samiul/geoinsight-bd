import { getSocketServer } from "../../infrastructure/socket/socket.server";
import { publishToGovQueue } from "../../infrastructure/messaging/gov-queue.publisher";
import { nationalRoom, SOCKET_EVENTS } from "../../infrastructure/socket/socket.rooms";

/** Dhaka division — used as national routing anchor for gov queue broadcasts. */
export const NATIONAL_ADMIN_UNIT_ID = "a1000001-0001-4001-8001-000000000001";

export async function broadcastDashboardRefresh(source: string): Promise<void> {
  const payload = { source, refreshed_at: new Date().toISOString() };
  try {
    getSocketServer().to(nationalRoom()).emit(SOCKET_EVENTS.DASHBOARD_REFRESH, {
      type: "dashboard_refresh",
      adminUnitId: NATIONAL_ADMIN_UNIT_ID,
      payload,
      timestamp: payload.refreshed_at,
    });
  } catch {
    // Socket may not be ready during tests
  }
  await publishToGovQueue({
    type: "dashboard_refresh",
    adminUnitId: NATIONAL_ADMIN_UNIT_ID,
    payload,
  });
}

export async function broadcastKpiUpdate(
  metric: string,
  value: number,
  extra: Record<string, unknown> = {},
): Promise<void> {
  const payload = { metric, value, ...extra, updated_at: new Date().toISOString() };
  try {
    getSocketServer().to(nationalRoom()).emit(SOCKET_EVENTS.KPI_UPDATE, {
      type: "kpi_update",
      adminUnitId: NATIONAL_ADMIN_UNIT_ID,
      payload,
      timestamp: payload.updated_at,
    });
  } catch {
    // ignore
  }
  await publishToGovQueue({
    type: "kpi_update",
    adminUnitId: NATIONAL_ADMIN_UNIT_ID,
    payload,
  });
}
