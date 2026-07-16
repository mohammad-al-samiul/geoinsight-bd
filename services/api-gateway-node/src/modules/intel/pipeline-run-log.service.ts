import { Prisma } from "@prisma/client";
import { env } from "../../core/config/env";
import { prismaRead, prismaWrite } from "../../core/database/prisma.client";

export async function logPipelineJobRun(input: {
  job: string;
  ok: boolean;
  detail?: Record<string, unknown>;
  durationMs: number;
  startedAt: Date;
}): Promise<void> {
  try {
    await prismaWrite.pipelineJobRun.create({
      data: {
        job: input.job,
        ok: input.ok,
        detail: (input.detail ?? null) as Prisma.InputJsonValue,
        durationMs: input.durationMs,
        startedAt: input.startedAt,
        completedAt: new Date(),
      },
    });
  } catch (err) {
    console.warn(
      "[pipeline-log] failed to persist job run:",
      err instanceof Error ? err.message : err,
    );
  }
}

export async function logIngestionSyncRun(input: {
  fetched: number;
  inserted: number;
  updated: number;
  feedsOk: number;
  feedsTotal: number;
  durationMs: number;
  error?: string;
}): Promise<void> {
  try {
    await prismaWrite.ingestionSyncRun.create({
      data: {
        fetched: input.fetched,
        inserted: input.inserted,
        updated: input.updated,
        feedsOk: input.feedsOk,
        feedsTotal: input.feedsTotal,
        durationMs: input.durationMs,
        error: input.error ?? null,
      },
    });
  } catch (err) {
    console.warn(
      "[ingestion-log] failed to persist sync run:",
      err instanceof Error ? err.message : err,
    );
  }
}

export async function pruneAuditLogs(): Promise<{ pipeline: number; ingestion: number }> {
  const pipelineCutoff = new Date(
    Date.now() - env.PIPELINE_LOG_RETENTION_DAYS * 86_400_000,
  );
  const ingestionCutoff = new Date(
    Date.now() - env.INGESTION_LOG_RETENTION_DAYS * 86_400_000,
  );

  const [pipeline, ingestion] = await Promise.all([
    prismaWrite.pipelineJobRun.deleteMany({
      where: { completedAt: { lt: pipelineCutoff } },
    }),
    prismaWrite.ingestionSyncRun.deleteMany({
      where: { completedAt: { lt: ingestionCutoff } },
    }),
  ]);

  return { pipeline: pipeline.count, ingestion: ingestion.count };
}

export async function getRecentPipelineRuns(job?: string, limit = 20) {
  return prismaRead.pipelineJobRun.findMany({
    where: job ? { job } : undefined,
    orderBy: { completedAt: "desc" },
    take: limit,
    select: {
      id: true,
      job: true,
      ok: true,
      durationMs: true,
      startedAt: true,
      completedAt: true,
      detail: true,
    },
  });
}

export async function getRecentIngestionRuns(limit = 20) {
  return prismaRead.ingestionSyncRun.findMany({
    orderBy: { completedAt: "desc" },
    take: limit,
    select: {
      id: true,
      fetched: true,
      inserted: true,
      updated: true,
      feedsOk: true,
      feedsTotal: true,
      error: true,
      durationMs: true,
      completedAt: true,
    },
  });
}

/** Wrap a pipeline job with DB audit logging (used by orchestrator). */
export async function loggedPipelineTask(
  job: string,
  fn: () => Promise<Record<string, unknown>>,
): Promise<Record<string, unknown>> {
  const startedAt = new Date();
  const t0 = Date.now();
  try {
    const detail = await fn();
    await logPipelineJobRun({
      job,
      ok: true,
      detail,
      durationMs: Date.now() - t0,
      startedAt,
    });
    return detail;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await logPipelineJobRun({
      job,
      ok: false,
      detail: { error: message },
      durationMs: Date.now() - t0,
      startedAt,
    });
    throw err;
  }
}
