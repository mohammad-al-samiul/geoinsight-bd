import { randomUUID } from "crypto";
import { IngestionSentiment, LiveSignalType } from "@prisma/client";
import { prismaRead, prismaWrite } from "../../core/database/prisma.client";
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
import { clusterProtestMovements, type ProtestMovement } from "../../shared/geo/protest-movements";
import bdDistricts from "../../shared/geo/data/bd-districts.json";

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
        return this.mergeCitizenMovements(this.applyScope(pulse, ctx), ctx);
      }
    }

    const fromDb = await getLatestIntelSnapshot("UNREST", "bn", null);
    if (fromDb) {
      const { _snapshot: _s, ...rest } = fromDb;
      pulse = rest as unknown as UnrestPulse;
      if (isRedisEnabled()) {
        await getRedisClient().setex(UNREST_CACHE_KEY, UNREST_TTL_SEC, JSON.stringify(pulse));
      }
      return this.mergeCitizenMovements(this.applyScope(pulse, ctx), ctx);
    }

    pulse = await this.buildPulse();
    if (isRedisEnabled()) {
      await getRedisClient().setex(UNREST_CACHE_KEY, UNREST_TTL_SEC, JSON.stringify(pulse));
    }
    return this.mergeCitizenMovements(this.applyScope(pulse, ctx), ctx);
  }

  async createCitizenReport(input: CitizenReportInput): Promise<ProtestMovement> {
    const id = randomUUID();
    const theme = CITIZEN_THEMES[input.themeId] ?? CITIZEN_THEMES.general;
    const party = CITIZEN_PARTIES[input.partyId] ?? CITIZEN_PARTIES.unaffiliated;
    const now = new Date();
    const body = JSON.stringify({
      place: input.place,
      themeId: input.themeId,
      themeEn: theme.en,
      themeBn: theme.bn,
      partyId: input.partyId,
      partyEn: party.en,
      partyBn: party.bn,
      lat: input.lat ?? null,
      lng: input.lng ?? null,
      titleBn: input.title,
    } satisfies CitizenReportBody);

    const row = await prismaWrite.liveSignal.create({
      data: {
        signalType: LiveSignalType.ALERT,
        title: input.title,
        body,
        url: `citizen://${id}`,
        sourceName: "Citizen",
        district: input.district,
        division: divisionNameForDistrict(input.district),
        severity: input.urgency === "active" ? 75 : 50,
        flagType: "CITIZEN",
        publishedAt: now,
      },
    });

    return citizenRowToMovement(row);
  }

  private async mergeCitizenMovements(pulse: UnrestPulse, ctx: ScopeContext): Promise<UnrestPulse> {
    const extra = await this.listCitizenMovements(ctx);
    if (extra.length === 0) return pulse;
    const existing = pulse.movements ?? [];
    const seen = new Set(existing.map((m) => m.id));
    const movements = [...extra.filter((m) => !seen.has(m.id)), ...existing];
    return {
      ...pulse,
      movements,
      summary: {
        ...pulse.summary,
        active_protests: movements.filter((m) => m.status === "active").length,
        active_movements: movements.filter((m) => m.status === "active").length,
      },
    };
  }

  private async listCitizenMovements(ctx: ScopeContext): Promise<ProtestMovement[]> {
    const rows = await prismaRead.liveSignal.findMany({
      where: {
        flagType: "CITIZEN",
        url: { startsWith: "citizen://" },
        resolvedAt: null,
      },
      orderBy: { publishedAt: "desc" },
      take: 200,
    });
    return rows
      .map(citizenRowToMovement)
      .filter((m) => matchesScopeDistrict(m.district, m.division, ctx));
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

export interface CitizenReportInput {
  title: string;
  place: string;
  district: string;
  themeId: string;
  partyId: string;
  urgency: "active" | "recent";
  lat?: number;
  lng?: number;
}

interface CitizenReportBody {
  place?: string;
  themeId?: string;
  themeEn?: string;
  themeBn?: string;
  partyId?: string;
  partyEn?: string;
  partyBn?: string;
  lat?: number | null;
  lng?: number | null;
  titleBn?: string;
}

const EMPTY_IMPACT: NewsImpactExtract = {
  deaths: 0,
  civilian_deaths: 0,
  injuries: 0,
  homes_damaged: 0,
  livestock_lost: 0,
  damage_mentions: 0,
  evidence: [],
};

const CITIZEN_THEMES: Record<string, { en: string; bn: string }> = {
  gas_fuel: { en: "Gas / fuel price protest", bn: "গ্যাস/জ্বালানি দাম আন্দোলন" },
  power: { en: "Electricity tariff / load-shedding", bn: "বিদ্যুৎ দাম/লোডশেডিং আন্দোলন" },
  political_opposition: { en: "Opposition / political protest", bn: "বিরোধী দল/রাজনৈতিক আন্দোলন" },
  student: { en: "Student protest", bn: "ছাত্র আন্দোলন" },
  hartal_blockade: { en: "Hartal / blockade", bn: "হরতাল/অবরোধ" },
  wage: { en: "Wage / labour protest", bn: "মজুরি/শ্রমিক আন্দোলন" },
  general: { en: "Public protest", bn: "জন আন্দোলন / বিক্ষোভ" },
};

const CITIZEN_PARTIES: Record<string, { en: string; bn: string }> = {
  bnp: { en: "BNP", bn: "বিএনপি" },
  jamaat: { en: "Jamaat-e-Islami", bn: "জামায়াতে ইসলামী" },
  ncp: { en: "NCP", bn: "এনসিপি" },
  jatiya_party: { en: "Jatiya Party", bn: "জাতীয় পার্টি" },
  student_org: { en: "Student organizations", bn: "ছাত্র সংগঠন" },
  labour_union: { en: "Labour / trade union", bn: "শ্রমিক সংগঠন" },
  civil_society: { en: "Civil society", bn: "নাগরিক সমাজ" },
  unaffiliated: { en: "Unaffiliated / public", bn: "অদলীয় / সাধারণ জনতা" },
};

const DIVISION_BY_ID: Record<string, string> = {
  "1": "Barishal",
  "2": "Chattogram",
  "3": "Dhaka",
  "4": "Khulna",
  "5": "Rajshahi",
  "6": "Rangpur",
  "7": "Sylhet",
  "8": "Mymensingh",
};

function divisionNameForDistrict(district: string): string | null {
  const hit = (bdDistricts as { districts: Array<{ name: string; division_id: string }> }).districts.find(
    (d) => d.name.toLowerCase() === district.trim().toLowerCase(),
  );
  return hit ? DIVISION_BY_ID[hit.division_id] ?? null : null;
}

function parseCitizenBody(raw: string | null): CitizenReportBody {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as CitizenReportBody;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function citizenRowToMovement(row: {
  id: string;
  title: string;
  body: string | null;
  url: string;
  district: string | null;
  division: string | null;
  severity: number | null;
  publishedAt: Date | null;
  createdAt: Date;
}): ProtestMovement {
  const extra = parseCitizenBody(row.body);
  const themeId = extra.themeId && CITIZEN_THEMES[extra.themeId] ? extra.themeId : "general";
  const partyId = extra.partyId && CITIZEN_PARTIES[extra.partyId] ? extra.partyId : "unaffiliated";
  const theme = CITIZEN_THEMES[themeId];
  const party = CITIZEN_PARTIES[partyId];
  const place = extra.place?.trim() || row.district || "Unknown";
  const status: "active" | "recent" = (row.severity ?? 0) >= 70 ? "active" : "recent";
  const at = (row.publishedAt ?? row.createdAt).toISOString();
  const when = new Date(at);
  return {
    id: row.id,
    title: `${theme.en} — ${place} (${party.en})`,
    title_bn: `${theme.bn} — ${place} (${party.bn})`,
    theme_id: themeId,
    theme: extra.themeEn || theme.en,
    theme_bn: extra.themeBn || theme.bn,
    party_id: partyId,
    party: extra.partyEn || party.en,
    party_bn: extra.partyBn || party.bn,
    place,
    place_bn: place,
    district: row.district,
    division: row.division,
    status,
    status_bn: status === "active" ? "চলমান / সক্রিয়" : "সাম্প্রতিক",
    status_en: status === "active" ? "Active now" : "Recent",
    event_at: at,
    event_period_en: when.toLocaleString("en-BD", { month: "long", year: "numeric" }),
    event_period_bn: when.toLocaleString("bn-BD", { month: "long", year: "numeric" }),
    temporal_class: "live",
    first_seen_at: at,
    last_seen_at: at,
    article_count: 1,
    severity: row.severity ?? (status === "active" ? 75 : 50),
    impact: EMPTY_IMPACT,
    summary_bn: `নাগরিক/ফিল্ড রিপোর্ট: ${row.title} · ইস্যু: ${theme.bn} · দল: ${party.bn}`,
    summary_en: `Citizen/field report: ${row.title} · issue: ${theme.en} · party: ${party.en}`,
    articles: [],
    lat: typeof extra.lat === "number" ? extra.lat : null,
    lng: typeof extra.lng === "number" ? extra.lng : null,
    source_confidence: 0.35,
    unique_sources: 1,
    timeline: [{ at, title: row.title, source_name: "Citizen", url: row.url }],
    source: "citizen",
  };
}

export const unrestService = new UnrestService();
