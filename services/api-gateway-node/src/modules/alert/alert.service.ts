import { prismaWrite, prismaRead } from "../../core/database/prisma.client";
import { ApiError } from "../../core/errors/api.error";
import { IAuditService } from "../../shared/audit/audit.service";
import { ListAlertsQuery } from "./alert.validator";

export class AlertService {
  constructor(private readonly auditService: IAuditService) {}

  async list(query: ListAlertsQuery) {
    return prismaRead.redFlagAlert.findMany({
      where: {
        ...(query.unresolvedOnly && { resolvedAt: null }),
        ...(query.unitId && { project: { adminUnitId: query.unitId } }),
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
  }

  async resolve(alertId: string, userId: string, ip?: string) {
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
