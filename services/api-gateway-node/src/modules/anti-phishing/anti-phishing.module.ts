import { Router } from "express";
import { UserRole } from "@prisma/client";
import { z } from "zod";
import { BaseModule } from "../../core/module/app-module.interface";
import { authenticate } from "../../core/middlewares/auth.middleware";
import { validate } from "../../core/middlewares/validate.middleware";
import { container } from "../../core/di/container";
import { asyncHandler, sendSuccess } from "../../core/utils/async-handler";
import { antiPhishingService } from "./anti-phishing.service";

const scanSchema = z.object({ url: z.string().url().max(2048) });

export class AntiPhishingModule extends BaseModule {
  readonly name = "anti-phishing";

  register(router: Router): void {
    router.post(
      "/anti-phishing/scan",
      authenticate(),
      container.rbac.requireRoles(UserRole.PMO, UserRole.MINISTER),
      validate(scanSchema, "body"),
      asyncHandler(async (req, res) => {
        const data = await antiPhishingService.scan(req.body.url);
        sendSuccess(res, data);
      }),
    );
  }
}

export const antiPhishingModule = new AntiPhishingModule();
