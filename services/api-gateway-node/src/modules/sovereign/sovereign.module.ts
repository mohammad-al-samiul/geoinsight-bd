import { Router } from "express";
import { z } from "zod";
import { UserRole } from "@prisma/client";
import { BaseModule } from "../../core/module/app-module.interface";
import { authenticate } from "../../core/middlewares/auth.middleware";
import { validate } from "../../core/middlewares/validate.middleware";
import { container } from "../../core/di/container";
import { asyncHandler, sendSuccess } from "../../core/utils/async-handler";
import { sovereignLlmService } from "./sovereign.service";

const chatSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["system", "user", "assistant"]),
        content: z.string().min(1).max(8000),
      }),
    )
    .min(1),
  lang: z.enum(["bn", "en"]).optional(),
  context: z.string().max(10000).optional(),
});

export class SovereignModule extends BaseModule {
  readonly name = "sovereign";

  register(router: Router): void {
    router.post(
      "/sovereign-llm/chat",
      authenticate(),
      container.rbac.requireRoles(UserRole.PMO, UserRole.MINISTER),
      validate(chatSchema, "body"),
      asyncHandler(async (req, res) => {
        const data = await sovereignLlmService.chat(req.body);
        sendSuccess(res, data);
      }),
    );

    router.get(
      "/sovereign-llm/status",
      authenticate(),
      container.rbac.requireRoles(UserRole.PMO, UserRole.MINISTER, UserRole.DC),
      asyncHandler(async (_req, res) => {
        const data = await sovereignLlmService.status();
        sendSuccess(res, data);
      }),
    );
  }
}

export const sovereignModule = new SovereignModule();
