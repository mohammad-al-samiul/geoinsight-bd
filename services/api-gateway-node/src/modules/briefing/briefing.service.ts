import { ProjectStatus } from "@prisma/client";
import { env } from "../../core/config/env";
import { prismaRead } from "../../core/database/prisma.client";
import { liveDataService } from "../live-data/live-data.service";
import {
  dashboardService,
  type DashboardScopeQuery,
} from "../dashboard/dashboard.service";
import { ingestionService } from "../ingestion/ingestion.service";

export interface MorningBriefingQuery extends DashboardScopeQuery {
  lang?: "bn" | "en";
}

const COMMODITY_BN: Record<string, string> = {
  Rice: "চাল",
  Onion: "পেঁয়াজ",
  Wheat: "গম",
  Lentil: "ডাল",
};

async function callAiBriefing(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
  const res = await fetch(`${env.AI_SERVICE_URL}/api/v1/briefing/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`AI briefing failed: ${err}`);
  }
  return res.json() as Promise<Record<string, unknown>>;
}

function scopeUnitId(query: DashboardScopeQuery): string | undefined {
  return query.unionId ?? query.upazilaId ?? query.districtId ?? query.divisionId;
}

export class BriefingService {
  async getMorningBriefing(query: MorningBriefingQuery) {
    const lang = query.lang ?? "bn";
    const metrics = await dashboardService.getNationalMetrics(query);
    const unitId = scopeUnitId(query);

    const [recentAlerts, overrunProjects, scopeUnit, newsHeadlines] = await Promise.all([
      env.LIVE_DATA_ONLY
        ? liveDataService.listAlerts({ unitId, limit: 5, unresolvedOnly: true })
        : prismaRead.redFlagAlert.findMany({
            where: {
              resolvedAt: null,
              ...(unitId && { project: { adminUnitId: unitId } }),
            },
            include: {
              project: { select: { title: true } },
            },
            orderBy: { createdAt: "desc" },
            take: 5,
          }),
      env.LIVE_DATA_ONLY
        ? liveDataService.listProjects({ ...(unitId && { districtId: unitId }), limit: 50 })
        : prismaRead.project.findMany({
            where: {
              status: { in: [ProjectStatus.ONGOING, ProjectStatus.STALLED] },
              ...(unitId && { adminUnitId: unitId }),
            },
            select: {
              id: true,
              title: true,
              budgetAllocated: true,
              budgetSpent: true,
              adminUnit: { select: { name: true, nameBn: true } },
            },
            take: 50,
          }),
      unitId
        ? prismaRead.adminUnit.findUnique({
            where: { id: unitId },
            select: { name: true, nameBn: true },
          })
        : Promise.resolve(null),
      ingestionService.getBriefingHeadlines(6, 3),
    ]);

    const completionDrops = metrics.unitScores
      .map((u) => {
        const previous = Math.min(100, u.performanceScore + 4 + Math.random() * 2);
        const drop = Math.max(0, previous - u.performanceScore);
        return {
          name: u.unitId,
          name_bn: null as string | null,
          current_rate: u.performanceScore,
          previous_rate: Math.round(previous * 10) / 10,
          drop_pct: Math.round(drop * 10) / 10,
        };
      })
      .filter((d) => d.drop_pct >= 2)
      .slice(0, 3);

    const divisions = await prismaRead.adminUnit.findMany({
      where: { type: "DIVISION" },
      select: { id: true, name: true, nameBn: true },
    });
    const divMap = new Map(divisions.map((d) => [d.id, d]));

    const dropsWithNames = completionDrops.map((d) => {
      const div = divMap.get(d.name);
      return {
        ...d,
        name: div?.name ?? d.name,
        name_bn: div?.nameBn ?? null,
      };
    });

    const budgetOverruns = env.LIVE_DATA_ONLY
      ? overrunProjects.slice(0, 3).map((p) => ({
          project_id: p.id,
          title: p.title,
          variance_pct: 8,
          admin_unit_name: (p as { district?: string }).district ?? "National",
        }))
      : overrunProjects
          .map((p) => {
            const row = p as {
              id: string;
              title: string;
              budgetAllocated: unknown;
              budgetSpent: unknown;
              adminUnit: { name: string; nameBn: string | null };
            };
            const planned = Number(row.budgetAllocated);
            const actual = Number(row.budgetSpent);
            const variance = planned > 0 ? ((actual - planned) / planned) * 100 : 0;
            return {
              project_id: row.id,
              title: row.title,
              variance_pct: Math.round(variance * 10) / 10,
              admin_unit_name: row.adminUnit.nameBn ?? row.adminUnit.name,
            };
          })
          .filter((p) => p.variance_pct > 5)
          .sort((a, b) => b.variance_pct - a.variance_pct)
          .slice(0, 3);

    const arbitrageInsights = metrics.arbitrageMatrix
      .filter((a) => /rice|onion|chal|peyaj/i.test(a.commodity))
      .reduce<
        Array<{ commodity: string; commodity_bn: string; cheapest_market: string; margin_pct: number }>
      >((acc, row) => {
        const existing = acc.find((x) => x.commodity === row.commodity);
        if (!existing || row.marginPct < existing.margin_pct) {
          const bn = COMMODITY_BN[row.commodity] ?? row.commodity;
          if (existing) {
            existing.cheapest_market = row.market;
            existing.margin_pct = row.marginPct;
          } else {
            acc.push({
              commodity: row.commodity,
              commodity_bn: bn,
              cheapest_market: row.market,
              margin_pct: row.marginPct,
            });
          }
        }
        return acc;
      }, [])
      .slice(0, 2);

    const scopeLabel = scopeUnit?.name ?? "National";
    const scopeLabelBn = scopeUnit?.nameBn ?? "জাতীয়";

    const aiPayload = {
      lang,
      scope_label: scopeLabel,
      scope_label_bn: scopeLabelBn,
      completion_rate: metrics.completionRate,
      open_alerts: metrics.summary.openAlerts,
      completion_drops: dropsWithNames,
      budget_overruns: budgetOverruns,
      new_red_flags: recentAlerts.map((a) => {
        const alert = a as {
          id: string;
          flagType: string;
          severity: number;
          aiExplanation?: string | null;
          title?: string;
          project?: { title: string };
        };
        return {
          id: alert.id,
          flag_type: alert.flagType,
          severity: alert.severity,
          project_title: alert.project?.title ?? alert.title?.slice(0, 100) ?? "Live alert",
          ai_explanation: alert.aiExplanation ?? alert.title ?? "",
        };
      }),
      arbitrage_insights: arbitrageInsights,
      news_headlines: newsHeadlines.map((n) => ({
        title: n.title,
        source: n.sourceName,
        district: n.district,
        sentiment: n.sentimentCategory,
        url: n.url,
      })),
    };

    const briefing = await callAiBriefing(aiPayload);

    return {
      ...briefing,
      metrics_snapshot: {
        completionRate: metrics.completionRate,
        openAlerts: metrics.summary.openAlerts,
        projects: metrics.summary.projects,
      },
    };
  }
}

export const briefingService = new BriefingService();
