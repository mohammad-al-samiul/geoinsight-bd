import { Router } from "express";
import { UserRole } from "@prisma/client";
import { BaseModule } from "../../core/module/app-module.interface";
import { authenticate } from "../../core/middlewares/auth.middleware";
import { container } from "../../core/di/container";
import { asyncHandler, sendSuccess } from "../../core/utils/async-handler";
import { prisma } from "../../core/database/prisma.client";

export class DashboardModule extends BaseModule {
  readonly name = "dashboard";

  register(router: Router): void {
    router.get(
      "/dashboard/national",
      authenticate(),
      container.rbac.requireRoles(UserRole.PMO, UserRole.MINISTER),
      asyncHandler(async (_req, res) => {
        const [units, projects, alerts, representatives] = await Promise.all([
          prisma.adminUnit.count(),
          prisma.project.count(),
          prisma.redFlagAlert.count({ where: { resolvedAt: null } }),
          prisma.representative.count(),
        ]);

        sendSuccess(res, {
          units,
          projects,
          openAlerts: alerts,
          representatives,
          timestamp: new Date().toISOString(),
        });
      }),
    );
  }
}

export const dashboardModule = new DashboardModule();
