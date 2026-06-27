import { getRedisClient, isRedisEnabled } from "../redis/redis.client";

const DEFAULT_TTL_SECONDS = 86_400; // 24 hours

export class RedisCacheService {
  async get<T>(key: string): Promise<T | null> {
    if (!isRedisEnabled()) return null;
    const raw = await getRedisClient().get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds = DEFAULT_TTL_SECONDS): Promise<void> {
    if (!isRedisEnabled()) return;
    await getRedisClient().set(key, JSON.stringify(value), "EX", ttlSeconds);
  }

  async del(key: string): Promise<void> {
    if (!isRedisEnabled()) return;
    await getRedisClient().del(key);
  }

  async delByPattern(pattern: string): Promise<void> {
    if (!isRedisEnabled()) return;
    const redis = getRedisClient();
    let cursor = "0";
    do {
      const [next, keys] = await redis.scan(cursor, "MATCH", pattern, "COUNT", 100);
      cursor = next;
      if (keys.length > 0) await redis.del(...keys);
    } while (cursor !== "0");
  }
}

export const redisCacheService = new RedisCacheService();
