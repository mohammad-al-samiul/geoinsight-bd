import type { AdminFilterState, AdminUnitType } from "@/types";

export function getActiveUnitId(filter: AdminFilterState): string | null {
  return (
    filter.unionId ??
    filter.upazilaId ??
    filter.districtId ??
    filter.divisionId
  );
}

export function getDrillChildType(filter: AdminFilterState): AdminUnitType {
  if (!filter.divisionId) return "DIVISION";
  if (!filter.districtId) return "DISTRICT";
  if (!filter.upazilaId) return "UPAZILA";
  return "UNION";
}

export function getDrillParentId(filter: AdminFilterState): string | null {
  const childType = getDrillChildType(filter);
  switch (childType) {
    case "DIVISION":
      return null;
    case "DISTRICT":
      return filter.divisionId;
    case "UPAZILA":
      return filter.districtId;
    case "UNION":
      return filter.upazilaId;
    default:
      return null;
  }
}
