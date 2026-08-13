import { AdminUnitType, UserRole } from "@prisma/client";
import { prismaRead } from "../../core/database/prisma.client";
import { ApiError } from "../../core/errors/api.error";
import { isLocalEntityRole, NATIONAL_ROLES } from "../../core/constants/rbac";
import { adminScopeService } from "../../shared/scope/admin-scope.service";
import {
  catalogByUnitCode,
  LOCAL_ENTITY_CATALOG,
  LOCAL_ENTITY_CODES,
  type LocalEntityCode,
  type LocalEntityDefinition,
} from "./local-entity.catalog";

const LOCAL_ROOT_TYPES: AdminUnitType[] = [
  AdminUnitType.CONSTITUENCY,
  AdminUnitType.CITY_CORPORATION,
];

export interface LocalEntityOverview {
  entity: {
    id: string;
    code: string;
    name: string;
    nameBn: string | null;
    type: AdminUnitType;
    parentId: string | null;
    divisionId: string | null;
    districtId: string | null;
  };
  catalog: LocalEntityDefinition | null;
  wardCount: number;
  wards: Array<{
    id: string;
    code: string;
    name: string;
    nameBn: string | null;
  }>;
  coreModules: Array<{
    id: string;
    titleEn: string;
    titleBn: string;
    status: "planned" | "active";
  }>;
  phase: "P0" | "P1" | "P2" | "P3" | "P4";
  lastUpdatedAt: string | null;
  dataFreshness: "live" | "stale" | "unknown";
}

const CORE_MODULES: LocalEntityOverview["coreModules"] = [
  {
    id: "osint",
    titleEn: "Multi-channel OSINT",
    titleBn: "মাল্টি-চ্যানেল ওএসআইএনটি",
    status: "active",
  },
  {
    id: "sentiment",
    titleEn: "AI sentiment & propaganda",
    titleBn: "এআই সেন্টিমেন্ট ও প্রোপাগান্ডা",
    status: "active",
  },
  {
    id: "instant-action",
    titleEn: "Instant action (24hr SLA)",
    titleBn: "ইনস্ট্যান্ট অ্যাকশন (২৪ ঘণ্টা SLA)",
    status: "active",
  },
  {
    id: "whatsapp-alerts",
    titleEn: "WhatsApp & voice alerts",
    titleBn: "হোয়াটসঅ্যাপ ও ভয়েস অ্যালার্ট",
    status: "active",
  },
  {
    id: "wpi",
    titleEn: "Ward Performance Index",
    titleBn: "ওয়ার্ড পারফরম্যান্স ইনডেক্স",
    status: "active",
  },
  {
    id: "political-pulse",
    titleEn: "Political pulse & influencers",
    titleBn: "পলিটিক্যাল পালস ও প্রভাবশালী",
    status: "active",
  },
];

export class LocalEntityService {
  async listCatalog(user: {
    role: UserRole;
    adminUnitId: string | null;
  }): Promise<
    Array<{
      code: LocalEntityCode;
      definition: LocalEntityDefinition;
      unit: { id: string; code: string; name: string; nameBn: string | null; type: AdminUnitType } | null;
    }>
  > {
    const units = await prismaRead.adminUnit.findMany({
      where: {
        type: { in: LOCAL_ROOT_TYPES },
        code: { in: LOCAL_ENTITY_CODES },
      },
      select: {
        id: true,
        code: true,
        name: true,
        nameBn: true,
        type: true,
      },
    });
    const byCode = new Map(units.map((u) => [u.code, u]));

    const rows = LOCAL_ENTITY_CODES.map((code) => ({
      code,
      definition: LOCAL_ENTITY_CATALOG[code],
      unit: byCode.get(code) ?? null,
    }));

    if (NATIONAL_ROLES.includes(user.role)) return rows;

    if (!isLocalEntityRole(user.role) || !user.adminUnitId) {
      throw ApiError.forbidden("Local entity catalog requires MP, Mayor, or PMO");
    }

    const scoped = units.find((u) => u.id === user.adminUnitId);
    if (!scoped) throw ApiError.forbidden("No local entity bound to this account");
    return rows.filter((r) => r.unit?.id === scoped.id);
  }

  async getOverview(
    user: { role: UserRole; adminUnitId: string | null },
    entityId?: string,
  ): Promise<LocalEntityOverview> {
    let targetId = entityId ?? null;

    if (isLocalEntityRole(user.role)) {
      if (!user.adminUnitId) throw ApiError.forbidden("Local role missing admin unit scope");
      if (targetId && targetId !== user.adminUnitId) {
        const allowed = await adminScopeService.isWithinScope(
          user.adminUnitId,
          user.role,
          targetId,
        );
        if (!allowed) throw ApiError.forbidden("Outside your local entity scope");
        // Prefer root entity for overview when a ward id is passed
        const unit = await prismaRead.adminUnit.findUnique({ where: { id: targetId } });
        if (unit?.type === AdminUnitType.WARD && unit.parentId) {
          targetId = unit.parentId;
        }
      } else {
        targetId = user.adminUnitId;
      }
    } else if (NATIONAL_ROLES.includes(user.role)) {
      if (!targetId) {
        const first = await prismaRead.adminUnit.findFirst({
          where: { type: { in: LOCAL_ROOT_TYPES }, code: { in: LOCAL_ENTITY_CODES } },
          orderBy: { code: "asc" },
        });
        if (!first) throw ApiError.notFound("No local entities seeded yet");
        targetId = first.id;
      }
    } else {
      throw ApiError.forbidden("Role cannot access local entity dashboards");
    }

    const entity = await prismaRead.adminUnit.findUnique({
      where: { id: targetId! },
      select: {
        id: true,
        code: true,
        name: true,
        nameBn: true,
        type: true,
        parentId: true,
        divisionId: true,
        districtId: true,
      },
    });

    if (!entity) throw ApiError.notFound("Local entity not found");
    if (!LOCAL_ROOT_TYPES.includes(entity.type)) {
      throw ApiError.badRequest("Target unit is not a constituency or city corporation");
    }

    const wards = await prismaRead.adminUnit.findMany({
      where: { parentId: entity.id, type: AdminUnitType.WARD },
      orderBy: { code: "asc" },
      select: { id: true, code: true, name: true, nameBn: true },
    });

    const pulse = await prismaRead.metricTimeSeries.findFirst({
      where: { module: `local:${entity.code}` },
      orderBy: { recordedAt: "desc" },
      select: { recordedAt: true },
    });
    const lastUpdatedAt = pulse?.recordedAt?.toISOString() ?? null;
    const ageMs = pulse?.recordedAt ? Date.now() - pulse.recordedAt.getTime() : null;
    const dataFreshness =
      ageMs == null
        ? "unknown"
        : ageMs <= 5 * 60_000
          ? "live"
          : ageMs <= 30 * 60_000
            ? "stale"
            : "stale";

    return {
      entity,
      catalog: catalogByUnitCode(entity.code),
      wardCount: wards.length,
      wards,
      coreModules: CORE_MODULES,
      phase: "P4",
      lastUpdatedAt,
      dataFreshness,
    };
  }
}

export const localEntityService = new LocalEntityService();
