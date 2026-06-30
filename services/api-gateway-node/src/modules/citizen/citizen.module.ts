import { Router } from "express";
import { z } from "zod";
import { BaseModule } from "../../core/module/app-module.interface";
import { validate } from "../../core/middlewares/validate.middleware";
import { asyncHandler, sendSuccess } from "../../core/utils/async-handler";
import {
  publicFeed333RateLimiter,
  publicFeed999RateLimiter,
  publicFeedBurstLimiter,
} from "../../core/middlewares/rate-limiter.middleware";
import { sovereignFeedGuard } from "../public-feed/public-feed.routes";
import { citizenChatService } from "./citizen.service";

const chatSchema = z.object({
  message: z.string().min(2).max(2000),
  lang: z.enum(["bn", "en"]).optional(),
  district: z.string().max(120).optional(),
  upazila: z.string().max(120).optional(),
});

export class CitizenModule extends BaseModule {
  readonly name = "citizen";

  register(router: Router): void {
    router.use("/citizen", sovereignFeedGuard());

    router.post(
      "/citizen/chat",
      publicFeedBurstLimiter,
      publicFeed333RateLimiter,
      validate(chatSchema, "body"),
      asyncHandler(async (req, res) => {
        const data = await citizenChatService.chat({ ...req.body, channel: "333" });
        sendSuccess(res, data);
      }),
    );

    router.post(
      "/citizen/chat/999",
      publicFeedBurstLimiter,
      publicFeed999RateLimiter,
      validate(chatSchema, "body"),
      asyncHandler(async (req, res) => {
        const data = await citizenChatService.chat({ ...req.body, channel: "999" });
        sendSuccess(res, data);
      }),
    );
  }
}

export const citizenModule = new CitizenModule();
