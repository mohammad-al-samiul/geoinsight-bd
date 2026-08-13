import { Router } from "express";
import { z } from "zod";
import { UserRole } from "@prisma/client";
import { BaseModule } from "../../core/module/app-module.interface";
import { authenticate } from "../../core/middlewares/auth.middleware";
import { validate } from "../../core/middlewares/validate.middleware";
import { container } from "../../core/di/container";
import { asyncHandler, sendSuccess } from "../../core/utils/async-handler";
import { searchService } from "./search.service";

const querySchema = z.object({
  q: z.string().min(2).max(120),
  limit: z.coerce.number().int().min(1).max(30).optional(),
});

export class SearchModule extends BaseModule {
  readonly name = "search";

  register(router: Router): void {
    router.get(
      "/search",
      authenticate(),
      container.rbac.requireRoles(
        UserRole.PMO,
        UserRole.MINISTER,
        UserRole.DC,
        UserRole.UNION_CHAIRMAN,
        UserRole.MP,
        UserRole.MAYOR,
      ),
      validate(querySchema, "query"),
      asyncHandler(async (req, res) => {
        const q = req.query as unknown as z.infer<typeof querySchema>;
        const data = await searchService.search(
          q.q,
          q.limit ?? 20,
          req.user!.role,
        );
        sendSuccess(res, { results: data, query: q.q });
      }),
    );
  }
}

export const searchModule = new SearchModule();
