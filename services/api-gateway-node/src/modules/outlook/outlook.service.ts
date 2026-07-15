import { env } from "../../core/config/env";
import { prismaRead } from "../../core/database/prisma.client";
import { getRedisClient, isRedisEnabled } from "../../infrastructure/redis/redis.client";
import { broadcastDashboardRefresh } from "../pipeline/pipeline.broadcast";
import { unrestService } from "../unrest/unrest.service";
import {
  getCurrentMandate,
  mandateAnalysisSince,
  mandatePublicMeta,
} from "../../shared/gov/current-mandate";
import { AI_FETCH_LLM_MS, fetchAi } from "../../shared/http/fetch-ai";

const OUTLOOK_CACHE_KEY = "outlook:strategic:v3";
const OUTLOOK_TTL_SEC = 1800;
/** Rolling cap inside the current mandate window */
const LOOKBACK_DAYS = 90;

const POLITICS_KW = [
  "politics", "election", "parliament", "cabinet", "minister", "party",
  "protest", "governance", "opposition", "bnp", "manifesto", "reform",
  "রাজনীতি", "নির্বাচন", "সংসদ", "মন্ত্রিসভা", "মন্ত্রী", "দল",
  "আন্দোলন", "শাসন", "বিরোধী", "বিএনপি", "ইশতেহার", "সংস্কার", "সরকার",
];

const ECONOMY_KW = [
  "economy", "imf", "inflation", "reserves", "remittance", "rmg", "export",
  "banking", "gdp", "investment", "taka", "budget", "fiscal", "trade",
  "অর্থনীতি", "মূল্যস্ফীতি", "রিজার্ভ", "রেমিট্যান্স", "রপ্তানি", "ব্যাংক",
  "বাজেট", "বিনিয়োগ", "জিডিপি", "বাণিজ্য",
];

const ANALYST_HINTS = [
  "analysis", "analyst", "think tank", "crisis group", "world bank", "adb",
  "imf", "diplomat", "orf", "csis", "brookings", "opinion", "editorial",
  "বিশ্লেষণ", "মতামত", "সম্পাদকীয়",
];

function classifyDomain(text: string): "politics" | "economy" | "both" | null {
  const lower = text.toLowerCase();
  const pol = POLITICS_KW.some((k) => lower.includes(k.toLowerCase()) || text.includes(k));
  const eco = ECONOMY_KW.some((k) => lower.includes(k.toLowerCase()) || text.includes(k));
  if (pol && eco) return "both";
  if (pol) return "politics";
  if (eco) return "economy";
  return null;
}

function isAnalystLike(sourceName: string, text: string): boolean {
  const blob = `${sourceName} ${text}`.toLowerCase();
  return ANALYST_HINTS.some((h) => blob.includes(h.toLowerCase()));
}

export class OutlookService {
  async getStrategic(lang: "bn" | "en" = "bn") {
    const cacheKey = `${OUTLOOK_CACHE_KEY}:${lang}`;
    if (isRedisEnabled()) {
      const cached = await getRedisClient().get(cacheKey);
      if (cached) return JSON.parse(cached) as Record<string, unknown>;
    }

    const data = await this.buildStrategic(lang);
    if (isRedisEnabled()) {
      await getRedisClient().setex(cacheKey, OUTLOOK_TTL_SEC, JSON.stringify(data));
    }
    return data;
  }

  async refresh(): Promise<Record<string, unknown>> {
    const [bn, en] = await Promise.all([this.buildStrategic("bn"), this.buildStrategic("en")]);
    if (isRedisEnabled()) {
      const redis = getRedisClient();
      await redis.setex(`${OUTLOOK_CACHE_KEY}:bn`, OUTLOOK_TTL_SEC, JSON.stringify(bn));
      await redis.setex(`${OUTLOOK_CACHE_KEY}:en`, OUTLOOK_TTL_SEC, JSON.stringify(en));
    }
    await broadcastDashboardRefresh("pipeline:outlook");
    const challenges = Array.isArray(bn.challenges) ? bn.challenges.length : 0;
    const sources = Array.isArray(bn.sources) ? bn.sources : [];
    return {
      politics_sources: sources.filter(
        (s) => (s as { domain: string }).domain !== "economy",
      ).length,
      economy_sources: sources.filter(
        (s) => (s as { domain: string }).domain !== "politics",
      ).length,
      challenges,
    };
  }

  private async buildStrategic(lang: "bn" | "en"): Promise<Record<string, unknown>> {
    const mandate = getCurrentMandate({
      CURRENT_GOVERNMENT_SINCE: env.CURRENT_GOVERNMENT_SINCE,
      CURRENT_GOVERNMENT_PARTY: env.CURRENT_GOVERNMENT_PARTY,
    });
    const since = mandateAnalysisSince(LOOKBACK_DAYS, mandate);

    const articles = await prismaRead.externalArticle.findMany({
      where: { fetchedAt: { gte: since } },
      orderBy: { fetchedAt: "desc" },
      take: 800,
      select: {
        title: true,
        summary: true,
        url: true,
        sourceName: true,
        publishedAt: true,
        fetchedAt: true,
      },
    });

    const sources: Array<{
      title: string;
      source: string;
      url: string;
      domain: "politics" | "economy" | "both";
      published_at: string;
      summary: string | null;
      analyst_like: boolean;
    }> = [];

    for (const a of articles) {
      const published = a.publishedAt ?? a.fetchedAt;
      if (published < mandate.termStartedAt) continue;
      const text = `${a.title} ${a.summary ?? ""}`;
      const domain = classifyDomain(text);
      if (!domain) continue;
      sources.push({
        title: a.title,
        source: a.sourceName,
        url: a.url,
        domain,
        published_at: published.toISOString(),
        summary: a.summary,
        analyst_like: isAnalystLike(a.sourceName, text),
      });
    }

    sources.sort((a, b) => Number(b.analyst_like) - Number(a.analyst_like));
    const trimmed = sources.slice(0, 80);

    let unrestSummary: Record<string, unknown> = {};
    try {
      const pulse = await unrestService.getPulse();
      unrestSummary = {
        districts_at_risk: pulse.summary.districts_at_risk,
        active_protests: pulse.summary.active_protests,
        law_hotspots: pulse.summary.law_hotspots,
        top_district: pulse.summary.top_district,
      };
    } catch {
      unrestSummary = {};
    }

    const government = mandatePublicMeta(mandate);

    const aiPayload = {
      lang,
      government_context: government,
      sources: trimmed.map((s) => ({
        title: s.title,
        source: s.source,
        url: s.url,
        domain: s.domain,
        published_at: s.published_at,
        summary: s.summary,
      })),
      unrest_summary: unrestSummary,
      metrics: {},
    };

    let aiResult: Record<string, unknown>;
    try {
      const res = await fetchAi(
        `/api/v1/outlook/generate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(aiPayload),
        },
        { timeoutMs: AI_FETCH_LLM_MS },
      );
      if (!res.ok) throw new Error(`outlook AI ${res.status}`);
      aiResult = (await res.json()) as Record<string, unknown>;
    } catch (err) {
      aiResult = {
        lang,
        generated_at: new Date().toISOString(),
        challenges: [],
        direction: [],
        scenarios: [],
        narrative:
          lang === "bn"
            ? "আউটলুক AI সাময়িকভাবে অনুপলব্ধ — নিচে সোর্স তালিকা দেখুন।"
            : "Outlook AI temporarily unavailable — see source list below.",
        disclaimer:
          lang === "bn"
            ? "খোলা সোর্স ভিত্তিক — থিসিস/পূর্বাভাস নয়।"
            : "Open-source grounded — not a thesis or forecast.",
        source_count: trimmed.length,
        llm_used: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }

    return {
      ...aiResult,
      sources: trimmed,
      unrest: unrestSummary,
      government,
      lookback_days: LOOKBACK_DAYS,
      analysis_since: since.toISOString(),
      refreshed_at: new Date().toISOString(),
    };
  }
}

export const outlookService = new OutlookService();
