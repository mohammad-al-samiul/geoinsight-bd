import { Router } from "express";
import { z } from "zod";
import { UserRole } from "@prisma/client";
import { BaseModule } from "../../core/module/app-module.interface";
import { authenticate } from "../../core/middlewares/auth.middleware";
import { validate } from "../../core/middlewares/validate.middleware";
import { container } from "../../core/di/container";
import { asyncHandler, sendSuccess } from "../../core/utils/async-handler";
import { auditTrailService } from "./audit-trail.service";

const listSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export class AuditTrailModule extends BaseModule {
  readonly name = "audit-trail";

  register(router: Router): void {
    router.get(
      "/audit-trail",
      authenticate(),
      container.rbac.requireRoles(UserRole.PMO, UserRole.MINISTER),
      validate(listSchema, "query"),
      asyncHandler(async (req, res) => {
        const q = req.query as z.infer<typeof listSchema>;
        const data = await auditTrailService.listAiAuditTrail(q.limit ?? 50);
        sendSuccess(res, data);
      }),
    );
  }
}

export const auditTrailModule = new AuditTrailModule();
