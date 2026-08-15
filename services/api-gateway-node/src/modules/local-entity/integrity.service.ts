import {
  AdminUnitType,
  LocalIntegrityDomain,
  LocalIntegrityStatus,
  UserRole,
} from "@prisma/client";
import { prismaRead } from "../../core/database/prisma.client";
import { resolveLocalEntityId } from "./local-entity.scope";
import { integrityOpsHint } from "./ops-solutions";

export type IntegrityDomain = "CRIME" | "CORRUPTION";

function num(m: Record<string, unknown>, key: string): number {
  const v = m[key];
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

function flag(m: Record<string, unknown>, key: string): boolean {
  return m[key] === true;
}

function hourDhaka(d: Date): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    hourCycle: "h23",
    timeZone: "Asia/Dhaka",
  }).formatToParts(d);
  return Number(parts.find((p) => p.type === "hour")?.value ?? 0);
}

function pressureOf(
  domain: LocalIntegrityDomain,
  metrics: Record<string, unknown>,
  severity: number,
): number {
  if (domain === LocalIntegrityDomain.CRIME) {
    return Math.min(
      100,
      severity * 8 +
        num(metrics, "count7d") * 4 +
        (num(metrics, "nightSharePct") >= 60 ? 12 : 0) +
        (flag(metrics, "patrolGap") ? 16 : 0) +
        Math.max(0, 40 - num(metrics, "cctvCoverage")) * 0.35,
    );
  }
  return Math.min(
    100,
    severity * 7 +
      (flag(metrics, "tenderFlag") ? 22 : 0) +
      num(metrics, "holdingTaxGapPct") * 0.7 +
      Math.min(25, num(metrics, "extraFeeTk") / 80) +
      num(metrics, "sameContractorWins") * 4,
  );
}

function summaryExtras(
  domain: LocalIntegrityDomain,
  items: Array<{ kind: string; metrics: Record<string, unknown>; hour: number }>,
) {
  if (domain === LocalIntegrityDomain.CRIME) {
    const night = items.filter((i) => i.hour >= 19 || i.hour < 5).length;
    return {
      snatch: items.filter((i) => i.kind === "SNATCH").length,
      theft: items.filter((i) => i.kind === "THEFT").length,
      nightSharePct: items.length ? Math.round((night / items.length) * 100) : 0,
      patrolGaps: items.filter((i) => flag(i.metrics, "patrolGap")).length,
    };
  }
  return {
    tenderFlags: items.filter((i) => flag(i.metrics, "tenderFlag") || i.kind === "TENDER").length,
    bribes: items.filter((i) => i.kind === "BRIBE").length,
    holdingTaxAvgGap: Math.round(
      items.reduce((n, i) => n + num(i.metrics, "holdingTaxGapPct"), 0) /
        Math.max(1, items.filter((i) => num(i.metrics, "holdingTaxGapPct") > 0).length || 1),
    ),
  };
}

export type IntegrityLeagueSlice = {
  incidents: number;
  open: number;
  watch: number;
  closed: number;
  hotWards: number;
  snatch?: number;
  theft?: number;
  nightSharePct?: number;
  patrolGaps?: number;
  tenderFlags?: number;
  bribes?: number;
  holdingTaxAvgGap?: number;
};

export type SeatIntegrityLeague = {
  crime: IntegrityLeagueSlice;
  corruption: IntegrityLeagueSlice;
};

function sliceOf(
  domain: LocalIntegrityDomain,
  rows: Array<{
    kind: string;
    status: LocalIntegrityStatus;
    metrics: Record<string, unknown>;
    severity: number;
    occurredAt: Date;
    wardId: string | null;
  }>,
): IntegrityLeagueSlice {
  const items = rows.map((row) => ({
    kind: row.kind,
    metrics: row.metrics,
    hour: hourDhaka(row.occurredAt),
    status: row.status,
    severity: row.severity,
    wardId: row.wardId,
    pressure: pressureOf(domain, row.metrics, row.severity),
  }));
  const extras = summaryExtras(
    domain,
    items.map((i) => ({ kind: i.kind, metrics: i.metrics, hour: i.hour })),
  );
  const hotWards = new Set(
    items
      .filter(
        (i) =>
          i.status === LocalIntegrityStatus.OPEN &&
          i.wardId &&
          (i.severity >= 4 || i.pressure >= 28),
      )
      .map((i) => i.wardId as string),
  );
  return {
    incidents: items.length,
    open: items.filter((i) => i.status === LocalIntegrityStatus.OPEN).length,
    watch: items.filter((i) => i.status === LocalIntegrityStatus.WATCH).length,
    closed: items.filter((i) => i.status === LocalIntegrityStatus.CLOSED).length,
    hotWards: hotWards.size,
    ...extras,
  };
}

function emptyLeague(): SeatIntegrityLeague {
  return {
    crime: sliceOf(LocalIntegrityDomain.CRIME, []),
    corruption: sliceOf(LocalIntegrityDomain.CORRUPTION, []),
  };
}

export class LocalIntegrityService {
  async getDesk(
    user: { role: UserRole; adminUnitId: string | null },
    opts: { entityId?: string; domain: IntegrityDomain },
  ) {
    const entityId = await resolveLocalEntityId(user, opts.entityId);
    const domain = opts.domain as LocalIntegrityDomain;

    const [wards, rows] = await Promise.all([
      prismaRead.adminUnit.findMany({
        where: { parentId: entityId, type: AdminUnitType.WARD },
        select: { id: true, code: true, name: true, nameBn: true },
        orderBy: { code: "asc" },
      }),
      prismaRead.localIntegrityIncident.findMany({
        where: { entityId, domain },
        orderBy: [{ severity: "desc" }, { occurredAt: "desc" }],
        take: 80,
        include: {
          ward: { select: { id: true, code: true, name: true, nameBn: true } },
        },
      }),
    ]);

    const items = rows.map((row) => {
      const metrics = (row.metrics ?? {}) as Record<string, unknown>;
      const hour = hourDhaka(row.occurredAt);
      const hint = integrityOpsHint(row.domain, row.kind);
      return {
        id: row.id,
        domain: row.domain,
        kind: row.kind,
        status: row.status,
        source: row.source,
        title: row.title,
        titleBn: row.titleBn,
        detail: row.detail,
        detailBn: row.detailBn,
        metrics,
        severity: row.severity,
        pressure: pressureOf(domain, metrics, row.severity),
        lat: row.lat,
        lng: row.lng,
        occurredAt: row.occurredAt.toISOString(),
        hour,
        ward: row.ward,
        opsHint: hint,
      };
    });

    const byHour = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      count: items.filter((i) => i.hour === hour).length,
    }));

    const heat = wards.map((w) => {
      const mine = items.filter((i) => i.ward?.id === w.id);
      const pressure = Math.min(100, mine.reduce((s, i) => s + i.pressure, 0));
      const alerts = mine.filter((i) => i.status === LocalIntegrityStatus.OPEN && i.severity >= 4).length;
      return {
        wardId: w.id,
        code: w.code,
        name: w.name,
        nameBn: w.nameBn,
        incidents: mine.length,
        alerts,
        pressure,
        score: Math.max(8, 100 - pressure),
      };
    });

    const extras = summaryExtras(
      domain,
      items.map((i) => ({ kind: i.kind, metrics: i.metrics, hour: i.hour })),
    );

    return {
      entityId,
      domain,
      generatedAt: new Date().toISOString(),
      sourceNote:
        "Demo / seed operational snapshot — not a live police, RAB, or ACC feed.",
      summary: {
        incidents: items.length,
        open: items.filter((i) => i.status === LocalIntegrityStatus.OPEN).length,
        watch: items.filter((i) => i.status === LocalIntegrityStatus.WATCH).length,
        closed: items.filter((i) => i.status === LocalIntegrityStatus.CLOSED).length,
        hotWards: heat.filter((h) => h.pressure >= 28).length,
        ...extras,
      },
      byHour,
      heat,
      items,
    };
  }

  /** One query for the five PM desks — open/hotWards/flags only, no incident roster. */
  async nationalRollup(entityIds: string[]): Promise<Map<string, SeatIntegrityLeague>> {
    const out = new Map<string, SeatIntegrityLeague>();
    for (const id of entityIds) out.set(id, emptyLeague());
    if (!entityIds.length) return out;

    const rows = await prismaRead.localIntegrityIncident.findMany({
      where: { entityId: { in: entityIds } },
      select: {
        entityId: true,
        domain: true,
        kind: true,
        status: true,
        metrics: true,
        severity: true,
        occurredAt: true,
        wardId: true,
      },
    });

    type Row = {
      kind: string;
      status: LocalIntegrityStatus;
      metrics: Record<string, unknown>;
      severity: number;
      occurredAt: Date;
      wardId: string | null;
    };
    const grouped = new Map<string, Row[]>();
    for (const row of rows) {
      const key = `${row.entityId}:${row.domain}`;
      const list = grouped.get(key) ?? [];
      list.push({
        kind: String(row.kind),
        status: row.status,
        metrics: (row.metrics ?? {}) as Record<string, unknown>,
        severity: row.severity,
        occurredAt: row.occurredAt,
        wardId: row.wardId,
      });
      grouped.set(key, list);
    }

    for (const id of entityIds) {
      out.set(id, {
        crime: sliceOf(LocalIntegrityDomain.CRIME, grouped.get(`${id}:${LocalIntegrityDomain.CRIME}`) ?? []),
        corruption: sliceOf(
          LocalIntegrityDomain.CORRUPTION,
          grouped.get(`${id}:${LocalIntegrityDomain.CORRUPTION}`) ?? [],
        ),
      });
    }
    return out;
  }

  async listAlerts(
    user: { role: UserRole; adminUnitId: string | null },
    opts: { entityId?: string; limit?: number } = {},
  ) {
    const entityId = await resolveLocalEntityId(user, opts.entityId);
    const rows = await prismaRead.localIntegrityIncident.findMany({
      where: {
        entityId,
        status: LocalIntegrityStatus.OPEN,
        severity: { gte: 4 },
      },
      orderBy: [{ severity: "desc" }, { occurredAt: "desc" }],
      take: opts.limit ?? 8,
      include: {
        ward: { select: { id: true, code: true, name: true, nameBn: true } },
      },
    });
    return rows.map((row) => {
      const hint = integrityOpsHint(row.domain, row.kind);
      const isCrime = row.domain === LocalIntegrityDomain.CRIME;
      return {
        id: row.id,
        domain: row.domain,
        kind: row.kind,
        title: row.title,
        titleBn: row.titleBn,
        detail: row.detail,
        detailBn: row.detailBn,
        severity: row.severity,
        ward: row.ward,
        opsHint: hint,
        href: isCrime ? "/local/crime" : "/local/corruption",
        actionKind: isCrime ? ("CRIME" as const) : ("CORRUPTION" as const),
        evidenceTopic: isCrime ? ("CRIME" as const) : ("CORRUPTION" as const),
      };
    });
  }
}

export const localIntegrityService = new LocalIntegrityService();
