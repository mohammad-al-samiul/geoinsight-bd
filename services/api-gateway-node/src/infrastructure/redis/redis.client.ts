import Redis from "ioredis";
import { env } from "../../core/config/env";

let client: Redis | null = null;
let subscriber: Redis | null = null;

export function isRedisEnabled(): boolean {
  return Boolean(env.REDIS_URL) && env.NODE_ENV !== "test";
}

function createRedisConnection(): Redis {
  return new Redis(env.REDIS_URL!, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    lazyConnect: true,
    retryStrategy: (times) => (times > 30 ? null : Math.min(times * 200, 3000)),
  });
}

export function getRedisClient(): Redis {
  if (!isRedisEnabled()) {
    throw new Error("Redis is not configured");
  }
  if (!client) {
    client = createRedisConnection();
    client.on("error", (err) => console.error("[redis] Client error:", err.message));
  }
  return client;
}

/** Dedicated subscriber connection for Socket.io adapter (duplicate). */
export function getRedisSubscriber(): Redis {
  if (!isRedisEnabled()) {
    throw new Error("Redis is not configured");
  }
  if (!subscriber) {
    subscriber = getRedisClient().duplicate();
    subscriber.on("error", (err) =>
      console.error("[redis] Subscriber error:", err.message),
    );
  }
  return subscriber;
}

export async function connectRedis(): Promise<void> {
  if (!isRedisEnabled()) return;

  const maxAttempts = 30;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const redis = getRedisClient();
      if (redis.status === "wait") {
        await redis.connect();
      }
      await redis.ping();
      console.info("[redis] Connected");
      return;
    } catch (err) {
      if (client) {
        client.disconnect();
        client = null;
        subscriber = null;
      }
      if (attempt >= maxAttempts) {
        console.error(
          `[redis] Could not reach ${env.REDIS_URL}. Start Docker infra: docker compose up -d redis`,
        );
        throw err;
      }
      console.warn(`[redis] Waiting for Redis (${attempt}/${maxAttempts})...`);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
}

export async function disconnectRedis(): Promise<void> {
  if (subscriber) {
    await subscriber.quit();
    subscriber = null;
  }
  if (client) {
    await client.quit();
    client = null;
  }
}
