import { Router } from "express";
import { UserRole } from "@prisma/client";
import { BaseModule } from "../../core/module/app-module.interface";
import { authenticate } from "../../core/middlewares/auth.middleware";
import { container } from "../../core/di/container";
import { asyncHandler, sendSuccess } from "../../core/utils/async-handler";
import { divisionalCrisisService } from "./divisional-crisis.service";

export class DivisionalCrisisModule extends BaseModule {
  readonly name = "divisional-crisis";

  register(router: Router): void {
    router.get(
      "/divisional-crisis/pulse",
      authenticate(),
      container.rbac.requireRoles(UserRole.PMO, UserRole.MINISTER, UserRole.DC),
      asyncHandler(async (_req, res) => {
        sendSuccess(res, await divisionalCrisisService.getPulse());
      }),
    );
  }
}

export const divisionalCrisisModule = new DivisionalCrisisModule();
