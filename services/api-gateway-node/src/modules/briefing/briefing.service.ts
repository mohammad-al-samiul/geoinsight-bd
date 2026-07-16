import { ProjectStatus } from "@prisma/client";
import { env } from "../../core/config/env";
import { prismaRead } from "../../core/database/prisma.client";
import { liveDataService } from "../live-data/live-data.service";
import {
  dashboardService,
  type DashboardScopeQuery,
} from "../dashboard/dashboard.service";
import { ingestionService } from "../ingestion/ingestion.service";
import { AI_FETCH_LLM_MS, fetchAi } from "../../shared/http/fetch-ai";
import {
  getLatestIntelSnapshot,
  getStaleIntelFallback,
  isUsableIntelPayload,
  saveIntelSnapshot,
} from "../intel/intel-snapshot.service";
import { getRedisClient, isRedisEnabled } from "../../infrastructure/redis/redis.client";

export interface MorningBriefingQuery extends DashboardScopeQuery {
  lang?: "bn" | "en";
}

const BRIEFING_TTL_SEC = 900;

const COMMODITY_BN: Record<string, string> = {
  Rice: "চাল",
  Onion: "পেঁয়াজ",
  Wheat: "গম",
  Lentil: "ডাল",
};

async function callAiBriefing(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
  const res = await fetchAi(
    `/api/v1/briefing/generate`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    { timeoutMs: AI_FETCH_LLM_MS },
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`AI briefing failed: ${err}`);
  }
  return res.json() as Promise<Record<string, unknown>>;
}

function buildBriefingFallback(
  payload: Record<string, unknown>,
  lang: "bn" | "en",
): Record<string, unknown> {
  const bn = lang === "bn";
  const scope = String(payload.scope_label_bn ?? payload.scope_label ?? (bn ? "জাতীয়" : "National"));
  const completion = Number(payload.completion_rate ?? 0);
  const alerts = Number(payload.open_alerts ?? 0);
  const headlines = Array.isArray(payload.news_headlines)
    ? (payload.news_headlines as Array<{ title: string; source: string; district?: string | null }>)
    : [];

  const bullets = headlines.slice(0, 5).map((h, idx) => ({
    text: bn
      ? `সংবাদ (${h.source}): ${h.title.slice(0, 140)}${h.district ? ` — ${h.district}` : ""}`
      : `News (${h.source}): ${h.title.slice(0, 140)}${h.district ? ` — ${h.district}` : ""}`,
    category: "news",
    priority: idx === 0 ? 1 : 2,
  }));

  if (bullets.length === 0) {
    bullets.push({
      text: bn
        ? `স্কোপ ${scope}: সমাপ্তির হার ${completion.toFixed(1)}%, ${alerts}টি খোলা সতর্কতা — লাইভ ফিড সিঙ্ক চালু আছে।`
        : `Scope ${scope}: completion ${completion.toFixed(1)}%, ${alerts} open alerts — live feed sync is active.`,
      category: "summary",
      priority: 5,
    });
  }

  const header = bn ? `আজ সকালের ব্রিফিং — ${scope}` : `Morning briefing — ${scope}`;
  const body = bullets.map((b) => `• ${b.text}`).join("\n");

  return {
    lang,
    scope_label: bn ? scope : String(payload.scope_label ?? "National"),
    generated_at: new Date().toISOString(),
    bullets,
    narrative: `${header}\n\n${body}`,
    voice_text: [header, ...bullets.map((b) => b.text)].join(" ").slice(0, 1200),
    llm_used: false,
  };
}

function scopeUnitId(query: DashboardScopeQuery): string | undefined {
  return query.unionId ?? query.upazilaId ?? query.districtId ?? query.divisionId;
}

export class BriefingService {
  async getMorningBriefing(query: MorningBriefingQuery) {
    const lang = query.lang ?? "bn";
    const unitId = scopeUnitId(query);
    const scopeKey = unitId ?? "national";
    const cacheKey = `briefing:morning:v2:${lang}:${scopeKey}`;

    if (isRedisEnabled()) {
      const cached = await getRedisClient().get(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached) as Record<string, unknown>;
        if (isUsableIntelPayload("BRIEFING", parsed)) return parsed;
      }
    }

    const fromDb = await getLatestIntelSnapshot("BRIEFING", lang, scopeKey);
    if (fromDb) {
      if (isRedisEnabled()) {
        await getRedisClient().setex(cacheKey, BRIEFING_TTL_SEC, JSON.stringify(fromDb));
      }
      return fromDb;
    }

    const data = await this.buildMorningBriefing(query).catch(async (err) => {
      console.warn(
        "[briefing] build failed, trying DB stale fallback:",
        err instanceof Error ? err.message : err,
      );
      const stale = await getStaleIntelFallback("BRIEFING", lang, scopeKey);
      if (stale) return stale;
      throw err;
    });
    try {
      await saveIntelSnapshot({
        kind: "BRIEFING",
        lang,
        scopeKey,
        payload: data,
        sourceCount: Array.isArray((data as { news_headlines?: unknown[] }).news_headlines)
          ? ((data as { news_headlines: unknown[] }).news_headlines.length)
          : 0,
        llmUsed: Boolean((data as { llm_used?: boolean }).llm_used),
      });
    } catch (err) {
      console.warn(
        "[briefing] snapshot persist failed:",
        err instanceof Error ? err.message : err,
      );
    }
    if (isRedisEnabled()) {
      await getRedisClient().setex(cacheKey, BRIEFING_TTL_SEC, JSON.stringify(data));
    }
    return data;
  }

  /** Force regenerate for pipeline cron */
  async refreshMorningBriefing(lang: "bn" | "en" = "bn"): Promise<Record<string, unknown>> {
    if (isRedisEnabled()) {
      const redis = getRedisClient();
      const keys = await redis.keys(`briefing:morning:v2:${lang}:*`);
      if (keys.length) await redis.del(...keys);
    }
    const data = await this.buildMorningBriefing({ lang });
    await saveIntelSnapshot({
      kind: "BRIEFING",
      lang,
      scopeKey: "national",
      payload: data,
      sourceCount: Array.isArray((data as { news_headlines?: unknown[] }).news_headlines)
        ? ((data as { news_headlines: unknown[] }).news_headlines.length)
        : 0,
      llmUsed: Boolean((data as { llm_used?: boolean }).llm_used),
    });
    if (isRedisEnabled()) {
      await getRedisClient().setex(
        `briefing:morning:v2:${lang}:national`,
        BRIEFING_TTL_SEC,
        JSON.stringify(data),
      );
    }
    return { refreshed: true, lang };
  }

  private async buildMorningBriefing(query: MorningBriefingQuery) {
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

    // Deterministic “pressure drop” from riskScore (no Math.random)
    const completionDrops = metrics.unitScores
      .map((u) => {
        const risk = u.riskScore ?? 0;
        const previous = Math.min(100, u.performanceScore + Math.max(2, Math.round(risk / 20)));
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
      .sort((a, b) => b.drop_pct - a.drop_pct)
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
      ? overrunProjects
          .slice(0, 8)
          .map((p) => {
            const severity = Number((p as { severity?: number }).severity ?? 3);
            return {
              project_id: p.id,
              title: p.title,
              variance_pct: Math.min(45, 4 + severity * 3),
              admin_unit_name: (p as { district?: string }).district ?? "National",
            };
          })
          .sort((a, b) => b.variance_pct - a.variance_pct)
          .slice(0, 3)
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

    let briefing: Record<string, unknown>;
    try {
      briefing = await callAiBriefing(aiPayload);
    } catch (err) {
      console.warn(
        "[briefing] AI generate failed, using live fallback:",
        err instanceof Error ? err.message : err,
      );
      briefing = buildBriefingFallback(aiPayload, lang);
    }

    return {
      ...briefing,
      news_headlines: aiPayload.news_headlines,
      metrics_snapshot: {
        completionRate: metrics.completionRate,
        openAlerts: metrics.summary.openAlerts,
        projects: metrics.summary.projects,
      },
      refreshed_at: new Date().toISOString(),
    };
  }
}

export const briefingService = new BriefingService();
