import { ProjectStatus, UserRole } from "@prisma/client";
import { prismaRead } from "../../core/database/prisma.client";
import { AI_FETCH_LLM_MS, fetchAi } from "../../shared/http/fetch-ai";
import { resolveLocalEntityId } from "./local-entity.scope";

function progressPct(allocated: number, spent: number, status: string): number {
  if (status === "COMPLETED") return 100;
  if (status === "CANCELLED") return 0;
  if (status === "PLANNED") return Math.min(15, Math.round((spent / Math.max(allocated, 1)) * 100));
  if (status === "STALLED") {
    return Math.min(55, Math.max(10, Math.round((spent / Math.max(allocated, 1)) * 100)));
  }
  return Math.min(98, Math.round((spent / Math.max(allocated, 1)) * 100));
}

export class LocalBudgetService {
  async list(
    user: { role: UserRole; adminUnitId: string | null },
    opts: { entityId?: string; status?: ProjectStatus } = {},
  ) {
    const entityId = await resolveLocalEntityId(user, opts.entityId);
    const entity = await prismaRead.adminUnit.findUnique({
      where: { id: entityId },
      select: {
        id: true,
        code: true,
        name: true,
        nameBn: true,
        parentId: true,
        districtId: true,
      },
    });

    const scopeIds = new Set<string>([entityId]);
    if (entity?.parentId) scopeIds.add(entity.parentId);
    if (entity?.districtId) scopeIds.add(entity.districtId);

    const rows = await prismaRead.project.findMany({
      where: {
        adminUnitId: { in: [...scopeIds] },
        ...(opts.status ? { status: opts.status } : {}),
      },
      select: {
        id: true,
        title: true,
        budgetAllocated: true,
        budgetSpent: true,
        status: true,
        startDate: true,
        adminUnitId: true,
        adminUnit: { select: { id: true, code: true, name: true, nameBn: true, type: true } },
        _count: { select: { redFlagAlerts: true } },
      },
      orderBy: [{ status: "asc" }, { startDate: "desc" }],
      take: 80,
    });

    const items = rows.map((r) => {
      const allocated = Number(r.budgetAllocated);
      const spent = Number(r.budgetSpent);
      return {
        id: r.id,
        title: r.title,
        status: r.status,
        budgetAllocated: allocated,
        budgetSpent: spent,
        progressPct: progressPct(allocated, spent, r.status),
        startDate: r.startDate,
        redFlags: r._count.redFlagAlerts,
        adminUnit: r.adminUnit,
        scopedToEntity: r.adminUnitId === entityId,
      };
    });

    const allocated = items.reduce((s, i) => s + i.budgetAllocated, 0);
    const spent = items.reduce((s, i) => s + i.budgetSpent, 0);
    const ongoing = items.filter((i) => i.status === "ONGOING").length;
    const stalled = items.filter((i) => i.status === "STALLED").length;
    const summary = {
      projectCount: items.length,
      allocated,
      spent,
      burnPct: allocated > 0 ? Math.round((spent / allocated) * 100) : 0,
      ongoing,
      stalled,
    };

    const aiRisk = await this.polishRisk({
      entityName: entity?.nameBn || entity?.name || "",
      summary,
      items,
    });

    return {
      entityId,
      entityCode: entity?.code ?? "",
      entityName: entity?.name ?? "",
      entityNameBn: entity?.nameBn ?? null,
      generatedAt: new Date().toISOString(),
      summary,
      items,
      aiRisk,
    };
  }

  private async polishRisk(input: {
    entityName: string;
    summary: {
      projectCount: number;
      allocated: number;
      spent: number;
      burnPct: number;
      ongoing: number;
      stalled: number;
    };
    items: Array<{
      title: string;
      status: string;
      budgetAllocated: number;
      budgetSpent: number;
      progressPct: number;
      redFlags: number;
    }>;
  }) {
    const stalled = input.items.filter((i) => i.status === "STALLED");
    const flagged = [...input.items].sort(
      (a, b) => b.redFlags - a.redFlags || Number(b.status === "STALLED") - Number(a.status === "STALLED"),
    );
    let riskLevel: "LOW" | "MEDIUM" | "HIGH" = "LOW";
    if (stalled.length || flagged.some((f) => f.redFlags >= 2)) riskLevel = "HIGH";
    else if (flagged.some((f) => f.redFlags >= 1) || input.summary.burnPct > 85) {
      riskLevel = "MEDIUM";
    }
    const fallback = {
      riskLevel,
      narrativeEn: `ADP risk ${riskLevel}: stalled ${stalled.length}, burn ${input.summary.burnPct}%.`,
      narrativeBn: `ADP ঝুঁকি ${riskLevel}: স্থবির ${stalled.length}, ব্যয় ${input.summary.burnPct}%।`,
      topRisks: flagged.slice(0, 3).map((p) => ({
        projectTitle: p.title,
        reasonEn: `${p.status}; flags ${p.redFlags}`,
        reasonBn: `${p.status}; ফ্ল্যাগ ${p.redFlags}`,
        score: p.redFlags * 20 + (p.status === "STALLED" ? 30 : 0),
      })),
      llmUsed: false,
    };
    try {
      const res = await fetchAi(
        "/api/v1/local-ai/budget-risk",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            entity_name: input.entityName,
            summary: input.summary,
            projects: input.items.slice(0, 20).map((p) => ({
              title: p.title,
              status: p.status,
              allocated: p.budgetAllocated,
              spent: p.budgetSpent,
              progress_pct: p.progressPct,
              red_flags: p.redFlags,
            })),
            lang: "bn",
          }),
        },
        { timeoutMs: AI_FETCH_LLM_MS },
      );
      if (!res.ok) return fallback;
      const data = (await res.json()) as {
        risk_level?: string;
        narrative_en?: string;
        narrative_bn?: string;
        top_risks?: Array<{
          project_title?: string;
          reason_en?: string;
          reason_bn?: string;
          score?: number;
        }>;
        llm_used?: boolean;
      };
      const rl = data.risk_level;
      return {
        riskLevel:
          rl === "LOW" || rl === "MEDIUM" || rl === "HIGH" ? rl : fallback.riskLevel,
        narrativeEn: data.narrative_en || fallback.narrativeEn,
        narrativeBn: data.narrative_bn || fallback.narrativeBn,
        topRisks: (data.top_risks ?? [])
          .filter((r) => r.project_title)
          .slice(0, 5)
          .map((r) => ({
            projectTitle: String(r.project_title),
            reasonEn: String(r.reason_en ?? ""),
            reasonBn: String(r.reason_bn ?? ""),
            score: Number(r.score ?? 0),
          })),
        llmUsed: Boolean(data.llm_used),
      };
    } catch {
      return fallback;
    }
  }
}

export const localBudgetService = new LocalBudgetService();
