import { AdminUnitType, ServiceOutageKind, ServiceOutageStatus, SignalSource, UserRole } from "@prisma/client";
import { prismaRead, prismaWrite } from "../../core/database/prisma.client";
import { ApiError } from "../../core/errors/api.error";
import { outageOpsHint } from "./ops-solutions";
import {
  assertWardBelongsToEntity,
  resolveLocalEntityId,
} from "./local-entity.scope";

export class OutageService {
  async list(
    user: { role: UserRole; adminUnitId: string | null },
    opts: {
      entityId?: string;
      status?: ServiceOutageStatus | "ALL";
      kind?: ServiceOutageKind;
      source?: SignalSource;
      limit?: number;
    } = {},
  ) {
    const entityId = await resolveLocalEntityId(user, opts.entityId);
    const limit = Math.min(opts.limit ?? 50, 100);
    const where = {
      entityId,
      ...(opts.status && opts.status !== "ALL" ? { status: opts.status } : {}),
      ...(opts.kind ? { kind: opts.kind } : {}),
      ...(opts.source ? { source: opts.source } : {}),
    };

    const items = await prismaRead.localServiceOutage.findMany({
      where,
      orderBy: [{ status: "asc" }, { severity: "desc" }, { startedAt: "desc" }],
      take: limit,
      include: {
        ward: { select: { id: true, code: true, name: true, nameBn: true } },
      },
    });

    const [active, watch, resolved] = await Promise.all([
      prismaRead.localServiceOutage.count({
        where: { entityId, status: ServiceOutageStatus.ACTIVE },
      }),
      prismaRead.localServiceOutage.count({
        where: { entityId, status: ServiceOutageStatus.WATCH },
      }),
      prismaRead.localServiceOutage.count({
        where: { entityId, status: ServiceOutageStatus.RESOLVED },
      }),
    ]);

    const byKind = items.reduce<Record<string, number>>((acc, row) => {
      if (row.status === ServiceOutageStatus.RESOLVED) return acc;
      acc[row.kind] = (acc[row.kind] ?? 0) + 1;
      return acc;
    }, {});

    const openItems = items.filter((i) => i.status !== ServiceOutageStatus.RESOLVED);
    const pressureOf = (row: (typeof items)[number]) => {
      const statusBoost =
        row.status === ServiceOutageStatus.ACTIVE
          ? 16
          : row.status === ServiceOutageStatus.WATCH
            ? 8
            : 0;
      return row.severity * 12 + Math.min(24, Math.round(row.affectedCount / 50)) + statusBoost;
    };

    const wards = await prismaRead.adminUnit.findMany({
      where: { parentId: entityId, type: AdminUnitType.WARD },
      select: { id: true, code: true, name: true, nameBn: true },
      orderBy: { code: "asc" },
    });

    const heat = wards.map((w) => {
      const rows = openItems.filter((i) => i.wardId === w.id);
      const pressure = Math.min(100, rows.reduce((s, r) => s + pressureOf(r), 0));
      const worst = rows.reduce((m, r) => Math.max(m, r.severity), 0);
      return {
        wardId: w.id,
        code: w.code,
        name: w.name,
        nameBn: w.nameBn,
        open: rows.length,
        pressure,
        score: Math.max(8, 100 - pressure),
        worstSeverity: worst,
      };
    });

    return {
      entityId,
      generatedAt: new Date().toISOString(),
      summary: {
        active,
        watch,
        resolved,
        affectedPeople: openItems.reduce((s, i) => s + i.affectedCount, 0),
        byKind,
        hotWards: heat.filter((h) => h.pressure >= 28).length,
        overdueEta: openItems.filter(
          (i) => i.etaRestoreAt && i.etaRestoreAt.getTime() < Date.now(),
        ).length,
      },
      heat,
      items: items.map((row) => ({
        ...row,
        pressure: pressureOf(row),
        opsHint: outageOpsHint(row.kind),
      })),
    };
  }

  async create(
    user: { role: UserRole; adminUnitId: string | null },
    input: {
      entityId?: string;
      wardId?: string;
      kind?: ServiceOutageKind;
      source?: SignalSource;
      title: string;
      titleBn?: string;
      detail?: string;
      detailBn?: string;
      severity?: number;
      affectedCount?: number;
      lat?: number;
      lng?: number;
      etaRestoreAt?: string;
    },
  ) {
    const entityId = await resolveLocalEntityId(user, input.entityId);
    if (input.wardId) await assertWardBelongsToEntity(input.wardId, entityId);
    return prismaWrite.localServiceOutage.create({
      data: {
        entityId,
        wardId: input.wardId ?? null,
        kind: input.kind ?? ServiceOutageKind.OTHER,
        source: input.source ?? SignalSource.OFFICIAL,
        status: ServiceOutageStatus.ACTIVE,
        title: input.title.trim(),
        titleBn: input.titleBn?.trim() || null,
        detail: input.detail?.trim() || null,
        detailBn: input.detailBn?.trim() || null,
        severity: Math.min(5, Math.max(1, input.severity ?? 3)),
        affectedCount: Math.max(0, input.affectedCount ?? 0),
        lat: input.lat,
        lng: input.lng,
        etaRestoreAt: input.etaRestoreAt ? new Date(input.etaRestoreAt) : null,
      },
      include: {
        ward: { select: { id: true, code: true, name: true, nameBn: true } },
      },
    });
  }

  async resolve(
    user: { role: UserRole; adminUnitId: string | null },
    outageId: string,
  ) {
    const existing = await prismaRead.localServiceOutage.findUnique({
      where: { id: outageId },
    });
    if (!existing) throw ApiError.notFound("Outage not found");
    await resolveLocalEntityId(user, existing.entityId);
    return prismaWrite.localServiceOutage.update({
      where: { id: outageId },
      data: {
        status: ServiceOutageStatus.RESOLVED,
        resolvedAt: new Date(),
      },
      include: {
        ward: { select: { id: true, code: true, name: true, nameBn: true } },
      },
    });
  }
}

export const outageService = new OutageService();
