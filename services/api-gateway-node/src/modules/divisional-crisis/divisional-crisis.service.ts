import { AdminUnitType, LiveSignalType } from "@prisma/client";
import { prismaRead } from "../../core/database/prisma.client";
import { notSyntheticLiveSignalWhere } from "../../shared/provenance";
import { normalizeDivisionName } from "../../shared/scope/scope-context";
import { metricSeriesService, type MetricPoint } from "../metrics/metric-series.service";

const LOOKBACK_HOURS = 48;

type DivisionPulse = {
  division: string;
  signalCount: number;
  criticalSignalCount: number;
  grievanceArticleCount: number;
  weatherStress: number;
  riskScore: number;
  latestSignalAt: string | null;
};

function divisionSlug(name: string): string {
  return (normalizeDivisionName(name) ?? name).toLowerCase().replace(/\s+/g, "-");
}

export class DivisionalCrisisService {
  /**
   * Live, source-labelled crisis indicators + durable chart series from DB.
   * Official crime/utility telemetry is not claimed — scores come from
   * live_signals, articles, weather, and persisted metric_time_series.
   */
  async getPulse(): Promise<{
    generatedAt: string;
    lookbackHours: number;
    sources: string[];
    divisions: DivisionPulse[];
    series: MetricPoint[];
  }> {
    const since = new Date(Date.now() - LOOKBACK_HOURS * 60 * 60 * 1000);
    const [divisions, signals, articles, observations, series] = await Promise.all([
      prismaRead.adminUnit.findMany({
        where: { type: AdminUnitType.DIVISION },
        select: { name: true },
        orderBy: { name: "asc" },
      }),
      prismaRead.liveSignal.findMany({
        where: { signalType: LiveSignalType.ALERT, createdAt: { gte: since }, ...notSyntheticLiveSignalWhere },
        select: { division: true, severity: true, createdAt: true },
      }),
      prismaRead.externalArticle.findMany({
        where: {
          fetchedAt: { gte: since },
          sentimentCategory: "Grievance",
          division: { not: null },
        },
        select: { division: true },
      }),
      prismaRead.weatherObservation.findMany({
        where: { recordedAt: { gte: since } },
        select: {
          division: true,
          floodRisk: true,
          cycloneRisk: true,
          heatStress: true,
          recordedAt: true,
        },
      }),
      metricSeriesService.listSeries("divisional-crisis", undefined, 200),
    ]);

    const pulseDivisions: DivisionPulse[] = divisions.map(({ name }) => {
      const division = normalizeDivisionName(name) ?? name;
      const matches = <T extends { division: string | null }>(row: T) =>
        normalizeDivisionName(row.division) === division;
      const divisionSignals = signals.filter(matches);
      const divisionArticles = articles.filter(matches);
      const divisionWeather = observations.filter(matches);
      const weatherStress = divisionWeather.length
        ? Math.round(
            (divisionWeather.reduce(
              (total, item) =>
                total + Math.max(item.floodRisk, item.cycloneRisk, item.heatStress),
              0,
            ) /
              divisionWeather.length) *
              20,
          )
        : 0;
      const criticalSignalCount = divisionSignals.filter((item) => (item.severity ?? 0) >= 4).length;
      const riskScore = Math.min(
        100,
        Math.round(
          weatherStress +
            Math.min(30, divisionSignals.length * 7) +
            Math.min(24, criticalSignalCount * 12) +
            Math.min(16, divisionArticles.length * 2),
        ),
      );
      const latestSignal = divisionSignals.sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
      )[0];

      return {
        division,
        signalCount: divisionSignals.length,
        criticalSignalCount,
        grievanceArticleCount: divisionArticles.length,
        weatherStress,
        riskScore,
        latestSignalAt: latestSignal?.createdAt.toISOString() ?? null,
      };
    });

    // Persist hourly risk so charts keep a durable trail without duplicate rows.
    const hourKey = new Date().toISOString().slice(0, 13);
    void metricSeriesService.upsertMany(
      "divisional-crisis",
      pulseDivisions.map((row) => ({
        seriesKey: `${divisionSlug(row.division)}:risk`,
        periodKey: hourKey,
        label: row.division,
        value: row.riskScore,
        recordedAt: new Date(),
        meta: {
          signalCount: row.signalCount,
          criticalSignalCount: row.criticalSignalCount,
          weatherStress: row.weatherStress,
        },
      })),
    );

    return {
      generatedAt: new Date().toISOString(),
      lookbackHours: LOOKBACK_HOURS,
      sources: ["live_signals", "external_articles", "open_meteo", "metric_time_series"],
      divisions: pulseDivisions,
      series,
    };
  }
}

export const divisionalCrisisService = new DivisionalCrisisService();
