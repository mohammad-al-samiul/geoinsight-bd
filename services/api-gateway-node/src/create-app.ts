import compression from "compression";
import cors from "cors";
import express, { Express } from "express";
import helmet from "helmet";
import { Router } from "express";
import { env } from "./core/config/env";
import {
  errorHandler,
  notFoundHandler,
} from "./core/middlewares/error-handler.middleware";
import { globalRateLimiter } from "./core/middlewares/rate-limiter.middleware";
import { prometheusMiddleware } from "./core/metrics/prometheus.middleware";
import { registerModules } from "./modules/register-modules";

/** Express app factory — safe for supertest (no listen, no RabbitMQ, no sockets). */
export function createApp(): Express {
  const app = express();

  app.set("trust proxy", 1);
  app.use(helmet({ contentSecurityPolicy: env.NODE_ENV === "production" }));
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  // gzip/brotli-negotiated response compression; large JSON payloads
  // (hierarchy, dashboards, feeds) shrink dramatically over the wire.
  app.use(compression({ threshold: 1024 }));
  app.use(express.json({ limit: "1mb" }));

  if (env.NODE_ENV !== "test") {
    app.use(prometheusMiddleware);
    app.use(globalRateLimiter);
  }

  const apiRouter = Router();
  registerModules(apiRouter);
  app.use("/api/v1", apiRouter);

  app.get("/", (_req, res) => {
    res.redirect(302, env.CORS_ORIGIN);
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
