import cors from "cors";
import express from "express";
import helmet from "helmet";
import { createServer } from "http";
import { Router } from "express";
import { env } from "./core/config/env";
import { prisma } from "./core/database/prisma.client";
import {
  errorHandler,
  notFoundHandler,
} from "./core/middlewares/error-handler.middleware";
import { globalRateLimiter } from "./core/middlewares/rate-limiter.middleware";
import {
  closeRabbitMq,
  startGovQueueConsumer,
} from "./infrastructure/messaging/gov-queue.consumer";
import { initSocketServer } from "./infrastructure/socket/socket.server";
import { registerModules } from "./modules/register-modules";
import { container } from "./core/di/container";

const app = express();
const httpServer = createServer(app);

app.set("trust proxy", 1);
app.use(helmet({ contentSecurityPolicy: env.NODE_ENV === "production" }));
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(globalRateLimiter);

const apiRouter = Router();
registerModules(apiRouter);
app.use("/api/v1", apiRouter);

app.use(notFoundHandler);
app.use(errorHandler);

initSocketServer(httpServer);

async function bootstrap(): Promise<void> {
  await prisma.$connect();
  await startGovQueueConsumer();
  container.blockchainRetryWorker.start();

  httpServer.listen(env.API_GATEWAY_PORT, () => {
    console.info(`[gateway] Port ${env.API_GATEWAY_PORT} (${env.NODE_ENV})`);
  });
}

async function shutdown(signal: string): Promise<void> {
  console.info(`[gateway] ${signal} — shutting down`);
  container.blockchainRetryWorker.stop();
  await container.fabricClient.disconnect();
  httpServer.close();
  await closeRabbitMq();
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

void bootstrap().catch((err) => {
  console.error("[gateway] Fatal:", err);
  process.exit(1);
});

export default app;
