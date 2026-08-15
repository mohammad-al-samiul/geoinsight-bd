import { env } from "../../core/config/env";
import { prismaRead } from "../../core/database/prisma.client";
import { isGovQueueConnected } from "../../infrastructure/messaging/gov-queue.consumer";
import { getRedisClient, isRedisEnabled } from "../../infrastructure/redis/redis.client";
import { fetchAi } from "../../shared/http/fetch-ai";

export type HealthCheckStatus = "ok" | "fail" | "skip";

export interface ReadinessReport {
  status: "healthy" | "degraded" | "unhealthy";
  service: string;
  checks: Record<string, HealthCheckStatus>;
  info: {
    fabricEnabled: boolean;
    sentimentMock: boolean;
    alertDeliveryMode: string;
    mfaEnforce: boolean;
    seedVersion: string | null;
    seedAppliedAt: string | null;
  };
}

export async function getLiveness(): Promise<{ success: true; service: string; status: "healthy" }> {
  return { success: true, service: "geoinsight-api-gateway", status: "healthy" };
}

export async function getReadiness(): Promise<ReadinessReport> {
  const checks: Record<string, HealthCheckStatus> = {};

  try {
    await prismaRead.$queryRaw`SELECT 1`;
    checks.database = "ok";
  } catch {
    checks.database = "fail";
  }

  if (isRedisEnabled()) {
    try {
      await getRedisClient().ping();
      checks.redis = "ok";
    } catch {
      checks.redis = "fail";
    }
  } else {
    checks.redis = "skip";
  }

  checks.rabbitmq = isGovQueueConnected() ? "ok" : "fail";

  try {
    const res = await fetchAi("/api/v1/health/live", undefined, { timeoutMs: 3_000 });
    checks.ai_analytics = res.ok ? "ok" : "fail";
  } catch {
    checks.ai_analytics = "fail";
  }

  const criticalFailed = checks.database === "fail";
  const optionalFailed =
    checks.redis === "fail" || checks.rabbitmq === "fail" || checks.ai_analytics === "fail";

  let status: ReadinessReport["status"] = "healthy";
  if (criticalFailed) status = "unhealthy";
  else if (optionalFailed) status = "degraded";

  let seedVersion: string | null = null;
  let seedAppliedAt: string | null = null;
  try {
    const rows = await prismaRead.$queryRaw<
      Array<{ version: string; applied_at: Date | string }>
    >`SELECT version, applied_at FROM seed_version WHERE id = true LIMIT 1`;
    const row = rows[0];
    if (row) {
      seedVersion = row.version;
      seedAppliedAt =
        row.applied_at instanceof Date
          ? row.applied_at.toISOString()
          : String(row.applied_at);
    }
  } catch {
    /* table missing until db-init */
  }

  return {
    status,
    service: "geoinsight-api-gateway",
    checks,
    info: {
      fabricEnabled: env.FABRIC_ENABLED,
      sentimentMock: env.SENTIMENT_USE_MOCK,
      alertDeliveryMode: env.ALERT_DELIVERY_MODE,
      mfaEnforce: env.MFA_ENFORCE,
      seedVersion,
      seedAppliedAt,
    },
  };
}

export function getPlatformFeatures() {
  return {
    fabricEnabled: env.FABRIC_ENABLED,
    sentimentMock: env.SENTIMENT_USE_MOCK,
    alertDeliveryMode: env.ALERT_DELIVERY_MODE,
    mfaEnforce: env.MFA_ENFORCE,
    mfaRequiredRoles: env.MFA_REQUIRED_ROLES,
  };
}

export function readinessHttpStatus(report: ReadinessReport): number {
  // Only block traffic when the database is down. Redis / RabbitMQ / AI are
  // optional at the edge — returning 503 for "degraded" made Docker healthchecks
  // and the dashboard BFF treat a live gateway as unreachable.
  if (report.status === "unhealthy") return 503;
  return 200;
}
