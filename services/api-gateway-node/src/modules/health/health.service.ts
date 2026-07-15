import { prismaRead } from "../../core/database/prisma.client";
import { isGovQueueConnected } from "../../infrastructure/messaging/gov-queue.consumer";
import { getRedisClient, isRedisEnabled } from "../../infrastructure/redis/redis.client";
import { fetchAi } from "../../shared/http/fetch-ai";

export type HealthCheckStatus = "ok" | "fail" | "skip";

export interface ReadinessReport {
  status: "healthy" | "degraded" | "unhealthy";
  service: string;
  checks: Record<string, HealthCheckStatus>;
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

  return {
    status,
    service: "geoinsight-api-gateway",
    checks,
  };
}

export function readinessHttpStatus(report: ReadinessReport): number {
  // Only block traffic when the database is down. Redis / RabbitMQ / AI are
  // optional at the edge — returning 503 for "degraded" made Docker healthchecks
  // and the dashboard BFF treat a live gateway as unreachable.
  if (report.status === "unhealthy") return 503;
  return 200;
}
