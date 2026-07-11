import { AdminUnitType } from "@prisma/client";
import { prismaRead } from "../../core/database/prisma.client";
import type { DashboardScopeQuery } from "../../modules/dashboard/dashboard.service";

export interface ScopeContext {
  unitId?: string;
  divisionId?: string;
  districtId?: string;
  upazilaId?: string;
  unionId?: string;
  divisionName?: string;
  districtName?: string;
}

const DIVISION_ALIASES: Record<string, string> = {
  chittagong: "Chattogram",
  chattogram: "Chattogram",
  ctg: "Chattogram",
  chattagram: "Chattogram",
  dhaka: "Dhaka",
  sylhet: "Sylhet",
  barishal: "Barishal",
  barisal: "Barishal",
  khulna: "Khulna",
  rajshahi: "Rajshahi",
  rangpur: "Rangpur",
  mymensingh: "Mymensingh",
};

export function normalizeDivisionName(raw: string | null | undefined): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  const alias = DIVISION_ALIASES[trimmed.toLowerCase()];
  return alias ?? trimmed;
}

export function divisionNamesMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  const na = normalizeDivisionName(a)?.toLowerCase();
  const nb = normalizeDivisionName(b)?.toLowerCase();
  if (!na || !nb) return false;
  return na === nb;
}

export function scopeUnitId(query: DashboardScopeQuery): string | undefined {
  return query.unionId ?? query.upazilaId ?? query.districtId ?? query.divisionId;
}

export async function resolveScopeContext(
  query: DashboardScopeQuery = {},
): Promise<ScopeContext> {
  const unitId = scopeUnitId(query);
  const ctx: ScopeContext = {
    unitId,
    divisionId: query.divisionId,
    districtId: query.districtId,
    upazilaId: query.upazilaId,
    unionId: query.unionId,
  };

  if (query.divisionId) {
    const div = await prismaRead.adminUnit.findUnique({
      where: { id: query.divisionId },
      select: { name: true, type: true },
    });
    if (div?.type === AdminUnitType.DIVISION) {
      ctx.divisionName = normalizeDivisionName(div.name);
    }
  }

  if (query.districtId) {
    const dist = await prismaRead.adminUnit.findUnique({
      where: { id: query.districtId },
      select: { name: true, divisionId: true, type: true },
    });
    if (dist) {
      ctx.districtName = dist.name;
      if (dist.divisionId) {
        const div = await prismaRead.adminUnit.findUnique({
          where: { id: dist.divisionId },
          select: { name: true },
        });
        ctx.divisionName = normalizeDivisionName(div?.name);
      }
    }
  }

  if (query.upazilaId && !ctx.divisionName) {
    const up = await prismaRead.adminUnit.findUnique({
      where: { id: query.upazilaId },
      select: { name: true, divisionId: true, districtId: true },
    });
    if (up?.divisionId) {
      const div = await prismaRead.adminUnit.findUnique({
        where: { id: up.divisionId },
        select: { name: true },
      });
      ctx.divisionName = normalizeDivisionName(div?.name);
    }
    if (up?.districtId) {
      const dist = await prismaRead.adminUnit.findUnique({
        where: { id: up.districtId },
        select: { name: true },
      });
      ctx.districtName = dist?.name;
    }
  }

  if (unitId && !ctx.divisionName && !ctx.districtName) {
    const unit = await prismaRead.adminUnit.findUnique({
      where: { id: unitId },
      select: { name: true, type: true, divisionId: true, districtId: true },
    });
    if (unit?.type === AdminUnitType.DIVISION) {
      ctx.divisionName = normalizeDivisionName(unit.name);
    } else if (unit?.type === AdminUnitType.DISTRICT) {
      ctx.districtName = unit.name;
    }
    if (unit?.divisionId) {
      const div = await prismaRead.adminUnit.findUnique({
        where: { id: unit.divisionId },
        select: { name: true },
      });
      ctx.divisionName = normalizeDivisionName(div?.name);
    }
    if (unit?.districtId && !ctx.districtName) {
      const dist = await prismaRead.adminUnit.findUnique({
        where: { id: unit.districtId },
        select: { name: true },
      });
      ctx.districtName = dist?.name;
    }
  }

  return ctx;
}

export function matchesScopeDivision(
  division: string | null | undefined,
  ctx: ScopeContext,
): boolean {
  if (!ctx.divisionName && !ctx.districtName) return true;
  if (ctx.divisionName && divisionNamesMatch(division, ctx.divisionName)) return true;
  return false;
}

export function matchesScopeDistrict(
  district: string | null | undefined,
  division: string | null | undefined,
  ctx: ScopeContext,
): boolean {
  if (!ctx.divisionName && !ctx.districtName) return true;

  if (ctx.districtName) {
    if (district) {
      const d = district.toLowerCase();
      const target = ctx.districtName.toLowerCase();
      if (d === target || d.includes(target) || target.includes(d)) return true;
    }
    if (ctx.divisionName && divisionNamesMatch(division, ctx.divisionName)) return true;
    return false;
  }

  if (ctx.divisionName) {
    return divisionNamesMatch(division, ctx.divisionName);
  }

  return true;
}
