import { IngestionSentiment } from "@prisma/client";
import { prismaRead } from "../../core/database/prisma.client";
import { getRedisClient, isRedisEnabled } from "../../infrastructure/redis/redis.client";
import { broadcastDashboardRefresh } from "../pipeline/pipeline.broadcast";
import {
  getLatestIntelSnapshot,
  saveIntelSnapshot,
} from "../intel/intel-snapshot.service";
import {
  normalizeDivisionName,
  resolveScopeContext,
  matchesScopeDistrict,
  type ScopeContext,
} from "../../shared/scope/scope-context";
import type { DashboardScopeQuery } from "../dashboard/dashboard.service";
import {
  aggregateSegmentedImpact,
  buildImpactWindows,
  extractNewsImpact,
  type ImpactArticleInput,
  type NewsImpactExtract,
  type SegmentedNewsImpact,
} from "../../shared/impact/news-impact";
import { env } from "../../core/config/env";
import {
  getCurrentMandate,
  mandateAnalysisSince,
  mandatePublicMeta,
} from "../../shared/gov/current-mandate";
import { isBangladeshRelevantArticle } from "../../shared/geo/bangladesh-relevance";
import { clusterProtestMovements } from "../../shared/geo/protest-movements";

const UNREST_CACHE_KEY = "unrest:pulse:v11";
const UNREST_TTL_SEC = 900;
/** Fetch window — impact UI can slice 1d / 7d / 30d (floored at current mandate) */
const LOOKBACK_DAYS = 30;
const DEFAULT_IMPACT_WINDOW = 7;

export type UnrestCategory =
  | "protest"
  | "govt_discontent"
  | "law_reaction"
  | "social_viral"
  | "general_grievance";

const PROTEST_KW = [
  "আন্দোলন",
  "বিক্ষোভ",
  "হরতাল",
  "অবরোধ",
  "ধর্মঘট",
  "মিছিল",
  "সমাবেশ",
  "ঘেরাও",
  "protest",
  "demonstration",
  "rally",
  "strike",
  "hartal",
  "blockade",
  "sit-in",
  "march",
];

const GOVT_DISCONTENT_KW = [
  "অসন্তোষ",
  "বিরোধিতা",
  "প্রতিবাদ",
  "সরকারের বিরুদ্ধে",
  "সরকার বিরোধী",
  "ক্ষোভ",
  "অভিযোগ",
  "দুর্নীতি",
  "হয়রানি",
  "government protest",
  "anti-government",
  "against the government",
  "public outrage",
  "anger against",
  "dissatisfaction",
];

const LAW_KW = [
  "আইন",
  "বিল",
  "অধ্যাদেশ",
  "আইন পাস",
  "নতুন আইন",
  "খসড়া আইন",
  "law",
  "bill",
  "ordinance",
  "legislation",
  "act passed",
  "new law",
  "draft law",
];

const SOCIAL_KW = [
  "ফেসবুক",
  "ভাইরাল",
  "সোশ্যাল মিডিয়া",
  "facebook",
  "viral",
  "social media",
  "twitter",
  "tiktok",
  "online outrage",
];

/** Gas / electricity / fuel — so price-hike politics is not dropped as noise */
const UTILITY_ISSUE_KW = [
  "বিদ্যুৎ",
  "বিদ্যুত",
  "গ্যাস",
  "জ্বালানি",
  "লোডশেডিং",
  "তিতাস",
  "সিএনজি",
  "ডিজেল",
  "অকটেন",
  "petrol",
  "octane",
  "diesel",
  "electricity",
  "load shedding",
  "load-shedding",
  "cng",
  "lng",
  "fuel",
  "desco",
  "pdb",
];

const PRICE_HIKE_KW = [
  "মূল্যবৃদ্ধি",
  "মূল্য বৃদ্ধি",
  "দাম বৃদ্ধি",
  "দাম বাড়",
  "দাম বাড়ানো",
  "বিল বৃদ্ধি",
  "রেট বৃদ্ধি",
  "হারে বৃদ্ধি",
  "ট্যারিফ",
  "tariff",
  "price hike",
  "fare hike",
  "rate hike",
  "price rise",
  "increased price",
  "raised the price",
];

const OPPOSITION_KW = [
  "বিরোধী দল",
  "বিরোধী নেতা",
  "বিরোধী নেতারা",
  "বিএনপি",
  "bnp",
  "opposition",
  "জাতীয় পার্টি",
  "প্রতিবাদ সভা",
  "গণসমাবেশ",
];

function includesAny(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some((k) => lower.includes(k.toLowerCase()));
}

function classifyUnrest(text: string, sentiment: IngestionSentiment | null): UnrestCategory | null {
  // Cricket / sports "strike" (bowling) is not civil unrest.
  const sportsNoise =
    /\b(cricket|innings|bowled|five-match|test match|t20|odi|series against)\b/i.test(text) &&
    !includesAny(text, ["আন্দোলন", "বিক্ষোভ", "হরতাল", "protest", "demonstration", "hartal"]);

  const hasProtest = includesAny(text, PROTEST_KW) && !sportsNoise;
  const hasLaw = includesAny(text, LAW_KW);
  const hasGovt = includesAny(text, GOVT_DISCONTENT_KW);
  const hasSocial = includesAny(text, SOCIAL_KW);
  const hasUtility = includesAny(text, UTILITY_ISSUE_KW);
  const hasPriceHike = includesAny(text, PRICE_HIKE_KW);
  const hasOpposition = includesAny(text, OPPOSITION_KW);
  const utilityPriceUnrest = hasUtility && hasPriceHike;
  const oppositionUtilityUnrest = hasOpposition && (hasUtility || hasPriceHike);

  if (hasLaw && (hasProtest || hasGovt || utilityPriceUnrest)) return "law_reaction";
  if (hasProtest || utilityPriceUnrest || oppositionUtilityUnrest) return "protest";
  if (hasSocial && (hasGovt || hasProtest || sentiment === IngestionSentiment.Grievance)) {
    return "social_viral";
  }
  if (hasGovt || (hasOpposition && hasGovt)) return "govt_discontent";
  if (hasUtility && (hasGovt || sentiment === IngestionSentiment.Grievance)) {
    return "govt_discontent";
  }
  if (sentiment === IngestionSentiment.Grievance) return "general_grievance";
  return null;
}

function severityFor(category: UnrestCategory, text: string): number {
  let base =
    category === "protest" || category === "law_reaction"
      ? 4
      : category === "social_viral"
        ? 3
        : category === "govt_discontent"
          ? 3
          : 2;
  if (/হরতাল|hartal|violence|সহিংস|clash|সংঘর্ষ/i.test(text)) base = Math.min(5, base + 1);
  if (/nationwide|সারাদেশ|জাতীয়/i.test(text)) base = Math.min(5, base + 1);
  return base;
}

function categoryLabelBn(category: UnrestCategory): string {
  switch (category) {
    case "protest":
      return "আন্দোলন / বিক্ষোভ";
    case "govt_discontent":
      return "সরকার-বিরোধী অসন্তোষ";
    case "law_reaction":
      return "আইন/বিল নিয়ে প্রতিক্রিয়া";
    case "social_viral":
      return "সামাজিক মাধ্যমে ভাইরাল";
    default:
      return "নাগরিক অভিযোগ";
  }
}

export interface UnrestSignal {
  id: string;
  title: string;
  title_bn_hint: string;
  category: UnrestCategory;
  category_bn: string;
  severity: number;
  district: string | null;
  division: string | null;
  source_name: string;
  url: string;
  published_at: string | null;
  sentiment: string | null;
  impact: NewsImpactExtract;
}

export interface DistrictUnrestCell {
  district: string;
  division: string | null;
  protest_count: number;
  govt_discontent_count: number;
  law_reaction_count: number;
  social_viral_count: number;
  grievance_count: number;
  total_signals: number;
  unrest_score: number;
  risk_level: number;
  trend: "rising" | "stable" | "falling";
  top_categories: UnrestCategory[];
  population_pressure: "high" | "medium" | "low";
  deaths: number;
  injuries: number;
  civilian_deaths: number;
  damage_mentions: number;
}

export interface UnrestPulse {
  districts: DistrictUnrestCell[];
  signals: UnrestSignal[];
  /** Named protest movements clustered by place + theme (e.g. HSC exam — Chattogram) */
  movements: ReturnType<typeof clusterProtestMovements>;
  summary: {
    districts_at_risk: number;
    active_protests: number;
    active_movements: number;
    law_hotspots: number;
    social_viral: number;
    total_signals: number;
    top_district: string | null;
    refreshed_at: string;
    sources: string[];
    note_bn: string;
    note_en: string;
    government?: ReturnType<typeof mandatePublicMeta>;
    impact: SegmentedNewsImpact & {
      default_window: number;
      windows: Record<string, SegmentedNewsImpact>;
    };
  };
  scope?: ScopeContext;
}

const IMPACT_DISCLAIMERS = {
  bn: "আনুমানিক = একই জেলা/দিনে খবরের সর্বোচ্চ (যোগ নয়)। বড় ঐতিহাসিক মোট (≥৮০) আলাদা। অফিসিয়াল হিসাব নয়।",
  en: "Estimate = max per district/day (not summed across papers). Large historical tallies (≥80) excluded. Not official.",
};

function impactFromSignals(signals: UnrestSignal[]): UnrestPulse["summary"]["impact"] {
  const items: ImpactArticleInput[] = signals.map((s) => ({
    district: s.district,
    publishedAt: s.published_at ?? new Date().toISOString(),
    impact: s.impact,
    title: s.title,
    url: s.url,
  }));
  const windows = buildImpactWindows(items, [1, 7, 30], new Date(), IMPACT_DISCLAIMERS);
  const primary = windows[String(DEFAULT_IMPACT_WINDOW)] ??
    aggregateSegmentedImpact(items, DEFAULT_IMPACT_WINDOW, new Date(), IMPACT_DISCLAIMERS);
  return {
    ...primary,
    default_window: DEFAULT_IMPACT_WINDOW,
    windows,
  };
}

export class UnrestService {
  async refreshPulse(): Promise<Record<string, unknown>> {
    const pulse = await this.buildPulse();
    if (isRedisEnabled()) {
      await getRedisClient().setex(UNREST_CACHE_KEY, UNREST_TTL_SEC, JSON.stringify(pulse));
    }
    try {
      await saveIntelSnapshot({
        kind: "UNREST",
        lang: "bn",
        scopeKey: null,
        payload: pulse as unknown as Record<string, unknown>,
        sourceCount: pulse.signals.length,
        llmUsed: false,
      });
    } catch (err) {
      console.warn(
        "[unrest] snapshot persist failed:",
        err instanceof Error ? err.message : err,
      );
    }
    await broadcastDashboardRefresh("pipeline:unrest");
    return {
      districts: pulse.districts.length,
      signals: pulse.signals.length,
      movements: pulse.movements.length,
      active_movements: pulse.movements.filter((m) => m.status === "active").length,
      districts_at_risk: pulse.summary.districts_at_risk,
      persisted: true,
    };
  }

  async getPulse(query: DashboardScopeQuery = {}): Promise<UnrestPulse> {
    const ctx = await resolveScopeContext(query);
    let pulse: UnrestPulse;

    if (isRedisEnabled()) {
      const cached = await getRedisClient().get(UNREST_CACHE_KEY);
      if (cached) {
        pulse = JSON.parse(cached) as UnrestPulse;
        return this.applyScope(pulse, ctx);
      }
    }

    const fromDb = await getLatestIntelSnapshot("UNREST", "bn", null);
    if (fromDb) {
      const { _snapshot: _s, ...rest } = fromDb;
      pulse = rest as unknown as UnrestPulse;
      if (isRedisEnabled()) {
        await getRedisClient().setex(UNREST_CACHE_KEY, UNREST_TTL_SEC, JSON.stringify(pulse));
      }
      return this.applyScope(pulse, ctx);
    }

    pulse = await this.buildPulse();
    if (isRedisEnabled()) {
      await getRedisClient().setex(UNREST_CACHE_KEY, UNREST_TTL_SEC, JSON.stringify(pulse));
    }
    return this.applyScope(pulse, ctx);
  }

  private applyScope(pulse: UnrestPulse, ctx: ScopeContext): UnrestPulse {
    if (!ctx.divisionName && !ctx.districtName) {
      return { ...pulse, movements: pulse.movements ?? [], scope: ctx };
    }

    const districts = pulse.districts.filter((d) =>
      matchesScopeDistrict(d.district, d.division, ctx),
    );
    const signals = pulse.signals.filter((s) =>
      matchesScopeDistrict(s.district, s.division, ctx),
    );
    const movements = (pulse.movements ?? []).filter((m) =>
      matchesScopeDistrict(m.district, m.division, ctx),
    );

    return {
      districts,
      signals,
      movements,
      summary: {
        ...pulse.summary,
        districts_at_risk: districts.filter((d) => d.risk_level >= 3).length,
        active_protests: movements.filter((m) => m.status === "active").length,
        active_movements: movements.filter((m) => m.status === "active").length,
        law_hotspots: districts.filter((d) => d.law_reaction_count > 0).length,
        social_viral: districts.reduce((n, d) => n + d.social_viral_count, 0),
        total_signals: signals.length,
        top_district: districts[0]?.district ?? null,
        impact: impactFromSignals(signals),
      },
      scope: ctx,
    };
  }

  /** Fresh national pulse from DB (skips Redis). Used by the local mayor desk. */
  async buildPulse(): Promise<UnrestPulse> {
    const mandate = getCurrentMandate({
      CURRENT_GOVERNMENT_SINCE: env.CURRENT_GOVERNMENT_SINCE,
      CURRENT_GOVERNMENT_PARTY: env.CURRENT_GOVERNMENT_PARTY,
    });
    const since = mandateAnalysisSince(LOOKBACK_DAYS, mandate);
    const mid = new Date(Date.now() - Math.floor(DEFAULT_IMPACT_WINDOW / 2) * 86400 * 1000);
    const districtWindowSince = mandateAnalysisSince(DEFAULT_IMPACT_WINDOW, mandate);

    const articles = await prismaRead.externalArticle.findMany({
      where: { fetchedAt: { gte: since } },
      orderBy: { fetchedAt: "desc" },
      take: 800,
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

    const signals: UnrestSignal[] = [];
    const movementInputs: Array<{
      id: string;
      title: string;
      summary?: string | null;
      category: UnrestCategory;
      severity: number;
      district: string | null;
      division: string | null;
      source_name: string;
      url: string;
      published_at: string | null;
      impact: NewsImpactExtract;
    }> = [];
    const byDistrict = new Map<
      string,
      {
        division: string | null;
        protest: number;
        govt: number;
        law: number;
        social: number;
        grievance: number;
        recent: number;
        older: number;
        impactItems: ImpactArticleInput[];
      }
    >();

    for (const article of articles) {
      const published = article.publishedAt ?? article.fetchedAt;
      if (published < mandate.termStartedAt) continue;

      const text = `${article.title} ${article.summary ?? ""}`;
      if (
        !isBangladeshRelevantArticle({
          title: article.title,
          summary: article.summary,
          district: article.district,
          division: article.division,
          sourceName: article.sourceName,
          url: article.url,
        })
      ) {
        continue;
      }

      const category = classifyUnrest(text, article.sentimentCategory);
      if (!category) continue;

      const district = article.district && article.district !== "National"
        ? article.district
        : "National";
      const division = normalizeDivisionName(article.division) ?? article.division ?? null;
      const severity = severityFor(category, text);
      const impact = extractNewsImpact(article.title, article.summary);
      const publishedAt = (article.publishedAt ?? article.fetchedAt).toISOString();

      signals.push({
        id: article.id,
        title: article.title,
        title_bn_hint: categoryLabelBn(category),
        category,
        category_bn: categoryLabelBn(category),
        severity,
        district: district === "National" ? null : district,
        division,
        source_name: article.sourceName,
        url: article.url,
        published_at: publishedAt,
        sentiment: article.sentimentCategory,
        impact,
      });

      movementInputs.push({
        id: article.id,
        title: article.title,
        summary: article.summary,
        category,
        severity,
        district: district === "National" ? null : district,
        division,
        source_name: article.sourceName,
        url: article.url,
        published_at: publishedAt,
        impact,
      });

      const key = district;
      const entry = byDistrict.get(key) ?? {
        division,
        protest: 0,
        govt: 0,
        law: 0,
        social: 0,
        grievance: 0,
        recent: 0,
        older: 0,
        impactItems: [],
      };
      if (category === "protest") entry.protest += 1;
      if (category === "govt_discontent") entry.govt += 1;
      if (category === "law_reaction") entry.law += 1;
      if (category === "social_viral") entry.social += 1;
      if (category === "general_grievance") entry.grievance += 1;
      if (article.fetchedAt >= mid) entry.recent += 1;
      else entry.older += 1;
      if ((article.publishedAt ?? article.fetchedAt) >= districtWindowSince) {
        entry.impactItems.push({
          district: district === "National" ? null : district,
          publishedAt,
          impact,
          title: article.title,
          url: article.url,
        });
      }
      if (!entry.division && division) entry.division = division;
      byDistrict.set(key, entry);
    }

    const districts: DistrictUnrestCell[] = [];
    for (const [district, e] of byDistrict) {
      if (district === "National") continue;
      const total = e.protest + e.govt + e.law + e.social + e.grievance;
      if (total === 0) continue;

      const districtImpact = aggregateSegmentedImpact(
        e.impactItems,
        DEFAULT_IMPACT_WINDOW,
        new Date(),
        IMPACT_DISCLAIMERS,
      );

      const unrestScore = Math.min(
        100,
        e.protest * 18 +
          e.law * 20 +
          e.govt * 12 +
          e.social * 10 +
          e.grievance * 6 +
          Math.min(districtImpact.deaths, 20) * 8 +
          Math.min(districtImpact.injuries, 50) * 2,
      );
      const riskLevel =
        unrestScore >= 70 ? 5 : unrestScore >= 50 ? 4 : unrestScore >= 30 ? 3 : unrestScore >= 15 ? 2 : 1;

      const topCategories: UnrestCategory[] = [];
      if (e.protest > 0) topCategories.push("protest");
      if (e.law > 0) topCategories.push("law_reaction");
      if (e.govt > 0) topCategories.push("govt_discontent");
      if (e.social > 0) topCategories.push("social_viral");
      if (e.grievance > 0) topCategories.push("general_grievance");

      let trend: "rising" | "stable" | "falling" = "stable";
      if (e.recent > e.older + 1) trend = "rising";
      else if (e.older > e.recent + 1) trend = "falling";

      districts.push({
        district,
        division: e.division,
        protest_count: e.protest,
        govt_discontent_count: e.govt,
        law_reaction_count: e.law,
        social_viral_count: e.social,
        grievance_count: e.grievance,
        total_signals: total,
        unrest_score: unrestScore,
        risk_level: riskLevel,
        trend,
        top_categories: topCategories.slice(0, 3),
        population_pressure: riskLevel >= 4 ? "high" : riskLevel >= 3 ? "medium" : "low",
        deaths: districtImpact.deaths,
        injuries: districtImpact.injuries,
        civilian_deaths: districtImpact.civilian_deaths,
        damage_mentions: districtImpact.damage_mentions,
      });
    }

    districts.sort((a, b) => b.unrest_score - a.unrest_score || b.total_signals - a.total_signals);
    signals.sort((a, b) => b.severity - a.severity);

    const movements = clusterProtestMovements(movementInputs);
    const activeMovements = movements.filter((m) => m.status === "active");
    const atRisk = districts.filter((d) => d.risk_level >= 3);
    const impact = impactFromSignals(signals);

    return {
      districts,
      signals: signals.slice(0, 120),
      movements,
      summary: {
        districts_at_risk: atRisk.length,
        active_protests: activeMovements.length,
        active_movements: activeMovements.length,
        law_hotspots: districts.filter((d) => d.law_reaction_count > 0).length,
        social_viral: districts.reduce((n, d) => n + d.social_viral_count, 0),
        total_signals: signals.length,
        top_district: districts[0]?.district ?? null,
        refreshed_at: new Date().toISOString(),
        sources: ["rss_newspapers", "google_news", "topic_feeds"],
        note_bn:
          `${mandate.labelBn} — চলমান আন্দোলন স্থান ও বিষয় অনুযায়ী গ্রুপ করা। নিহত/আহত/ক্ষতি সংবাদ থেকে আনুমানিক।`,
        note_en:
          `${mandate.labelEn} — active protests clustered by place and theme. Casualties estimated from news.`,
        government: mandatePublicMeta(mandate),
        impact,
      },
    };
  }
}

export const unrestService = new UnrestService();
