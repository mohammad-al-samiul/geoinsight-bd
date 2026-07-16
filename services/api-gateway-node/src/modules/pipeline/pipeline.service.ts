import {
  IngestionSentiment,
  KpiRecordStatus,
  LiveSignalType,
  Prisma,
  ProjectStatus,
  RedFlagType,
} from "@prisma/client";
import { env } from "../../core/config/env";
import { prismaRead, prismaWrite } from "../../core/database/prisma.client";
import { getRedisClient, isRedisEnabled } from "../../infrastructure/redis/redis.client";
import { publishToGovQueue } from "../../infrastructure/messaging/gov-queue.publisher";
import { hashAiExplanation } from "../twin/twin.service";
import { ingestionService } from "../ingestion/ingestion.service";
import { broadcastDashboardRefresh, broadcastKpiUpdate } from "./pipeline.broadcast";
import { AI_FETCH_LLM_MS, fetchAi } from "../../shared/http/fetch-ai";

const COMMODITIES = ["rice", "wheat", "lentil", "onion"] as const;
const HAZARD_CACHE_KEY = "pipeline:hazard:v1";
const HAZARD_TTL_SEC = 3600;
const KPI_MIN_INTERVAL_MS = 6 * 60 * 60 * 1000;

const FLOOD_KEYWORDS = ["বন্যা", "flood", "inundat", "water level", "পানি বৃদ্ধি"];
const CYCLONE_KEYWORDS = ["ঘূর্ণিঝড়", "cyclone", "storm", "বিপর্যয়", "landfall"];

const DIVISION_ALIASES: Record<string, string> = {
  chittagong: "Chattogram",
  chattogram: "Chattogram",
  ctg: "Chattogram",
  chattagram: "Chattogram",
  barisal: "Barishal",
};

function normalizeDivision(raw: string): string {
  const key = raw.trim().toLowerCase();
  return DIVISION_ALIASES[key] ?? raw.trim();
}

const COASTAL_DIVISIONS = new Set(["Chattogram", "Barishal", "Khulna"]);

export interface PipelineJobResult {
  job: string;
  ok: boolean;
  detail: Record<string, unknown>;
  completed_at: string;
}

export interface PipelineRunSummary {
  jobs: PipelineJobResult[];
  completed_at: string;
}

interface LandedCostRow {
  country_code: string;
  country_name: string;
  commodity: string;
  unit_price_usd: number;
  shipping_cost_usd: number;
  tariff_usd: number;
  landed_cost_usd: number;
  reliability_score: number;
}

interface ArbitrageApiResult {
  commodity: string;
  all_ranked: LandedCostRow[];
}

function fiscalYear(): string {
  const now = new Date();
  const year = now.getMonth() >= 6 ? now.getFullYear() + 1 : now.getFullYear();
  return String(year);
}

function commodityCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9_]/g, "_");
}

export class PipelineService {
  private lastRuns = new Map<string, string>();

  getLastRuns(): Record<string, string> {
    return Object.fromEntries(this.lastRuns);
  }

  async runAll(): Promise<PipelineRunSummary> {
    const jobs: PipelineJobResult[] = [];
    const runners: Array<[string, () => Promise<Record<string, unknown>>]> = [
      ["news", () => this.syncNews()],
      ["commodity", () => this.syncCommodityPrices()],
      ["kpi", () => this.syncKpiRecords()],
      ["alerts", () => this.detectAnomalies()],
      ["agro", () => this.syncAgroPrices()],
      ["hazard", () => this.refreshHazardSignals()],
      ["weather", () => this.syncWeatherData()],
      ["unrest", () => this.refreshUnrestPulse()],
      ["outlook", () => this.refreshStrategicOutlook()],
      ["briefing", () => this.refreshMorningBriefing()],
      ["signals", () => this.extractLiveSignals()],
    ];

    for (const [job, fn] of runners) {
      try {
        const detail = await fn();
        jobs.push({ job, ok: true, detail, completed_at: new Date().toISOString() });
        this.lastRuns.set(job, new Date().toISOString());
      } catch (err) {
        jobs.push({
          job,
          ok: false,
          detail: { error: err instanceof Error ? err.message : String(err) },
          completed_at: new Date().toISOString(),
        });
      }
    }

    await broadcastDashboardRefresh("pipeline:full");
    return { jobs, completed_at: new Date().toISOString() };
  }

  async syncNews(): Promise<Record<string, unknown>> {
    // Full 15-per-feed runs are too heavy for routine live refresh on a small VPS.
    // Keep the dashboard fed with fresher, lighter batches instead of timing out.
    const result = await ingestionService.syncFromAi(6, 240_000);
    await broadcastDashboardRefresh("pipeline:news");
    void this.refreshIntelAfterNews().catch((err) => {
      console.warn(
        "[pipeline:news] post-news intel refresh failed:",
        err instanceof Error ? err.message : err,
      );
    });
    return result as unknown as Record<string, unknown>;
  }

  /** Refresh briefing/outlook when news lands so narrative sections stay populated. */
  private async refreshIntelAfterNews(): Promise<void> {
    const { getLatestIntelSnapshot } = await import("../intel/intel-snapshot.service");
    const { isUsableIntelPayload } = await import("../intel/intel-snapshot.service");
    const { briefingService } = await import("../briefing/briefing.service");
    const { outlookService } = await import("../outlook/outlook.service");

    const [briefBn, briefEn, outlookBn] = await Promise.all([
      getLatestIntelSnapshot("BRIEFING", "bn", "national"),
      getLatestIntelSnapshot("BRIEFING", "en", "national"),
      getLatestIntelSnapshot("OUTLOOK", "bn", null),
    ]);

    const tasks: Array<Promise<unknown>> = [];
    if (!briefBn || !isUsableIntelPayload("BRIEFING", briefBn)) {
      tasks.push(briefingService.refreshMorningBriefing("bn"));
    }
    if (!briefEn || !isUsableIntelPayload("BRIEFING", briefEn)) {
      tasks.push(briefingService.refreshMorningBriefing("en"));
    }
    if (!outlookBn || !isUsableIntelPayload("OUTLOOK", outlookBn)) {
      tasks.push(outlookService.refresh());
    }
    if (tasks.length) await Promise.all(tasks);
  }

  async syncCommodityPrices(): Promise<Record<string, unknown>> {
    let inserted = 0;
    const commodities: string[] = [];

    for (const commodity of COMMODITIES) {
      const res = await fetchAi(`/api/v1/arbitrage/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commodity, quantity_mt: 1000 }),
      });
      if (!res.ok) continue;

      const payload = (await res.json()) as ArbitrageApiResult;
      commodities.push(payload.commodity);
      const ranked = payload.all_ranked.slice(0, 25);

      for (let rank = 0; rank < ranked.length; rank++) {
        const row = ranked[rank];
        await prismaWrite.commodityPriceLog.create({
          data: {
            commodityCode: commodityCode(row.commodity || payload.commodity),
            countryCode: row.country_code.slice(0, 3),
            countryName: row.country_name,
            unitPriceUsd: new Prisma.Decimal(row.unit_price_usd),
            shippingCostUsd: new Prisma.Decimal(row.shipping_cost_usd),
            tariffRate: new Prisma.Decimal(
              row.unit_price_usd > 0 ? row.tariff_usd / row.unit_price_usd : 0,
            ),
            landedCostUsd: new Prisma.Decimal(row.landed_cost_usd),
            sourceRank: rank + 1,
            metadata: { pipeline: true, reliability: row.reliability_score },
          },
        });
        inserted += 1;
      }
    }

    await broadcastKpiUpdate("compliance", inserted, { source: "commodity_sync" });
    await broadcastDashboardRefresh("pipeline:commodity");
    return { inserted, commodities };
  }

  async syncKpiRecords(): Promise<Record<string, unknown>> {
    const defs = await prismaRead.kpiDefinition.findMany({
      where: { code: { in: ["COMPLETION", "BUDGET_UTIL", "GRIEVANCE", "AGRI_GROWTH"] } },
    });
    const defByCode = new Map(defs.map((d) => [d.code, d.id]));
    const reps = await prismaRead.representative.findMany({
      select: { id: true, adminUnitId: true, adminUnit: { select: { districtId: true, name: true } } },
      take: 100,
    });

    const since = new Date(Date.now() - KPI_MIN_INTERVAL_MS);
    let upserted = 0;
    const fy = fiscalYear();

    for (const rep of reps) {
      const districtName = rep.adminUnit.name;
      const districtKey = districtName.split(" ")[0];

      let completion: number;
      let budgetUtil: number;

      if (env.LIVE_DATA_ONLY) {
        const [projectSignals, alertSignals] = await Promise.all([
          prismaRead.liveSignal.count({
            where: {
              signalType: { in: [LiveSignalType.PROJECT, LiveSignalType.POLICY] },
              OR: [
                { district: { contains: districtKey, mode: "insensitive" } },
                { adminUnitId: rep.adminUnitId },
              ],
            },
          }),
          prismaRead.liveSignal.count({
            where: {
              signalType: LiveSignalType.ALERT,
              OR: [
                { district: { contains: districtKey, mode: "insensitive" } },
                { adminUnitId: rep.adminUnitId },
              ],
            },
          }),
        ]);
        completion = Math.round(
          Math.max(52, Math.min(97, 82 - alertSignals * 3 + projectSignals * 2)),
        );
        budgetUtil = Math.round(
          Math.max(58, Math.min(94, 68 + projectSignals * 1.5 - alertSignals * 2)),
        );
      } else {
        const projects = await prismaRead.project.findMany({
          where: {
            adminUnit: {
              OR: [
                { id: rep.adminUnitId },
                { districtId: rep.adminUnit.districtId ?? undefined },
                { divisionId: rep.adminUnitId },
              ],
            },
          },
          select: { status: true, budgetAllocated: true, budgetSpent: true },
        });

        completion =
          projects.length === 0
            ? 72
            : Math.round(
                projects.reduce((sum, p) => {
                  const pct =
                    p.status === ProjectStatus.COMPLETED
                      ? 100
                      : p.status === ProjectStatus.ONGOING
                        ? Math.min(
                            95,
                            (Number(p.budgetSpent) / Math.max(Number(p.budgetAllocated), 1)) * 100,
                          )
                        : p.status === ProjectStatus.STALLED
                          ? 35
                          : 10;
                  return sum + pct;
                }, 0) / projects.length,
              );

        budgetUtil =
          projects.length === 0
            ? 68
            : Math.round(
                (projects.reduce(
                  (sum, p) =>
                    sum + Number(p.budgetSpent) / Math.max(Number(p.budgetAllocated), 1),
                  0,
                ) /
                  projects.length) *
                  100,
              );
      }
      const grievanceArticles = await prismaRead.externalArticle.count({
        where: {
          fetchedAt: { gte: since },
          sentimentCategory: IngestionSentiment.Grievance,
          OR: [{ district: districtName }, { district: { contains: districtName.split(" ")[0] } }],
        },
      });
      const totalArticles = await prismaRead.externalArticle.count({
        where: {
          fetchedAt: { gte: since },
          OR: [{ district: districtName }, { district: { contains: districtName.split(" ")[0] } }],
        },
      });
      const grievanceRatio = totalArticles > 0 ? grievanceArticles / totalArticles : 0.15;
      const grievanceResolution = Math.round(Math.max(40, 100 - grievanceRatio * 120));

      const ricePrice = await prismaRead.commodityPriceLog.findFirst({
        where: { commodityCode: "RICE", countryCode: "BGD" },
        orderBy: { createdAt: "desc" },
      });
      const agriGrowth = ricePrice
        ? Math.round(72 + Number(ricePrice.landedCostUsd) * 0.02)
        : 74;

      const values: Array<[string, number]> = [
        ["COMPLETION", completion],
        ["BUDGET_UTIL", Math.min(100, budgetUtil)],
        ["GRIEVANCE", grievanceResolution],
        ["AGRI_GROWTH", Math.min(99, agriGrowth)],
      ];

      for (const [code, value] of values) {
        const defId = defByCode.get(code);
        if (!defId) continue;

        const recent = await prismaRead.kpiRecord.findFirst({
          where: {
            representativeId: rep.id,
            kpiDefId: defId,
            recordedAt: { gte: since },
            blockchainHash: { startsWith: "pipeline:" },
          },
          orderBy: { recordedAt: "desc" },
        });

        if (recent && Math.abs(Number(recent.value) - value) < 1.5) continue;

        await prismaWrite.kpiRecord.create({
          data: {
            representativeId: rep.id,
            kpiDefId: defId,
            value: new Prisma.Decimal(value),
            fiscalYear: fy,
            status: KpiRecordStatus.VERIFIED,
            verified: true,
            recordedAt: new Date(),
            blockchainHash: "pipeline:auto",
          },
        });
        upserted += 1;
      }
    }

    await broadcastKpiUpdate("completion_rate", upserted, { source: "kpi_pipeline" });
    return { upserted, representatives: reps.length };
  }

  async detectAnomalies(): Promise<Record<string, unknown>> {
    let created = 0;
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const overrunProjects = await prismaRead.project.findMany({
      where: { status: ProjectStatus.ONGOING },
      select: {
        id: true,
        title: true,
        budgetAllocated: true,
        budgetSpent: true,
        adminUnitId: true,
      },
    });

    for (const p of overrunProjects) {
      const allocated = Number(p.budgetAllocated);
      const spent = Number(p.budgetSpent);
      if (allocated <= 0 || spent / allocated < 1.08) continue;

      const existing = await prismaRead.redFlagAlert.findFirst({
        where: {
          projectId: p.id,
          flagType: RedFlagType.BUDGET_OVERRUN,
          resolvedAt: null,
          createdAt: { gte: since },
        },
      });
      if (existing) continue;

      const pct = Math.round((spent / allocated) * 100);
      const explanation = `Pipeline: budget utilization ${pct}% exceeds threshold (108%). Project "${p.title}".`;
      const alert = await prismaWrite.redFlagAlert.create({
        data: {
          projectId: p.id,
          flagType: RedFlagType.BUDGET_OVERRUN,
          severity: pct >= 120 ? 5 : 4,
          aiExplanation: explanation,
          blockchainHash: hashAiExplanation(explanation, p.id),
        },
      });

      await publishToGovQueue({
        type: "alert_created",
        adminUnitId: p.adminUnitId,
        payload: {
          alertId: alert.id,
          projectId: p.id,
          severity: alert.severity,
          flagType: alert.flagType,
          aiExplanation: explanation,
          predictive: false,
          source: "pipeline",
        },
      });
      created += 1;
    }

    const stalled = await prismaRead.project.findMany({
      where: { status: ProjectStatus.STALLED },
      select: { id: true, title: true, adminUnitId: true, startDate: true },
    });

    for (const p of stalled) {
      const days = Math.floor((Date.now() - p.startDate.getTime()) / (86400 * 1000));
      if (days < 90) continue;

      const existing = await prismaRead.redFlagAlert.findFirst({
        where: {
          projectId: p.id,
          flagType: RedFlagType.DELAY,
          resolvedAt: null,
          createdAt: { gte: since },
        },
      });
      if (existing) continue;

      const explanation = `Pipeline: project stalled ${days} days — "${p.title}".`;
      const alert = await prismaWrite.redFlagAlert.create({
        data: {
          projectId: p.id,
          flagType: RedFlagType.DELAY,
          severity: 4,
          aiExplanation: explanation,
          blockchainHash: hashAiExplanation(explanation, p.id),
        },
      });

      await publishToGovQueue({
        type: "alert_created",
        adminUnitId: p.adminUnitId,
        payload: {
          alertId: alert.id,
          projectId: p.id,
          severity: alert.severity,
          flagType: alert.flagType,
          aiExplanation: explanation,
          source: "pipeline",
        },
      });
      created += 1;
    }

    if (created > 0) {
      await broadcastDashboardRefresh("pipeline:alerts");
    }
    return { created };
  }

  async syncAgroPrices(): Promise<Record<string, unknown>> {
    const markets = await prismaRead.agroMarket.findMany({
      select: { id: true, type: true },
      take: 200,
    });

    const latestPrices = await prismaRead.$queryRaw<
      Array<{ commodity_code: string; unit_price_usd: string }>
    >`
      SELECT DISTINCT ON (commodity_code)
        commodity_code,
        unit_price_usd::text
      FROM commodity_price_logs
      WHERE commodity_code IN ('RICE', 'WHEAT', 'LENTIL', 'ONION')
      ORDER BY commodity_code, created_at DESC
    `;

    const priceMap = new Map<string, number>();
    for (const row of latestPrices) {
      priceMap.set(row.commodity_code, Number(row.unit_price_usd));
    }

    const commodityForType: Record<string, string> = {
      WHOLESALE: "RICE",
      RETAIL: "ONION",
      HAAT: "LENTIL",
      MANDI: "WHEAT",
    };

    const usdToBdt = 110;
    let updated = 0;

    for (const market of markets) {
      const code = commodityForType[market.type] ?? "RICE";
      const usdPerMt = priceMap.get(code);
      if (!usdPerMt) continue;

      // unit_price_usd is USD per metric ton → BDT per kg
      const variance = 0.92 + (market.id.charCodeAt(0) % 16) * 0.01;
      const priceBdt = Math.round(((usdPerMt * usdToBdt) / 1000) * variance * 100) / 100;

      await prismaWrite.agroMarket.update({
        where: { id: market.id },
        data: {
          commodityCode: code,
          priceBdtPerKg: new Prisma.Decimal(priceBdt),
          priceUpdatedAt: new Date(),
        },
      });
      updated += 1;
    }

    await broadcastDashboardRefresh("pipeline:agro");
    return { updated, markets: markets.length };
  }

  async refreshHazardSignals(): Promise<Record<string, unknown>> {
    const since = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const articles = await prismaRead.externalArticle.findMany({
      where: { fetchedAt: { gte: since } },
      select: { title: true, summary: true, district: true, division: true },
      take: 200,
    });

    const signals: Array<{
      zone_id: string;
      hazard_type: string;
      risk_level: number;
      division: string;
      article_count: number;
      updated_at: string;
    }> = [];

    const divisionHits = new Map<string, { flood: number; cyclone: number }>();

    for (const article of articles) {
      const text = `${article.title} ${article.summary ?? ""}`.toLowerCase();
      let division = normalizeDivision(article.division ?? article.district ?? "National");
      if (division === "National") {
        if (text.includes("chittagong") || text.includes("chattogram") || text.includes("cox")) {
          division = "Chattogram";
        } else if (text.includes("sylhet")) {
          division = "Sylhet";
        } else if (text.includes("barishal") || text.includes("barisal")) {
          division = "Barishal";
        }
      }
      const entry = divisionHits.get(division) ?? { flood: 0, cyclone: 0 };

      if (FLOOD_KEYWORDS.some((k) => text.includes(k.toLowerCase()))) entry.flood += 1;
      if (CYCLONE_KEYWORDS.some((k) => text.includes(k.toLowerCase()))) entry.cyclone += 1;
      divisionHits.set(division, entry);
    }

    for (const [division, hits] of divisionHits) {
      const floodThreshold = COASTAL_DIVISIONS.has(division) ? 1 : 2;
      if (hits.flood >= floodThreshold) {
        signals.push({
          zone_id: `live-flood-${division.toLowerCase().replace(/\s+/g, "-")}`,
          hazard_type: "flood",
          risk_level: Math.min(5, 2 + hits.flood),
          division,
          article_count: hits.flood,
          updated_at: new Date().toISOString(),
        });
      }
      if (hits.cyclone >= 1) {
        signals.push({
          zone_id: `live-cyclone-${division.toLowerCase().replace(/\s+/g, "-")}`,
          hazard_type: "cyclone",
          risk_level: Math.min(5, 3 + hits.cyclone),
          division,
          article_count: hits.cyclone,
          updated_at: new Date().toISOString(),
        });
      }
    }

    const payload = { signals, article_count: articles.length, refreshed_at: new Date().toISOString() };

    if (isRedisEnabled()) {
      await getRedisClient().setex(HAZARD_CACHE_KEY, HAZARD_TTL_SEC, JSON.stringify(payload));
    }

    await broadcastDashboardRefresh("pipeline:hazard");
    return { signals: signals.length, articles: articles.length };
  }

  async extractLiveSignals(): Promise<Record<string, unknown>> {
    const { liveDataService } = await import("../live-data/live-data.service");
    const result = await liveDataService.extractSignalsFromNews(7);
    await broadcastDashboardRefresh("pipeline:signals");
    return result;
  }

  async getHazardSignals(): Promise<Record<string, unknown> | null> {
    if (!isRedisEnabled()) return null;
    const raw = await getRedisClient().get(HAZARD_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Record<string, unknown>;
  }

  async syncWeatherData(): Promise<Record<string, unknown>> {
    const { weatherService } = await import("../weather/weather.service");
    // Weather fetch can fan out to many Open-Meteo points and often needs
    // more than the default 30s gateway timeout.
    const result = await weatherService.syncFromAi(AI_FETCH_LLM_MS);
    return result;
  }

  async refreshUnrestPulse(): Promise<Record<string, unknown>> {
    const { unrestService } = await import("../unrest/unrest.service");
    return unrestService.refreshPulse();
  }

  async refreshStrategicOutlook(): Promise<Record<string, unknown>> {
    const { outlookService } = await import("../outlook/outlook.service");
    return outlookService.refresh();
  }

  async refreshMorningBriefing(): Promise<Record<string, unknown>> {
    const { briefingService } = await import("../briefing/briefing.service");
    const [bn, en] = await Promise.all([
      briefingService.refreshMorningBriefing("bn"),
      briefingService.refreshMorningBriefing("en"),
    ]);
    await broadcastDashboardRefresh("pipeline:briefing");
    return { bn, en };
  }

  async getLatestCommodityQuotes(commodity: string, limit = 30) {
    const code = commodityCode(commodity);
    return prismaRead.commodityPriceLog.findMany({
      where: { commodityCode: code },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        countryCode: true,
        countryName: true,
        unitPriceUsd: true,
        shippingCostUsd: true,
        tariffRate: true,
        landedCostUsd: true,
        sourceRank: true,
        createdAt: true,
      },
    });
  }
}

export const pipelineService = new PipelineService();
