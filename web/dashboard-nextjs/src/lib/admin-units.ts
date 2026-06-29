import type { AdminUnit } from "@/types";
import { getCachedAdminUnits, loadAdminHierarchy } from "@/lib/admin-hierarchy";

/** Fallback sample nodes when API hierarchy is not yet loaded. */
const FALLBACK_UNITS: AdminUnit[] = [];

export async function ensureAdminUnits(): Promise<AdminUnit[]> {
  const loaded = await loadAdminHierarchy();
  return loaded.length > 0 ? loaded : FALLBACK_UNITS;
}

export function getChildren(parentId: string | null, type: AdminUnit["type"]): AdminUnit[] {
  const units = getCachedAdminUnits();
  return units.filter((u) => u.parentId === parentId && u.type === type);
}

export function getUnitById(id: string | null): AdminUnit | undefined {
  if (!id) return undefined;
  return getCachedAdminUnits().find((u) => u.id === id);
}

/** Walk parent chain from a unit up to division. */
export function getAncestorFilter(unitId: string): {
  divisionId: string | null;
  districtId: string | null;
  upazilaId: string | null;
  unionId: string | null;
} {
  const result = {
    divisionId: null as string | null,
    districtId: null as string | null,
    upazilaId: null as string | null,
    unionId: null as string | null,
  };

  let current = getUnitById(unitId);
  while (current) {
    switch (current.type) {
      case "DIVISION":
        result.divisionId = current.id;
        break;
      case "DISTRICT":
        result.districtId = current.id;
        break;
      case "UPAZILA":
        result.upazilaId = current.id;
        break;
      case "UNION":
        result.unionId = current.id;
        break;
    }
    current = current.parentId ? getUnitById(current.parentId) : undefined;
  }

  return result;
}

export function getBreadcrumb(filter: {
  divisionId: string | null;
  districtId: string | null;
  upazilaId: string | null;
  unionId: string | null;
}): AdminUnit[] {
  return [
    filter.divisionId,
    filter.districtId,
    filter.upazilaId,
    filter.unionId,
  ]
    .map(getUnitById)
    .filter((u): u is AdminUnit => Boolean(u));
}
