import {
  ExternalArticleSource,
  IngestionSentiment,
  Prisma,
} from "@prisma/client";
import { prismaRead, prismaWrite } from "../../core/database/prisma.client";
import { redisCacheService } from "../../infrastructure/cache/redis-cache.service";
import { fetchAi } from "../../shared/http/fetch-ai";
import { isBangladeshRelevantArticle } from "../../shared/geo/bangladesh-relevance";
import { logIngestionSyncRun } from "../intel/pipeline-run-log.service";

const HEATMAP_TTL_SEC = 120;

export interface IngestedArticlePayload {
  source_type: string;
  source_name: string;
  title: string;
  summary?: string | null;
  url: string;
  published_at?: string | null;
  district?: string | null;
  division?: string | null;
  sentiment_category?: string | null;
  sentiment_score?: number | null;
  language?: string;
}

export interface IngestionSyncResult {
  fetched: number;
  inserted: number;
  updated: number;
  feeds_ok: number;
  feeds_total: number;
  completed_at: string;
}

export interface HeatmapCellDto {
  district: string;
  upazila: string | null;
  grievance_count: number;
  demand_count: number;
  neutral_count: number;
  total: number;
  grievance_ratio: number;
  sentiment_score: number;
  trend: "rising" | "stable" | "falling";
  distress_count?: number;
  hardship_hint?: string | null;
}

export interface HeatmapDto {
  level: string;
  total_logs: number;
  grievance_total: number;
  demand_total: number;
  cells: HeatmapCellDto[];
  source: string;
  narrative_bn?: string;
  narrative_en?: string;
  top_distressed?: string[];
}

function mapSourceType(raw: string): ExternalArticleSource {
  return raw === "google_news" ? ExternalArticleSource.GOOGLE_NEWS : ExternalArticleSource.RSS_NEWSPAPER;
}

function mapSentiment(raw: string | null | undefined): IngestionSentiment | null {
  if (!raw) return null;
  if (raw === "Grievance") return IngestionSentiment.Grievance;
  if (raw === "Demand") return IngestionSentiment.Demand;
  return IngestionSentiment.Neutral;
}

const DISTRESS_KW = [
  "অভিযোগ", "অসন্তোষ", "ক্ষোভ", "কষ্ট", "দুর্ভোগ", "ভোগান্তি", "দুর্দশা", "সংকট",
  "দুর্নীতি", "অনিয়ম", "হয়রানি", "বঞ্চিত",
  "আন্দোলন", "বিক্ষোভ", "হরতাল", "প্রতিবাদ", "বিরোধিতা",
  "হত্যা", "খুন", "ধর্ষণ", "সহিংস", "সংঘর্ষ", "আক্রমণ",
  "দুর্ঘটনা", "মৃত্যু", "নিহত", "আহত", "নিখোঁজ",
  "দারিদ্র্য", "বেকার", "মূল্যস্ফীতি", "খাদ্য সংকট",
  "বন্যা", "জলোচ্ছ্বাস", "ঘূর্ণিঝড়", "ভূমিধস",
  "corruption", "protest", "scandal", "fraud", "violence", "killed",
  "murder", "outrage", "anger", "suffer", "crisis", "strike", "hartal",
  "clash", "assault", "grievance",
];

const DEMAND_KW = [
  "দাবি", "চাই", "প্রয়োজন", "আশা", "demand", "request", "call for", "appeal", "seek",
];

function classifyFromText(
  text: string,
  stored: IngestionSentiment | null,
): IngestionSentiment {
  const lower = text.toLowerCase();
  const distressHits = DISTRESS_KW.filter((k) => lower.includes(k.toLowerCase()) || text.includes(k)).length;
  const demandHits = DEMAND_KW.filter((k) => lower.includes(k.toLowerCase()) || text.includes(k)).length;

  if (distressHits > 0 && distressHits >= demandHits) return IngestionSentiment.Grievance;
  if (demandHits > 0) return IngestionSentiment.Demand;
  if (stored === IngestionSentiment.Grievance) return IngestionSentiment.Grievance;
  if (stored === IngestionSentiment.Demand) return IngestionSentiment.Demand;
  return IngestionSentiment.Neutral;
}

function hardshipHint(text: string): string | null {
  if (/আন্দোলন|বিক্ষোভ|হরতাল|protest|strike|hartal/i.test(text)) return "আন্দোলন";
  if (/হত্যা|নিহত|killed|murder|violence|সহিংস/i.test(text)) return "সহিংসতা";
  if (/বন্যা|ঘূর্ণিঝড়|flood|cyclone/i.test(text)) return "দুর্যোগ";
  if (/দুর্নীতি|corruption|fraud/i.test(text)) return "দুর্নীতি";
  if (/মূল্যস্ফীতি|বেকার|দারিদ্র্য|কষ্ট|দুর্ভোগ|crisis|suffer/i.test(text)) return "অর্থনৈতিক কষ্ট";
  if (/অসন্তোষ|ক্ষোভ|অভিযোগ|grievance|outrage/i.test(text)) return "অসন্তোষ";
  return null;
}

export class IngestionService {
  async syncFromAi(maxPerFeed = 15, timeoutMs = 120_000): Promise<IngestionSyncResult> {
    const t0 = Date.now();
    try {
      const res = await fetchAi(
        `/api/v1/ingestion/fetch`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ max_per_feed: maxPerFeed, analyze_sentiment: true }),
        },
        { timeoutMs },
      );

      if (!res.ok) {
        throw new Error(`Ingestion fetch failed (${res.status})`);
      }

      const payload = (await res.json()) as {
        fetched: number;
        feeds_ok: number;
        feeds_total: number;
        completed_at: string;
        articles: IngestedArticlePayload[];
      };

      let inserted = 0;
      let updated = 0;

      for (const article of payload.articles) {
        const existing = await prismaRead.externalArticle.findUnique({
          where: { url: article.url },
          select: { id: true },
        });

        const data: Prisma.ExternalArticleCreateInput = {
          sourceType: mapSourceType(article.source_type),
          sourceName: article.source_name,
          title: article.title,
          summary: article.summary ?? null,
          url: article.url,
          publishedAt: article.published_at ? new Date(article.published_at) : null,
          district: article.district ?? null,
          division: article.division ?? null,
          sentimentCategory: mapSentiment(article.sentiment_category),
          sentimentScore: article.sentiment_score ?? null,
          language: article.language ?? "bn",
        };

        if (existing) {
          await prismaWrite.externalArticle.update({
            where: { id: existing.id },
            data: {
              ...data,
              fetchedAt: new Date(),
            },
          });
          updated += 1;
        } else {
          await prismaWrite.externalArticle.create({ data });
          inserted += 1;
        }
      }

      const result: IngestionSyncResult = {
        fetched: payload.fetched,
        inserted,
        updated,
        feeds_ok: payload.feeds_ok,
        feeds_total: payload.feeds_total,
        completed_at: payload.completed_at,
      };

      await logIngestionSyncRun({
        fetched: result.fetched,
        inserted: result.inserted,
        updated: result.updated,
        feedsOk: result.feeds_ok,
        feedsTotal: result.feeds_total,
        durationMs: Date.now() - t0,
      });

      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await logIngestionSyncRun({
        fetched: 0,
        inserted: 0,
        updated: 0,
        feedsOk: 0,
        feedsTotal: 0,
        durationMs: Date.now() - t0,
        error: message,
      });
      throw err;
    }
  }

  async hasRecentArticles(days = 7, minCount = 5): Promise<boolean> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const count = await prismaRead.externalArticle.count({
      where: { fetchedAt: { gte: since }, sentimentCategory: { not: null } },
    });
    return count >= minCount;
  }

  async listArticles(limit = 30, days = 7) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return prismaRead.externalArticle.findMany({
      where: { fetchedAt: { gte: since } },
      orderBy: { publishedAt: "desc" },
      take: limit,
      select: {
        id: true,
        sourceType: true,
        sourceName: true,
        title: true,
        summary: true,
        url: true,
        publishedAt: true,
        district: true,
        division: true,
        sentimentCategory: true,
        sentimentScore: true,
        language: true,
        fetchedAt: true,
      },
    });
  }

  async getStats(days = 7) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const [total, bySource] = await Promise.all([
      prismaRead.externalArticle.count({ where: { fetchedAt: { gte: since } } }),
      prismaRead.externalArticle.groupBy({
        by: ["sourceType"],
        where: { fetchedAt: { gte: since } },
        _count: true,
      }),
    ]);
    return { total, days, bySource };
  }

  async getBriefingHeadlines(limit = 6, days = 3) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const pool = Math.max(limit * 4, 24);
    const grievance = await prismaRead.externalArticle.findMany({
      where: {
        fetchedAt: { gte: since },
        sentimentCategory: IngestionSentiment.Grievance,
      },
      orderBy: { publishedAt: "desc" },
      take: Math.ceil(pool / 2),
      select: {
        title: true,
        sourceName: true,
        district: true,
        sentimentCategory: true,
        url: true,
      },
    });

    const remaining = pool - grievance.length;
    const other =
      remaining > 0
        ? await prismaRead.externalArticle.findMany({
            where: {
              fetchedAt: { gte: since },
              sentimentCategory: { not: IngestionSentiment.Grievance },
            },
            orderBy: { publishedAt: "desc" },
            take: remaining,
            select: {
              title: true,
              sourceName: true,
              district: true,
              sentimentCategory: true,
              url: true,
            },
          })
        : [];

    return [...grievance, ...other]
      .filter((n) =>
        isBangladeshRelevantArticle({
          title: n.title,
          district: n.district,
          sourceName: n.sourceName,
          url: n.url,
        }),
      )
      .slice(0, limit);
  }

  async searchArticles(query: string, limit = 8) {
    const q = query.trim();
    if (q.length < 2) return [];
    return prismaRead.externalArticle.findMany({
      where: {
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { summary: { contains: q, mode: "insensitive" } },
          { district: { contains: q, mode: "insensitive" } },
          { sourceName: { contains: q, mode: "insensitive" } },
        ],
      },
      orderBy: { publishedAt: "desc" },
      take: limit,
      select: {
        id: true,
        title: true,
        sourceName: true,
        url: true,
        district: true,
        sentimentCategory: true,
        publishedAt: true,
      },
    });
  }

  async buildHeatmap(level: "district" | "upazila" = "district", limit = 120): Promise<HeatmapDto> {
    const cacheKey = `ingestion:heatmap:${level}:${limit}`;
    const cached = await redisCacheService.get<HeatmapDto>(cacheKey);
    if (cached) return cached;

    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const mid = new Date(Date.now() - 3.5 * 24 * 60 * 60 * 1000);
    // Cap for VPS: 250 recent articles is enough for district grievance ratios
    const articles = await prismaRead.externalArticle.findMany({
      where: { fetchedAt: { gte: since } },
      orderBy: { fetchedAt: "desc" },
      take: 250,
      select: {
        title: true,
        summary: true,
        district: true,
        sentimentCategory: true,
        fetchedAt: true,
      },
    });

    type Agg = {
      Grievance: number;
      Demand: number;
      Neutral: number;
      distress: number;
      recentG: number;
      olderG: number;
      hint: string | null;
    };
    const agg = new Map<string, Agg>();

    for (const row of articles) {
      const text = `${row.title} ${row.summary ?? ""}`;
      const cat = classifyFromText(text, row.sentimentCategory);
      const district = row.district && row.district !== "National" ? row.district : null;
      if (!district) continue;

      const key = level === "upazila" ? `${district}|General` : district;
      const bucket = agg.get(key) ?? {
        Grievance: 0,
        Demand: 0,
        Neutral: 0,
        distress: 0,
        recentG: 0,
        olderG: 0,
        hint: null,
      };

      if (cat === IngestionSentiment.Grievance) {
        bucket.Grievance += 1;
        bucket.distress += 1;
        if (row.fetchedAt >= mid) bucket.recentG += 1;
        else bucket.olderG += 1;
        bucket.hint = hardshipHint(text) ?? bucket.hint;
      } else if (cat === IngestionSentiment.Demand) {
        bucket.Demand += 1;
      } else {
        bucket.Neutral += 1;
      }
      agg.set(key, bucket);
    }

    const cells: HeatmapCellDto[] = [];
    let grievanceTotal = 0;
    let demandTotal = 0;
    let analyzed = 0;

    for (const [key, counts] of agg) {
      const [district, upazilaPart] = key.includes("|") ? key.split("|", 2) : [key, null];
      const upazila = level === "upazila" ? upazilaPart : null;
      const total = counts.Grievance + counts.Demand + counts.Neutral;
      if (total === 0) continue;
      analyzed += total;
      grievanceTotal += counts.Grievance;
      demandTotal += counts.Demand;

      const ratio = total > 0 ? counts.Grievance / total : 0;
      // Dissatisfaction score: grievance weight + volume boost + demand pressure
      const score = Math.max(
        0,
        Math.min(
          100,
          Math.round(
            ratio * 70 +
              Math.min(25, counts.Grievance * 8) +
              Math.min(10, counts.Demand * 2) +
              (counts.distress > 0 ? 5 : 0),
          ),
        ),
      );

      let trend: "rising" | "stable" | "falling" = "stable";
      if (counts.recentG > counts.olderG + 0) trend = "rising";
      else if (counts.olderG > counts.recentG + 1) trend = "falling";
      else if (ratio >= 0.4) trend = "rising";

      cells.push({
        district,
        upazila,
        grievance_count: counts.Grievance,
        demand_count: counts.Demand,
        neutral_count: counts.Neutral,
        total,
        grievance_ratio: Math.round(ratio * 1000) / 1000,
        sentiment_score: score,
        trend,
        distress_count: counts.distress,
        hardship_hint: counts.hint,
      });
    }

    cells.sort((a, b) => b.sentiment_score - a.sentiment_score || b.grievance_count - a.grievance_count);

    const top = cells.filter((c) => c.grievance_count > 0 || c.sentiment_score >= 25).slice(0, 5);
    const topNames = top.map((c) => c.district);
    const narrativeBn =
      topNames.length > 0
        ? `খবর বিশ্লেষণে সবচেয়ে বেশি অসন্তোষ/কষ্টের সংকেত: ${topNames.join(", ")}। স্কোর = অভিযোগের অনুপাত + সংবাদ ভলিউম (AI + কীওয়ার্ড)।`
        : "গত ৭ দিনে জেলাভিত্তিক শক্তিশালী অসন্তোষ সংকেত কম — আরও সংবাদ সিঙ্ক করুন।";
    const narrativeEn =
      topNames.length > 0
        ? `Highest dissatisfaction/distress signals from news: ${topNames.join(", ")}. Score blends grievance ratio + volume (AI + keywords).`
        : "Few strong district distress signals in the last 7 days — sync more news.";

    const result: HeatmapDto = {
      level,
      total_logs: analyzed,
      grievance_total: grievanceTotal,
      demand_total: demandTotal,
      cells: cells.slice(0, limit),
      source: "news_rss_google",
      narrative_bn: narrativeBn,
      narrative_en: narrativeEn,
      top_distressed: topNames,
    };
    await redisCacheService.set(cacheKey, result, HEATMAP_TTL_SEC);
    return result;
  }
}

export const ingestionService = new IngestionService();
