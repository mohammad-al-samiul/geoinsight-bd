import { Router } from "express";
import { z } from "zod";
import { UserRole } from "@prisma/client";
import { BaseModule } from "../../core/module/app-module.interface";
import { authenticate } from "../../core/middlewares/auth.middleware";
import { validate } from "../../core/middlewares/validate.middleware";
import { container } from "../../core/di/container";
import { asyncHandler, sendSuccess } from "../../core/utils/async-handler";
import { weatherService } from "./weather.service";

const scopeQuerySchema = z.object({
  divisionId: z.string().uuid().optional(),
  districtId: z.string().uuid().optional(),
  upazilaId: z.string().uuid().optional(),
  unionId: z.string().uuid().optional(),
});

export class WeatherModule extends BaseModule {
  readonly name = "weather";

  register(router: Router): void {
    router.get(
      "/weather/live",
      authenticate(),
      container.rbac.requireRoles(UserRole.PMO, UserRole.MINISTER, UserRole.DC),
      validate(scopeQuerySchema, "query"),
      asyncHandler(async (req, res) => {
        const q = req.query as z.infer<typeof scopeQuerySchema>;
        const data = await weatherService.getLive(q);
        sendSuccess(res, data);
      }),
    );
  }
}

export const weatherModule = new WeatherModule();
