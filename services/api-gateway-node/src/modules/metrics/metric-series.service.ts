import { Prisma } from "@prisma/client";
import { prismaRead, prismaWrite } from "../../core/database/prisma.client";

export type MetricPoint = {
  seriesKey: string;
  periodKey: string;
  label?: string | null;
  value: number;
  recordedAt: string;
  meta?: Record<string, unknown> | null;
};

export class MetricSeriesService {
  async upsertMany(
    module: string,
    points: Array<{
      seriesKey: string;
      periodKey: string;
      label?: string | null;
      value: number;
      recordedAt?: Date;
      meta?: Prisma.InputJsonValue;
    }>,
  ): Promise<number> {
    if (!points.length) return 0;
    let n = 0;
    // Chunked upserts keep write amplification low for cron / pulse paths.
    for (const point of points) {
      await prismaWrite.metricTimeSeries.upsert({
        where: {
          module_seriesKey_periodKey: {
            module,
            seriesKey: point.seriesKey,
            periodKey: point.periodKey,
          },
        },
        create: {
          module,
          seriesKey: point.seriesKey,
          periodKey: point.periodKey,
          label: point.label ?? null,
          value: point.value,
          meta: point.meta ?? Prisma.JsonNull,
          recordedAt: point.recordedAt ?? new Date(),
        },
        update: {
          label: point.label ?? null,
          value: point.value,
          meta: point.meta ?? undefined,
          recordedAt: point.recordedAt ?? new Date(),
        },
      });
      n += 1;
    }
    return n;
  }

  async listSeries(
    module: string,
    seriesKeys?: string[],
    limit = 120,
  ): Promise<MetricPoint[]> {
    const rows = await prismaRead.metricTimeSeries.findMany({
      where: {
        module,
        ...(seriesKeys?.length ? { seriesKey: { in: seriesKeys } } : {}),
      },
      orderBy: [{ seriesKey: "asc" }, { recordedAt: "asc" }],
      take: Math.min(2000, Math.max(1, limit * Math.max(1, seriesKeys?.length ?? 8))),
    });
    return rows.map((row) => ({
      seriesKey: row.seriesKey,
      periodKey: row.periodKey,
      label: row.label,
      value: Number(row.value),
      recordedAt: row.recordedAt.toISOString(),
      meta: (row.meta as Record<string, unknown> | null) ?? null,
    }));
  }

  /** National completion trend from verified KPI history (DB source of truth). */
  async buildCompletionTrendFromKpis(): Promise<Array<{ month: string; rate: number }>> {
    const rows = await prismaRead.$queryRaw<
      Array<{ month: string; mnum: number; rate: number }>
    >`
      SELECT
        to_char(date_trunc('month', recorded_at), 'Mon') AS month,
        EXTRACT(MONTH FROM date_trunc('month', recorded_at))::int AS mnum,
        ROUND(AVG(value)::numeric, 1)::float AS rate
      FROM kpi_records
      WHERE status IN ('VERIFIED', 'SUBMITTED')
        AND recorded_at >= NOW() - INTERVAL '14 months'
      GROUP BY 1, 2, date_trunc('month', recorded_at)
      ORDER BY date_trunc('month', recorded_at) ASC
      LIMIT 12
    `;

    if (rows.length >= 3) {
      return rows.map((r) => ({ month: r.month, rate: Number(r.rate) }));
    }

    const stored = await this.listSeries("dashboard", ["completion"], 12);
    if (stored.length) {
      return stored.map((p) => ({
        month: p.label || p.periodKey,
        rate: p.value,
      }));
    }

    return [];
  }
}

export const metricSeriesService = new MetricSeriesService();
