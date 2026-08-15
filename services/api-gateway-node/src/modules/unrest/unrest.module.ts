import { Router } from "express";
import { z } from "zod";
import { UserRole } from "@prisma/client";
import { BaseModule } from "../../core/module/app-module.interface";
import { authenticate } from "../../core/middlewares/auth.middleware";
import { validate } from "../../core/middlewares/validate.middleware";
import { container } from "../../core/di/container";
import { asyncHandler, sendCreated, sendSuccess } from "../../core/utils/async-handler";
import { unrestService } from "./unrest.service";

const scopeQuerySchema = z.object({
  divisionId: z.string().uuid().optional(),
  districtId: z.string().uuid().optional(),
  upazilaId: z.string().uuid().optional(),
  unionId: z.string().uuid().optional(),
});

const citizenReportSchema = z.object({
  title: z.string().trim().min(3).max(240),
  place: z.string().trim().min(2).max(120),
  district: z.string().trim().min(2).max(64),
  themeId: z.string().trim().min(1).max(40),
  partyId: z.string().trim().min(1).max(40),
  urgency: z.enum(["active", "recent"]),
  lat: z.number().min(20).max(27).optional(),
  lng: z.number().min(88).max(93).optional(),
});

export class UnrestModule extends BaseModule {
  readonly name = "unrest";

  register(router: Router): void {
    router.get(
      "/unrest/pulse",
      authenticate(),
      container.rbac.requireRoles(UserRole.PMO, UserRole.MINISTER, UserRole.DC),
      validate(scopeQuerySchema, "query"),
      asyncHandler(async (req, res) => {
        const q = req.query as z.infer<typeof scopeQuerySchema>;
        const data = await unrestService.getPulse(q);
        sendSuccess(res, data);
      }),
    );

    router.post(
      "/unrest/citizen-reports",
      authenticate(),
      container.rbac.requireRoles(UserRole.PMO, UserRole.MINISTER, UserRole.DC),
      validate(citizenReportSchema),
      asyncHandler(async (req, res) => {
        const body = req.body as z.infer<typeof citizenReportSchema>;
        const data = await unrestService.createCitizenReport(body);
        sendCreated(res, data);
      }),
    );

    router.post(
      "/unrest/refresh",
      authenticate(),
      container.rbac.requireRoles(UserRole.PMO, UserRole.MINISTER),
      asyncHandler(async (_req, res) => {
        const detail = await unrestService.refreshPulse();
        sendSuccess(res, detail);
      }),
    );
  }
}

export const unrestModule = new UnrestModule();
