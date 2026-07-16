import { IntelSnapshotKind, Prisma } from "@prisma/client";
import { env } from "../../core/config/env";
import { prismaRead, prismaWrite } from "../../core/database/prisma.client";

/** Serve from DB without regenerating (Redis miss path). */
const FRESH_MAX_AGE_MS: Record<IntelSnapshotKind, number> = {
  BRIEFING: 20 * 60_000,
  OUTLOOK: 45 * 60_000,
  UNREST: 20 * 60_000,
};

function hasText(value: unknown, minLen = 40): boolean {
  return typeof value === "string" && value.trim().length >= minLen;
}

/** Reject empty/stale snapshots so the UI never shows a blank briefing/outlook. */
export function isUsableIntelPayload(
  kind: IntelSnapshotKind,
  payload: Record<string, unknown>,
): boolean {
  if (kind === "OUTLOOK") {
    const challenges = Array.isArray(payload.challenges) ? payload.challenges.length : 0;
    const sources = Array.isArray(payload.sources) ? payload.sources.length : 0;
    return hasText(payload.narrative, 80) || challenges >= 2 || sources >= 3;
  }
  if (kind === "BRIEFING") {
    const bullets = Array.isArray(payload.bullets) ? payload.bullets.length : 0;
    const headlines = Array.isArray(payload.news_headlines) ? payload.news_headlines.length : 0;
    return hasText(payload.narrative, 30) || bullets >= 1 || headlines >= 2;
  }
  if (kind === "UNREST") {
    const signals = Array.isArray(payload.signals) ? payload.signals.length : 0;
    const districts = Array.isArray(payload.districts) ? payload.districts.length : 0;
    return signals >= 1 || districts >= 1;
  }
  return true;
}

function wrapSnapshot(
  row: {
    id: string;
    generatedAt: Date;
    llmUsed: boolean;
    sourceCount: number;
  },
  payload: Record<string, unknown>,
  meta: { fresh: boolean; stale?: boolean },
): Record<string, unknown> {
  return {
    ...payload,
    _snapshot: {
      id: row.id,
      generated_at: row.generatedAt.toISOString(),
      llm_used: row.llmUsed,
      source_count: row.sourceCount,
      from_db: true,
      fresh: meta.fresh,
      stale: meta.stale ?? false,
    },
  };
}

async function trimSnapshotsForScope(
  kind: IntelSnapshotKind,
  lang: string,
  scopeKey: string | null,
): Promise<void> {
  const keep = env.INTEL_SNAPSHOT_KEEP_PER_SCOPE;
  const excess = await prismaRead.intelAnalysisSnapshot.findMany({
    where: { kind, lang, scopeKey: scopeKey ?? null },
    orderBy: { generatedAt: "desc" },
    select: { id: true },
    skip: keep,
  });
  if (!excess.length) return;
  await prismaWrite.intelAnalysisSnapshot.deleteMany({
    where: { id: { in: excess.map((r) => r.id) } },
  });
}

export async function saveIntelSnapshot(input: {
  kind: IntelSnapshotKind;
  lang?: string;
  scopeKey?: string | null;
  payload: Record<string, unknown>;
  sourceCount?: number;
  llmUsed?: boolean;
}): Promise<boolean> {
  if (!isUsableIntelPayload(input.kind, input.payload)) {
    console.warn(`[intel] skip persist — unusable ${input.kind} payload`);
    return false;
  }

  const lang = input.lang ?? "bn";
  const scopeKey = input.scopeKey ?? null;

  await prismaWrite.intelAnalysisSnapshot.create({
    data: {
      kind: input.kind,
      lang,
      scopeKey,
      payload: input.payload as Prisma.InputJsonValue,
      sourceCount: input.sourceCount ?? 0,
      llmUsed: input.llmUsed ?? false,
    },
  });

  void trimSnapshotsForScope(input.kind, lang, scopeKey).catch((err) => {
    console.warn("[intel] trim failed:", err instanceof Error ? err.message : err);
  });

  return true;
}

export async function getLatestIntelSnapshot(
  kind: IntelSnapshotKind,
  lang = "bn",
  scopeKey: string | null = null,
  options?: { allowStale?: boolean },
): Promise<Record<string, unknown> | null> {
  const row = await prismaRead.intelAnalysisSnapshot.findFirst({
    where: { kind, lang, scopeKey: scopeKey ?? null },
    orderBy: { generatedAt: "desc" },
  });
  if (!row) return null;

  const payload = row.payload as Record<string, unknown>;
  if (!isUsableIntelPayload(kind, payload)) return null;

  const ageMs = Date.now() - row.generatedAt.getTime();
  const freshMax = FRESH_MAX_AGE_MS[kind];
  const retentionMax = env.INTEL_SNAPSHOT_RETENTION_DAYS * 86_400_000;

  if (ageMs <= freshMax) {
    return wrapSnapshot(row, payload, { fresh: true });
  }

  if (options?.allowStale && ageMs <= retentionMax) {
    return wrapSnapshot(row, payload, { fresh: false, stale: true });
  }

  return null;
}

/** Last good snapshot within retention — used when AI/regen fails. */
export async function getStaleIntelFallback(
  kind: IntelSnapshotKind,
  lang = "bn",
  scopeKey: string | null = null,
): Promise<Record<string, unknown> | null> {
  return getLatestIntelSnapshot(kind, lang, scopeKey, { allowStale: true });
}

export async function listIntelSnapshotHistory(
  kind: IntelSnapshotKind,
  lang = "bn",
  scopeKey: string | null = null,
  limit = 20,
) {
  const rows = await prismaRead.intelAnalysisSnapshot.findMany({
    where: { kind, lang, scopeKey: scopeKey ?? null },
    orderBy: { generatedAt: "desc" },
    take: limit,
    select: {
      id: true,
      generatedAt: true,
      sourceCount: true,
      llmUsed: true,
      payload: true,
    },
  });

  return rows.map((row) => {
    const payload = row.payload as Record<string, unknown>;
    const narrative =
      typeof payload.narrative === "string"
        ? payload.narrative.slice(0, 280)
        : null;
    return {
      id: row.id,
      generated_at: row.generatedAt.toISOString(),
      source_count: row.sourceCount,
      llm_used: row.llmUsed,
      narrative_preview: narrative,
      bullet_count: Array.isArray(payload.bullets) ? payload.bullets.length : 0,
      challenge_count: Array.isArray(payload.challenges) ? payload.challenges.length : 0,
    };
  });
}

export async function pruneIntelSnapshots(): Promise<{ deleted: number }> {
  const cutoff = new Date(Date.now() - env.INTEL_SNAPSHOT_RETENTION_DAYS * 86_400_000);
  const result = await prismaWrite.intelAnalysisSnapshot.deleteMany({
    where: { generatedAt: { lt: cutoff } },
  });
  return { deleted: result.count };
}

export async function getIntelStorageStats() {
  const [snapshots, articles, pipelineRuns, ingestionRuns, latestArticle] =
    await Promise.all([
      prismaRead.intelAnalysisSnapshot.count(),
      prismaRead.externalArticle.count(),
      prismaRead.pipelineJobRun.count(),
      prismaRead.ingestionSyncRun.count(),
      prismaRead.externalArticle.findFirst({
        orderBy: { fetchedAt: "desc" },
        select: { fetchedAt: true },
      }),
    ]);

  const byKind = await prismaRead.intelAnalysisSnapshot.groupBy({
    by: ["kind"],
    _count: { id: true },
    _max: { generatedAt: true },
  });

  return {
    intel_snapshots: snapshots,
    external_articles: articles,
    pipeline_job_runs: pipelineRuns,
    ingestion_sync_runs: ingestionRuns,
    latest_article_at: latestArticle?.fetchedAt?.toISOString() ?? null,
    snapshots_by_kind: byKind.map((g) => ({
      kind: g.kind,
      count: g._count.id,
      latest_at: g._max.generatedAt?.toISOString() ?? null,
    })),
  };
}
