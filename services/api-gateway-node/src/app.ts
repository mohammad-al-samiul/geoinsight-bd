import { createServer } from "http";
import { env } from "./core/config/env";
import { prisma } from "./core/database/prisma.client";
import {
  closeRabbitMq,
  startGovQueueConsumer,
} from "./infrastructure/messaging/gov-queue.consumer";
import { initSocketServer } from "./infrastructure/socket/socket.server";
import { container } from "./core/di/container";
import { createApp } from "./create-app";

const app = createApp();
const httpServer = createServer(app);

if (env.NODE_ENV !== "test") {
  initSocketServer(httpServer);
}

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
