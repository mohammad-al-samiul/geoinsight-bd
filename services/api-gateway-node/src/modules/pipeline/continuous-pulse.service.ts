import {
  AdminUnitType,
  ComplaintStatus,
  IngestionSentiment,
  LiveSignalType,
  UserRole,
} from "@prisma/client";
import { env } from "../../core/config/env";
import { prismaRead, prismaWrite } from "../../core/database/prisma.client";
import { notSyntheticLiveSignalWhere } from "../../shared/provenance";
import { LOCAL_ENTITY_CODES, type LocalEntityCode } from "../local-entity/local-entity.catalog";
import { wpiService } from "../local-entity/wpi.service";
import { divisionalCrisisService } from "../divisional-crisis/divisional-crisis.service";
import { metricSeriesService } from "../metrics/metric-series.service";
import { broadcastDashboardRefresh } from "./pipeline.broadcast";

const SYSTEM_USER = { role: UserRole.PMO, adminUnitId: null as string | null };

function bucketKey(minutes = 5): string {
  const d = new Date();
  d.setUTCSeconds(0, 0);
  d.setUTCMinutes(Math.floor(d.getUTCMinutes() / minutes) * minutes);
  return d.toISOString().slice(0, 16);
}

/**
 * Always-on DB pulse while api-gateway (Docker) is running.
 * Writes national + local (MP/Mayor) metrics even when no browser is open.
 */
export class ContinuousPulseService {
  async run(): Promise<Record<string, unknown>> {
    const period = bucketKey(5);
    const national = await this.pulseNational(period);
    const local = await this.pulseLocal(period);
    await broadcastDashboardRefresh("pipeline:continuous-pulse");
    return {
      period,
      national,
      local,
      at: new Date().toISOString(),
    };
  }

  private async pulseNational(period: string) {
    // Persist crisis risk + reuse live signal / weather aggregates.
    const crisis = await divisionalCrisisService.getPulse();

    const completionTrend = await metricSeriesService.buildCompletionTrendFromKpis();
    let completionWritten = 0;
    if (completionTrend.length) {
      completionWritten = await metricSeriesService.upsertMany(
        "dashboard",
        completionTrend.map((point, i) => ({
          seriesKey: "completion",
          periodKey: `m-${String(i).padStart(2, "0")}-${point.month}`,
          label: point.month,
          value: point.rate,
          recordedAt: new Date(Date.UTC(2025, i, 15)),
        })),
      );
    }

    // Live activity sparkline — new point every 5 minutes.
    const openAlerts = await prismaRead.redFlagAlert.count({
      where: { resolvedAt: null },
    });
    const recentSignals = await prismaRead.liveSignal.count({
      where: {
        createdAt: { gte: new Date(Date.now() - 6 * 60 * 60 * 1000) },
        ...notSyntheticLiveSignalWhere,
      },
    });
    const activityValue = Math.max(
      10,
      Math.min(100, Math.round(openAlerts * 4 + recentSignals * 2 + 28)),
    );
    await metricSeriesService.upsertMany("dashboard", [
      {
        seriesKey: "activity",
        periodKey: period,
        label: "National activity",
        value: activityValue,
        recordedAt: new Date(),
        meta: { openAlerts, recentSignals, synthetic: false },
      },
    ]);

    const newsFresh = await prismaRead.pipelineJobRun.findFirst({
      where: {
        job: "news",
        ok: true,
        completedAt: {
          gte: new Date(Date.now() - 2 * env.PIPELINE_NEWS_INTERVAL_MS),
        },
      },
      select: { id: true },
    });

    let syntheticSignal = false;
    if (!newsFresh) {
      const signalUrl = `pulse://national/activity/${period}`;
      await prismaWrite.liveSignal.upsert({
        where: { url: signalUrl },
        create: {
          signalType: LiveSignalType.ALERT,
          title: `National activity pulse ${period}`,
          body: `Automated Docker pulse — open alerts ${openAlerts}, recent signals ${recentSignals}.`,
          url: signalUrl,
          sourceName: "GeoInsight Pulse",
          division: "Dhaka",
          district: "Dhaka",
          severity: openAlerts >= 5 ? 4 : 2,
          flagType: "PULSE",
          sentimentCategory: IngestionSentiment.Neutral,
          publishedAt: new Date(),
        },
        update: {
          severity: openAlerts >= 5 ? 4 : 2,
          body: `Automated Docker pulse — open alerts ${openAlerts}, recent signals ${recentSignals}.`,
          publishedAt: new Date(),
        },
      });
      syntheticSignal = true;
    }

    return {
      crisisDivisions: crisis.divisions.length,
      completionPoints: completionWritten,
      activity: activityValue,
      syntheticSignal,
      newsFresh: Boolean(newsFresh),
    };
  }

  private async pulseLocal(period: string) {
    const entities = await prismaRead.adminUnit.findMany({
      where: {
        type: { in: [AdminUnitType.CONSTITUENCY, AdminUnitType.CITY_CORPORATION] },
        code: { in: [...LOCAL_ENTITY_CODES] },
      },
      select: { id: true, code: true, name: true },
      orderBy: { code: "asc" },
    });

    const summary: Array<Record<string, unknown>> = [];
    for (const entity of entities) {
      const code = entity.code as LocalEntityCode;
      const module = `local:${code}`;

      const [open, overdue, red, resolved] = await Promise.all([
        prismaRead.citizenComplaint.count({
          where: { entityId: entity.id, status: { not: ComplaintStatus.RESOLVED } },
        }),
        prismaRead.citizenComplaint.count({
          where: {
            entityId: entity.id,
            status: { not: ComplaintStatus.RESOLVED },
            slaDeadline: { lt: new Date() },
          },
        }),
        prismaRead.citizenComplaint.count({
          where: {
            entityId: entity.id,
            isRedAlert: true,
            status: { not: ComplaintStatus.RESOLVED },
          },
        }),
        prismaRead.citizenComplaint.count({
          where: { entityId: entity.id, status: ComplaintStatus.RESOLVED },
        }),
      ]);

      await metricSeriesService.upsertMany(module, [
        {
          seriesKey: "complaints:open",
          periodKey: period,
          label: "Open",
          value: open,
          recordedAt: new Date(),
        },
        {
          seriesKey: "complaints:overdue",
          periodKey: period,
          label: "Overdue",
          value: overdue,
          recordedAt: new Date(),
        },
        {
          seriesKey: "complaints:red",
          periodKey: period,
          label: "Red",
          value: red,
          recordedAt: new Date(),
        },
        {
          seriesKey: "complaints:resolved",
          periodKey: period,
          label: "Resolved",
          value: resolved,
          recordedAt: new Date(),
        },
        {
          seriesKey: "sla:pressure",
          periodKey: period,
          label: "SLA pressure",
          value: Math.min(100, overdue * 18 + red * 12 + open * 4 + 20),
          recordedAt: new Date(),
        },
      ]);

      // Recompute WPI from live complaint mix (PMO system actor).
      const wpi = await wpiService.recompute(SYSTEM_USER, { entityId: entity.id });
      if (wpi.items.length) {
        const avg = Math.round(
          wpi.items.reduce((s, r) => s + r.score, 0) / wpi.items.length,
        );
        await metricSeriesService.upsertMany(module, [
          {
            seriesKey: "wpi:average",
            periodKey: period,
            label: "WPI avg",
            value: avg,
            recordedAt: new Date(),
          },
        ]);
      }

      // Specialty / OSINT / voter rows stay as last real write — do not jitter
      // them into a fake live chart when news already landed this cycle.
      summary.push({
        code: entity.code,
        open,
        overdue,
        red,
        wpiWards: wpi.updated,
      });
    }

    return { entities: summary.length, detail: summary };
  }
}

export const continuousPulseService = new ContinuousPulseService();
