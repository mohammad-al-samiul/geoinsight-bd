import rateLimit from "express-rate-limit";
import { env } from "../config/env";
import { HTTP_STATUS } from "../constants/http-status";

const rateLimitMessage = (message: string) => ({
  success: false,
  message,
});

export const globalRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitMessage("Too many requests, please try again later"),
  statusCode: HTTP_STATUS.TOO_MANY_REQUESTS,
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitMessage("Too many authentication attempts"),
  statusCode: HTTP_STATUS.TOO_MANY_REQUESTS,
});
