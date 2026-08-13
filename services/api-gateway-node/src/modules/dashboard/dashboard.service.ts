import { Prisma, ProjectStatus } from "@prisma/client";
import { env } from "../../core/config/env";
import { prismaRead } from "../../core/database/prisma.client";
import { redisCacheService } from "../../infrastructure/cache/redis-cache.service";
import { liveDataService } from "../live-data/live-data.service";
import { metricSeriesService } from "../metrics/metric-series.service";

const DASHBOARD_TTL_SEC = 90;

export interface DashboardScopeQuery {
  divisionId?: string;
  districtId?: string;
  upazilaId?: string;
  unionId?: string;
}

function scopeUnitId(query: DashboardScopeQuery): string | undefined {
  return query.unionId ?? query.upazilaId ?? query.districtId ?? query.divisionId;
}

function projectWhere(query: DashboardScopeQuery): Prisma.ProjectWhereInput {
  const unitId = scopeUnitId(query);
  if (!unitId) return {};
  return {
    adminUnit: {
      OR: [
        { id: unitId },
        { divisionId: unitId },
        { districtId: unitId },
        { upazilaId: unitId },
        { parentId: unitId },
      ],
    },
  };
}

const BD_HUB = { lat: 23.685, lng: 90.3563 };

const COUNTRY_COORDS: Record<string, [number, number]> = {
  IND: [28.6139, 77.209],
  NPL: [27.7172, 85.324],
  MMR: [19.7633, 96.0785],
  PAK: [33.6844, 73.0479],
  THA: [13.7563, 100.5018],
  VNM: [21.0285, 105.8542],
  MYS: [3.139, 101.6869],
  CHN: [39.9042, 116.4074],
  TUR: [39.9334, 32.8597],
  EGY: [30.0444, 31.2357],
  CAN: [45.4215, -75.6972],
  AUS: [-35.2809, 149.13],
  RUS: [55.7558, 37.6176],
  UKR: [50.4501, 30.5234],
  BRA: [-15.7942, -47.8822],
  ARG: [-34.6037, -58.3816],
  USA: [38.9072, -77.0369],
  QAT: [25.2854, 51.531],
  NLD: [52.3676, 4.9041],
  ARE: [24.4539, 54.3773],
  BGD: [BD_HUB.lat, BD_HUB.lng],
};

function formatCommodity(code: string): string {
  return code.charAt(0) + code.slice(1).toLowerCase().replace(/_/g, " ");
}

function buildTradeFlows(
  rows: Array<{
    commodity_code: string;
    country_code: string;
    country_name: string;
    unit_price_usd: string;
    landed_cost_usd: string;
  }>,
) {
  const byCommodity = new Map<string, typeof rows>();
  for (const row of rows) {
    const list = byCommodity.get(row.commodity_code) ?? [];
    list.push(row);
    byCommodity.set(row.commodity_code, list);
  }

  const flows: Array<{
    id: string;
    commodity: string;
    flowType: "import" | "export";
    countryCode: string;
    countryName: string;
    countryLat: number;
    countryLng: number;
    marginPct: number;
    unitPriceUsd: number;
    landedCostUsd: number;
  }> = [];

  for (const [code, entries] of byCommodity) {
    if (entries.length < 2) continue;
    const sorted = [...entries].sort(
      (a, b) => Number(a.landed_cost_usd) - Number(b.landed_cost_usd),
    );
    const cheapest = sorted[0];
    const priciest = sorted[sorted.length - 1];
    const minCost = Number(cheapest.landed_cost_usd);
    const maxCost = Number(priciest.landed_cost_usd);
    const spreadPct =
      minCost > 0 ? Math.round(((maxCost - minCost) / minCost) * 1000) / 10 : 0;
    const commodity = formatCommodity(code);

    const importCoords = COUNTRY_COORDS[cheapest.country_code];
    if (importCoords && cheapest.country_code !== "BGD") {
      flows.push({
        id: `import-${code}-${cheapest.country_code}`,
        commodity,
        flowType: "import",
        countryCode: cheapest.country_code,
        countryName: cheapest.country_name,
        countryLat: importCoords[0],
        countryLng: importCoords[1],
        marginPct: Math.max(3, Math.round(spreadPct * 0.4 * 10) / 10),
        unitPriceUsd: Number(cheapest.unit_price_usd),
        landedCostUsd: minCost,
      });
    }

    const exportCoords = COUNTRY_COORDS[priciest.country_code];
    if (
      exportCoords &&
      priciest.country_code !== "BGD" &&
      priciest.country_code !== cheapest.country_code
    ) {
      flows.push({
        id: `export-${code}-${priciest.country_code}`,
        commodity,
        flowType: "export",
        countryCode: priciest.country_code,
        countryName: priciest.country_name,
        countryLat: exportCoords[0],
        countryLng: exportCoords[1],
        marginPct: spreadPct,
        unitPriceUsd: Number(priciest.unit_price_usd),
        landedCostUsd: maxCost,
      });
    }
  }

  return flows.slice(0, 24);
}

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export class DashboardService {
  async getNationalMetrics(query: DashboardScopeQuery = {}) {
    if (env.LIVE_DATA_ONLY) {
      return liveDataService.getNationalMetrics(query);
    }

    const scopeKey = [
      query.divisionId ?? "",
      query.districtId ?? "",
      query.upazilaId ?? "",
      query.unionId ?? "",
    ].join(":");
    const cacheKey = `dash:national:seed:${scopeKey || "all"}`;

    return redisCacheService.getOrSet(cacheKey, DASHBOARD_TTL_SEC, async () => {
      const where = projectWhere(query);

      const [units, projects, openAlerts, representatives, projectRows, divisions, commodityRows] =
        await Promise.all([
          prismaRead.adminUnit.count(),
          prismaRead.project.count({ where }),
          prismaRead.redFlagAlert.count({
            where: {
              resolvedAt: null,
              ...(Object.keys(where).length > 0 && { project: where }),
            },
          }),
          prismaRead.representative.count(
            scopeUnitId(query)
              ? { where: { adminUnitId: scopeUnitId(query) } }
              : undefined,
          ),
          prismaRead.project.findMany({
            where,
            select: {
              title: true,
              budgetAllocated: true,
              budgetSpent: true,
              status: true,
              startDate: true,
              adminUnitId: true,
            },
            orderBy: { startDate: "desc" },
            take: 500,
          }),
          prismaRead.adminUnit.findMany({
            where: { type: "DIVISION" },
            select: { id: true, name: true },
          }),
          prismaRead.$queryRaw<
            Array<{
              commodity_code: string;
              country_code: string;
              country_name: string;
              unit_price_usd: string;
              landed_cost_usd: string;
              min_landed: string;
            }>
          >`
            SELECT DISTINCT ON (commodity_code, country_code)
              commodity_code,
              country_code,
              country_name,
              unit_price_usd::text,
              landed_cost_usd::text,
              MIN(landed_cost_usd) OVER (PARTITION BY commodity_code)::text AS min_landed
            FROM commodity_price_logs
            ORDER BY commodity_code, country_code, created_at DESC
          `,
        ]);

      const total = projectRows.length || 1;
      const completionRate =
        Math.round(
          (projectRows.reduce((sum, p) => {
            const pct =
              p.status === ProjectStatus.COMPLETED
                ? 100
                : p.status === ProjectStatus.ONGOING
                  ? Math.min(
                      95,
                      Number(p.budgetSpent) / Math.max(Number(p.budgetAllocated), 1) * 100,
                    )
                  : p.status === ProjectStatus.STALLED
                    ? 40
                    : 0;
            return sum + pct;
          }, 0) /
            total) *
            10,
        ) / 10;

      const budgetVariance = projectRows.slice(0, 8).map((p) => {
        const planned = Number(p.budgetAllocated);
        const actual = Number(p.budgetSpent);
        const variance = planned > 0 ? ((actual - planned) / planned) * 100 : 0;
        return {
          project: p.title.length > 28 ? `${p.title.slice(0, 25)}...` : p.title,
          planned: Math.round(planned / 100),
          actual: Math.round(actual / 100),
          variance: Math.round(variance * 10) / 10,
        };
      });

      let completionTrend = await metricSeriesService.buildCompletionTrendFromKpis();
      if (!completionTrend.length) {
        completionTrend = MONTH_LABELS.map((month, i) => ({
          month,
          rate: Math.round((72 + i * 1.4 + (completionRate - 85) * 0.3) * 10) / 10,
        }));
      }
      // Persist national trend permanently (upsert by month period).
      void metricSeriesService.upsertMany(
        "dashboard",
        completionTrend.map((point, i) => ({
          seriesKey: "completion",
          periodKey: `m-${String(i).padStart(2, "0")}-${point.month}`,
          label: point.month,
          value: point.rate,
          recordedAt: new Date(Date.UTC(2025, i, 15)),
        })),
      );

      const arbitrageMatrix = commodityRows.map((row) => {
        const landed = Number(row.landed_cost_usd);
        const minLanded = Number(row.min_landed);
        const marginPct =
          minLanded > 0 ? Math.round(((landed - minLanded) / minLanded) * 1000) / 10 : 0;
        return {
          commodity: row.commodity_code.charAt(0) + row.commodity_code.slice(1).toLowerCase(),
          market: row.country_name,
          marginPct: Math.max(0, marginPct + 4),
        };
      });

      // Two batched queries instead of 2 per division (previously 16),
      // grouped in memory by the division each unit rolls up to.
      const [divisionProjectRows, openAlertRows] = await Promise.all([
        prismaRead.project.findMany({
          select: {
            status: true,
            budgetAllocated: true,
            budgetSpent: true,
            adminUnit: { select: { id: true, divisionId: true } },
          },
          orderBy: { startDate: "desc" },
          take: 2000,
        }),
        prismaRead.redFlagAlert.findMany({
          where: { resolvedAt: null },
          select: {
            project: { select: { adminUnit: { select: { id: true, divisionId: true } } } },
          },
          take: 2000,
        }),
      ]);

      const divisionKey = (unit: { id: string; divisionId: string | null } | null | undefined) =>
        unit ? (unit.divisionId ?? unit.id) : null;

      const projectsByDivision = new Map<
        string,
        Array<{ status: string; budgetAllocated: unknown; budgetSpent: unknown }>
      >();
      for (const row of divisionProjectRows) {
        const key = divisionKey(row.adminUnit);
        if (!key) continue;
        const bucket = projectsByDivision.get(key);
        if (bucket) bucket.push(row);
        else projectsByDivision.set(key, [row]);
      }

      const alertsByDivision = new Map<string, number>();
      for (const row of openAlertRows) {
        const key = divisionKey(row.project?.adminUnit);
        if (!key) continue;
        alertsByDivision.set(key, (alertsByDivision.get(key) ?? 0) + 1);
      }

      const unitScores = divisions.map((div) => {
        const divProjects = projectsByDivision.get(div.id) ?? [];
        const divAlerts = alertsByDivision.get(div.id) ?? 0;
        const perf =
          divProjects.length === 0
            ? 75
            : Math.round(
                divProjects.reduce((s, p) => {
                  const ratio = Number(p.budgetSpent) / Math.max(Number(p.budgetAllocated), 1);
                  const statusBonus = p.status === "COMPLETED" ? 20 : p.status === "STALLED" ? -15 : 0;
                  return s + Math.min(100, ratio * 80 + statusBonus);
                }, 0) / divProjects.length,
              );
        return {
          unitId: div.id,
          performanceScore: perf,
          riskScore: Math.min(95, divAlerts * 8 + 15),
          openAlerts: divAlerts,
        };
      });

      const tradeFlows = buildTradeFlows(commodityRows);

      return {
        summary: { units, projects, openAlerts, representatives },
        completionRate,
        completionTrend,
        budgetVariance,
        arbitrageMatrix,
        tradeFlows,
        unitScores,
        timestamp: new Date().toISOString(),
      };
    });
  }
}

export const dashboardService = new DashboardService();
