import {
  ComplaintStatus,
  LocalVisitReason,
  LocalVisitStatus,
  UserRole,
} from "@prisma/client";
import { prismaRead, prismaWrite } from "../../core/database/prisma.client";
import { ApiError } from "../../core/errors/api.error";
import { AI_FETCH_LLM_MS, fetchAi } from "../../shared/http/fetch-ai";
import {
  assertWardBelongsToEntity,
  resolveLocalEntityId,
} from "./local-entity.scope";
import { wpiService } from "./wpi.service";

export class LocalVisitService {
  async list(
    user: { role: UserRole; adminUnitId: string | null },
    opts: { entityId?: string; status?: LocalVisitStatus | "ALL" } = {},
  ) {
    const entityId = await resolveLocalEntityId(user, opts.entityId);
    const items = await prismaRead.localVisitPlan.findMany({
      where: {
        entityId,
        ...(opts.status && opts.status !== "ALL" ? { status: opts.status } : {}),
      },
      orderBy: [{ status: "asc" }, { scheduledAt: "asc" }],
      take: 60,
      include: {
        ward: { select: { id: true, code: true, name: true, nameBn: true } },
      },
    });

    const suggestions = await this.suggest(user, { entityId });

    return {
      entityId,
      generatedAt: new Date().toISOString(),
      summary: {
        planned: items.filter((i) => i.status === LocalVisitStatus.PLANNED).length,
        done: items.filter((i) => i.status === LocalVisitStatus.DONE).length,
        suggestions: suggestions.length,
      },
      items,
      suggestions,
      llmUsed: suggestions.some((s) => Boolean(s.meta?.llmUsed)),
    };
  }

  async suggest(
    user: { role: UserRole; adminUnitId: string | null },
    opts: { entityId?: string } = {},
  ) {
    const entityId = await resolveLocalEntityId(user, opts.entityId);
    const entity = await prismaRead.adminUnit.findUnique({
      where: { id: entityId },
      select: { name: true, nameBn: true },
    });
    const [wpi, reds] = await Promise.all([
      wpiService.list(user, { entityId }),
      prismaRead.citizenComplaint.findMany({
        where: {
          entityId,
          isRedAlert: true,
          status: { not: ComplaintStatus.RESOLVED },
        },
        select: {
          id: true,
          title: true,
          titleBn: true,
          wardId: true,
          ward: { select: { id: true, code: true, name: true, nameBn: true } },
        },
        take: 8,
      }),
    ]);

    const candidates: Array<{
      reason: LocalVisitReason;
      title: string;
      titleBn: string;
      wardId: string | null;
      wardName: string | null;
      priority: number;
      meta?: Record<string, unknown>;
    }> = [];

    for (const w of wpi.items.filter((x) => x.score < 60).slice(0, 5)) {
      candidates.push({
        reason: LocalVisitReason.WPI_DROP,
        title: `Field visit — ${w.ward.name} (WPI ${w.score})`,
        titleBn: `ফিল্ড ভিজিট — ${w.ward.nameBn || w.ward.name} (WPI ${w.score})`,
        wardId: w.wardId,
        wardName: w.ward.name,
        priority: Math.round(100 - w.score),
        meta: { score: w.score },
      });
    }
    for (const c of reds) {
      candidates.push({
        reason: LocalVisitReason.RED_ALERT,
        title: `Dispatch visit — ${c.title}`,
        titleBn: `ডিসপ্যাচ ভিজিট — ${c.titleBn || c.title}`,
        wardId: c.wardId,
        wardName: c.ward.name,
        priority: 95,
        meta: { complaintId: c.id },
      });
    }
    candidates.sort((a, b) => b.priority - a.priority);

    const heuristicTop3 = candidates.slice(0, 3).map((c, i) => ({
      ...c,
      meta: { ...(c.meta ?? {}), rank: i + 1, llmUsed: false },
    }));

    try {
      const res = await fetchAi(
        "/api/v1/local-ai/visit-recommend",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            entity_name: entity?.nameBn || entity?.name || "",
            candidates: candidates.slice(0, 12).map((c) => ({
              reason: c.reason,
              title: c.title,
              title_bn: c.titleBn,
              ward_id: c.wardId,
              ward_name: c.wardName,
              priority: c.priority,
              meta: c.meta ?? {},
            })),
            lang: "bn",
            top_n: 3,
          }),
        },
        { timeoutMs: AI_FETCH_LLM_MS },
      );
      if (!res.ok) return heuristicTop3;
      const data = (await res.json()) as {
        items?: Array<{
          reason?: string;
          title?: string;
          title_bn?: string;
          ward_id?: string | null;
          ward_name?: string | null;
          priority?: number;
          meta?: Record<string, unknown>;
          rank?: number;
        }>;
        llm_used?: boolean;
      };
      if (!Array.isArray(data.items) || !data.items.length) return heuristicTop3;

      const reasons = new Set(Object.values(LocalVisitReason));
      return data.items.slice(0, 3).map((row, i) => {
        const reason = reasons.has(row.reason as LocalVisitReason)
          ? (row.reason as LocalVisitReason)
          : LocalVisitReason.MANUAL;
        return {
          reason,
          title: String(row.title || heuristicTop3[i]?.title || "Field visit"),
          titleBn: String(row.title_bn || row.title || heuristicTop3[i]?.titleBn || ""),
          wardId: row.ward_id ?? heuristicTop3[i]?.wardId ?? null,
          wardName: row.ward_name ?? heuristicTop3[i]?.wardName ?? null,
          priority: typeof row.priority === "number" ? row.priority : 50,
          meta: {
            ...(row.meta ?? {}),
            rank: row.rank ?? i + 1,
            llmUsed: Boolean(data.llm_used),
          },
        };
      });
    } catch {
      return heuristicTop3;
    }
  }

  async create(
    user: { id: string; role: UserRole; adminUnitId: string | null },
    input: {
      entityId?: string;
      wardId?: string;
      title: string;
      titleBn?: string;
      reason?: LocalVisitReason;
      scheduledAt?: string;
      notes?: string;
      priority?: number;
    },
  ) {
    const entityId = await resolveLocalEntityId(user, input.entityId);
    if (input.wardId) await assertWardBelongsToEntity(input.wardId, entityId);
    const scheduledAt = input.scheduledAt
      ? new Date(input.scheduledAt)
      : new Date(Date.now() + 24 * 60 * 60_000);

    return prismaWrite.localVisitPlan.create({
      data: {
        entityId,
        wardId: input.wardId || null,
        title: input.title.trim(),
        titleBn: input.titleBn?.trim() || null,
        reason: input.reason ?? LocalVisitReason.MANUAL,
        scheduledAt,
        notes: input.notes?.trim() || null,
        priority: input.priority ?? 50,
        createdById: user.id,
      },
      include: {
        ward: { select: { id: true, code: true, name: true, nameBn: true } },
      },
    });
  }

  async updateStatus(
    user: { role: UserRole; adminUnitId: string | null },
    visitId: string,
    status: LocalVisitStatus,
  ) {
    const row = await prismaRead.localVisitPlan.findUnique({ where: { id: visitId } });
    if (!row) throw ApiError.notFound("Visit not found");
    await resolveLocalEntityId(user, row.entityId);
    return prismaWrite.localVisitPlan.update({
      where: { id: visitId },
      data: { status },
      include: {
        ward: { select: { id: true, code: true, name: true, nameBn: true } },
      },
    });
  }
}

export const localVisitService = new LocalVisitService();
