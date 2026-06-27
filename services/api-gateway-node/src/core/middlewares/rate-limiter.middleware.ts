import rateLimit, { RateLimitRequestHandler } from "express-rate-limit";
import { RedisStore, type RedisReply } from "rate-limit-redis";
import { env } from "../config/env";
import { HTTP_STATUS } from "../constants/http-status";
import { getRedisClient, isRedisEnabled } from "../../infrastructure/redis/redis.client";

const rateLimitMessage = (message: string) => ({
  success: false,
  message,
});

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
): RateLimitRequestHandler {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: rateLimitMessage(message),
    statusCode: HTTP_STATUS.TOO_MANY_REQUESTS,
    store: redisStore(prefix),
  });
}

/** Global authenticated API ceiling — Redis-backed across gateway replicas */
export const globalRateLimiter = createLimiter(
  "global",
  env.RATE_LIMIT_MAX,
  env.RATE_LIMIT_WINDOW_MS,
  "Too many requests, please try again later",
);

/** Credential stuffing / brute-force protection */
export const authRateLimiter = createLimiter(
  "auth",
  20,
  15 * 60 * 1000,
  "Too many authentication attempts",
);

/**
 * Public 333 Upazila data feed — mirrors nginx zone=feed_333 (30 req/min default).
 */
export const publicFeed333RateLimiter = createLimiter(
  "feed333",
  env.PUBLIC_FEED_333_RATE_MAX,
  env.PUBLIC_FEED_333_WINDOW_MS,
  "333 Upazila feed rate limit exceeded",
);

/**
 * Public 999 Union data feed — stricter (15 req/min default).
 */
export const publicFeed999RateLimiter = createLimiter(
  "feed999",
  env.PUBLIC_FEED_999_RATE_MAX,
  env.PUBLIC_FEED_999_WINDOW_MS,
  "999 Union feed rate limit exceeded",
);

/** Burst protection for unauthenticated scrape endpoints */
export const publicFeedBurstLimiter = createLimiter(
  "feed-burst",
  10,
  1000,
  "Feed burst limit exceeded — possible DDoS",
);
