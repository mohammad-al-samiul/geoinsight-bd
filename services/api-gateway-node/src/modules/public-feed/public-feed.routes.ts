import { Router, Request, Response, NextFunction } from "express";
import { env } from "../../core/config/env";
import {
  publicFeed333RateLimiter,
  publicFeed999RateLimiter,
  publicFeedBurstLimiter,
} from "../../core/middlewares/rate-limiter.middleware";
import { asyncHandler, sendSuccess } from "../../core/utils/async-handler";

async function proxyFeed(
  path: string,
  body: Record<string, unknown>,
): Promise<{ status: number; json: unknown }> {
  const res = await fetch(`${env.AI_SERVICE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

export function createPublicFeedRoutes(): Router {
  const router = Router();

  router.post(
    "/333/stream",
    publicFeedBurstLimiter,
    publicFeed333RateLimiter,
    asyncHandler(async (req: Request, res: Response) => {
      const limit = Math.min(Number(req.body?.limit ?? 50), 100);
      const upstream = await proxyFeed("/api/v1/sentiment/stream", { limit });
      res.status(upstream.status).json(upstream.json);
    }),
  );

  router.post(
    "/999/stream",
    publicFeedBurstLimiter,
    publicFeed999RateLimiter,
    asyncHandler(async (req: Request, res: Response) => {
      const limit = Math.min(Number(req.body?.limit ?? 50), 50);
      const upstream = await proxyFeed("/api/v1/sentiment/stream", { limit });
      res.status(upstream.status).json(upstream.json);
    }),
  );

  router.get(
    "/health",
    asyncHandler(async (_req: Request, res: Response) => {
      sendSuccess(res, { feeds: ["333-upazila", "999-union"], sovereign: env.SOVEREIGN_MODE });
    }),
  );

  return router;
}

/** Optional IP allowlist for public feeds in sovereign mode */
export function sovereignFeedGuard() {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!env.SOVEREIGN_MODE) {
      next();
      return;
    }
    const forwarded = req.headers["x-forwarded-for"];
    const clientIp = (typeof forwarded === "string" ? forwarded.split(",")[0] : req.ip)?.trim();
    const isInternal =
      clientIp?.startsWith("10.") ||
      clientIp?.startsWith("172.") ||
      clientIp?.startsWith("192.168.") ||
      clientIp === "127.0.0.1" ||
      clientIp === "::1";
    if (!isInternal) {
      res.status(403).json({
        success: false,
        message: "Public feeds restricted to NDC internal network in sovereign mode",
      });
      return;
    }
    next();
  };
}
