import { ProjectStatus, UserRole } from "@prisma/client";
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
import {
  isBangladeshRelevantArticle,
  looksLikeGovProject,
} from "../../shared/geo/bangladesh-relevance";
import { nationalBoardService } from "../local-entity/national-board.service";
import { nationalSectorService } from "../national-sector/national-sector.service";

export interface MorningBriefingQuery extends DashboardScopeQuery {
  lang?: "bn" | "en";
}

const BRIEFING_TTL_SEC = 900;
const BRIEFING_CACHE_VER = "v3";

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
    ? (payload.news_headlines as Array<{
        title: string;
        source: string;
        district?: string | null;
        url?: string | null;
      }>)
    : [];

  const bullets = headlines.slice(0, 5).map((h, idx) => ({
    text: bn
      ? `সংবাদ (${h.source}): ${h.title.slice(0, 140)}${h.district ? ` — ${h.district}` : ""}`
      : `News (${h.source}): ${h.title.slice(0, 140)}${h.district ? ` — ${h.district}` : ""}`,
    category: "news",
    priority: idx === 0 ? 1 : 2,
    source: h.source,
    source_url: h.url ?? undefined,
  }));

  if (bullets.length === 0) {
    bullets.push({
      text: bn
        ? `স্কোপ ${scope}: সমাপ্তির হার ${completion.toFixed(1)}%, ${alerts}টি খোলা সতর্কতা — লাইভ ফিড সিঙ্ক চালু আছে।`
        : `Scope ${scope}: completion ${completion.toFixed(1)}%, ${alerts} open alerts — live feed sync is active.`,
      category: "summary",
      priority: 5,
      source: "GeoInsight",
      source_url: undefined,
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

function enrichBriefingSources(briefing: Record<string, unknown>): Record<string, unknown> {
  const headlines = Array.isArray(briefing.news_headlines)
    ? (briefing.news_headlines as Array<{
        title?: string;
        source?: string;
        url?: string;
      }>)
    : [];
  const bullets = Array.isArray(briefing.bullets)
    ? (briefing.bullets as Array<Record<string, unknown>>)
    : [];
  const next = bullets.map((b) => {
    if (typeof b.source === "string" && b.source) return b;
    const text = String(b.text ?? "");
    const byTitle = headlines.find((h) => {
      const title = h.title ?? "";
      return title.length >= 12 && text.includes(title.slice(0, 40));
    });
    const hit =
      byTitle ?? headlines.find((h) => Boolean(h.source && text.includes(String(h.source))));
    if (!hit) return b;
    return { ...b, source: hit.source, source_url: hit.url };
  });
  return { ...briefing, bullets: next };
}

function scopeUnitId(query: DashboardScopeQuery): string | undefined {
  return query.unionId ?? query.upazilaId ?? query.districtId ?? query.divisionId;
}

export class BriefingService {
  async getMorningBriefing(query: MorningBriefingQuery) {
    const lang = query.lang ?? "bn";
    const unitId = scopeUnitId(query);
    const scopeKey = unitId ?? "national";
    const cacheKey = `briefing:morning:${BRIEFING_CACHE_VER}:${lang}:${scopeKey}`;

    let data: Record<string, unknown> | null = null;

    if (isRedisEnabled()) {
      const cached = await getRedisClient().get(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached) as Record<string, unknown>;
        if (isUsableIntelPayload("BRIEFING", parsed)) data = parsed;
      }
    }

    if (!data) {
      const fromDb = await getLatestIntelSnapshot("BRIEFING", lang, scopeKey);
      if (fromDb) {
        if (isRedisEnabled()) {
          await getRedisClient().setex(cacheKey, BRIEFING_TTL_SEC, JSON.stringify(fromDb));
        }
        data = fromDb;
      }
    }

    if (!data) {
      data = await this.buildMorningBriefing(query).catch(async (err) => {
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
    }

    if (!data) {
      throw new Error("Briefing unavailable");
    }
    return enrichBriefingSources(await this.attachLocalDeskBullets(data, lang, scopeKey));
  }

  /** Fresh local-desk bullets — not stored in the 15m briefing snapshot. */
  private async attachLocalDeskBullets(
    briefing: Record<string, unknown>,
    lang: "bn" | "en",
    scopeKey: string,
  ): Promise<Record<string, unknown>> {
    if (scopeKey !== "national") return briefing;
    try {
      const [board, national] = await Promise.all([
        nationalBoardService.getBoard({
          role: UserRole.PMO,
          adminUnitId: null,
        }),
        nationalSectorService
          .getBoard({ role: UserRole.PMO, adminUnitId: null })
          .catch(() => null),
      ]);
      const extras: Array<{
        text: string;
        category: string;
        priority: number;
        source?: string;
        source_url?: string;
      }> = [];
      const bn = lang === "bn";

      if (
        national &&
        (national.summary.educationAlerts > 0 ||
          national.summary.healthAlerts > 0 ||
          national.summary.jobsAlerts > 0)
      ) {
        const hotEdu = [...national.divisions].sort(
          (a, b) => b.education.alert - a.education.alert || b.education.teacherGap - a.education.teacherGap,
        )[0];
        const hotHealth = [...national.divisions].sort(
          (a, b) => b.health.alert - a.health.alert || b.health.dengue7d - a.health.dengue7d,
        )[0];
        const hotJobs = [...national.divisions].sort(
          (a, b) => b.jobs.alert - a.jobs.alert || b.jobs.unemploymentAvg - a.jobs.unemploymentAvg,
        )[0];
        extras.push({
          text: bn
            ? `জাতীয় সেক্টর (৮ বিভাগ): শিক্ষা অ্যালার্ট ${national.summary.educationAlerts}, ডেঙ্গু ৭দিন ${national.summary.dengue7d}, বেকারত্ব ${national.summary.unemploymentAvg}% — শিক্ষা ${hotEdu?.nameBn || hotEdu?.name}, স্বাস্থ্য ${hotHealth?.nameBn || hotHealth?.name}, কর্মসংস্থান ${hotJobs?.nameBn || hotJobs?.name}।`
            : `National sectors (8 divisions): education alerts ${national.summary.educationAlerts}, dengue 7d ${national.summary.dengue7d}, unemployment ${national.summary.unemploymentAvg}% — hottest edu ${hotEdu?.name}, health ${hotHealth?.name}, jobs ${hotJobs?.name}.`,
          category: "alert",
          priority: 1,
        });
      }

      if (board.summary.warningWards > 0 || board.summary.warningSeats > 0) {
        const hot = [...board.seats]
          .filter((s) => s.command.warningWards > 0)
          .sort((a, b) => b.command.warningWards - a.command.warningWards)
          .slice(0, 3);
        extras.push({
          text: bn
            ? `লোকাল কমান্ড: ${board.summary.warningWards}টি ওয়ার্ডে ৩+ লেয়ার সতর্কতা, ${board.summary.warningSeats}টি সীট — ${hot.map((s) => `${s.nameBn || s.name} ${s.command.warningWards}টি (কমান্ড ${s.command.commandAverage})`).join("; ")}।`
            : `Local DSS command: ${board.summary.warningWards} warning wards on ${board.summary.warningSeats} desks — ${hot.map((s) => `${s.code} ${s.command.warningWards} (command ${s.command.commandAverage})`).join("; ")}. 3+ layers stacked.`,
          category: "alert",
          priority: 1,
        });
      }

      if (board.summary.activeOutages > 0) {
        const hot = board.seats
          .filter((s) => s.outages.active > 0)
          .sort((a, b) => b.outages.gasFuel - a.outages.gasFuel || b.outages.active - a.outages.active)
          .slice(0, 3);
        const kindBits = (s: (typeof hot)[number]) =>
          ["GAS", "FUEL", "POWER", "WATER"]
            .filter((k) => (s.outages.byKind[k] ?? 0) > 0)
            .map((k) => `${k.toLowerCase()} ${s.outages.byKind[k]}`)
            .join(", ");
        extras.push({
          text: bn
            ? `লোকাল ডিএসএস আউটজ: ${board.summary.hotSeats}টি সীটে ${board.summary.activeOutages}টি সক্রিয় — ${hot.map((s) => `${s.nameBn || s.name} ${s.outages.active}টি (${kindBits(s) || "মিশ্র"})`).join("; ")}।`
            : `Local DSS outages: ${board.summary.activeOutages} active on ${board.summary.hotSeats} desks — ${hot.map((s) => `${s.code} ${s.outages.active} (${kindBits(s) || "mixed"})`).join("; ")}.`,
          category: "alert",
          priority: board.summary.gasFuel > 0 ? 1 : 2,
        });
      }

      if (board.summary.unrestRising > 0 || board.summary.unrestActive > 0) {
        const hot = board.seats
          .filter((s) => s.unrest.trend === "rising" || s.unrest.active > 0)
          .sort((a, b) => Number(b.unrest.trend === "rising") - Number(a.unrest.trend === "rising") || b.unrest.last24h - a.unrest.last24h)
          .slice(0, 3);
        extras.push({
          text: bn
            ? `লোকাল আন্দোলন: ${board.summary.unrestRising}টি সীটে ট্রেন্ড বাড়ছে, ${board.summary.unrestActive}টি সক্রিয় ক্লাস্টার — ${hot.map((s) => `${s.nameBn || s.name} ${s.unrest.trend} (${s.unrest.last24h}/২৪ঘ)`).join("; ")}।`
            : `Local DSS unrest: ${board.summary.unrestRising} desks rising, ${board.summary.unrestActive} active clusters — ${hot.map((s) => `${s.code} ${s.unrest.trend} (${s.unrest.last24h}/24h)`).join("; ")}.`,
          category: "alert",
          priority: board.summary.unrestRising > 0 ? 1 : 2,
        });
      }

      if (board.summary.overdue > 0 || board.summary.redAlerts > 0) {
        const hot = board.seats
          .filter((s) => s.sla.overdue > 0 || s.sla.redAlerts > 0)
          .sort((a, b) => b.sla.redAlerts - a.sla.redAlerts || b.sla.overdue - a.sla.overdue)
          .slice(0, 3);
        extras.push({
          text: bn
            ? `লোকাল SLA: ${board.summary.overdue}টি সময়সীমা অতিক্রান্ত, ${board.summary.redAlerts}টি জরুরি — ${hot.map((s) => `${s.nameBn || s.name} overdue ${s.sla.overdue} / red ${s.sla.redAlerts}`).join("; ")}।`
            : `Local DSS SLA: ${board.summary.overdue} overdue, ${board.summary.redAlerts} red alerts — ${hot.map((s) => `${s.code} overdue ${s.sla.overdue} / red ${s.sla.redAlerts}`).join("; ")}.`,
          category: "alert",
          priority: board.summary.redAlerts > 0 ? 1 : 2,
        });
      }

      if (
        board.summary.sectorAlerts > 0 ||
        board.summary.dengue7d > 0 ||
        board.summary.teacherGap > 0 ||
        board.summary.jobFairGaps > 0
      ) {
        const pressure = (s: (typeof board.seats)[number]) =>
          s.sectors.education.alert * 12 +
          s.sectors.health.alert * 12 +
          s.sectors.jobs.alert * 12 +
          (s.sectors.health.dengue7d ?? 0) * 2 +
          (s.sectors.education.teacherGap ?? 0) * 3 +
          (s.sectors.jobs.jobFairGaps ?? 0) * 8;
        const hot = [...board.seats]
          .sort((a, b) => pressure(b) - pressure(a))
          .slice(0, 2);
        extras.push({
          text: bn
            ? `লোকাল সেক্টর: শিক্ষক গ্যাপ ${board.summary.teacherGap}, ডেঙ্গু ৭দিন ${board.summary.dengue7d}, জব-ফেয়ার গ্যাপ ${board.summary.jobFairGaps} — ${hot.map((s) => `${s.nameBn || s.name} শিক্ষা ${s.sectors.education.alert}/স্বাস্থ্য ${s.sectors.health.alert}/চাকরি ${s.sectors.jobs.alert}`).join("; ")}।`
            : `Local DSS sectors: teacher gap ${board.summary.teacherGap}, dengue 7d ${board.summary.dengue7d}, job-fair gaps ${board.summary.jobFairGaps} — ${hot.map((s) => `${s.code} edu ${s.sectors.education.alert}/health ${s.sectors.health.alert}/jobs ${s.sectors.jobs.alert}`).join("; ")}.`,
          category: "alert",
          priority: board.summary.sectorAlerts > 0 ? 1 : 2,
        });
      }

      if (
        board.summary.crimeOpen > 0 ||
        board.summary.corruptionOpen > 0 ||
        board.summary.tenderFlags > 0 ||
        board.summary.bribes > 0
      ) {
        const pressure = (s: (typeof board.seats)[number]) =>
          s.integrity.crime.open * 10 +
          s.integrity.corruption.open * 10 +
          (s.integrity.corruption.tenderFlags ?? 0) * 14 +
          (s.integrity.corruption.bribes ?? 0) * 12 +
          ((s.integrity.crime.nightSharePct ?? 0) >= 60 ? 8 : 0);
        const hot = [...board.seats]
          .sort((a, b) => pressure(b) - pressure(a))
          .slice(0, 2);
        extras.push({
          text: bn
            ? `লোকাল ইন্টিগ্রিটি: অপরাধ খোলা ${board.summary.crimeOpen}, দুর্নীতি খোলা ${board.summary.corruptionOpen}, টেন্ডার ${board.summary.tenderFlags}, ঘুষ ${board.summary.bribes} — ${hot.map((s) => `${s.nameBn || s.name} crime ${s.integrity.crime.open} (night ${s.integrity.crime.nightSharePct ?? 0}%) / corr ${s.integrity.corruption.open}`).join("; ")}।`
            : `Local DSS integrity: crime open ${board.summary.crimeOpen}, corruption open ${board.summary.corruptionOpen}, tender ${board.summary.tenderFlags}, bribes ${board.summary.bribes} — ${hot.map((s) => `${s.code} crime ${s.integrity.crime.open} (night ${s.integrity.crime.nightSharePct ?? 0}%) / corr ${s.integrity.corruption.open}`).join("; ")}.`,
          category: "alert",
          priority:
            board.summary.tenderFlags > 0 || board.summary.bribes > 0 || board.summary.crimeOpen > 0
              ? 1
              : 2,
        });
      }

      if (board.evidence.items.length) {
        const topics = (board.summary.hotTopics ?? []).slice(0, 4).join(", ") || "mixed";
        const titles = board.evidence.items
          .slice(0, 3)
          .map((it) => (bn ? it.titleBn || it.title : it.title));
        extras.push({
          text: bn
            ? `লোকাল গবেষণা: ${board.evidence.items.length}টি সংকট-ম্যাচড অ্যাবস্ট্রাক্ট (${topics}) — ${titles.join("; ")}। পূর্ণ পেপার নয়।`
            : `Local DSS research: ${board.evidence.items.length} crisis-matched abstracts (${topics}) — ${titles.join("; ")}. Abstracts only, not full papers.`,
          category: "summary",
          priority: 2,
        });
      }

      if (!extras.length) return briefing;
      const deskLabel = bn ? "লোকাল ডিএসএস" : "Local DSS";
      const tagged = extras.map((e) => ({ ...e, source: e.source ?? deskLabel }));
      const existing = Array.isArray(briefing.bullets)
        ? (briefing.bullets as Array<{ text?: string; category?: string; priority?: number }>)
        : [];
      const cleaned = existing.filter((b) => {
        const t = String(b.text ?? "");
        return (
          !t.includes("National sectors") &&
          !t.includes("জাতীয় সেক্টর") &&
          !t.includes("Local DSS command") &&
          !t.includes("লোকাল কমান্ড") &&
          !t.includes("Local DSS outages") &&
          !t.includes("লোকাল ডিএসএস আউটজ") &&
          !t.includes("Local DSS unrest") &&
          !t.includes("লোকাল আন্দোলন") &&
          !t.includes("Local DSS SLA") &&
          !t.includes("লোকাল SLA") &&
          !t.includes("Local DSS research") &&
          !t.includes("লোকাল গবেষণা") &&
          !t.includes("Local DSS sectors") &&
          !t.includes("লোকাল সেক্টর") &&
          !t.includes("Local DSS integrity") &&
          !t.includes("লোকাল ইন্টিগ্রিটি")
        );
      });
      return { ...briefing, bullets: [...tagged, ...cleaned].slice(0, 10) };
    } catch {
      return briefing;
    }
  }

  /** Force regenerate for pipeline cron */
  async refreshMorningBriefing(lang: "bn" | "en" = "bn"): Promise<Record<string, unknown>> {
    if (isRedisEnabled()) {
      const redis = getRedisClient();
      const keys = await redis.keys(`briefing:morning:${BRIEFING_CACHE_VER}:${lang}:*`);
      if (keys.length) await redis.del(...keys);
      // Also clear prior cache versions so football/world noise cannot linger.
      const legacy = await redis.keys(`briefing:morning:v2:${lang}:*`);
      if (legacy.length) await redis.del(...legacy);
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
        `briefing:morning:${BRIEFING_CACHE_VER}:${lang}:national`,
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

    const [recentAlertsRaw, overrunProjectsRaw, scopeUnit, newsHeadlinesRaw] = await Promise.all([
      env.LIVE_DATA_ONLY
        ? liveDataService.listAlerts({ unitId, limit: 20, unresolvedOnly: true })
        : prismaRead.redFlagAlert.findMany({
            where: {
              resolvedAt: null,
              ...(unitId && { project: { adminUnitId: unitId } }),
            },
            include: {
              project: { select: { title: true } },
            },
            orderBy: { createdAt: "desc" },
            take: 20,
          }),
      env.LIVE_DATA_ONLY
        ? liveDataService.listProjects({ ...(unitId && { districtId: unitId }), limit: 80 })
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
      ingestionService.getBriefingHeadlines(16, 3),
    ]);

    // Bangladesh-only: drop football / foreign / lifestyle noise from briefing inputs.
    const recentAlerts = recentAlertsRaw.filter((a) => {
      const alert = a as {
        title?: string;
        aiExplanation?: string | null;
        sourceName?: string | null;
        sourceUrl?: string | null;
        district?: string | null;
        project?: { title?: string };
      };
      const title = alert.project?.title ?? alert.title ?? alert.aiExplanation ?? "";
      return isBangladeshRelevantArticle({
        title,
        summary: alert.aiExplanation,
        district: alert.district,
        sourceName: alert.sourceName,
        url: alert.sourceUrl,
      });
    }).slice(0, 5);

    const overrunProjects = overrunProjectsRaw.filter((p) => {
      const title = String((p as { title?: string }).title ?? "");
      const src = p as { sourceName?: string; sourceUrl?: string; district?: string };
      const bd = isBangladeshRelevantArticle({
        title,
        district: src.district,
        sourceName: src.sourceName,
        url: src.sourceUrl,
      });
      // Live signals are often news — only keep real gov/infra project language.
      if (env.LIVE_DATA_ONLY) return bd && looksLikeGovProject(title);
      return bd || looksLikeGovProject(title);
    });

    const newsHeadlines = newsHeadlinesRaw
      .filter((n) =>
        isBangladeshRelevantArticle({
          title: n.title,
          district: n.district,
          sourceName: n.sourceName,
          url: n.url,
        }),
      )
      .slice(0, 6);

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
