import { UserRole } from "@prisma/client";
import {
  AdminUnitType,
  ComplaintStatus,
  LocalIntegrityDomain,
  LocalSector,
  ServiceOutageStatus,
} from "@prisma/client";
import { prismaRead } from "../../core/database/prisma.client";
import { currentPeriodKey, resolveLocalEntityId } from "./local-entity.scope";
import { wpiService } from "./wpi.service";
import { outageService } from "./outage.service";
import { localHeatmapService } from "./heatmap.service";
import { localUnrestService } from "./local-unrest.service";
import { localSectorService } from "./local-sector.service";
import { localIntegrityService } from "./integrity.service";
import { commandOpsHint } from "./ops-solutions";

const HOT = 28;

type LayerKey =
  | "outage"
  | "complaints"
  | "education"
  | "health"
  | "jobs"
  | "crime"
  | "corruption";

const LAYER_HREF: Record<LayerKey, string> = {
  outage: "/local/outage",
  complaints: "/local/heatmap",
  education: "/local/education",
  health: "/local/health",
  jobs: "/local/jobs",
  crime: "/local/crime",
  corruption: "/local/corruption",
};

type ScenarioId =
  | "DRAIN_CLEAR"
  | "NIGHT_PATROL"
  | "LIGHTING"
  | "DIGITAL_COUNTER"
  | "FEVER_DESK"
  | "SMC_TODAY";

function clamp(n: number): number {
  return Math.max(1, Math.min(100, Math.round(n)));
}

function commandScore(wpi: number, p: Record<LayerKey, number>): number {
  const s = (k: LayerKey) => Math.max(8, 100 - p[k]);
  return clamp(
    0.3 * wpi +
      0.16 * s("outage") +
      0.14 * s("crime") +
      0.12 * s("health") +
      0.1 * s("education") +
      0.1 * s("corruption") +
      0.08 * s("complaints"),
  );
}

const SCENARIO_DEFS: Array<{
  id: ScenarioId;
  layer: LayerKey;
  factor: number;
  title: string;
  titleBn: string;
  detail: string;
  detailBn: string;
}> = [
  {
    id: "DRAIN_CLEAR",
    layer: "outage",
    factor: 0.4,
    title: "Clear drains / standby pumps",
    titleBn: "ড্রেন পরিষ্কার / পাম্প স্ট্যান্ডবাই",
    detail: "Cut utility pressure on waterlogged wards tonight.",
    detailBn: "জলাবদ্ধ ওয়ার্ডে আজ রাতে ইউটিলিটি চাপ কমান।",
  },
  {
    id: "NIGHT_PATROL",
    layer: "crime",
    factor: 0.35,
    title: "Extra night patrol loop",
    titleBn: "অতিরিক্ত রাতের টহল",
    detail: "One extra loop on snatch/theft pinch points after 19:00.",
    detailBn: "১৯:০০-এর পর ছিনতাই/চুরি চোকপয়েন্টে একটি অতিরিক্ত লুপ।",
  },
  {
    id: "LIGHTING",
    layer: "crime",
    factor: 0.2,
    title: "Night lighting on dark lanes",
    titleBn: "অন্ধকার গলিতে রাতের আলো",
    detail: "Streetlight cover on patrol-gap lanes.",
    detailBn: "টহল-ফাঁক গলিতে স্ট্রিটলাইট।",
  },
  {
    id: "DIGITAL_COUNTER",
    layer: "corruption",
    factor: 0.4,
    title: "Digital receipt only",
    titleBn: "শুধু ডিজিটাল রসিদ",
    detail: "Named counter, posted fee chart, freeze cash extras.",
    detailBn: "নামসহ কাউন্টার, ফি চার্ট, নগদ অতিরিক্ত বন্ধ।",
  },
  {
    id: "FEVER_DESK",
    layer: "health",
    factor: 0.35,
    title: "Open a fever / dengue desk",
    titleBn: "জ্বর / ডেঙ্গু ডেস্ক খুলুন",
    detail: "Larvicide + ORS buffer on the hot health wards.",
    detailBn: "হট স্বাস্থ্য ওয়ার্ডে লার্ভিসাইড + ORS বাফার।",
  },
  {
    id: "SMC_TODAY",
    layer: "education",
    factor: 0.35,
    title: "Call the SMC today",
    titleBn: "আজই এসএমসি কল",
    detail: "Teacher-gap list + generator cover for evening class.",
    detailBn: "শিক্ষক ঘাটতির তালিকা + সন্ধ্যার ক্লাসে জেনারেটর।",
  },
];

function num(m: Record<string, unknown>, key: string): number {
  const v = m[key];
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

function flag(m: Record<string, unknown>, key: string): boolean {
  return m[key] === true;
}

function sectorPressure(sector: LocalSector, metrics: Record<string, unknown>, severity: number): number {
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

function integrityPressure(
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

function heatMap(
  rows: Array<{ wardId: string; pressure?: number }> | undefined,
): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of rows ?? []) m.set(r.wardId, r.pressure ?? 0);
  return m;
}

function outageLayer(kind: string): string {
  if (["POWER", "GAS", "FUEL", "WATER", "DRAINAGE", "ROAD", "INTERNET"].includes(kind)) {
    return kind;
  }
  return "OTHER";
}

function complaintLayer(category: string): string {
  switch (category) {
    case "UTILITIES":
      return "POWER";
    case "CRIME":
      return "CRIME";
    case "CORRUPTION":
      return "CORRUPTION";
    case "EDUCATION":
      return "EDUCATION";
    case "HEALTH":
      return "HEALTH";
    case "UNEMPLOYMENT":
      return "UNEMPLOYMENT";
    case "DRAINAGE":
      return "DRAINAGE";
    case "TRAFFIC":
    case "INFRASTRUCTURE":
      return "ROAD";
    case "SAFETY":
      return "CRIME";
    default:
      return "COMPLAINT";
  }
}

function sevFromN(n: number): "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" {
  if (n >= 5) return "CRITICAL";
  if (n >= 4) return "HIGH";
  if (n >= 3) return "MEDIUM";
  return "LOW";
}

function asSev(v: unknown): "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" {
  if (v === "CRITICAL" || v === "HIGH" || v === "MEDIUM" || v === "LOW") return v;
  if (typeof v === "number") return sevFromN(v);
  return "MEDIUM";
}

export type CommandWarningWard = {
  name: string;
  nameBn: string | null;
  signals: number;
  hot: LayerKey[];
  commandScore: number;
  wpi: number;
  opsHint: { horizon: string; en: string; bn: string };
};

export type CommandScenarioRollup = {
  id: ScenarioId;
  title: string;
  titleBn: string;
  layer: LayerKey;
  factor: number;
  avgCommandLift: number;
  affectedWards: number;
};

export type SeatCommandLeague = {
  wards: number;
  warningWards: number;
  wpiAverage: number;
  commandAverage: number;
  unrestTrend: "rising" | "stable" | "falling";
  unrestActive: number;
  warnings: CommandWarningWard[];
  scenarios: CommandScenarioRollup[];
};

export function emptyCommandLeague(): SeatCommandLeague {
  return {
    wards: 0,
    warningWards: 0,
    wpiAverage: 0,
    commandAverage: 0,
    unrestTrend: "stable",
    unrestActive: 0,
    warnings: [],
    scenarios: SCENARIO_DEFS.map((d) => ({
      id: d.id,
      title: d.title,
      titleBn: d.titleBn,
      layer: d.layer,
      factor: d.factor,
      avgCommandLift: 0,
      affectedWards: 0,
    })),
  };
}

export class CommandRoomService {
  async getDesk(
    user: { role: UserRole; adminUnitId: string | null },
    opts: { entityId?: string } = {},
  ) {
    const entityId = await resolveLocalEntityId(user, opts.entityId);

    const [wpi, outages, heatmap, unrest, education, health, jobs, crime, corruption] =
      await Promise.all([
        wpiService.list(user, { entityId }).catch(() => null),
        outageService.list(user, { entityId, status: "ALL" }).catch(() => null),
        localHeatmapService.getBoard(user, { entityId }).catch(() => null),
        localUnrestService.getDesk(user, { entityId }).catch(() => null),
        localSectorService.getDesk(user, { entityId, sector: "EDUCATION" }).catch(() => null),
        localSectorService.getDesk(user, { entityId, sector: "HEALTH" }).catch(() => null),
        localSectorService.getDesk(user, { entityId, sector: "EMPLOYMENT" }).catch(() => null),
        localIntegrityService.getDesk(user, { entityId, domain: "CRIME" }).catch(() => null),
        localIntegrityService.getDesk(user, { entityId, domain: "CORRUPTION" }).catch(() => null),
      ]);

    const outageP = heatMap(outages?.heat);
    const complaintP = heatMap(heatmap?.wards);
    const eduP = heatMap(education?.heat);
    const healthP = heatMap(health?.heat);
    const jobsP = heatMap(jobs?.heat);
    const crimeP = heatMap(crime?.heat);
    const corrP = heatMap(corruption?.heat);

    const wardIndex = new Map<
      string,
      { id: string; code: string; name: string; nameBn: string | null }
    >();
    for (const w of heatmap?.wards ?? []) {
      wardIndex.set(w.wardId, {
        id: w.wardId,
        code: w.code,
        name: w.name,
        nameBn: w.nameBn,
      });
    }
    for (const w of wpi?.items ?? []) {
      if (!wardIndex.has(w.wardId)) {
        wardIndex.set(w.wardId, {
          id: w.wardId,
          code: w.ward.code,
          name: w.ward.name,
          nameBn: w.ward.nameBn,
        });
      }
    }

    const wpiByWard = new Map((wpi?.items ?? []).map((r) => [r.wardId, r.score]));

    const wards = [...wardIndex.values()].map((w) => {
      const layers: Record<LayerKey, number> = {
        outage: outageP.get(w.id) ?? 0,
        complaints: complaintP.get(w.id) ?? 0,
        education: eduP.get(w.id) ?? 0,
        health: healthP.get(w.id) ?? 0,
        jobs: jobsP.get(w.id) ?? 0,
        crime: crimeP.get(w.id) ?? 0,
        corruption: corrP.get(w.id) ?? 0,
      };
      const hot = (Object.keys(layers) as LayerKey[]).filter((k) => layers[k] >= HOT);
      const wpiScore = wpiByWard.get(w.id) ?? 60;
      const score = commandScore(wpiScore, layers);
      const hint = commandOpsHint(hot.map((k) => k.toUpperCase()));
      return {
        wardId: w.id,
        code: w.code,
        name: w.name,
        nameBn: w.nameBn,
        wpi: wpiScore,
        commandScore: score,
        layers,
        hot,
        signals: hot.length,
        warning: hot.length >= 3,
        hrefs: hot.map((k) => ({ layer: k, href: LAYER_HREF[k] })),
        opsHint: hint,
      };
    });
    wards.sort((a, b) => b.signals - a.signals || a.commandScore - b.commandScore);

    const scenarios = SCENARIO_DEFS.map((def) => {
      const wardDeltas = wards
        .filter((w) => w.layers[def.layer] >= 18)
        .map((w) => {
          const nextPressure = Math.max(0, Math.round(w.layers[def.layer] * (1 - def.factor)));
          const nextLayers = { ...w.layers, [def.layer]: nextPressure };
          const nextScore = commandScore(w.wpi, nextLayers);
          return {
            wardId: w.wardId,
            layer: def.layer,
            pressureDelta: nextPressure - w.layers[def.layer],
            commandDelta: nextScore - w.commandScore,
          };
        });
      const lift =
        wardDeltas.length > 0
          ? Math.round(
              wardDeltas.reduce((s, d) => s + d.commandDelta, 0) / wardDeltas.length,
            )
          : 0;
      return {
        ...def,
        affectedWards: wardDeltas.length,
        avgCommandLift: lift,
        wardDeltas,
      };
    });

    const markers: Array<{
      id: string;
      layer: string;
      lat: number;
      lng: number;
      severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
      source: string;
      occurredAt: string;
      wardId: string | null;
      label: string;
      kind?: string;
    }> = [];

    for (const row of outages?.items ?? []) {
      if (row.status === "RESOLVED" || row.lat == null || row.lng == null) continue;
      markers.push({
        id: `out-${row.id}`,
        layer: outageLayer(String(row.kind)),
        lat: row.lat,
        lng: row.lng,
        severity: sevFromN(row.severity),
        source: String(row.source ?? "OFFICIAL"),
        occurredAt: row.startedAt.toISOString(),
        wardId: row.wardId ?? row.ward?.id ?? null,
        label: row.titleBn || row.title,
        kind: String(row.kind),
      });
    }
    for (const pack of [education, health, jobs]) {
      const layer =
        pack?.sector === "EDUCATION"
          ? "EDUCATION"
          : pack?.sector === "HEALTH"
            ? "HEALTH"
            : "UNEMPLOYMENT";
      for (const row of pack?.items ?? []) {
        if (row.lat == null || row.lng == null) continue;
        markers.push({
          id: `sec-${row.id}`,
          layer,
          lat: row.lat,
          lng: row.lng,
          severity: sevFromN(row.severity),
          source: String(row.source ?? "OFFICIAL"),
          occurredAt: row.observedAt,
          wardId: row.ward?.id ?? null,
          label: row.titleBn || row.title,
          kind: String(row.kind),
        });
      }
    }
    for (const pack of [crime, corruption]) {
      const layer = pack?.domain === "CORRUPTION" ? "CORRUPTION" : "CRIME";
      for (const row of pack?.items ?? []) {
        if (row.lat == null || row.lng == null) continue;
        markers.push({
          id: `int-${row.id}`,
          layer,
          lat: row.lat,
          lng: row.lng,
          severity: sevFromN(row.severity),
          source: String(row.source ?? "OFFICIAL"),
          occurredAt: row.occurredAt,
          wardId: row.ward?.id ?? null,
          label: row.titleBn || row.title,
          kind: String(row.kind),
        });
      }
    }
    for (const m of heatmap?.markers ?? []) {
      markers.push({
        id: `cmp-${m.id}`,
        layer: complaintLayer(String(m.category ?? "OTHER")),
        lat: m.lat,
        lng: m.lng,
        severity: asSev(m.severity),
        source: String(m.source ?? "CITIZEN"),
        occurredAt: m.createdAt,
        wardId: null,
        label: m.label,
        kind: String(m.category ?? "COMPLAINT"),
      });
    }
    for (const p of unrest?.pins ?? []) {
      if (p.lat == null || p.lng == null) continue;
      markers.push({
        id: `unr-${p.id}`,
        layer: "UNREST",
        lat: p.lat,
        lng: p.lng,
        severity: asSev(p.severity),
        source: "NEWS",
        occurredAt:
          typeof p.occurredAt === "string" && p.occurredAt
            ? p.occurredAt
            : new Date().toISOString(),
        wardId: p.wardId ?? null,
        label: p.label,
        kind: p.themeId,
      });
    }

    const warnings = wards.filter((w) => w.warning);
    const avgCommand =
      wards.length > 0
        ? Math.round(wards.reduce((s, w) => s + w.commandScore, 0) / wards.length)
        : 0;

    return {
      entityId,
      generatedAt: new Date().toISOString(),
      sourceNote:
        "Live overlay of Local DSS layers — WPI plus utilities, crime, health, education, corruption, complaints. Seed/demo feeds, not a national C4ISR system.",
      formula:
        "Command score = 30% WPI + 16% utilities + 14% crime + 12% health + 10% education + 10% corruption + 8% complaints",
      summary: {
        wards: wards.length,
        warningWards: warnings.length,
        wpiAverage: wpi?.summary.averageScore ?? 0,
        commandAverage: avgCommand,
        activeOutages: outages?.summary.active ?? 0,
        unrestTrend: unrest?.summary.trend ?? "stable",
        unrestActive: unrest?.summary.active ?? 0,
      },
      warnings: warnings.slice(0, 8).map((w) => ({
        wardId: w.wardId,
        name: w.name,
        nameBn: w.nameBn,
        signals: w.signals,
        hot: w.hot,
        commandScore: w.commandScore,
        wpi: w.wpi,
        opsHint: w.opsHint,
      })),
      scenarios,
      wards,
      markers: markers.slice(0, 80),
    };
  }

  /** Seat-level command averages + scenario lifts. No markers, no ward map. */
  async nationalRollup(entityIds: string[]): Promise<Map<string, SeatCommandLeague>> {
    const out = new Map<string, SeatCommandLeague>();
    for (const id of entityIds) out.set(id, emptyCommandLeague());
    if (!entityIds.length) return out;

    const periodKey = currentPeriodKey();
    const since = new Date(Date.now() - 56 * 24 * 60 * 60_000);

    const [wards, wpiRows, outages, complaints, sites, incidents] = await Promise.all([
      prismaRead.adminUnit.findMany({
        where: { parentId: { in: entityIds }, type: AdminUnitType.WARD },
        select: { id: true, parentId: true, code: true, name: true, nameBn: true },
      }),
      prismaRead.wardPerformanceScore.findMany({
        where: { entityId: { in: entityIds }, periodKey },
        select: { wardId: true, score: true },
      }),
      prismaRead.localServiceOutage.findMany({
        where: { entityId: { in: entityIds }, status: { not: ServiceOutageStatus.RESOLVED } },
        select: { wardId: true, status: true, severity: true, affectedCount: true },
      }),
      prismaRead.citizenComplaint.findMany({
        where: { entityId: { in: entityIds }, createdAt: { gte: since } },
        select: { wardId: true, status: true, isRedAlert: true, slaDeadline: true },
      }),
      prismaRead.localSectorSite.findMany({
        where: { entityId: { in: entityIds } },
        select: { wardId: true, sector: true, metrics: true, severity: true },
      }),
      prismaRead.localIntegrityIncident.findMany({
        where: { entityId: { in: entityIds } },
        select: { wardId: true, domain: true, metrics: true, severity: true },
      }),
    ]);

    const wpiByWard = new Map(wpiRows.map((r) => [r.wardId, r.score]));
    const now = Date.now();
    type Acc = {
      outage: number;
      complaints: { open: number; overdue: number; red: number };
      education: number;
      health: number;
      jobs: number;
      crime: number;
      corruption: number;
    };
    const acc = new Map<string, Acc>();
    const accOf = (wardId: string): Acc => {
      const cur = acc.get(wardId) ?? {
        outage: 0,
        complaints: { open: 0, overdue: 0, red: 0 },
        education: 0,
        health: 0,
        jobs: 0,
        crime: 0,
        corruption: 0,
      };
      acc.set(wardId, cur);
      return cur;
    };

    for (const row of outages) {
      if (!row.wardId) continue;
      const statusBoost =
        row.status === ServiceOutageStatus.ACTIVE
          ? 16
          : row.status === ServiceOutageStatus.WATCH
            ? 8
            : 0;
      accOf(row.wardId).outage +=
        row.severity * 12 + Math.min(24, Math.round(row.affectedCount / 50)) + statusBoost;
    }
    for (const row of complaints) {
      if (row.status === ComplaintStatus.RESOLVED) continue;
      const c = accOf(row.wardId).complaints;
      c.open += 1;
      if (row.isRedAlert) c.red += 1;
      if (row.slaDeadline.getTime() < now) c.overdue += 1;
    }
    for (const row of sites) {
      if (!row.wardId) continue;
      const metrics = (row.metrics ?? {}) as Record<string, unknown>;
      const p = sectorPressure(row.sector, metrics, row.severity);
      const a = accOf(row.wardId);
      if (row.sector === LocalSector.EDUCATION) a.education += p;
      else if (row.sector === LocalSector.HEALTH) a.health += p;
      else a.jobs += p;
    }
    for (const row of incidents) {
      if (!row.wardId) continue;
      const metrics = (row.metrics ?? {}) as Record<string, unknown>;
      const p = integrityPressure(row.domain, metrics, row.severity);
      const a = accOf(row.wardId);
      if (row.domain === LocalIntegrityDomain.CRIME) a.crime += p;
      else a.corruption += p;
    }

    const byEntity = new Map<string, typeof wards>();
    for (const w of wards) {
      if (!w.parentId) continue;
      const list = byEntity.get(w.parentId) ?? [];
      list.push(w);
      byEntity.set(w.parentId, list);
    }

    for (const entityId of entityIds) {
      const entityWards = byEntity.get(entityId) ?? [];
      const computed = entityWards.map((w) => {
        const a = acc.get(w.id);
        const layers: Record<LayerKey, number> = {
          outage: Math.min(100, a?.outage ?? 0),
          complaints: Math.min(
            100,
            a ? a.complaints.open * 8 + a.complaints.overdue * 14 + a.complaints.red * 18 : 0,
          ),
          education: Math.min(100, a?.education ?? 0),
          health: Math.min(100, a?.health ?? 0),
          jobs: Math.min(100, a?.jobs ?? 0),
          crime: Math.min(100, a?.crime ?? 0),
          corruption: Math.min(100, a?.corruption ?? 0),
        };
        const hot = (Object.keys(layers) as LayerKey[]).filter((k) => layers[k] >= HOT);
        const wpiScore = wpiByWard.get(w.id) ?? 60;
        const score = commandScore(wpiScore, layers);
        return {
          name: w.name,
          nameBn: w.nameBn,
          wpi: wpiScore,
          commandScore: score,
          layers,
          hot,
          signals: hot.length,
          warning: hot.length >= 3,
          opsHint: commandOpsHint(hot.map((k) => k.toUpperCase())),
        };
      });
      computed.sort((a, b) => b.signals - a.signals || a.commandScore - b.commandScore);

      const warnings = computed.filter((w) => w.warning);
      const storedWpi = entityWards
        .map((w) => wpiByWard.get(w.id))
        .filter((n): n is number => typeof n === "number");
      const scenarios = SCENARIO_DEFS.map((def) => {
        const lifts = computed
          .filter((w) => w.layers[def.layer] >= 18)
          .map((w) => {
            const nextPressure = Math.max(0, Math.round(w.layers[def.layer] * (1 - def.factor)));
            const nextLayers = { ...w.layers, [def.layer]: nextPressure };
            return commandScore(w.wpi, nextLayers) - w.commandScore;
          });
        return {
          id: def.id,
          title: def.title,
          titleBn: def.titleBn,
          layer: def.layer,
          factor: def.factor,
          avgCommandLift: lifts.length
            ? Math.round(lifts.reduce((s, n) => s + n, 0) / lifts.length)
            : 0,
          affectedWards: lifts.length,
        };
      });

      out.set(entityId, {
        wards: computed.length,
        warningWards: warnings.length,
        wpiAverage: storedWpi.length
          ? Math.round(storedWpi.reduce((s, n) => s + n, 0) / storedWpi.length)
          : 0,
        commandAverage: computed.length
          ? Math.round(computed.reduce((s, w) => s + w.commandScore, 0) / computed.length)
          : 0,
        unrestTrend: "stable",
        unrestActive: 0,
        warnings: warnings.slice(0, 3).map((w) => ({
          name: w.name,
          nameBn: w.nameBn,
          signals: w.signals,
          hot: w.hot,
          commandScore: w.commandScore,
          wpi: w.wpi,
          opsHint: w.opsHint,
        })),
        scenarios,
      });
    }

    return out;
  }
}

export const commandRoomService = new CommandRoomService();
