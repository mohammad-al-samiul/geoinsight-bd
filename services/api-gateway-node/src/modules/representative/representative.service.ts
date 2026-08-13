import { prismaRead } from "../../core/database/prisma.client";
import { LiveSignalType, type Prisma } from "@prisma/client";
import { env } from "../../core/config/env";
import { getCurrentMandate } from "../../shared/gov/current-mandate";
import { representativeUnitScopeWhere } from "../../shared/scope/admin-unit-filter";
import { ListRepresentativesQuery } from "./representative.validator";

const ROLE_ORDER: Record<string, number> = {
  MINISTER: 0,
  MP: 1,
  DC: 2,
  UPAZILA_CHAIRMAN: 3,
  UNION_CHAIRMAN: 4,
  MAYOR: 5,
};

function parsePortfolio(name: string): string | null {
  const m = /\(([^)]+)\)\s*$/.exec(name.trim());
  return m?.[1]?.trim() || null;
}

function displayName(name: string): string {
  return name.replace(/\s*\([^)]+\)\s*$/, "").trim() || name;
}

export class RepresentativeService {
  /**
   * Officials from DB under the current mandate — not news headlines.
   * LIVE_DATA_ONLY adds recent mention counts from live signals.
   */
  async list(query: ListRepresentativesQuery) {
    const mandate = getCurrentMandate({
      CURRENT_GOVERNMENT_SINCE: env.CURRENT_GOVERNMENT_SINCE,
      CURRENT_GOVERNMENT_PARTY: env.CURRENT_GOVERNMENT_PARTY,
    });
    const ruling = mandate.rulingParty;

    const where: Prisma.RepresentativeWhereInput = {
      ...(query.unitId && representativeUnitScopeWhere(query.unitId)),
      OR: [{ tenureEnd: null }, { tenureEnd: { gt: new Date() } }],
      AND: [
        { NOT: { party: { contains: "Awami", mode: "insensitive" } } },
        { NOT: { name: { contains: "Hasina", mode: "insensitive" } } },
        { NOT: { name: { contains: "Quader", mode: "insensitive" } } },
        { NOT: { name: { contains: "Moudud Ahmed", mode: "insensitive" } } },
        // Political seats = ruling party; admin/local stay career/local
        {
          OR: [
            { party: { equals: ruling, mode: "insensitive" } },
            { party: { contains: "BCS", mode: "insensitive" } },
            { party: { contains: "Local", mode: "insensitive" } },
            { role: { in: ["DC", "UNION_CHAIRMAN", "UPAZILA_CHAIRMAN", "MAYOR"] } },
          ],
        },
        // Ministers/MPs must belong to this mandate term
        {
          OR: [
            { role: { in: ["DC", "UNION_CHAIRMAN", "UPAZILA_CHAIRMAN", "MAYOR"] } },
            { tenureStart: { gte: mandate.termStartedAt } },
          ],
        },
      ],
    };

    const rows = await prismaRead.representative.findMany({
      where,
      select: {
        id: true,
        name: true,
        nid: true,
        role: true,
        party: true,
        tenureStart: true,
        tenureEnd: true,
        adminUnitId: true,
        adminUnit: { select: { id: true, name: true, type: true } },
      },
    });

    rows.sort((a, b) => {
      const ra = ROLE_ORDER[a.role] ?? 9;
      const rb = ROLE_ORDER[b.role] ?? 9;
      if (ra !== rb) return ra - rb;
      const pa = parsePortfolio(a.name)?.toLowerCase() ?? "";
      const pb = parsePortfolio(b.name)?.toLowerCase() ?? "";
      if (pa.includes("prime") && !pb.includes("prime")) return -1;
      if (!pa.includes("prime") && pb.includes("prime")) return 1;
      if (pa.includes("senior") && !pb.includes("senior")) return -1;
      if (!pa.includes("senior") && pb.includes("senior")) return 1;
      return a.name.localeCompare(b.name);
    });

    let mentionByName = new Map<string, number>();
    if (env.LIVE_DATA_ONLY && rows.length) {
      const signals = await prismaRead.liveSignal.findMany({
        where: {
          signalType: {
            in: [LiveSignalType.REPRESENTATIVE, LiveSignalType.POLICY, LiveSignalType.ALERT],
          },
          createdAt: { gte: mandate.termStartedAt },
        },
        select: { title: true, body: true },
        take: 200,
      });
      for (const r of rows) {
        const needle = displayName(r.name).split(" ")[0]?.toLowerCase() ?? "";
        if (!needle || needle.length < 3) continue;
        const hits = signals.filter((s) =>
          `${s.title} ${s.body ?? ""}`.toLowerCase().includes(needle),
        ).length;
        if (hits > 0) mentionByName.set(r.id, hits);
      }
    }

    const repIds = rows.map((r) => r.id);
    const latestKpis =
      repIds.length === 0
        ? []
        : await prismaRead.kpiRecord.findMany({
            where: {
              representativeId: { in: repIds },
              kpiDef: { code: { in: ["COMPLETION", "BUDGET_UTIL"] } },
            },
            select: {
              representativeId: true,
              value: true,
              recordedAt: true,
              kpiDef: { select: { code: true } },
            },
            orderBy: { recordedAt: "desc" },
            take: repIds.length * 4,
          });

    const kpiMap = new Map<string, { completion: number | null; budgetUtil: number | null }>();
    for (const k of latestKpis) {
      const prev = kpiMap.get(k.representativeId) ?? { completion: null, budgetUtil: null };
      if (k.kpiDef.code === "COMPLETION" && prev.completion == null) {
        prev.completion = Number(k.value);
      }
      if (k.kpiDef.code === "BUDGET_UTIL" && prev.budgetUtil == null) {
        prev.budgetUtil = Number(k.value);
      }
      kpiMap.set(k.representativeId, prev);
    }

    return rows.map((r) => {
      const kpi = kpiMap.get(r.id);
      return {
        ...r,
        displayName: displayName(r.name),
        portfolio: parsePortfolio(r.name),
        liveMentions: mentionByName.get(r.id) ?? 0,
        completionPct: kpi?.completion ?? null,
        budgetUtilPct: kpi?.budgetUtil ?? null,
        government: {
          ruling_party: mandate.rulingParty,
          term_started_on: mandate.termStartedOn,
          label_bn: mandate.labelBn,
          label_en: mandate.labelEn,
        },
      };
    });
  }
}
