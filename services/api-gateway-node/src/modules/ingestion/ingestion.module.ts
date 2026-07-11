import { Router } from "express";
import { z } from "zod";
import { UserRole } from "@prisma/client";
import { BaseModule } from "../../core/module/app-module.interface";
import { authenticate } from "../../core/middlewares/auth.middleware";
import { validate } from "../../core/middlewares/validate.middleware";
import { container } from "../../core/di/container";
import { asyncHandler, sendSuccess } from "../../core/utils/async-handler";
import { ingestionService } from "./ingestion.service";

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
  days: z.coerce.number().int().min(1).max(30).optional(),
});

const syncBodySchema = z
  .object({
    maxPerFeed: z.coerce.number().int().min(1).max(50).optional(),
  })
  .optional();

export class IngestionModule extends BaseModule {
  readonly name = "ingestion";

  register(router: Router): void {
    router.post(
      "/ingestion/sync",
      authenticate(),
      container.rbac.requireRoles(UserRole.PMO, UserRole.MINISTER),
      asyncHandler(async (req, res) => {
        const body = syncBodySchema.safeParse(req.body).data;
        const data = await ingestionService.syncFromAi(body?.maxPerFeed ?? 15);
        sendSuccess(res, data);
      }),
    );

    router.get(
      "/ingestion/articles",
      authenticate(),
      container.rbac.requireRoles(UserRole.PMO, UserRole.MINISTER, UserRole.DC),
      validate(listQuerySchema, "query"),
      asyncHandler(async (req, res) => {
        const q = req.query as z.infer<typeof listQuerySchema>;
        const data = await ingestionService.listArticles(q.limit ?? 30, q.days ?? 7);
        sendSuccess(res, data);
      }),
    );

    router.get(
      "/ingestion/stats",
      authenticate(),
      container.rbac.requireRoles(UserRole.PMO, UserRole.MINISTER),
      asyncHandler(async (_req, res) => {
        const data = await ingestionService.getStats(7);
        sendSuccess(res, data);
      }),
    );
  }
}

export const ingestionModule = new IngestionModule();
