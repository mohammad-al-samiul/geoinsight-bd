import { prismaRead } from "../../core/database/prisma.client";
import { LiveSignalType } from "@prisma/client";
import { env } from "../../core/config/env";
import { getCurrentMandate } from "../../shared/gov/current-mandate";
import { representativeUnitScopeWhere } from "../../shared/scope/admin-unit-filter";
import { ListRepresentativesQuery } from "./representative.validator";

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

    const rows = await prismaRead.representative.findMany({
      where: {
        ...(query.unitId && representativeUnitScopeWhere(query.unitId)),
        OR: [{ tenureEnd: null }, { tenureEnd: { gt: new Date() } }],
        // Current government only — never show Awami League / prior cabinet
        AND: [
          { NOT: { party: { contains: "Awami", mode: "insensitive" } } },
          { NOT: { name: { contains: "Hasina", mode: "insensitive" } } },
          { NOT: { name: { contains: "Quader", mode: "insensitive" } } },
        ],
      },
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
      orderBy: [{ role: "asc" }, { name: "asc" }],
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
        const needle = r.name.split(" ")[0]?.toLowerCase() ?? "";
        if (!needle || needle.length < 3) continue;
        const hits = signals.filter((s) =>
          `${s.title} ${s.body ?? ""}`.toLowerCase().includes(needle),
        ).length;
        if (hits > 0) mentionByName.set(r.id, hits);
      }
    }

    // Attach KPI snapshot (latest completion / budget util) for each rep
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
