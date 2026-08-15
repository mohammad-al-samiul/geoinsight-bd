import {
  AdminUnitType,
  LocalSector,
  LocalSiteStatus,
  UserRole,
} from "@prisma/client";
import { prismaRead } from "../../core/database/prisma.client";
import { resolveLocalEntityId } from "./local-entity.scope";
import { sectorOpsHint } from "./ops-solutions";

export type SectorCode = "EDUCATION" | "HEALTH" | "EMPLOYMENT";

function num(m: Record<string, unknown>, key: string): number {
  const v = m[key];
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

function flag(m: Record<string, unknown>, key: string): boolean {
  return m[key] === true;
}

function pressureOf(sector: LocalSector, metrics: Record<string, unknown>, severity: number): number {
  if (sector === LocalSector.EDUCATION) {
    return Math.min(
      100,
      num(metrics, "dropoutPct") * 3.2 +
        num(metrics, "teacherGap") * 8 +
        Math.max(0, 88 - num(metrics, "attendancePct")) * 1.1 +
        severity * 4,
    );
  }
  if (sector === LocalSector.HEALTH) {
    return Math.min(
      100,
      num(metrics, "dengueCases7d") * 4.5 +
        Math.max(0, num(metrics, "occupancyPct") - 80) * 1.4 +
        (flag(metrics, "stockout") ? 22 : 0) +
        Math.max(0, 5 - num(metrics, "orsStockDays")) * 4 +
        severity * 4,
    );
  }
  return Math.min(
    100,
    num(metrics, "unemploymentPct") * 2.2 +
      num(metrics, "youthUnempPct") * 0.8 +
      (flag(metrics, "jobFairGap") ? 16 : 0) +
      Math.max(0, 20 - num(metrics, "vacanciesListed")) * 1.2 +
      severity * 3,
  );
}

function summaryExtras(sector: LocalSector, sites: Array<{ metrics: Record<string, unknown>; status: LocalSiteStatus }>) {
  if (sector === LocalSector.EDUCATION) {
    const att = sites.map((s) => num(s.metrics, "attendancePct")).filter((n) => n > 0);
    const drop = sites.map((s) => num(s.metrics, "dropoutPct"));
    const gap = sites.reduce((n, s) => n + num(s.metrics, "teacherGap"), 0);
    return {
      attendanceAvg: att.length ? Math.round(att.reduce((a, b) => a + b, 0) / att.length) : 0,
      dropoutAvg: drop.length ? Math.round(drop.reduce((a, b) => a + b, 0) / drop.length) : 0,
      teacherGap: gap,
    };
  }
  if (sector === LocalSector.HEALTH) {
    return {
      dengue7d: sites.reduce((n, s) => n + num(s.metrics, "dengueCases7d"), 0),
      occupancyAvg: Math.round(
        sites.reduce((n, s) => n + num(s.metrics, "occupancyPct"), 0) / Math.max(1, sites.length),
      ),
      stockouts: sites.filter((s) => flag(s.metrics, "stockout")).length,
    };
  }
  return {
    unemploymentAvg: Math.round(
      sites.reduce((n, s) => n + num(s.metrics, "unemploymentPct"), 0) / Math.max(1, sites.length),
    ),
    vacancies: sites.reduce((n, s) => n + num(s.metrics, "vacanciesListed"), 0),
    trainingSeats: sites.reduce((n, s) => n + num(s.metrics, "trainingSeats"), 0),
    jobFairGaps: sites.filter((s) => flag(s.metrics, "jobFairGap")).length,
  };
}

function sliceOf(
  sector: LocalSector,
  sites: Array<{ metrics: Record<string, unknown>; status: LocalSiteStatus }>,
): SectorLeagueSlice {
  return {
    sites: sites.length,
    alert: sites.filter((s) => s.status === LocalSiteStatus.ALERT).length,
    watch: sites.filter((s) => s.status === LocalSiteStatus.WATCH).length,
    ok: sites.filter((s) => s.status === LocalSiteStatus.OK).length,
    ...summaryExtras(sector, sites),
  };
}

export type SectorLeagueSlice = {
  sites: number;
  alert: number;
  watch: number;
  ok: number;
  attendanceAvg?: number;
  dropoutAvg?: number;
  teacherGap?: number;
  dengue7d?: number;
  occupancyAvg?: number;
  stockouts?: number;
  unemploymentAvg?: number;
  vacancies?: number;
  trainingSeats?: number;
  jobFairGaps?: number;
};

export type SeatSectorLeague = {
  education: SectorLeagueSlice;
  health: SectorLeagueSlice;
  jobs: SectorLeagueSlice;
};

function emptyLeague(): SeatSectorLeague {
  return {
    education: sliceOf(LocalSector.EDUCATION, []),
    health: sliceOf(LocalSector.HEALTH, []),
    jobs: sliceOf(LocalSector.EMPLOYMENT, []),
  };
}

export class LocalSectorService {
  async getDesk(
    user: { role: UserRole; adminUnitId: string | null },
    opts: { entityId?: string; sector: SectorCode },
  ) {
    const entityId = await resolveLocalEntityId(user, opts.entityId);
    const sector = opts.sector as LocalSector;

    const [wards, rows] = await Promise.all([
      prismaRead.adminUnit.findMany({
        where: { parentId: entityId, type: AdminUnitType.WARD },
        select: { id: true, code: true, name: true, nameBn: true },
        orderBy: { code: "asc" },
      }),
      prismaRead.localSectorSite.findMany({
        where: { entityId, sector },
        orderBy: [{ severity: "desc" }, { observedAt: "desc" }],
        take: 80,
        include: {
          ward: { select: { id: true, code: true, name: true, nameBn: true } },
        },
      }),
    ]);

    const items = rows.map((row) => {
      const metrics = (row.metrics ?? {}) as Record<string, unknown>;
      const hint = sectorOpsHint(row.sector, row.kind);
      return {
        id: row.id,
        sector: row.sector,
        kind: row.kind,
        status: row.status,
        source: row.source,
        title: row.title,
        titleBn: row.titleBn,
        detail: row.detail,
        detailBn: row.detailBn,
        metrics,
        severity: row.severity,
        pressure: pressureOf(sector, metrics, row.severity),
        lat: row.lat,
        lng: row.lng,
        observedAt: row.observedAt.toISOString(),
        ward: row.ward,
        opsHint: hint,
      };
    });

    const heat = wards.map((w) => {
      const mine = items.filter((i) => i.ward?.id === w.id);
      const pressure = Math.min(100, mine.reduce((s, i) => s + i.pressure, 0));
      const alerts = mine.filter((i) => i.status === LocalSiteStatus.ALERT).length;
      return {
        wardId: w.id,
        code: w.code,
        name: w.name,
        nameBn: w.nameBn,
        sites: mine.length,
        alerts,
        pressure,
        score: Math.max(8, 100 - pressure),
      };
    });

    const extras = summaryExtras(
      sector,
      items.map((i) => ({ metrics: i.metrics, status: i.status })),
    );

    return {
      entityId,
      sector,
      generatedAt: new Date().toISOString(),
      sourceNote:
        "Demo / seed operational snapshot — not a live EMIS, DGHS, or BBS feed.",
      summary: {
        sites: items.length,
        alert: items.filter((i) => i.status === LocalSiteStatus.ALERT).length,
        watch: items.filter((i) => i.status === LocalSiteStatus.WATCH).length,
        ok: items.filter((i) => i.status === LocalSiteStatus.OK).length,
        hotWards: heat.filter((h) => h.pressure >= 28).length,
        ...extras,
      },
      heat,
      items,
    };
  }

  /** One query for the five PM desks — summaries only, no site rosters. */
  async nationalRollup(entityIds: string[]): Promise<Map<string, SeatSectorLeague>> {
    const out = new Map<string, SeatSectorLeague>();
    for (const id of entityIds) out.set(id, emptyLeague());
    if (!entityIds.length) return out;

    const rows = await prismaRead.localSectorSite.findMany({
      where: { entityId: { in: entityIds } },
      select: { entityId: true, sector: true, status: true, metrics: true },
    });

    const grouped = new Map<string, Array<{ metrics: Record<string, unknown>; status: LocalSiteStatus }>>();
    for (const row of rows) {
      const key = `${row.entityId}:${row.sector}`;
      const list = grouped.get(key) ?? [];
      list.push({
        metrics: (row.metrics ?? {}) as Record<string, unknown>,
        status: row.status,
      });
      grouped.set(key, list);
    }

    for (const id of entityIds) {
      out.set(id, {
        education: sliceOf(LocalSector.EDUCATION, grouped.get(`${id}:${LocalSector.EDUCATION}`) ?? []),
        health: sliceOf(LocalSector.HEALTH, grouped.get(`${id}:${LocalSector.HEALTH}`) ?? []),
        jobs: sliceOf(LocalSector.EMPLOYMENT, grouped.get(`${id}:${LocalSector.EMPLOYMENT}`) ?? []),
      });
    }
    return out;
  }

  async listAlerts(
    user: { role: UserRole; adminUnitId: string | null },
    opts: { entityId?: string; limit?: number } = {},
  ) {
    const entityId = await resolveLocalEntityId(user, opts.entityId);
    const rows = await prismaRead.localSectorSite.findMany({
      where: { entityId, status: LocalSiteStatus.ALERT },
      orderBy: [{ severity: "desc" }, { observedAt: "desc" }],
      take: opts.limit ?? 8,
      include: {
        ward: { select: { id: true, code: true, name: true, nameBn: true } },
      },
    });
    return rows.map((row) => {
      const hint = sectorOpsHint(row.sector, row.kind);
      return {
        id: row.id,
        sector: row.sector,
        kind: row.kind,
        title: row.title,
        titleBn: row.titleBn,
        detail: row.detail,
        detailBn: row.detailBn,
        severity: row.severity,
        ward: row.ward,
        opsHint: hint,
        href:
          row.sector === LocalSector.EDUCATION
            ? "/local/education"
            : row.sector === LocalSector.HEALTH
              ? "/local/health"
              : "/local/jobs",
        actionKind:
          row.sector === LocalSector.EDUCATION
            ? ("EDUCATION" as const)
            : row.sector === LocalSector.HEALTH
              ? ("HEALTH" as const)
              : ("JOBS" as const),
        evidenceTopic:
          row.sector === LocalSector.EMPLOYMENT ? "UNEMPLOYMENT" : row.sector,
      };
    });
  }
}

export const localSectorService = new LocalSectorService();
