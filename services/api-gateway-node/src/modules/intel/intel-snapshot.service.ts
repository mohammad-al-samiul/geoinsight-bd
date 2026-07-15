import { IntelSnapshotKind, Prisma } from "@prisma/client";
import { prismaRead, prismaWrite } from "../../core/database/prisma.client";

const MAX_AGE_MS: Record<IntelSnapshotKind, number> = {
  BRIEFING: 20 * 60_000,
  OUTLOOK: 45 * 60_000,
  UNREST: 20 * 60_000,
};

export async function saveIntelSnapshot(input: {
  kind: IntelSnapshotKind;
  lang?: string;
  scopeKey?: string | null;
  payload: Record<string, unknown>;
  sourceCount?: number;
  llmUsed?: boolean;
}): Promise<void> {
  await prismaWrite.intelAnalysisSnapshot.create({
    data: {
      kind: input.kind,
      lang: input.lang ?? "bn",
      scopeKey: input.scopeKey ?? null,
      payload: input.payload as Prisma.InputJsonValue,
      sourceCount: input.sourceCount ?? 0,
      llmUsed: input.llmUsed ?? false,
    },
  });
}

export async function getLatestIntelSnapshot(
  kind: IntelSnapshotKind,
  lang = "bn",
  scopeKey: string | null = null,
): Promise<Record<string, unknown> | null> {
  const row = await prismaRead.intelAnalysisSnapshot.findFirst({
    where: {
      kind,
      lang,
      scopeKey: scopeKey ?? null,
    },
    orderBy: { generatedAt: "desc" },
  });
  if (!row) return null;

  const ageMs = Date.now() - row.generatedAt.getTime();
  if (ageMs > MAX_AGE_MS[kind]) return null;

  const payload = row.payload as Record<string, unknown>;
  return {
    ...payload,
    _snapshot: {
      id: row.id,
      generated_at: row.generatedAt.toISOString(),
      llm_used: row.llmUsed,
      source_count: row.sourceCount,
      from_db: true,
    },
  };
}
