import { createServer } from "http";
import { env } from "./core/config/env";
import { connectDatabase, disconnectDatabase } from "./core/database/prisma.client";
import {
  connectRedis,
  disconnectRedis,
} from "./infrastructure/redis/redis.client";
import {
  closeRabbitMq,
  startGovQueueConsumer,
} from "./infrastructure/messaging/gov-queue.consumer";
import { closeSocketServer, initSocketServer } from "./infrastructure/socket/socket.server";
import { container } from "./core/di/container";
import { createApp } from "./create-app";
import { pipelineOrchestrator } from "./modules/pipeline/pipeline.orchestrator";
import type { IngestionBackgroundWorker } from "./modules/ingestion/ingestion.worker";

const app = createApp();
const httpServer = createServer(app);
let ingestionWorker: IngestionBackgroundWorker | null = null;

async function bootstrap(): Promise<void> {
  await connectDatabase();
  await connectRedis();
  if (env.NODE_ENV !== "test") {
    initSocketServer(httpServer);
  }
  await startGovQueueConsumer();
  container.blockchainRetryWorker.start();

  if (env.PIPELINE_ENABLED && env.NODE_ENV !== "test") {
    pipelineOrchestrator.start();
  } else if (env.INGESTION_ENABLED && env.NODE_ENV !== "test") {
    const { ingestionService } = await import("./modules/ingestion/ingestion.service");
    const { IngestionBackgroundWorker } = await import("./modules/ingestion/ingestion.worker");
    ingestionWorker = new IngestionBackgroundWorker(
      () => ingestionService.syncFromAi(15),
      env.INGESTION_INTERVAL_MS,
      env.INGESTION_RUN_ON_START,
      env.INGESTION_STARTUP_DELAY_MS,
    );
    ingestionWorker.start();
  }

  httpServer.listen(env.API_GATEWAY_PORT, () => {
    console.info(`[gateway] Port ${env.API_GATEWAY_PORT} (${env.NODE_ENV})`);
  });
}

async function shutdown(signal: string): Promise<void> {
  console.info(`[gateway] ${signal} — shutting down`);
  pipelineOrchestrator.stop();
  ingestionWorker?.stop();
  container.blockchainRetryWorker.stop();
  await container.fabricClient.disconnect();

  await new Promise<void>((resolve) => {
    httpServer.close(() => resolve());
  });
  await closeSocketServer();
  await closeRabbitMq();
  await disconnectRedis();
  await disconnectDatabase();
  process.exit(0);
}

if (env.NODE_ENV !== "test") {
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));

  void bootstrap().catch((err) => {
    console.error("[gateway] Fatal:", err);
    process.exit(1);
  });
}

export default app;
export { createApp, httpServer };
