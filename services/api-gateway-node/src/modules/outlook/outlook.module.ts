import { Router } from "express";
import { z } from "zod";
import { UserRole } from "@prisma/client";
import { BaseModule } from "../../core/module/app-module.interface";
import { authenticate } from "../../core/middlewares/auth.middleware";
import { validate } from "../../core/middlewares/validate.middleware";
import { container } from "../../core/di/container";
import { asyncHandler, sendSuccess } from "../../core/utils/async-handler";
import { outlookService } from "./outlook.service";

const querySchema = z.object({
  lang: z.enum(["bn", "en"]).optional(),
});

export class OutlookModule extends BaseModule {
  readonly name = "outlook";

  register(router: Router): void {
    router.get(
      "/outlook/strategic",
      authenticate(),
      container.rbac.requireRoles(UserRole.PMO, UserRole.MINISTER, UserRole.DC),
      validate(querySchema, "query"),
      asyncHandler(async (req, res) => {
        const q = req.query as z.infer<typeof querySchema>;
        const data = await outlookService.getStrategic(q.lang ?? "bn");
        sendSuccess(res, data);
      }),
    );

    router.post(
      "/outlook/refresh",
      authenticate(),
      container.rbac.requireRoles(UserRole.PMO, UserRole.MINISTER),
      asyncHandler(async (_req, res) => {
        const detail = await outlookService.refresh();
        sendSuccess(res, detail);
      }),
    );
  }
}

export const outlookModule = new OutlookModule();
