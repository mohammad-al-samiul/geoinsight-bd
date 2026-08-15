import { ComplaintStatus, UserRole } from "@prisma/client";
import { prismaRead } from "../../core/database/prisma.client";
import { resolveLocalEntityId } from "./local-entity.scope";

function isoWeekKey(d: Date): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export class LocalHeatmapService {
  async getBoard(
    user: { role: UserRole; adminUnitId: string | null },
    opts: { entityId?: string } = {},
  ) {
    const entityId = await resolveLocalEntityId(user, opts.entityId);
    const since = new Date(Date.now() - 56 * 24 * 60 * 60_000);

    const [wards, complaints] = await Promise.all([
      prismaRead.adminUnit.findMany({
        where: { parentId: entityId },
        select: { id: true, code: true, name: true, nameBn: true },
        orderBy: { code: "asc" },
      }),
      prismaRead.citizenComplaint.findMany({
        where: { entityId, createdAt: { gte: since } },
        select: {
          id: true,
          wardId: true,
          status: true,
          severity: true,
          category: true,
          source: true,
          isRedAlert: true,
          lat: true,
          lng: true,
          title: true,
          titleBn: true,
          createdAt: true,
          resolvedAt: true,
          slaDeadline: true,
        },
        orderBy: { createdAt: "desc" },
        take: 500,
      }),
    ]);

    const now = Date.now();
    const byWard = new Map<
      string,
      { open: number; overdue: number; red: number; resolved: number; total: number }
    >();
    for (const w of wards) {
      byWard.set(w.id, { open: 0, overdue: 0, red: 0, resolved: 0, total: 0 });
    }

    const weekly = new Map<string, { opened: number; resolved: number; overdue: number }>();

    for (const c of complaints) {
      const bucket = byWard.get(c.wardId) ?? {
        open: 0,
        overdue: 0,
        red: 0,
        resolved: 0,
        total: 0,
      };
      bucket.total += 1;
      if (c.status === ComplaintStatus.RESOLVED) bucket.resolved += 1;
      else {
        bucket.open += 1;
        if (c.isRedAlert) bucket.red += 1;
        if (c.slaDeadline && c.slaDeadline.getTime() < now) bucket.overdue += 1;
      }
      byWard.set(c.wardId, bucket);

      const wk = isoWeekKey(c.createdAt);
      const wrow = weekly.get(wk) ?? { opened: 0, resolved: 0, overdue: 0 };
      wrow.opened += 1;
      if (c.status === ComplaintStatus.RESOLVED) wrow.resolved += 1;
      if (c.slaDeadline && c.slaDeadline.getTime() < now && c.status !== ComplaintStatus.RESOLVED) {
        wrow.overdue += 1;
      }
      weekly.set(wk, wrow);
    }

    const heat = wards.map((w) => {
      const s = byWard.get(w.id)!;
      const pressure = Math.min(100, s.open * 8 + s.overdue * 14 + s.red * 18);
      return {
        wardId: w.id,
        code: w.code,
        name: w.name,
        nameBn: w.nameBn,
        ...s,
        pressure,
        score: Math.max(5, 100 - pressure),
      };
    });

    const markers = complaints
      .filter((c) => c.lat != null && c.lng != null && c.status !== ComplaintStatus.RESOLVED)
      .slice(0, 40)
      .map((c) => ({
        id: c.id,
        lat: c.lat as number,
        lng: c.lng as number,
        severity: c.severity,
        label: c.titleBn || c.title,
        isRedAlert: c.isRedAlert,
        category: c.category,
        source: c.source,
        createdAt: c.createdAt.toISOString(),
      }));

    const weekSeries = [...weekly.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-8)
      .map(([periodKey, v]) => ({ periodKey, ...v }));

    return {
      entityId,
      generatedAt: new Date().toISOString(),
      summary: {
        wards: heat.length,
        open: heat.reduce((s, h) => s + h.open, 0),
        overdue: heat.reduce((s, h) => s + h.overdue, 0),
        red: heat.reduce((s, h) => s + h.red, 0),
        hotWards: heat.filter((h) => h.pressure >= 40).length,
      },
      wards: heat.sort((a, b) => b.pressure - a.pressure),
      weekly: weekSeries,
      markers,
    };
  }
}

export const localHeatmapService = new LocalHeatmapService();
