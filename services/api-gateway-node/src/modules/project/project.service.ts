import { prismaRead } from "../../core/database/prisma.client";
import { ApiError } from "../../core/errors/api.error";
import { LiveSignalType } from "@prisma/client";
import { env } from "../../core/config/env";
import { getCurrentMandate } from "../../shared/gov/current-mandate";
import { projectUnitScopeWhere } from "../../shared/scope/admin-unit-filter";
import { ListProjectsQuery } from "./project.validator";

function progressPct(allocated: number, spent: number, status: string): number {
  if (status === "COMPLETED") return 100;
  if (status === "CANCELLED") return 0;
  if (status === "PLANNED") return Math.min(15, Math.round((spent / Math.max(allocated, 1)) * 100));
  if (status === "STALLED") {
    return Math.min(55, Math.max(10, Math.round((spent / Math.max(allocated, 1)) * 100)));
  }
  return Math.min(98, Math.round((spent / Math.max(allocated, 1)) * 100));
}

function pickResponsible(
  candidates: Array<{ id: string; name: string; role: string; party: string | null }>,
) {
  const rank = (role: string) =>
    role === "MINISTER" ? 0 : role === "MP" ? 1 : role === "DC" ? 2 : 3;
  const sorted = [...candidates].sort((a, b) => rank(a.role) - rank(b.role));
  return sorted[0] ?? null;
}

export class ProjectService {
  /**
   * Always prefer DB ADP projects (budget / status / unit).
   * LIVE_DATA_ONLY only adds live news signal counts — it must not zero budgets.
   */
  async listByUnit(query: ListProjectsQuery) {
    const mandate = getCurrentMandate({
      CURRENT_GOVERNMENT_SINCE: env.CURRENT_GOVERNMENT_SINCE,
      CURRENT_GOVERNMENT_PARTY: env.CURRENT_GOVERNMENT_PARTY,
    });

    const rows = await prismaRead.project.findMany({
      where: {
        ...(query.unitId && projectUnitScopeWhere(query.unitId)),
        ...(query.status && { status: query.status }),
      },
      select: {
        id: true,
        title: true,
        budgetAllocated: true,
        budgetSpent: true,
        status: true,
        contractorNid: true,
        startDate: true,
        blockchainTx: true,
        adminUnitId: true,
        adminUnit: { select: { id: true, name: true, type: true } },
        _count: { select: { redFlagAlerts: true } },
      },
      orderBy: { startDate: "desc" },
      take: 500,
    });

    const unitIds = [...new Set(rows.map((r) => r.adminUnitId))];
    const reps = unitIds.length
      ? await prismaRead.representative.findMany({
          where: {
            adminUnitId: { in: unitIds },
            OR: [{ tenureEnd: null }, { tenureEnd: { gt: new Date() } }],
          },
          select: { id: true, name: true, role: true, party: true, adminUnitId: true },
        })
      : [];

    const repsByUnit = new Map<string, typeof reps>();
    for (const r of reps) {
      const list = repsByUnit.get(r.adminUnitId) ?? [];
      list.push(r);
      repsByUnit.set(r.adminUnitId, list);
    }

    let liveByUnit = new Map<string, number>();
    if (env.LIVE_DATA_ONLY && unitIds.length) {
      const signals = await prismaRead.liveSignal.groupBy({
        by: ["adminUnitId"],
        where: {
          signalType: { in: [LiveSignalType.PROJECT, LiveSignalType.POLICY, LiveSignalType.ALERT] },
          adminUnitId: { in: unitIds },
          createdAt: { gte: mandate.termStartedAt },
        },
        _count: { _all: true },
      });
      liveByUnit = new Map(
        signals
          .filter((s) => s.adminUnitId)
          .map((s) => [s.adminUnitId as string, s._count._all]),
      );
    }

    return rows.map((r) => {
      const allocated = Number(r.budgetAllocated);
      const spent = Number(r.budgetSpent);
      const responsible = pickResponsible(repsByUnit.get(r.adminUnitId) ?? []);
      return {
        id: r.id,
        title: r.title,
        budgetAllocated: allocated,
        budgetSpent: spent,
        status: r.status,
        contractorNid: r.contractorNid,
        startDate: r.startDate,
        blockchainTx: env.FABRIC_ENABLED ? r.blockchainTx : null,
        provenance: "SEED" as const,
        adminUnitId: r.adminUnitId,
        adminUnit: r.adminUnit,
        progressPct: progressPct(allocated, spent, r.status),
        responsibleId: responsible?.id ?? null,
        responsibleName: responsible?.name ?? null,
        responsibleRole: responsible?.role ?? null,
        responsibleParty: responsible?.party ?? mandate.rulingParty,
        liveSignalCount: liveByUnit.get(r.adminUnitId) ?? 0,
        government: {
          ruling_party: mandate.rulingParty,
          term_started_on: mandate.termStartedOn,
          label_bn: mandate.labelBn,
          label_en: mandate.labelEn,
        },
        _count: r._count,
      };
    });
  }

  async getById(projectId: string) {
    const mandate = getCurrentMandate({
      CURRENT_GOVERNMENT_SINCE: env.CURRENT_GOVERNMENT_SINCE,
      CURRENT_GOVERNMENT_PARTY: env.CURRENT_GOVERNMENT_PARTY,
    });

    const project = await prismaRead.project.findUnique({
      where: { id: projectId },
      include: {
        adminUnit: { select: { id: true, name: true, type: true } },
        redFlagAlerts: {
          orderBy: { severity: "desc" },
          take: 10,
        },
      },
    });
    if (!project) throw ApiError.notFound("Project not found");

    const reps = await prismaRead.representative.findMany({
      where: {
        adminUnitId: project.adminUnitId,
        OR: [{ tenureEnd: null }, { tenureEnd: { gt: new Date() } }],
      },
      select: { id: true, name: true, role: true, party: true },
    });
    const responsible = pickResponsible(reps);
    const allocated = Number(project.budgetAllocated);
    const spent = Number(project.budgetSpent);

    let liveNews: Array<{ id: string; title: string; url: string | null; sourceName: string; publishedAt: string | null }> =
      [];
    if (env.LIVE_DATA_ONLY) {
      const unitName = project.adminUnit?.name?.split(" ")[0] ?? "";
      const signals = await prismaRead.liveSignal.findMany({
        where: {
          signalType: { in: [LiveSignalType.PROJECT, LiveSignalType.POLICY, LiveSignalType.ALERT] },
          createdAt: { gte: mandate.termStartedAt },
          OR: [
            { adminUnitId: project.adminUnitId },
            ...(unitName
              ? [{ district: { contains: unitName, mode: "insensitive" as const } }]
              : []),
          ],
        },
        orderBy: { publishedAt: "desc" },
        take: 8,
      });
      liveNews = signals.map((s) => ({
        id: s.id,
        title: s.title,
        url: s.url,
        sourceName: s.sourceName,
        publishedAt: s.publishedAt?.toISOString() ?? s.createdAt.toISOString(),
      }));
    }

    return {
      ...project,
      blockchainTx: env.FABRIC_ENABLED ? project.blockchainTx : null,
      provenance: "SEED" as const,
      budgetAllocated: allocated,
      budgetSpent: spent,
      progressPct: progressPct(allocated, spent, project.status),
      responsibleId: responsible?.id ?? null,
      responsibleName: responsible?.name ?? null,
      responsibleRole: responsible?.role ?? null,
      responsibleParty: responsible?.party ?? mandate.rulingParty,
      liveNews,
      government: {
        ruling_party: mandate.rulingParty,
        term_started_on: mandate.termStartedOn,
        label_bn: mandate.labelBn,
        label_en: mandate.labelEn,
      },
    };
  }
}
