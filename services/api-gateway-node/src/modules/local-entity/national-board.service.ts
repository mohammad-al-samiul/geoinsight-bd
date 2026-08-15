import { ComplaintStatus, ServiceOutageStatus, UserRole } from "@prisma/client";
import { prismaRead } from "../../core/database/prisma.client";
import { ApiError } from "../../core/errors/api.error";
import { getRedisClient, isRedisEnabled } from "../../infrastructure/redis/redis.client";
import {
  LOCAL_ENTITY_CATALOG,
  LOCAL_ENTITY_CODES,
  catalogByUnitCode,
} from "./local-entity.catalog";
import {
  localEvidenceService,
  outageKindToTopic,
  type EvidenceTopic,
  type NationalEvidenceSnippet,
} from "./evidence.service";
import { localUnrestService } from "./local-unrest.service";
import { localSectorService, type SeatSectorLeague } from "./local-sector.service";
import { localIntegrityService, type SeatIntegrityLeague } from "./integrity.service";
import { commandRoomService, emptyCommandLeague, type SeatCommandLeague } from "./command-room.service";

const CACHE_KEY = "local:national-board:v5";
const TTL_SEC = 60;

const CIVIC_KINDS = ["POWER", "GAS", "FUEL", "WATER"] as const;
const ALL_KINDS = [
  "POWER",
  "GAS",
  "FUEL",
  "WATER",
  "DRAINAGE",
  "ROAD",
  "INTERNET",
  "OTHER",
] as const;

export type UnrestTrend = "rising" | "stable" | "falling";

export type NationalBoardSeat = {
  entityId: string;
  code: string;
  name: string;
  nameBn: string | null;
  role: "MP" | "MAYOR" | null;
  href: string;
  hrefs: {
    desk: string;
    outage: string;
    pulse: string;
    complaints: string;
    evidence: string;
    education: string;
    health: string;
    jobs: string;
    crime: string;
    corruption: string;
    command: string;
  };
  outages: {
    active: number;
    byKind: Record<string, number>;
    bySource: Record<string, number>;
    worstKind: string | null;
    gasFuel: number;
  };
  sla: {
    open: number;
    overdue: number;
    redAlerts: number;
  };
  unrest: {
    active: number;
    last24h: number;
    last7d: number;
    trend: UnrestTrend;
    localHits: number;
  };
  evidenceHits: number;
  sectors: SeatSectorLeague;
  integrity: SeatIntegrityLeague;
  command: SeatCommandLeague;
};

export type NationalBoard = {
  generatedAt: string;
  sourceNote: string;
  summary: {
    seats: number;
    activeOutages: number;
    hotSeats: number;
    gasFuel: number;
    byKind: Record<string, number>;
    overdue: number;
    redAlerts: number;
    unrestActive: number;
    unrestRising: number;
    evidenceItems: number;
    hotTopics: EvidenceTopic[];
    sectorAlerts: number;
    dengue7d: number;
    teacherGap: number;
    jobFairGaps: number;
    crimeOpen: number;
    corruptionOpen: number;
    tenderFlags: number;
    bribes: number;
    warningSeats: number;
    warningWards: number;
    commandAverage: number;
  };
  seats: NationalBoardSeat[];
  evidence: {
    topics: EvidenceTopic[];
    sourceNote: string;
    items: NationalEvidenceSnippet[];
  };
};

let mem: { exp: number; data: NationalBoard } | null = null;

function emptyKind(): Record<string, number> {
  return Object.fromEntries(ALL_KINDS.map((k) => [k, 0]));
}

function emptySource(): Record<string, number> {
  return { OFFICIAL: 0, CITIZEN: 0, NEWS: 0, ACADEMIC: 0 };
}

async function readCache(): Promise<NationalBoard | null> {
  if (mem && mem.exp > Date.now()) return mem.data;
  if (!isRedisEnabled()) return null;
  try {
    const raw = await getRedisClient().get(CACHE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as NationalBoard;
    if (
      !data?.seats?.[0]?.sla ||
      !data?.seats?.[0]?.unrest ||
      !data?.evidence ||
      !data?.seats?.[0]?.sectors ||
      !data?.seats?.[0]?.integrity ||
      !data?.seats?.[0]?.command
    )
      return null;
    mem = { exp: Date.now() + TTL_SEC * 1000, data };
    return data;
  } catch {
    return null;
  }
}

async function writeCache(data: NationalBoard): Promise<void> {
  mem = { exp: Date.now() + TTL_SEC * 1000, data };
  if (!isRedisEnabled()) return;
  try {
    await getRedisClient().setex(CACHE_KEY, TTL_SEC, JSON.stringify(data));
  } catch {
    /* board still returns in-process cache */
  }
}

export class NationalBoardService {
  async getBoard(user: { role: UserRole; adminUnitId: string | null }): Promise<NationalBoard> {
    if (user.role !== UserRole.PMO && user.role !== UserRole.MINISTER) {
      throw ApiError.forbidden("National local board is PMO / Minister only");
    }

    const cached = await readCache();
    if (cached) return cached;

    const units = await prismaRead.adminUnit.findMany({
      where: { code: { in: [...LOCAL_ENTITY_CODES] } },
      select: { id: true, code: true, name: true, nameBn: true },
      orderBy: { code: "asc" },
    });
    const ids = units.map((u) => u.id);
    const pmo = { role: UserRole.PMO, adminUnitId: null };

    const [outages, complaints, unrestDesks, sectorMap, integrityMap, commandMap] = await Promise.all([
      ids.length
        ? prismaRead.localServiceOutage.findMany({
            where: { entityId: { in: ids }, status: ServiceOutageStatus.ACTIVE },
            select: { entityId: true, kind: true, source: true },
          })
        : Promise.resolve([]),
      ids.length
        ? prismaRead.citizenComplaint.findMany({
            where: {
              entityId: { in: ids },
              status: { not: ComplaintStatus.RESOLVED },
            },
            select: { entityId: true, isRedAlert: true, slaDeadline: true },
          })
        : Promise.resolve([]),
      Promise.all(
        units.map((u) =>
          localUnrestService.getDesk(pmo, { entityId: u.id }).catch(() => null),
        ),
      ),
      localSectorService.nationalRollup(ids),
      localIntegrityService.nationalRollup(ids),
      commandRoomService.nationalRollup(ids),
    ]);

    const outageByEntity = new Map<string, typeof outages>();
    for (const row of outages) {
      const list = outageByEntity.get(row.entityId) ?? [];
      list.push(row);
      outageByEntity.set(row.entityId, list);
    }

    const now = Date.now();
    const slaByEntity = new Map<string, { open: number; overdue: number; redAlerts: number }>();
    for (const row of complaints) {
      const cur = slaByEntity.get(row.entityId) ?? { open: 0, overdue: 0, redAlerts: 0 };
      cur.open += 1;
      if (row.isRedAlert) cur.redAlerts += 1;
      if (row.slaDeadline.getTime() < now) cur.overdue += 1;
      slaByEntity.set(row.entityId, cur);
    }

    const unrestByEntity = new Map<
      string,
      { active: number; last24h: number; last7d: number; trend: UnrestTrend; localHits: number }
    >();
    unrestDesks.forEach((desk, i) => {
      const unit = units[i];
      if (!unit) return;
      unrestByEntity.set(unit.id, {
        active: desk?.summary.active ?? 0,
        last24h: desk?.summary.last24h ?? 0,
        last7d: desk?.summary.last7d ?? 0,
        trend: desk?.summary.trend ?? "stable",
        localHits: desk?.summary.localHits ?? 0,
      });
    });

    const seats: NationalBoardSeat[] = units.map((u) => {
      const catalog =
        catalogByUnitCode(u.code) ?? LOCAL_ENTITY_CATALOG[u.code as keyof typeof LOCAL_ENTITY_CATALOG];
      const rows = outageByEntity.get(u.id) ?? [];
      const byKind = emptyKind();
      const bySource = emptySource();
      for (const row of rows) {
        byKind[row.kind] = (byKind[row.kind] ?? 0) + 1;
        bySource[String(row.source)] = (bySource[String(row.source)] ?? 0) + 1;
      }
      const civic = CIVIC_KINDS.filter((k) => (byKind[k] ?? 0) > 0).sort(
        (a, b) => (byKind[b] ?? 0) - (byKind[a] ?? 0),
      );
      const desk = `/local?entityId=${u.id}`;
      return {
        entityId: u.id,
        code: u.code,
        name: u.name,
        nameBn: u.nameBn,
        role: catalog?.role ?? null,
        href: desk,
        hrefs: {
          desk,
          outage: `/local/outage?entityId=${u.id}`,
          pulse: `/local/pulse?entityId=${u.id}`,
          complaints: `/local/complaints?entityId=${u.id}`,
          evidence: `/local/evidence?entityId=${u.id}`,
          education: `/local/education?entityId=${u.id}`,
          health: `/local/health?entityId=${u.id}`,
          jobs: `/local/jobs?entityId=${u.id}`,
          crime: `/local/crime?entityId=${u.id}`,
          corruption: `/local/corruption?entityId=${u.id}`,
          command: `/local/command?entityId=${u.id}`,
        },
        outages: {
          active: rows.length,
          byKind,
          bySource,
          worstKind: civic[0] ?? null,
          gasFuel: (byKind.GAS ?? 0) + (byKind.FUEL ?? 0),
        },
        sla: slaByEntity.get(u.id) ?? { open: 0, overdue: 0, redAlerts: 0 },
        unrest: unrestByEntity.get(u.id) ?? {
          active: 0,
          last24h: 0,
          last7d: 0,
          trend: "stable",
          localHits: 0,
        },
        evidenceHits: 0,
        sectors: sectorMap.get(u.id) ?? {
          education: { sites: 0, alert: 0, watch: 0, ok: 0, attendanceAvg: 0, dropoutAvg: 0, teacherGap: 0 },
          health: { sites: 0, alert: 0, watch: 0, ok: 0, dengue7d: 0, occupancyAvg: 0, stockouts: 0 },
          jobs: { sites: 0, alert: 0, watch: 0, ok: 0, unemploymentAvg: 0, vacancies: 0, trainingSeats: 0, jobFairGaps: 0 },
        },
        integrity: integrityMap.get(u.id) ?? {
          crime: { incidents: 0, open: 0, watch: 0, closed: 0, hotWards: 0, snatch: 0, theft: 0, nightSharePct: 0, patrolGaps: 0 },
          corruption: { incidents: 0, open: 0, watch: 0, closed: 0, hotWards: 0, tenderFlags: 0, bribes: 0, holdingTaxAvgGap: 0 },
        },
        command: {
          ...(commandMap.get(u.id) ?? emptyCommandLeague()),
          unrestTrend: unrestByEntity.get(u.id)?.trend ?? "stable",
          unrestActive: unrestByEntity.get(u.id)?.active ?? 0,
        },
      };
    });

    const byKind = emptyKind();
    for (const seat of seats) {
      for (const k of ALL_KINDS) byKind[k] += seat.outages.byKind[k] ?? 0;
    }

    const topicCounts = new Map<EvidenceTopic, number>();
    const bump = (topic: EvidenceTopic, n = 1) =>
      topicCounts.set(topic, (topicCounts.get(topic) ?? 0) + n);
    for (const seat of seats) {
      for (const [kind, n] of Object.entries(seat.outages.byKind)) {
        if (n > 0) bump(outageKindToTopic(kind), n);
      }
      if (seat.unrest.active > 0 || seat.unrest.trend === "rising") {
        bump("UNREST", seat.unrest.active || 1);
      }
      if ((seat.sectors.education.alert ?? 0) > 0) bump("EDUCATION", seat.sectors.education.alert);
      if ((seat.sectors.health.alert ?? 0) > 0) bump("HEALTH", seat.sectors.health.alert);
      if ((seat.sectors.jobs.alert ?? 0) > 0) bump("UNEMPLOYMENT", seat.sectors.jobs.alert);
      if ((seat.integrity.crime.open ?? 0) > 0) bump("CRIME", seat.integrity.crime.open);
      if ((seat.integrity.corruption.open ?? 0) > 0) bump("CORRUPTION", seat.integrity.corruption.open);
    }
    const hotTopics = [...topicCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([topic]) => topic);

    const pack = hotTopics.length
      ? await localEvidenceService.nationalSnippets({
          topics: hotTopics,
          units: units.map((u) => ({ id: u.id, code: u.code })),
          limit: 4,
        })
      : {
          topics: [] as EvidenceTopic[],
          sourceNote:
            "Curated abstracts and expert summaries — not full papers. Demo / open-source grounded.",
          items: [] as NationalEvidenceSnippet[],
          hitsByEntity: Object.fromEntries(units.map((u) => [u.id, 0])),
        };
    for (const seat of seats) {
      seat.evidenceHits = pack.hitsByEntity[seat.entityId] ?? 0;
    }

    const data: NationalBoard = {
      generatedAt: new Date().toISOString(),
      sourceNote:
        "Roll-up of Local DSS civic pressure plus crisis-matched research abstracts — not a national SCADA or police feed.",
      summary: {
        seats: seats.length,
        activeOutages: seats.reduce((s, r) => s + r.outages.active, 0),
        hotSeats: seats.filter(
          (r) =>
            r.outages.active > 0 ||
            r.sla.overdue > 0 ||
            r.sla.redAlerts > 0 ||
            r.unrest.active > 0 ||
            r.sectors.education.alert > 0 ||
            r.sectors.health.alert > 0 ||
            r.sectors.jobs.alert > 0 ||
            r.integrity.crime.open > 0 ||
            r.integrity.corruption.open > 0 ||
            r.command.warningWards > 0,
        ).length,
        gasFuel: seats.reduce((s, r) => s + r.outages.gasFuel, 0),
        byKind,
        overdue: seats.reduce((s, r) => s + r.sla.overdue, 0),
        redAlerts: seats.reduce((s, r) => s + r.sla.redAlerts, 0),
        unrestActive: seats.reduce((s, r) => s + r.unrest.active, 0),
        unrestRising: seats.filter((r) => r.unrest.trend === "rising").length,
        evidenceItems: pack.items.length,
        hotTopics,
        sectorAlerts: seats.reduce(
          (s, r) => s + r.sectors.education.alert + r.sectors.health.alert + r.sectors.jobs.alert,
          0,
        ),
        dengue7d: seats.reduce((s, r) => s + (r.sectors.health.dengue7d ?? 0), 0),
        teacherGap: seats.reduce((s, r) => s + (r.sectors.education.teacherGap ?? 0), 0),
        jobFairGaps: seats.reduce((s, r) => s + (r.sectors.jobs.jobFairGaps ?? 0), 0),
        crimeOpen: seats.reduce((s, r) => s + r.integrity.crime.open, 0),
        corruptionOpen: seats.reduce((s, r) => s + r.integrity.corruption.open, 0),
        tenderFlags: seats.reduce((s, r) => s + (r.integrity.corruption.tenderFlags ?? 0), 0),
        bribes: seats.reduce((s, r) => s + (r.integrity.corruption.bribes ?? 0), 0),
        warningSeats: seats.filter((r) => r.command.warningWards > 0).length,
        warningWards: seats.reduce((s, r) => s + r.command.warningWards, 0),
        commandAverage: seats.length
          ? Math.round(seats.reduce((s, r) => s + r.command.commandAverage, 0) / seats.length)
          : 0,
      },
      seats,
      evidence: {
        topics: pack.topics,
        sourceNote: pack.sourceNote,
        items: pack.items,
      },
    };

    await writeCache(data);
    return data;
  }
}

export const nationalBoardService = new NationalBoardService();
