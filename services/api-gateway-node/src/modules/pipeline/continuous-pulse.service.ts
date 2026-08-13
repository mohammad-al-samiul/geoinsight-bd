import {
  AdminUnitType,
  ComplaintStatus,
  IngestionSentiment,
  LiveSignalType,
  LocalOsintChannel,
  LocalOsintSentiment,
  Prisma,
  UserRole,
} from "@prisma/client";
import { prismaRead, prismaWrite } from "../../core/database/prisma.client";
import {
  LOCAL_ENTITY_CATALOG,
  LOCAL_ENTITY_CODES,
  type LocalEntityCode,
} from "../local-entity/local-entity.catalog";
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

function jitter(base: number, spread: number, min = 0, max = 100): number {
  const n = base + (Math.random() * 2 - 1) * spread;
  return Math.max(min, Math.min(max, Math.round(n * 10) / 10));
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
      where: { createdAt: { gte: new Date(Date.now() - 6 * 60 * 60 * 1000) } },
    });
    const activityValue = jitter(
      Math.min(100, openAlerts * 4 + recentSignals * 2 + 28),
      4,
      10,
      100,
    );
    await metricSeriesService.upsertMany("dashboard", [
      {
        seriesKey: "activity",
        periodKey: period,
        label: "National activity",
        value: activityValue,
        recordedAt: new Date(),
        meta: { openAlerts, recentSignals },
      },
    ]);

    // Heartbeat live signal so national feeds stay fresh without scraping.
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

    return {
      crisisDivisions: crisis.divisions.length,
      completionPoints: completionWritten,
      activity: activityValue,
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
      const catalog = LOCAL_ENTITY_CATALOG[code];
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
          value: jitter(Math.min(100, overdue * 18 + red * 12 + open * 4 + 20), 3),
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

      // Nudge specialty telemetry so specialty panels stay live.
      const specialtyRows = await prismaRead.localSpecialtySignal.findMany({
        where: { entityId: entity.id },
        select: { id: true, metricValue: true },
        take: 40,
      });
      let specialtyTouched = 0;
      for (const row of specialtyRows) {
        const current = row.metricValue == null ? 50 : Number(row.metricValue);
        const next = jitter(current, Math.max(1.5, current * 0.04), 0, 10_000);
        await prismaWrite.localSpecialtySignal.update({
          where: { id: row.id },
          data: {
            metricValue: new Prisma.Decimal(next),
            recordedAt: new Date(),
          },
        });
        specialtyTouched += 1;
      }

      // Soft OSINT hit when catalog keywords exist and feed is quiet.
      let osintCreated = 0;
      if (catalog?.osintKeywords?.length) {
        const recent = await prismaRead.localOsintHit.count({
          where: {
            entityId: entity.id,
            createdAt: { gte: new Date(Date.now() - 25 * 60 * 1000) },
          },
        });
        if (recent === 0) {
          const kw =
            catalog.osintKeywords[
              Math.floor(Math.random() * catalog.osintKeywords.length)
            ]!;
          const sentiments = [
            LocalOsintSentiment.NEUTRAL,
            LocalOsintSentiment.NEGATIVE,
            LocalOsintSentiment.POSITIVE,
          ] as const;
          const sentiment = sentiments[Math.floor(Math.random() * sentiments.length)]!;
          await prismaWrite.localOsintHit.create({
            data: {
              title: `${entity.name} field pulse · ${kw}`,
              titleBn: `${entity.name} স্থানীয় পালস · ${kw}`,
              summary: `Automated Docker pulse matched keyword “${kw}” for ${entity.code}.`,
              sourceName: "GeoInsight Local Pulse",
              sourceUrl: `pulse://local/${entity.code}/osint/${period}`,
              channel: LocalOsintChannel.FIELD,
              matchedKeyword: kw.slice(0, 120),
              sentiment,
              propagandaFlag: sentiment === LocalOsintSentiment.NEGATIVE && Math.random() < 0.25,
              publishedAt: new Date(),
              entityId: entity.id,
            },
          });
          osintCreated = 1;
        }
      }

      // Tiny voter pulse drift for political pulse charts.
      const centers = await prismaRead.localPollingCenter.findMany({
        where: { entityId: entity.id },
        select: { id: true, newVoters: true },
        take: 12,
      });
      let pulseTouched = 0;
      for (const center of centers) {
        const delta = Math.random() < 0.35 ? (Math.random() < 0.5 ? -1 : 1) : 0;
        if (!delta) continue;
        await prismaWrite.localPollingCenter.update({
          where: { id: center.id },
          data: { newVoters: Math.max(0, center.newVoters + delta) },
        });
        pulseTouched += 1;
      }

      summary.push({
        code: entity.code,
        open,
        overdue,
        red,
        wpiWards: wpi.updated,
        specialtyTouched,
        osintCreated,
        pulseTouched,
      });
    }

    return { entities: summary.length, detail: summary };
  }
}

export const continuousPulseService = new ContinuousPulseService();
