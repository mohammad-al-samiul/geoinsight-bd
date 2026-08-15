import { Router } from "express";
import { z } from "zod";
import { UserRole } from "@prisma/client";
import { BaseModule } from "../../core/module/app-module.interface";
import { authenticate } from "../../core/middlewares/auth.middleware";
import { validate } from "../../core/middlewares/validate.middleware";
import { container } from "../../core/di/container";
import { asyncHandler, sendSuccess } from "../../core/utils/async-handler";
import { nationalSectorService } from "./national-sector.service";

const ingestBodySchema = z
  .object({
    csv: z.string().min(20).max(400_000).optional(),
  })
  .default({});

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

    router.post(
      "/national-sector/ingest",
      authenticate(),
      container.rbac.requireRoles(UserRole.PMO),
      validate(ingestBodySchema),
      asyncHandler(async (req, res) => {
        const { csv } = req.body as z.infer<typeof ingestBodySchema>;
        const data = await nationalSectorService.ingestCsv(csv);
        sendSuccess(res, data);
      }),
    );
  }
}

export const nationalSectorModule = new NationalSectorModule();
