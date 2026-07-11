import {
  ExternalArticleSource,
  IngestionSentiment,
  Prisma,
} from "@prisma/client";
import { env } from "../../core/config/env";
import { prismaRead, prismaWrite } from "../../core/database/prisma.client";

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
}

export interface HeatmapDto {
  level: string;
  total_logs: number;
  grievance_total: number;
  demand_total: number;
  cells: HeatmapCellDto[];
  source: string;
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

export class IngestionService {
  async syncFromAi(maxPerFeed = 15): Promise<IngestionSyncResult> {
    const res = await fetch(`${env.AI_SERVICE_URL}/api/v1/ingestion/fetch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ max_per_feed: maxPerFeed, analyze_sentiment: true }),
    });

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

    return {
      fetched: payload.fetched,
      inserted,
      updated,
      feeds_ok: payload.feeds_ok,
      feeds_total: payload.feeds_total,
      completed_at: payload.completed_at,
    };
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
    const grievance = await prismaRead.externalArticle.findMany({
      where: {
        fetchedAt: { gte: since },
        sentimentCategory: IngestionSentiment.Grievance,
      },
      orderBy: { publishedAt: "desc" },
      take: Math.ceil(limit / 2),
      select: {
        title: true,
        sourceName: true,
        district: true,
        sentimentCategory: true,
        url: true,
      },
    });

    const remaining = limit - grievance.length;
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

    return [...grievance, ...other].slice(0, limit);
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
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const articles = await prismaRead.externalArticle.findMany({
      where: {
        fetchedAt: { gte: since },
        sentimentCategory: { not: null },
      },
      orderBy: { fetchedAt: "desc" },
      take: 500,
      select: {
        district: true,
        sentimentCategory: true,
      },
    });

    type Agg = { Grievance: number; Demand: number; Neutral: number };
    const agg = new Map<string, Agg>();

    for (const row of articles) {
      const district = row.district ?? "National";
      const key = level === "upazila" ? `${district}|General` : district;
      const bucket = agg.get(key) ?? { Grievance: 0, Demand: 0, Neutral: 0 };
      const cat = row.sentimentCategory ?? IngestionSentiment.Neutral;
      if (cat === IngestionSentiment.Grievance) bucket.Grievance += 1;
      else if (cat === IngestionSentiment.Demand) bucket.Demand += 1;
      else bucket.Neutral += 1;
      agg.set(key, bucket);
    }

    const cells: HeatmapCellDto[] = [];
    let grievanceTotal = 0;
    let demandTotal = 0;

    for (const [key, counts] of agg) {
      const [district, upazilaPart] = key.includes("|") ? key.split("|", 2) : [key, null];
      const upazila = level === "upazila" ? upazilaPart : null;
      const total = counts.Grievance + counts.Demand + counts.Neutral;
      grievanceTotal += counts.Grievance;
      demandTotal += counts.Demand;
      const ratio = total > 0 ? counts.Grievance / total : 0;
      const score = Math.max(0, Math.min(100, Math.round(ratio * 100 + (counts.Grievance - counts.Demand) * 2)));
      let trend: "rising" | "stable" | "falling" = "stable";
      if (ratio >= 0.45) trend = "rising";
      else if (ratio <= 0.2) trend = "falling";

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
      });
    }

    cells.sort((a, b) => b.sentiment_score - a.sentiment_score);

    return {
      level,
      total_logs: articles.length,
      grievance_total: grievanceTotal,
      demand_total: demandTotal,
      cells: cells.slice(0, limit),
      source: "news_rss_google",
    };
  }
}

export const ingestionService = new IngestionService();
