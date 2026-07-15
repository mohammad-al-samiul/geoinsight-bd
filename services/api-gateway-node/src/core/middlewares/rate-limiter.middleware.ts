import type { Request } from "express";
import rateLimit, { RateLimitRequestHandler } from "express-rate-limit";
import { RedisStore, type RedisReply } from "rate-limit-redis";
import { env } from "../config/env";
import { HTTP_STATUS } from "../constants/http-status";
import { getRedisClient, isRedisEnabled } from "../../infrastructure/redis/redis.client";

const rateLimitMessage = (message: string) => ({
  success: false,
  message,
});

function clientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return req.ip ?? "unknown";
}

function hasBearerAuth(req: Request): boolean {
  return Boolean(req.headers.authorization?.startsWith("Bearer "));
}

function isHealthProbe(req: Request): boolean {
  return req.path.startsWith("/api/v1/health");
}

function redisStore(prefix: string): RedisStore | undefined {
  if (!isRedisEnabled()) return undefined;
  const client = getRedisClient();
  return new RedisStore({
    prefix: `rl:${prefix}:`,
    sendCommand: (command: string, ...args: string[]) =>
      client.call(command, ...args) as Promise<RedisReply>,
  });
}

function createLimiter(
  prefix: string,
  max: number,
  windowMs: number,
  message: string,
  options?: {
    skip?: (req: Request) => boolean;
    keyGenerator?: (req: Request) => string;
  },
): RateLimitRequestHandler {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: rateLimitMessage(message),
    statusCode: HTTP_STATUS.TOO_MANY_REQUESTS,
    store: redisStore(prefix),
    keyGenerator: options?.keyGenerator ?? clientIp,
    skip: options?.skip,
  });
}

/**
 * Public / unauthenticated API ceiling.
 * Authenticated dashboard traffic is excluded — Next.js proxy shares one container IP
 * and live modules (proximity ~15 req/min) would exhaust 100/15min for all analysts.
 */
export const globalRateLimiter = createLimiter(
  "global",
  env.RATE_LIMIT_MAX,
  env.RATE_LIMIT_WINDOW_MS,
  "Too many requests, please try again later",
  {
    skip: (req) => isHealthProbe(req) || hasBearerAuth(req),
    keyGenerator: clientIp,
  },
);

/** Credential stuffing / brute-force protection */
export const authRateLimiter = createLimiter(
  "auth",
  20,
  15 * 60 * 1000,
  "Too many authentication attempts",
  { keyGenerator: clientIp },
);

/**
 * Public 333 Upazila data feed — mirrors nginx zone=feed_333 (30 req/min default).
 */
export const publicFeed333RateLimiter = createLimiter(
  "feed333",
  env.PUBLIC_FEED_333_RATE_MAX,
  env.PUBLIC_FEED_333_WINDOW_MS,
  "333 Upazila feed rate limit exceeded",
  { keyGenerator: clientIp },
);

/**
 * Public 999 Union data feed — stricter (15 req/min default).
 */
export const publicFeed999RateLimiter = createLimiter(
  "feed999",
  env.PUBLIC_FEED_999_RATE_MAX,
  env.PUBLIC_FEED_999_WINDOW_MS,
  "999 Union feed rate limit exceeded",
  { keyGenerator: clientIp },
);

/** Burst protection for unauthenticated scrape endpoints */
export const publicFeedBurstLimiter = createLimiter(
  "feed-burst",
  10,
  1000,
  "Feed burst limit exceeded — possible DDoS",
  { keyGenerator: clientIp },
);
