import { AdminUnitType, ComplaintStatus, UserRole } from "@prisma/client";
import { prismaRead, prismaWrite } from "../../core/database/prisma.client";
import { ApiError } from "../../core/errors/api.error";
import { AI_FETCH_LLM_MS, fetchAi } from "../../shared/http/fetch-ai";
import { metricSeriesService } from "../metrics/metric-series.service";
import {
  currentPeriodKey,
  resolveLocalEntityId,
} from "./local-entity.scope";

function clampScore(n: number): number {
  return Math.max(1, Math.min(100, Math.round(n)));
}

function baselineFromCode(code: string, salt: number): number {
  let h = salt;
  for (let i = 0; i < code.length; i++) h = (h * 31 + code.charCodeAt(i)) >>> 0;
  return 55 + (h % 36);
}

function whyDropped(row: {
  score: number;
  serviceScore: number;
  infraScore: number;
  resolutionScore: number;
  openComplaints: number;
  resolvedWithinSla: number;
  totalResolved: number;
}) {
  const reasons: Array<{ code: string; en: string; bn: string; weight: number }> = [];
  if (row.openComplaints >= 2) {
    reasons.push({
      code: "OPEN_LOAD",
      weight: row.openComplaints * 10,
      en: `${row.openComplaints} open complaints are dragging service & resolution scores.`,
      bn: `${row.openComplaints}টি খোলা অভিযোগ সেবা ও সমাধান স্কোর কমাচ্ছে।`,
    });
  }
  if (row.resolutionScore < 65) {
    reasons.push({
      code: "SLA_RESOLUTION",
      weight: 65 - row.resolutionScore,
      en: `Resolution score ${row.resolutionScore} — too few closed within 24h SLA (${row.resolvedWithinSla}/${row.totalResolved}).`,
      bn: `সমাধান স্কোর ${row.resolutionScore} — ২৪ ঘণ্টার মধ্যে কম সমাধান (${row.resolvedWithinSla}/${row.totalResolved})।`,
    });
  }
  if (row.serviceScore < 65) {
    reasons.push({
      code: "SERVICE",
      weight: 65 - row.serviceScore,
      en: `Service delivery score ${row.serviceScore} is below watch threshold.`,
      bn: `সেবা স্কোর ${row.serviceScore} নজরদারি সীমার নিচে।`,
    });
  }
  if (row.infraScore < 65) {
    reasons.push({
      code: "INFRA",
      weight: 65 - row.infraScore,
      en: `Infrastructure pace score ${row.infraScore} is weak.`,
      bn: `অবকাঠামো স্কোর ${row.infraScore} দুর্বল।`,
    });
  }
  if (!reasons.length) {
    reasons.push({
      code: "STABLE",
      weight: 0,
      en: `Score ${row.score} is stable — keep clearing open tickets to climb.`,
      bn: `স্কোর ${row.score} স্থিতিশীল — খোলা টিকিট ক্লিয়ার করে বাড়ান।`,
    });
  }
  reasons.sort((a, b) => b.weight - a.weight);
  return reasons.slice(0, 3);
}

export class WpiService {
  async list(
    user: { role: UserRole; adminUnitId: string | null },
    opts: { entityId?: string; periodKey?: string } = {},
  ) {
    const entityId = await resolveLocalEntityId(user, opts.entityId);
    const periodKey = opts.periodKey ?? currentPeriodKey();

    let rows = await prismaRead.wardPerformanceScore.findMany({
      where: { entityId, periodKey },
      orderBy: { score: "desc" },
      include: {
        ward: { select: { id: true, code: true, name: true, nameBn: true } },
      },
    });

    if (rows.length === 0) {
      await this.recompute(user, { entityId, periodKey });
      rows = await prismaRead.wardPerformanceScore.findMany({
        where: { entityId, periodKey },
        orderBy: { score: "desc" },
        include: {
          ward: { select: { id: true, code: true, name: true, nameBn: true } },
        },
      });
    }

    const avg =
      rows.length > 0
        ? Math.round(rows.reduce((s, r) => s + r.score, 0) / rows.length)
        : 0;
    const top = rows[0] ?? null;
    const bottom = rows.length > 0 ? rows[rows.length - 1]! : null;

    return {
      entityId,
      periodKey,
      summary: {
        wardCount: rows.length,
        averageScore: avg,
        topWard: top
          ? { id: top.wardId, name: top.ward.name, score: top.score }
          : null,
        bottomWard: bottom
          ? { id: bottom.wardId, name: bottom.ward.name, score: bottom.score }
          : null,
      },
      items: rows.map((row) => ({ ...row, why: whyDropped(row) })),
    };
  }

  async history(
    user: { role: UserRole; adminUnitId: string | null },
    opts: { entityId?: string; wardId?: string } = {},
  ) {
    const entityId = await resolveLocalEntityId(user, opts.entityId);
    const entity = await prismaRead.adminUnit.findUnique({
      where: { id: entityId },
      select: { code: true },
    });
    const module = `local:${entity?.code ?? entityId}`;
    const seriesKeys = opts.wardId
      ? [`wpi:ward:${opts.wardId}`]
      : ["wpi:average"];
    const points = await metricSeriesService.listSeries(module, seriesKeys, 48);

    const monthly = await prismaRead.wardPerformanceScore.findMany({
      where: {
        entityId,
        ...(opts.wardId ? { wardId: opts.wardId } : {}),
      },
      orderBy: { periodKey: "asc" },
      take: opts.wardId ? 12 : 200,
      include: {
        ward: { select: { id: true, code: true, name: true, nameBn: true } },
      },
    });

    return {
      entityId,
      series: points,
      monthly: monthly.map((r) => ({
        periodKey: r.periodKey,
        wardId: r.wardId,
        wardName: r.ward.name,
        wardNameBn: r.ward.nameBn,
        score: r.score,
        serviceScore: r.serviceScore,
        infraScore: r.infraScore,
        resolutionScore: r.resolutionScore,
        openComplaints: r.openComplaints,
        computedAt: r.computedAt,
      })),
    };
  }

  async explainWard(
    user: { role: UserRole; adminUnitId: string | null },
    wardId: string,
    entityIdOpt?: string,
  ) {
    const entityId = await resolveLocalEntityId(user, entityIdOpt);
    const periodKey = currentPeriodKey();
    let row = await prismaRead.wardPerformanceScore.findUnique({
      where: { wardId_periodKey: { wardId, periodKey } },
      include: {
        ward: { select: { id: true, code: true, name: true, nameBn: true } },
      },
    });
    if (!row || row.entityId !== entityId) {
      await this.recompute(user, { entityId, periodKey });
      row = await prismaRead.wardPerformanceScore.findUnique({
        where: { wardId_periodKey: { wardId, periodKey } },
        include: {
          ward: { select: { id: true, code: true, name: true, nameBn: true } },
        },
      });
    }
    if (!row || row.entityId !== entityId) {
      throw ApiError.notFound("WPI ward score not found");
    }
    const why = whyDropped(row);
    let aiNarrative: { en: string; bn: string; llmUsed: boolean } | null = null;
    try {
      const res = await fetchAi(
        "/api/v1/local-ai/wpi-explain",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ward_name: row.ward.name,
            ward_name_bn: row.ward.nameBn,
            score: row.score,
            service_score: row.serviceScore,
            infra_score: row.infraScore,
            resolution_score: row.resolutionScore,
            open_complaints: row.openComplaints,
            why,
            lang: "bn",
          }),
        },
        { timeoutMs: AI_FETCH_LLM_MS },
      );
      if (res.ok) {
        const data = (await res.json()) as {
          narrative_en?: string;
          narrative_bn?: string;
          llm_used?: boolean;
        };
        if (data.narrative_en && data.narrative_bn) {
          aiNarrative = {
            en: data.narrative_en,
            bn: data.narrative_bn,
            llmUsed: Boolean(data.llm_used),
          };
        }
      }
    } catch {
      /* template why remains */
    }
    if (!aiNarrative) {
      aiNarrative = {
        en: why.map((w) => w.en).join(" "),
        bn: why.map((w) => w.bn).join(" "),
        llmUsed: false,
      };
    }
    return {
      entityId,
      periodKey,
      item: { ...row, why, aiNarrative },
    };
  }

  async recompute(
    user: { role: UserRole; adminUnitId: string | null },
    opts: { entityId?: string; periodKey?: string } = {},
  ) {
    const entityId = await resolveLocalEntityId(user, opts.entityId);
    const periodKey = opts.periodKey ?? currentPeriodKey();
    const entity = await prismaRead.adminUnit.findUnique({
      where: { id: entityId },
      select: { code: true },
    });

    const wards = await prismaRead.adminUnit.findMany({
      where: { parentId: entityId, type: AdminUnitType.WARD },
      select: { id: true, code: true },
      orderBy: { code: "asc" },
    });

    const now = new Date();
    const results = [];
    const historyPoints: Array<{
      seriesKey: string;
      periodKey: string;
      label?: string | null;
      value: number;
      recordedAt?: Date;
    }> = [];
    const bucket = now.toISOString().slice(0, 16);

    for (const ward of wards) {
      const [openComplaints, resolved] = await Promise.all([
        prismaRead.citizenComplaint.count({
          where: {
            wardId: ward.id,
            status: { not: ComplaintStatus.RESOLVED },
          },
        }),
        prismaRead.citizenComplaint.findMany({
          where: { wardId: ward.id, status: ComplaintStatus.RESOLVED },
          select: { resolvedAt: true, slaDeadline: true },
        }),
      ]);

      const totalResolved = resolved.length;
      const resolvedWithinSla = resolved.filter(
        (r) => r.resolvedAt && r.resolvedAt.getTime() <= r.slaDeadline.getTime(),
      ).length;

      const resolutionScore =
        totalResolved === 0
          ? clampScore(75 - openComplaints * 4)
          : clampScore((resolvedWithinSla / totalResolved) * 100 - openComplaints * 3);

      const serviceScore = clampScore(
        baselineFromCode(ward.code, 7) - openComplaints * 2,
      );
      const infraScore = clampScore(baselineFromCode(ward.code, 13));
      const score = clampScore(
        serviceScore * 0.35 + infraScore * 0.3 + resolutionScore * 0.35,
      );

      const row = await prismaWrite.wardPerformanceScore.upsert({
        where: {
          wardId_periodKey: { wardId: ward.id, periodKey },
        },
        create: {
          wardId: ward.id,
          entityId,
          periodKey,
          score,
          serviceScore,
          infraScore,
          resolutionScore,
          openComplaints,
          resolvedWithinSla,
          totalResolved,
          computedAt: now,
        },
        update: {
          score,
          serviceScore,
          infraScore,
          resolutionScore,
          openComplaints,
          resolvedWithinSla,
          totalResolved,
          computedAt: now,
        },
        include: {
          ward: { select: { id: true, code: true, name: true, nameBn: true } },
        },
      });
      results.push(row);
      historyPoints.push({
        seriesKey: `wpi:ward:${ward.id}`,
        periodKey: bucket,
        label: row.ward.name,
        value: score,
        recordedAt: now,
      });
    }

    results.sort((a, b) => b.score - a.score);
    const avg =
      results.length > 0
        ? Math.round(results.reduce((s, r) => s + r.score, 0) / results.length)
        : 0;
    historyPoints.push({
      seriesKey: "wpi:average",
      periodKey: bucket,
      label: "WPI avg",
      value: avg,
      recordedAt: now,
    });

    if (entity?.code) {
      await metricSeriesService.upsertMany(`local:${entity.code}`, historyPoints);
    }

    return {
      entityId,
      periodKey,
      updated: results.length,
      items: results.map((row) => ({ ...row, why: whyDropped(row) })),
    };
  }
}

export const wpiService = new WpiService();
