import { Router } from "express";
import { z } from "zod";
import { UserRole } from "@prisma/client";
import { BaseModule } from "../../core/module/app-module.interface";
import { authenticate } from "../../core/middlewares/auth.middleware";
import { validate } from "../../core/middlewares/validate.middleware";
import { container } from "../../core/di/container";
import { asyncHandler, sendSuccess } from "../../core/utils/async-handler";
import { procurementService } from "./procurement.service";

const adviseSchema = z.object({
  commodity: z.string().min(1).max(64),
  quantity_mt: z.coerce.number().positive(),
  urgency_days: z.coerce.number().int().min(7).max(180).optional(),
  lang: z.enum(["bn", "en"]).optional(),
});

export class ProcurementModule extends BaseModule {
  readonly name = "procurement";

  register(router: Router): void {
    router.post(
      "/procurement/advise",
      authenticate(),
      container.rbac.requireRoles(UserRole.PMO, UserRole.MINISTER),
      validate(adviseSchema, "body"),
      asyncHandler(async (req, res) => {
        const data = await procurementService.advise(req.body);
        sendSuccess(res, data);
      }),
    );
  }
}

export const procurementModule = new ProcurementModule();
