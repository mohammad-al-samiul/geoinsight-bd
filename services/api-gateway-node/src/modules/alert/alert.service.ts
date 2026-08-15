import { prismaWrite, prismaRead } from "../../core/database/prisma.client";
import { ApiError } from "../../core/errors/api.error";
import { env } from "../../core/config/env";
import { liveDataService } from "../live-data/live-data.service";
import { IAuditService } from "../../shared/audit/audit.service";
import { projectUnitScopeWhere } from "../../shared/scope/admin-unit-filter";
import { ListAlertsQuery } from "./alert.validator";

export class AlertService {
  constructor(private readonly auditService: IAuditService) {}

  async list(query: ListAlertsQuery) {
    if (env.LIVE_DATA_ONLY) {
      return liveDataService.listAlerts({
        unitId: query.unitId,
        limit: query.limit,
        unresolvedOnly: query.unresolvedOnly,
      });
    }

    const rows = await prismaRead.redFlagAlert.findMany({
      where: {
        ...(query.unresolvedOnly && { resolvedAt: null }),
        ...(query.unitId && { project: projectUnitScopeWhere(query.unitId) }),
      },
      include: {
        project: {
          select: {
            id: true,
            title: true,
            adminUnitId: true,
            blockchainTx: true,
          },
        },
        resolvedBy: { select: { id: true, email: true } },
      },
      orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
      take: query.limit,
    });

    if (env.FABRIC_ENABLED) return rows;
    return rows.map((row) => ({
      ...row,
      blockchainHash: null,
      blockchainVerified: false,
      project: { ...row.project, blockchainTx: null },
    }));
  }

  async resolve(alertId: string, userId: string, ip?: string) {
    if (env.LIVE_DATA_ONLY) {
      try {
        const updated = await liveDataService.resolveLiveAlert(alertId, userId);
        await this.auditService.log({
          userId,
          action: "RESOLVE",
          tableName: "live_signals",
          recordId: alertId,
          oldValue: { resolvedAt: null },
          newValue: { resolvedAt: updated.resolvedAt },
          ipAddress: ip,
        });
        return updated;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Alert not found";
        if (msg.includes("already resolved")) throw ApiError.badRequest(msg);
        throw ApiError.notFound("Alert not found");
      }
    }

    const alert = await prismaRead.redFlagAlert.findUnique({ where: { id: alertId } });
    if (!alert) throw ApiError.notFound("Alert not found");
    if (alert.resolvedAt) throw ApiError.badRequest("Alert already resolved");

    const updated = await prismaWrite.redFlagAlert.update({
      where: { id: alertId },
      data: { resolvedAt: new Date(), resolvedById: userId },
    });

    await this.auditService.log({
      userId,
      action: "RESOLVE",
      tableName: "red_flag_alerts",
      recordId: alertId,
      oldValue: { resolvedAt: null },
      newValue: { resolvedAt: updated.resolvedAt },
      ipAddress: ip,
    });

    return updated;
  }
}
