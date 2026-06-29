import { Router } from "express";
import { z } from "zod";
import { UserRole } from "@prisma/client";
import { BaseModule } from "../../core/module/app-module.interface";
import { authenticate } from "../../core/middlewares/auth.middleware";
import { validate } from "../../core/middlewares/validate.middleware";
import { container } from "../../core/di/container";
import { asyncHandler, sendSuccess } from "../../core/utils/async-handler";
import { dashboardService } from "./dashboard.service";

const dashboardQuerySchema = z.object({
  divisionId: z.string().uuid().optional(),
  districtId: z.string().uuid().optional(),
  upazilaId: z.string().uuid().optional(),
  unionId: z.string().uuid().optional(),
});

export class DashboardModule extends BaseModule {
  readonly name = "dashboard";

  register(router: Router): void {
    router.get(
      "/dashboard/national",
      authenticate(),
      container.rbac.requireRoles(UserRole.PMO, UserRole.MINISTER),
      validate(dashboardQuerySchema, "query"),
      asyncHandler(async (req, res) => {
        const data = await dashboardService.getNationalMetrics(req.query as z.infer<typeof dashboardQuerySchema>);
        sendSuccess(res, data);
      }),
    );
  }
}

export const dashboardModule = new DashboardModule();
