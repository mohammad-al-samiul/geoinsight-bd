import { Router } from "express";
import { z } from "zod";
import { UserRole } from "@prisma/client";
import { BaseModule } from "../../core/module/app-module.interface";
import { authenticate } from "../../core/middlewares/auth.middleware";
import { validate } from "../../core/middlewares/validate.middleware";
import { container } from "../../core/di/container";
import { asyncHandler, sendSuccess } from "../../core/utils/async-handler";
import { briefingService } from "./briefing.service";

const briefingQuerySchema = z.object({
  divisionId: z.string().uuid().optional(),
  districtId: z.string().uuid().optional(),
  upazilaId: z.string().uuid().optional(),
  unionId: z.string().uuid().optional(),
  lang: z.enum(["bn", "en"]).optional(),
});

export class BriefingModule extends BaseModule {
  readonly name = "briefing";

  register(router: Router): void {
    router.get(
      "/briefing/morning",
      authenticate(),
      container.rbac.requireRoles(UserRole.PMO, UserRole.MINISTER),
      validate(briefingQuerySchema, "query"),
      asyncHandler(async (req, res) => {
        const data = await briefingService.getMorningBriefing(
          req.query as z.infer<typeof briefingQuerySchema>,
        );
        sendSuccess(res, data);
      }),
    );
  }
}

export const briefingModule = new BriefingModule();
