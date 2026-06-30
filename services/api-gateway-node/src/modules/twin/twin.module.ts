import { Router } from "express";
import { z } from "zod";
import { UserRole } from "@prisma/client";
import { BaseModule } from "../../core/module/app-module.interface";
import { authenticate } from "../../core/middlewares/auth.middleware";
import { validate } from "../../core/middlewares/validate.middleware";
import { container } from "../../core/di/container";
import { asyncHandler, sendSuccess } from "../../core/utils/async-handler";
import { twinService } from "./twin.service";

const twinSchema = z.object({
  targetDivisionId: z.string().uuid(),
  budgetShiftPct: z.coerce.number().min(-20).max(20),
  lang: z.enum(["bn", "en"]).optional(),
});

export class TwinModule extends BaseModule {
  readonly name = "twin";

  register(router: Router): void {
    router.post(
      "/twin/simulate",
      authenticate(),
      container.rbac.requireRoles(UserRole.PMO, UserRole.MINISTER),
      validate(twinSchema, "body"),
      asyncHandler(async (req, res) => {
        const data = await twinService.simulate(req.body);
        sendSuccess(res, data);
      }),
    );
  }
}

export const twinModule = new TwinModule();
