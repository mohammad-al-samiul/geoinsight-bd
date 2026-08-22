import {
  IngestionSentiment,
  LocalOsintSentiment,
  Prisma,
  UserRole,
} from "@prisma/client";
import { prismaRead, prismaWrite } from "../../core/database/prisma.client";
import { ApiError } from "../../core/errors/api.error";
import { AI_FETCH_DEFAULT_MS, fetchAi } from "../../shared/http/fetch-ai";
import { catalogByUnitCode } from "./local-entity.catalog";
import { resolveLocalEntityId } from "./local-entity.scope";
import { decorateTopics, matchEntity } from "./local-desk-topics";

const PROPAGANDA_HINTS = [
  "জাল",
  "গুজব",
  "মিথ্যা",
  "fake",
  "rumour",
  "rumor",
  "disinfo",
  "propaganda",
  "ভুয়া",
  "অপপ্রচার",
];

function mapIngestionSentiment(
  cat: IngestionSentiment | null,
): LocalOsintSentiment {
  if (cat === IngestionSentiment.Grievance) return LocalOsintSentiment.NEGATIVE;
  if (cat === IngestionSentiment.Demand) return LocalOsintSentiment.NEUTRAL;
  return LocalOsintSentiment.NEUTRAL;
}

function looksLikePropaganda(text: string): boolean {
  const lower = text.toLowerCase();
  return PROPAGANDA_HINTS.some((h) => lower.includes(h.toLowerCase()));
}

function geoHintsForCode(code: string): { districts: string[]; divisions: string[] } {
  if (code === "COCC") {
    return {
      districts: ["Cumilla", "Comilla"],
      divisions: ["Chattogram", "Chittagong"],
    };
  }
  return {
    districts: ["Chattogram", "Chittagong"],
    divisions: ["Chattogram", "Chittagong"],
  };
}

function matchScore(text: string, keywords: string[]): { kw: string | null; score: number } {
  const lower = text.toLowerCase();
  let score = 0;
  let first: string | null = null;
  for (const kw of keywords) {
    if (!kw) continue;
    const needle = kw.toLowerCase();
    if (lower.includes(needle)) {
      score += Math.min(12, Math.max(3, needle.length));
      if (!first) first = kw;
    }
  }
  return { kw: first, score };
}

async function classifyPropagandaAi(
  text: string,
  title?: string | null,
): Promise<{ isPropaganda: boolean; confidence: number; note: string } | null> {
  try {
    const res = await fetchAi(
      "/api/v1/local-ai/propaganda",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.slice(0, 3500), title: title ?? null }),
      },
      { timeoutMs: Math.min(AI_FETCH_DEFAULT_MS, 12_000) },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      is_propaganda?: boolean;
      confidence?: number;
      note?: string;
    };
    return {
      isPropaganda: Boolean(data.is_propaganda),
      confidence:
        typeof data.confidence === "number"
          ? Math.max(0, Math.min(1, data.confidence))
          : 0.5,
      note: data.note || "BanglaBERT classify",
    };
  } catch {
    return null;
  }
}

export class LocalOsintService {
  async feed(
    user: { role: UserRole; adminUnitId: string | null },
    opts: {
      entityId?: string;
      propagandaOnly?: boolean;
      limit?: number;
    } = {},
  ) {
    const entityId = await resolveLocalEntityId(user, opts.entityId);
    const entity = await prismaRead.adminUnit.findUnique({
      where: { id: entityId },
      select: { id: true, code: true, name: true, nameBn: true },
    });
    if (!entity) throw ApiError.notFound("Local entity not found");

    const catalog = catalogByUnitCode(entity.code);
    const keywords = catalog?.osintKeywords ?? [entity.name, entity.code];
    const geo = geoHintsForCode(entity.code);
    const limit = Math.min(opts.limit ?? 40, 80);

    const curatedWhere: Prisma.LocalOsintHitWhereInput = { entityId };
    if (opts.propagandaOnly) curatedWhere.propagandaFlag = true;

    const curated = await prismaRead.localOsintHit.findMany({
      where: curatedWhere,
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      take: limit,
      include: {
        ward: { select: { id: true, code: true, name: true, nameBn: true } },
      },
    });

    const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const geoOr = [
      ...geo.districts.map((d) => ({
        district: { contains: d, mode: "insensitive" as const },
      })),
      ...geo.divisions.map((d) => ({
        division: { contains: d, mode: "insensitive" as const },
      })),
      ...geo.districts.map((d) => ({
        title: { contains: d, mode: "insensitive" as const },
      })),
      ...keywords.slice(0, 8).map((kw) => ({
        title: { contains: kw, mode: "insensitive" as const },
      })),
    ];

    const articles = await prismaRead.externalArticle.findMany({
      where: {
        fetchedAt: { gte: since },
        OR: geoOr,
      },
      orderBy: { fetchedAt: "desc" },
      take: 180,
      select: {
        id: true,
        title: true,
        summary: true,
        url: true,
        sourceName: true,
        district: true,
        division: true,
        sentimentCategory: true,
        publishedAt: true,
        fetchedAt: true,
      },
    });

    const liveDraft = articles
      .map((a) => {
        const blob = `${a.title} ${a.summary ?? ""}`;
        const geo = matchEntity(entity.code, a.district, a.division, blob);
        const { kw, score } = matchScore(blob, keywords);
        if (!geo.hit) return null;
        const heuristic = looksLikePropaganda(blob);
        const ageHours =
          (Date.now() - (a.publishedAt ?? a.fetchedAt).getTime()) / 3_600_000;
        const recencyBoost = ageHours < 24 ? 20 : ageHours < 72 ? 10 : 0;
        const sentimentBoost =
          a.sentimentCategory === IngestionSentiment.Grievance ? 8 : 0;
        const localBoost = geo.local ? 16 : geo.hit ? 8 : 0;
        return {
          id: `live:${a.id}`,
          source: "live_news" as const,
          title: a.title,
          titleBn: null as string | null,
          summary: a.summary,
          sourceName: a.sourceName,
          sourceUrl: a.url,
          channel: "NEWS" as const,
          matchedKeyword: kw ?? geo.keyword ?? entity.code,
          sentiment: mapIngestionSentiment(a.sentimentCategory),
          propagandaFlag: heuristic,
          propagandaNote: heuristic ? "Heuristic propaganda hint" : null,
          propagandaConfidence: heuristic ? 0.72 : 0.2,
          publishedAt: a.publishedAt ?? a.fetchedAt,
          ward: null,
          matchScore: score + recencyBoost + sentimentBoost + localBoost,
          _blob: blob,
        };
      })
      .filter((x): x is NonNullable<typeof x> => Boolean(x))
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, Math.min(limit, 24));

    // Harden top hits with BanglaBERT propaganda classify (parallel, capped).
    const toClassify = liveDraft.slice(0, 10);
    const classified = await Promise.all(
      toClassify.map(async (item) => {
        const ai = await classifyPropagandaAi(item._blob, item.title);
        if (!ai) return item;
        return {
          ...item,
          propagandaFlag: ai.isPropaganda || item.propagandaFlag,
          propagandaNote: ai.note,
          propagandaConfidence: ai.confidence,
        };
      }),
    );
    const classifiedIds = new Set(classified.map((c) => c.id));
    const liveMatched = [
      ...classified,
      ...liveDraft.filter((d) => !classifiedIds.has(d.id)),
    ]
      .map(({ _blob, ...rest }) => {
        const tagged = decorateTopics(entity.code, _blob);
        return { ...rest, topics: tagged.topics, places: tagged.places };
      })
      .filter((x) => !(opts.propagandaOnly && !x.propagandaFlag))
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, limit);

    const curatedMapped = curated.map((h) => {
      const tagged = decorateTopics(
        entity.code,
        `${h.title} ${h.summary ?? ""} ${h.titleBn ?? ""}`,
      );
      return {
        id: h.id,
        source: "curated" as const,
        title: h.title,
        titleBn: h.titleBn,
        summary: h.summary,
        sourceName: h.sourceName,
        sourceUrl: h.sourceUrl,
        channel: h.channel,
        matchedKeyword: h.matchedKeyword,
        sentiment: h.sentiment,
        propagandaFlag: h.propagandaFlag,
        propagandaNote: h.propagandaNote,
        propagandaConfidence: h.propagandaFlag ? 0.85 : 0.15,
        publishedAt: h.publishedAt ?? h.createdAt,
        ward: h.ward,
        matchScore: 40,
        topics: tagged.topics,
        places: tagged.places,
      };
    });

    const items = [...liveMatched, ...curatedMapped]
      .sort((a, b) => {
        const scoreDiff = (b.matchScore ?? 0) - (a.matchScore ?? 0);
        if (Math.abs(scoreDiff) > 2) return scoreDiff;
        return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
      })
      .slice(0, limit);

    const sentiment = {
      positive: items.filter((i) => i.sentiment === "POSITIVE").length,
      neutral: items.filter((i) => i.sentiment === "NEUTRAL").length,
      negative: items.filter((i) => i.sentiment === "NEGATIVE").length,
    };
    const propagandaCount = items.filter((i) => i.propagandaFlag).length;

    return {
      entityId,
      entityCode: entity.code,
      keywords,
      geoHints: geo,
      summary: {
        total: items.length,
        curated: curatedMapped.length,
        liveNews: liveMatched.length,
        propagandaFlagged: propagandaCount,
        sentiment,
      },
      items,
    };
  }

  async createCurated(
    user: { role: UserRole; adminUnitId: string | null },
    input: {
      entityId?: string;
      title: string;
      titleBn?: string;
      summary?: string;
      sourceName: string;
      sourceUrl?: string;
      matchedKeyword: string;
      sentiment?: LocalOsintSentiment;
      propagandaFlag?: boolean;
      propagandaNote?: string;
      wardId?: string;
    },
  ) {
    const entityId = await resolveLocalEntityId(user, input.entityId);
    let propagandaFlag = Boolean(input.propagandaFlag);
    let propagandaNote = input.propagandaNote?.trim() || null;
    if (input.propagandaFlag === undefined) {
      const ai = await classifyPropagandaAi(
        `${input.title} ${input.summary ?? ""}`,
        input.title,
      );
      if (ai) {
        propagandaFlag = ai.isPropaganda;
        propagandaNote = ai.note;
      } else {
        propagandaFlag = looksLikePropaganda(`${input.title} ${input.summary ?? ""}`);
        propagandaNote = propagandaFlag ? "Heuristic propaganda hint" : null;
      }
    }
    return prismaWrite.localOsintHit.create({
      data: {
        entityId,
        wardId: input.wardId ?? null,
        title: input.title.trim(),
        titleBn: input.titleBn?.trim() || null,
        summary: input.summary?.trim() || null,
        sourceName: input.sourceName.trim(),
        sourceUrl: input.sourceUrl?.trim() || null,
        matchedKeyword: input.matchedKeyword.trim(),
        sentiment: input.sentiment ?? LocalOsintSentiment.NEUTRAL,
        propagandaFlag,
        propagandaNote,
        publishedAt: new Date(),
      },
    });
  }
}

export const localOsintService = new LocalOsintService();
