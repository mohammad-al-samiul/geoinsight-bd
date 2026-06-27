import crypto from "crypto";
import jwt from "jsonwebtoken";
import { getRedisClient, isRedisEnabled } from "../redis/redis.client";

const BLACKLIST_PREFIX = "geoinsight:jwt:blacklist:";
const USER_REVOKED_PREFIX = "geoinsight:auth:user-revoked:";

function tokenHash(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function ttlFromExp(exp?: number): number {
  if (!exp) return 900;
  const remaining = exp - Math.floor(Date.now() / 1000);
  return Math.max(remaining, 60);
}

/**
 * Redis-backed JWT denylist + per-user session revocation for multi-instance gateways.
 */
export class JwtSessionService {
  async blacklistAccessToken(token: string): Promise<void> {
    if (!isRedisEnabled()) return;
    const decoded = jwt.decode(token) as { jti?: string; exp?: number } | null;
    const key = decoded?.jti
      ? `${BLACKLIST_PREFIX}${decoded.jti}`
      : `${BLACKLIST_PREFIX}${tokenHash(token)}`;
    await getRedisClient().set(key, "1", "EX", ttlFromExp(decoded?.exp));
  }

  async isAccessTokenBlacklisted(token: string): Promise<boolean> {
    if (!isRedisEnabled()) return false;
    const decoded = jwt.decode(token) as { jti?: string } | null;
    const key = decoded?.jti
      ? `${BLACKLIST_PREFIX}${decoded.jti}`
      : `${BLACKLIST_PREFIX}${tokenHash(token)}`;
    return (await getRedisClient().exists(key)) === 1;
  }

  /** Revoke all tokens issued before this timestamp (role change / forced logout). */
  async revokeUserSessions(userId: string, ttlSeconds = 86_400 * 7): Promise<void> {
    if (!isRedisEnabled()) return;
    const revokedAt = Date.now();
    await getRedisClient().set(
      `${USER_REVOKED_PREFIX}${userId}`,
      String(revokedAt),
      "EX",
      ttlSeconds,
    );
  }

  async isUserSessionRevoked(userId: string, tokenIat?: number): Promise<boolean> {
    if (!isRedisEnabled() || tokenIat === undefined) return false;
    const raw = await getRedisClient().get(`${USER_REVOKED_PREFIX}${userId}`);
    if (!raw) return false;
    return tokenIat * 1000 < Number(raw);
  }
}

export const jwtSessionService = new JwtSessionService();
