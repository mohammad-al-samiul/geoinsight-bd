import type { Prisma } from "@prisma/client";

/** Match entities scoped to a division, district, upazila, union, or exact unit. */
export function adminUnitScopeWhere(unitId: string): Prisma.AdminUnitWhereInput {
  return {
    OR: [
      { id: unitId },
      { divisionId: unitId },
      { districtId: unitId },
      { upazilaId: unitId },
      { parentId: unitId },
    ],
  };
}

export function projectUnitScopeWhere(unitId: string): Prisma.ProjectWhereInput {
  return { adminUnit: adminUnitScopeWhere(unitId) };
}

export function representativeUnitScopeWhere(unitId: string): Prisma.RepresentativeWhereInput {
  return {
    OR: [{ adminUnitId: unitId }, { adminUnit: adminUnitScopeWhere(unitId) }],
  };
}

export function agroMarketUnitScopeWhere(unitId: string): Prisma.AgroMarketWhereInput {
  return {
    OR: [{ adminUnitId: unitId }, { adminUnit: adminUnitScopeWhere(unitId) }],
  };
}
