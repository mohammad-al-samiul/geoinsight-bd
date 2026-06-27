import rateLimit, { RateLimitRequestHandler } from "express-rate-limit";
import { env } from "../config/env";
import { HTTP_STATUS } from "../constants/http-status";

const rateLimitMessage = (message: string) => ({
  success: false,
  message,
});

function createLimiter(max: number, windowMs: number, message: string): RateLimitRequestHandler {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: rateLimitMessage(message),
    statusCode: HTTP_STATUS.TOO_MANY_REQUESTS,
  });
}

/** Global authenticated API ceiling */
export const globalRateLimiter = createLimiter(
  env.RATE_LIMIT_MAX,
  env.RATE_LIMIT_WINDOW_MS,
  "Too many requests, please try again later",
);

/** Credential stuffing / brute-force protection */
export const authRateLimiter = createLimiter(
  20,
  15 * 60 * 1000,
  "Too many authentication attempts",
);

/**
 * Public 333 Upazila data feed — mirrors nginx zone=feed_333 (30 req/min default).
 * Applied at application layer when traffic bypasses edge (internal mesh).
 */
export const publicFeed333RateLimiter = createLimiter(
  env.PUBLIC_FEED_333_RATE_MAX,
  env.PUBLIC_FEED_333_WINDOW_MS,
  "333 Upazila feed rate limit exceeded",
);

/**
 * Public 999 Union data feed — stricter (15 req/min default).
 */
export const publicFeed999RateLimiter = createLimiter(
  env.PUBLIC_FEED_999_RATE_MAX,
  env.PUBLIC_FEED_999_WINDOW_MS,
  "999 Union feed rate limit exceeded",
);

/** Burst protection for unauthenticated scrape endpoints */
export const publicFeedBurstLimiter = createLimiter(
  10,
  1000,
  "Feed burst limit exceeded — possible DDoS",
);
