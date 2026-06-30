import { prismaRead } from "../../core/database/prisma.client";
import type { DashboardScopeQuery } from "../dashboard/dashboard.service";

const EXTRA_TERMS: Record<string, string[]> = {
  dhaka: ["dhaka", "ঢাকা", "dncc", "dscc"],
  chattogram: ["chattogram", "chittagong", "চট্টগ্রাম"],
  sylhet: ["sylhet", "সিলেট"],
  khulna: ["khulna", "খুলনা"],
};

function extractSearchTerms(message: string): string[] {
  const raw = message.toLowerCase().split(/[\s,.:;!?()]+/).filter((t) => t.length > 2);
  const terms = new Set(raw);
  for (const [key, aliases] of Object.entries(EXTRA_TERMS)) {
    if (raw.some((t) => t.includes(key) || aliases.some((a) => message.toLowerCase().includes(a)))) {
      aliases.forEach((a) => terms.add(a));
    }
  }
  return [...terms];
}

export async function buildSovereignContext(
  userMessage: string,
  scope: DashboardScopeQuery = {},
): Promise<string> {
  const q = userMessage.trim();
  const searchTerms = extractSearchTerms(q);
  const scopeUnitId =
    scope.unionId ?? scope.upazilaId ?? scope.districtId ?? scope.divisionId;

  const unitOr =
    searchTerms.length > 0
      ? searchTerms.flatMap((t) => [
          { name: { contains: t, mode: "insensitive" as const } },
          { nameBn: { contains: t, mode: "insensitive" as const } },
        ])
      : [];

  const matchedUnits =
    unitOr.length > 0
      ? await prismaRead.adminUnit.findMany({
          where: { OR: unitOr },
          take: 8,
          select: { id: true, name: true, nameBn: true, type: true },
        })
      : [];

  const unitIds = scopeUnitId
    ? [scopeUnitId]
    : matchedUnits.length > 0
      ? matchedUnits.map((u) => u.id)
      : [];

  const projectFilter =
    unitIds.length > 0 || searchTerms.length > 0
      ? {
          AND: [
            unitIds.length > 0 ? { adminUnitId: { in: unitIds } } : {},
            searchTerms.length > 0
              ? {
                  OR: [
                    { title: { contains: q, mode: "insensitive" as const } },
                    ...searchTerms.map((t) => ({
                      title: { contains: t, mode: "insensitive" as const },
                    })),
                  ],
                }
              : {},
          ],
        }
      : {};

  const [projects, alerts, kpis, reps] = await Promise.all([
    prismaRead.project.findMany({
      where: Object.keys(projectFilter).length ? projectFilter : undefined,
      include: {
        adminUnit: { select: { name: true, nameBn: true } },
        _count: {
          select: {
            redFlagAlerts: { where: { resolvedAt: null } },
          },
        },
      },
      take: 12,
      orderBy: { updatedAt: "desc" },
    }),
    prismaRead.redFlagAlert.findMany({
      where: {
        resolvedAt: null,
        ...(unitIds.length > 0
          ? { project: { adminUnitId: { in: unitIds } } }
          : searchTerms.length > 0
            ? {
                OR: searchTerms.flatMap((t) => [
                  { aiExplanation: { contains: t, mode: "insensitive" as const } },
                  { project: { title: { contains: t, mode: "insensitive" as const } } },
                ]),
              }
            : {}),
      },
      include: {
        project: {
          select: {
            title: true,
            adminUnit: { select: { name: true, nameBn: true } },
          },
        },
      },
      take: 8,
      orderBy: { severity: "desc" },
    }),
    prismaRead.kpiRecord.findMany({
      where:
        unitIds.length > 0
          ? { representative: { adminUnitId: { in: unitIds } } }
          : searchTerms.length > 0
            ? {
                OR: searchTerms.flatMap((t) => [
                  { kpiDef: { name: { contains: t, mode: "insensitive" as const } } },
                  { representative: { name: { contains: t, mode: "insensitive" as const } } },
                ]),
              }
            : undefined,
      include: {
        kpiDef: { select: { name: true, code: true, unit: true } },
        representative: {
          select: { name: true, adminUnit: { select: { name: true, nameBn: true } } },
        },
      },
      take: 10,
      orderBy: { recordedAt: "desc" },
    }),
    searchTerms.length > 0
      ? prismaRead.representative.findMany({
          where: {
            OR: searchTerms.flatMap((t) => [
              { name: { contains: t, mode: "insensitive" as const } },
              { party: { contains: t, mode: "insensitive" as const } },
            ]),
          },
          include: { adminUnit: { select: { name: true, nameBn: true } } },
          take: 6,
        })
      : Promise.resolve([]),
  ]);

  const lines: string[] = [];

  if (matchedUnits.length > 0) {
    lines.push("ADMINISTRATIVE UNITS (verified DB):");
    for (const u of matchedUnits) {
      lines.push(
        `- ${u.name}${u.nameBn ? ` / ${u.nameBn}` : ""} (${u.type})`,
      );
    }
  }

  if (reps.length > 0) {
    lines.push("\nREPRESENTATIVES:");
    for (const r of reps) {
      lines.push(
        `- ${r.name} | ${r.role} | ${r.party ?? "—"} | ${r.adminUnit.name}`,
      );
    }
  }

  if (projects.length > 0) {
    lines.push("\nPROJECTS:");
    for (const p of projects) {
      const alloc = Number(p.budgetAllocated);
      const spent = Number(p.budgetSpent);
      const pct = alloc > 0 ? Math.round((spent / alloc) * 100) : 0;
      lines.push(
        `- ${p.title} | ${p.adminUnit.nameBn ?? p.adminUnit.name} | status=${p.status} | budget_used=${pct}% | open_alerts=${p._count.redFlagAlerts}`,
      );
    }
  }

  if (alerts.length > 0) {
    lines.push("\nOPEN RED FLAGS:");
    for (const a of alerts) {
      lines.push(
        `- ${a.flagType} (severity ${a.severity}) | ${a.project.title} | ${a.project.adminUnit.name} | ${(a.aiExplanation ?? "").slice(0, 150)}`,
      );
    }
  }

  if (kpis.length > 0) {
    lines.push("\nRECENT KPI RECORDS:");
    for (const k of kpis) {
      lines.push(
        `- ${k.kpiDef.name} (${k.kpiDef.code}): ${k.value}${k.kpiDef.unit ? ` ${k.kpiDef.unit}` : ""} | ${k.representative.adminUnit.nameBn ?? k.representative.adminUnit.name}`,
      );
    }
  }

  if (lines.length === 0) {
    return (
      "VERIFIED DATABASE: No records matched this query in the current administrative scope. " +
      "Tell the user clearly that live GeoInsight data was not found for this topic. " +
      "Do not invent population figures, project names, or KPI numbers."
    );
  }

  return lines.join("\n");
}
