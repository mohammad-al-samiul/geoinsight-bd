import { Router } from "express";
import { UserRole } from "@prisma/client";
import { BaseModule } from "../../core/module/app-module.interface";
import { authenticate } from "../../core/middlewares/auth.middleware";
import { container } from "../../core/di/container";
import { asyncHandler, sendSuccess } from "../../core/utils/async-handler";
import { nationalSectorService } from "./national-sector.service";

export class NationalSectorModule extends BaseModule {
  readonly name = "national-sector";

  register(router: Router): void {
    router.get(
      "/national-sector/board",
      authenticate(),
      container.rbac.requireRoles(UserRole.PMO, UserRole.MINISTER),
      asyncHandler(async (req, res) => {
        sendSuccess(
          res,
          await nationalSectorService.getBoard({
            role: req.user!.role,
            adminUnitId: req.user!.adminUnitId,
          }),
        );
      }),
    );
  }
}

export const nationalSectorModule = new NationalSectorModule();
