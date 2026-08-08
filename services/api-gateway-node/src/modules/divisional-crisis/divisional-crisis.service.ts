import { AdminUnitType, LiveSignalType } from "@prisma/client";
import { prismaRead } from "../../core/database/prisma.client";
import { normalizeDivisionName } from "../../shared/scope/scope-context";

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

export class DivisionalCrisisService {
  /**
   * Live, source-labelled crisis indicators. This deliberately does not claim
   * to be official crime or utility telemetry: those feeds are not connected.
   */
  async getPulse(): Promise<{
    generatedAt: string;
    lookbackHours: number;
    sources: string[];
    divisions: DivisionPulse[];
  }> {
    const since = new Date(Date.now() - LOOKBACK_HOURS * 60 * 60 * 1000);
    const [divisions, signals, articles, observations] = await Promise.all([
      prismaRead.adminUnit.findMany({
        where: { type: AdminUnitType.DIVISION },
        select: { name: true },
        orderBy: { name: "asc" },
      }),
      prismaRead.liveSignal.findMany({
        where: { signalType: LiveSignalType.ALERT, createdAt: { gte: since } },
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
    ]);

    return {
      generatedAt: new Date().toISOString(),
      lookbackHours: LOOKBACK_HOURS,
      sources: ["live_signals", "external_articles", "open_meteo"],
      divisions: divisions.map(({ name }) => {
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
      }),
    };
  }
}

export const divisionalCrisisService = new DivisionalCrisisService();
