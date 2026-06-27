import Redis from "ioredis";
import { env } from "../../core/config/env";

let client: Redis | null = null;
let subscriber: Redis | null = null;

export function isRedisEnabled(): boolean {
  return Boolean(env.REDIS_URL) && env.NODE_ENV !== "test";
}

export function getRedisClient(): Redis {
  if (!isRedisEnabled()) {
    throw new Error("Redis is not configured");
  }
  if (!client) {
    client = new Redis(env.REDIS_URL!, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: false,
    });
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
  await getRedisClient().ping();
  console.info("[redis] Connected");
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
