import { Prisma } from "@prisma/client";
import { prismaRead, prismaWrite } from "../../core/database/prisma.client";
import { getRedisClient, isRedisEnabled } from "../../infrastructure/redis/redis.client";
import type { DashboardScopeQuery } from "../dashboard/dashboard.service";
import { broadcastDashboardRefresh } from "../pipeline/pipeline.broadcast";
import {
  matchesScopeDistrict,
  normalizeDivisionName,
  resolveScopeContext,
  type ScopeContext,
} from "../../shared/scope/scope-context";
import {
  aggregateSegmentedImpact,
  buildImpactWindows,
  extractNewsImpact,
  type SegmentedNewsImpact,
} from "../../shared/impact/news-impact";
import { resolveImpactPlaces } from "../../shared/geo/news-place-matcher";
import { fetchAi } from "../../shared/http/fetch-ai";

const WEATHER_CACHE_KEY = "weather:live:v6";
const WEATHER_CACHE_TTL_SEC = 900;

const HAZARD_IMPACT_KEYWORDS = [
  "বন্যা",
  "flood",
  "inundat",
  "water level",
  "পানি বৃদ্ধি",
  "landslide",
  "ঘূর্ণিঝড়",
  "ঘুর্নিঝড়",
  "cyclone",
  "storm surge",
  "জলোচ্ছ্বাস",
  "typhoon",
];
const FLOOD_KEYWORDS = HAZARD_IMPACT_KEYWORDS;
const COASTAL_DIVISIONS = new Set(["Chattogram", "Barishal", "Khulna"]);

interface AiWeatherObservation {
  division: string;
  district?: string | null;
  name_bn: string;
  lat: number;
  lng: number;
  temp_c: number;
  humidity_pct: number;
  precipitation_mm: number;
  rain_24h_mm?: number;
  wind_speed_kmh: number;
  weather_code: number;
  weather_label: string;
  weather_label_bn: string;
  flood_risk: number;
  cyclone_risk: number;
  heat_stress: number;
  population_at_risk: number;
  recorded_at: string;
}

interface AiDisasterAlert {
  external_id: string;
  alert_type: string;
  severity: number;
  title: string;
  title_bn?: string;
  description?: string;
  division?: string;
  lat?: number;
  lng?: number;
  population_at_risk?: number;
  valid_from: string;
  valid_to?: string;
  source: string;
}

interface AiWeatherFetchResponse {
  observations: AiWeatherObservation[];
  alerts: AiDisasterAlert[];
  fetched_at: string;
  sources: string[];
}

export interface WeatherObservationDto {
  division: string;
  district: string | null;
  name_bn: string;
  lat: number;
  lng: number;
  temp_c: number;
  humidity_pct: number;
  precipitation_mm: number;
  rain_24h_mm: number;
  wind_speed_kmh: number;
  weather_code: number;
  weather_label: string;
  weather_label_bn: string;
  flood_risk: number;
  cyclone_risk: number;
  heat_stress: number;
  population_at_risk: number;
  recorded_at: string;
}

export interface WeatherLiveSummary {
  observations: WeatherObservationDto[];
  alerts: Array<{
    id: string;
    alert_type: string;
    severity: number;
    title: string;
    title_bn: string | null;
    description: string | null;
    division: string | null;
    lat: number | null;
    lng: number | null;
    population_at_risk: number | null;
    valid_from: string;
    valid_to: string | null;
    source: string;
  }>;
  impact: {
    total_population_at_risk: number;
    high_flood_divisions: string[];
    high_cyclone_divisions: string[];
    high_heat_divisions: string[];
    active_alert_count: number;
    max_severity: number;
    refreshed_at: string;
    sources: string[];
    flood_impact: SegmentedNewsImpact & {
      default_window: number;
      windows: Record<string, SegmentedNewsImpact>;
    };
  };
  scope?: ScopeContext;
}

export class WeatherService {
  async syncFromAi(timeoutMs?: number): Promise<Record<string, unknown>> {
    const res = await fetchAi(`/api/v1/weather/fetch`, undefined, {
      timeoutMs,
    });
    if (!res.ok) {
      throw new Error(`Weather fetch failed: ${res.status}`);
    }

    const payload = (await res.json()) as AiWeatherFetchResponse;
    let obsInserted = 0;
    let alertsUpserted = 0;

    for (const obs of payload.observations) {
      await prismaWrite.weatherObservation.create({
        data: {
          division: normalizeDivisionName(obs.division) ?? obs.division,
          district: obs.district ?? null,
          nameBn: obs.name_bn,
          lat: obs.lat,
          lng: obs.lng,
          tempC: new Prisma.Decimal(obs.temp_c),
          humidityPct: obs.humidity_pct,
          precipitationMm: new Prisma.Decimal(
            Math.max(obs.precipitation_mm, obs.rain_24h_mm ?? 0),
          ),
          windSpeedKmh: new Prisma.Decimal(obs.wind_speed_kmh),
          weatherCode: obs.weather_code,
          weatherLabel: obs.weather_label,
          weatherLabelBn: obs.weather_label_bn,
          floodRisk: obs.flood_risk,
          cycloneRisk: obs.cyclone_risk,
          heatStress: obs.heat_stress,
          populationAtRisk: obs.population_at_risk,
          source: "open-meteo",
          recordedAt: new Date(obs.recorded_at),
        },
      });
      obsInserted += 1;
    }

    const now = new Date();
    await prismaWrite.disasterAlert.updateMany({
      where: { source: { in: ["gdacs", "reliefweb"] }, isActive: true },
      data: { isActive: false },
    });

    for (const alert of payload.alerts) {
      await this.upsertAlert(alert, now);
      alertsUpserted += 1;
    }

    const newsAlerts = await this.syncNewsFloodAlerts();
    alertsUpserted += newsAlerts;

    const sources = [...new Set([...payload.sources, ...(newsAlerts > 0 ? ["news_pipeline"] : [])])];
    const live = await this.buildLiveSummary(sources);

    if (isRedisEnabled()) {
      await getRedisClient().setex(
        WEATHER_CACHE_KEY,
        WEATHER_CACHE_TTL_SEC,
        JSON.stringify(live),
      );
    }

    await broadcastDashboardRefresh("pipeline:weather");
    return {
      observations: obsInserted,
      alerts: alertsUpserted,
      news_alerts: newsAlerts,
      sources,
    };
  }

  private async upsertAlert(alert: AiDisasterAlert, now: Date) {
    await prismaWrite.disasterAlert.upsert({
      where: { externalId: alert.external_id },
      create: {
        externalId: alert.external_id,
        alertType: alert.alert_type,
        severity: alert.severity,
        title: alert.title,
        titleBn: alert.title_bn ?? null,
        description: alert.description ?? null,
        division: normalizeDivisionName(alert.division) ?? alert.division ?? null,
        lat: alert.lat ?? null,
        lng: alert.lng ?? null,
        populationAtRisk: alert.population_at_risk ?? null,
        validFrom: new Date(alert.valid_from),
        validTo: alert.valid_to ? new Date(alert.valid_to) : null,
        source: alert.source,
        isActive: true,
      },
      update: {
        alertType: alert.alert_type,
        severity: alert.severity,
        title: alert.title,
        titleBn: alert.title_bn ?? null,
        description: alert.description ?? null,
        division: normalizeDivisionName(alert.division) ?? alert.division ?? null,
        lat: alert.lat ?? null,
        lng: alert.lng ?? null,
        populationAtRisk: alert.population_at_risk ?? null,
        validFrom: new Date(alert.valid_from),
        validTo: alert.valid_to ? new Date(alert.valid_to) : null,
        isActive: true,
        updatedAt: now,
      },
    });
  }

  private async syncNewsFloodAlerts(): Promise<number> {
    const since = new Date(Date.now() - 72 * 60 * 60 * 1000);
    const articles = await prismaRead.externalArticle.findMany({
      where: { fetchedAt: { gte: since } },
      select: { title: true, summary: true, url: true, division: true, district: true, fetchedAt: true },
      take: 300,
    });

    let count = 0;
    const now = new Date();

    for (const article of articles) {
      const text = `${article.title} ${article.summary ?? ""}`.toLowerCase();
      if (!FLOOD_KEYWORDS.some((k) => text.includes(k.toLowerCase()))) continue;

      const division = normalizeDivisionName(article.division ?? undefined);
      const district = article.district ?? undefined;
      if (!division && !district) {
        if (!text.includes("chittagong") && !text.includes("chattogram") && !text.includes("cox")) {
          continue;
        }
      }

      const resolvedDivision =
        division ??
        (text.includes("chittagong") || text.includes("chattogram") || text.includes("cox")
          ? "Chattogram"
          : "National");

      const externalId = `news-flood-${article.url.slice(0, 400)}`;
      const titleBn = `${district ?? resolvedDivision} — বন্যা সংবাদ (${article.title.slice(0, 80)})`;

      await prismaWrite.disasterAlert.upsert({
        where: { externalId },
        create: {
          externalId,
          alertType: "flood",
          severity: COASTAL_DIVISIONS.has(resolvedDivision) ? 4 : 3,
          title: article.title.slice(0, 500),
          titleBn,
          description: article.summary?.slice(0, 2000) ?? null,
          division: resolvedDivision,
          lat: resolvedDivision === "Chattogram" ? 22.335 : 23.81,
          lng: resolvedDivision === "Chattogram" ? 91.834 : 90.41,
          populationAtRisk: resolvedDivision === "Chattogram" ? 1_200_000 : 800_000,
          validFrom: article.fetchedAt,
          validTo: new Date(article.fetchedAt.getTime() + 5 * 86400000),
          source: "news_pipeline",
          isActive: true,
        },
        update: {
          severity: COASTAL_DIVISIONS.has(resolvedDivision) ? 4 : 3,
          title: article.title.slice(0, 500),
          titleBn,
          description: article.summary?.slice(0, 2000) ?? null,
          division: resolvedDivision,
          isActive: true,
          updatedAt: now,
        },
      });
      count += 1;
    }

    return count;
  }

  private async latestObservationsPerLocation() {
    const rows = await prismaRead.$queryRaw<
      Array<{
        division: string;
        district: string | null;
        name_bn: string;
        lat: number;
        lng: number;
        temp_c: string;
        humidity_pct: number;
        precipitation_mm: string;
        wind_speed_kmh: string;
        weather_code: number;
        weather_label: string;
        weather_label_bn: string;
        flood_risk: number;
        cyclone_risk: number;
        heat_stress: number;
        population_at_risk: number;
        recorded_at: Date;
      }>
    >`
      -- Keep locality-level observations (name_bn) instead of collapsing
      -- everything at district/division granularity.
      -- This prevents Bohoddarhat/Halishahar style localities from being lost.
      SELECT DISTINCT ON (COALESCE(district, division), name_bn)
        division, district, name_bn, lat, lng,
        temp_c::text, humidity_pct, precipitation_mm::text, wind_speed_kmh::text,
        weather_code, weather_label, weather_label_bn,
        flood_risk, cyclone_risk, heat_stress, population_at_risk, recorded_at
      FROM weather_observations
      ORDER BY COALESCE(district, division), name_bn, recorded_at DESC
    `;
    return rows;
  }

  applyScope(summary: WeatherLiveSummary, ctx: ScopeContext): WeatherLiveSummary {
    if (!ctx.divisionName && !ctx.districtName) {
      return { ...summary, scope: ctx };
    }

    const observations = summary.observations.filter((o) =>
      matchesScopeDistrict(o.district, o.division, ctx),
    );
    const alerts = summary.alerts.filter((a) =>
      matchesScopeDistrict(null, a.division, ctx),
    );

    const highFlood = [...new Set(observations.filter((o) => o.flood_risk >= 3).map((o) => o.division))];
    const highCyclone = [...new Set(observations.filter((o) => o.cyclone_risk >= 3).map((o) => o.division))];
    const highHeat = [...new Set(observations.filter((o) => o.heat_stress >= 4).map((o) => o.division))];
    const totalPop = observations.reduce((sum, o) => sum + o.population_at_risk, 0);

    return {
      observations,
      alerts,
      impact: {
        ...summary.impact,
        total_population_at_risk: totalPop,
        high_flood_divisions: highFlood,
        high_cyclone_divisions: highCyclone,
        high_heat_divisions: highHeat,
        active_alert_count: alerts.length,
        max_severity: alerts.length > 0 ? Math.max(...alerts.map((a) => a.severity)) : 0,
      },
      scope: ctx,
    };
  }

  async buildLiveSummary(sources: string[] = ["open-meteo", "gdacs"]): Promise<WeatherLiveSummary> {
    const [obsRows, alerts] = await Promise.all([
      this.latestObservationsPerLocation(),
      prismaRead.disasterAlert.findMany({
        where: { isActive: true },
        orderBy: [{ severity: "desc" }, { validFrom: "desc" }],
        take: 100,
      }),
    ]);

    const observations: WeatherObservationDto[] = obsRows.map((o) => ({
      division: o.division,
      district: o.district,
      name_bn: o.name_bn,
      lat: o.lat,
      lng: o.lng,
      temp_c: Number(o.temp_c),
      humidity_pct: o.humidity_pct,
      precipitation_mm: Number(o.precipitation_mm),
      rain_24h_mm: Number(o.precipitation_mm),
      wind_speed_kmh: Number(o.wind_speed_kmh),
      weather_code: o.weather_code,
      weather_label: o.weather_label,
      weather_label_bn: o.weather_label_bn,
      flood_risk: o.flood_risk,
      cyclone_risk: o.cyclone_risk,
      heat_stress: o.heat_stress,
      population_at_risk: o.population_at_risk,
      recorded_at: o.recorded_at.toISOString(),
    }));

    const highFlood = [...new Set(observations.filter((o) => o.flood_risk >= 3).map((o) => o.division))];
    const highCyclone = [...new Set(observations.filter((o) => o.cyclone_risk >= 4).map((o) => o.division))];
    const highHeat = [...new Set(observations.filter((o) => o.heat_stress >= 4).map((o) => o.division))];
    const totalPop = observations.reduce((sum, o) => sum + o.population_at_risk, 0);
    const maxSeverity = alerts.length > 0 ? Math.max(...alerts.map((a) => a.severity)) : 0;
    const flood_impact = await this.buildFloodImpactFromNews();

    return {
      observations,
      alerts: alerts.map((a) => ({
        id: a.id,
        alert_type: a.alertType,
        severity: a.severity,
        title: a.title,
        title_bn: a.titleBn,
        description: a.description,
        division: a.division,
        lat: a.lat,
        lng: a.lng,
        population_at_risk: a.populationAtRisk,
        valid_from: a.validFrom.toISOString(),
        valid_to: a.validTo?.toISOString() ?? null,
        source: a.source,
      })),
      impact: {
        total_population_at_risk: totalPop,
        high_flood_divisions: highFlood,
        high_cyclone_divisions: highCyclone,
        high_heat_divisions: highHeat,
        active_alert_count: alerts.length,
        max_severity: maxSeverity,
        refreshed_at: new Date().toISOString(),
        sources,
        flood_impact,
      },
    };
  }

  private async buildFloodImpactFromNews() {
    const disclaimers = {
      bn: "বন্যা/ঘূর্ণিঝড়: খবরে নাম থাকা প্রতিটি উপজেলা/জেলায় নিহত·আহত·ঘর·পশু (দিনে সর্বোচ্চ)। বাঁশখালী ইত্যাদি শুধু উদাহরণ নয় — সব স্থান। অফিসিয়াল নয়।",
      en: "Flood/cyclone: every named upazila/district from news — deaths, injuries, homes, livestock (max/day). Not official.",
    };
    const since = new Date(Date.now() - 30 * 86400 * 1000);
    const articles = await prismaRead.externalArticle.findMany({
      where: { fetchedAt: { gte: since } },
      select: { title: true, summary: true, district: true, publishedAt: true, fetchedAt: true, url: true },
      take: 1200,
      orderBy: { fetchedAt: "desc" },
    });

    const items = [];
    for (const article of articles) {
      const blob = `${article.title} ${article.summary ?? ""}`;
      const text = blob.toLowerCase();
      if (!HAZARD_IMPACT_KEYWORDS.some((k) => text.includes(k.toLowerCase()))) continue;
      const impact = extractNewsImpact(article.title, article.summary);
      // Keep any article with tangible loss OR a clear named place + damage language
      const hasLoss =
        impact.deaths > 0 ||
        impact.injuries > 0 ||
        impact.homes_damaged > 0 ||
        impact.livestock_lost > 0 ||
        impact.damage_mentions > 0;
      if (!hasLoss) continue;

      const places = resolveImpactPlaces(article.title, article.summary, article.district);
      if (places.length === 0) continue;

      items.push({
        district: places[0] ?? article.district,
        places,
        publishedAt: article.publishedAt ?? article.fetchedAt,
        impact,
        title: article.title,
        url: article.url,
      });
    }

    const windows = buildImpactWindows(items, [1, 7, 30], new Date(), disclaimers);
    const primary =
      windows["7"] ?? aggregateSegmentedImpact(items, 7, new Date(), disclaimers);
    return {
      ...primary,
      default_window: 7,
      windows,
      place_count: primary.by_district?.length ?? 0,
    };
  }

  async getLive(query: DashboardScopeQuery = {}): Promise<WeatherLiveSummary> {
    const ctx = await resolveScopeContext(query);
    let summary: WeatherLiveSummary;

    if (isRedisEnabled()) {
      const cached = await getRedisClient().get(WEATHER_CACHE_KEY);
      if (cached) {
        summary = JSON.parse(cached) as WeatherLiveSummary;
        return this.applyScope(summary, ctx);
      }
    }

    const count = await prismaRead.weatherObservation.count();
    if (count === 0) {
      try {
        await this.syncFromAi();
      } catch {
        return this.applyScope(this.emptySummary(), ctx);
      }
      if (isRedisEnabled()) {
        const cached = await getRedisClient().get(WEATHER_CACHE_KEY);
        if (cached) {
          summary = JSON.parse(cached) as WeatherLiveSummary;
          return this.applyScope(summary, ctx);
        }
      }
    }

    summary = await this.buildLiveSummary();
    return this.applyScope(summary, ctx);
  }

  private emptySummary(): WeatherLiveSummary {
    return {
      observations: [],
      alerts: [],
      impact: {
        total_population_at_risk: 0,
        high_flood_divisions: [],
        high_cyclone_divisions: [],
        high_heat_divisions: [],
        active_alert_count: 0,
        max_severity: 0,
        refreshed_at: new Date().toISOString(),
        sources: [],
        flood_impact: {
          ...aggregateSegmentedImpact([], 7),
          default_window: 7,
          windows: buildImpactWindows([], [1, 7, 30]),
        },
      },
    };
  }
}

export const weatherService = new WeatherService();
