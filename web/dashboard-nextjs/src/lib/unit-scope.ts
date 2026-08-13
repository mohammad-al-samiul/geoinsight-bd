import type { AdminFilterState } from "@/types";

export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUnitId(id: string | null | undefined): id is string {
  return Boolean(id && UUID_RE.test(id));
}

export function activeUnitId(filter: AdminFilterState): string | undefined {
  const id =
    filter.unionId ??
    filter.upazilaId ??
    filter.districtId ??
    filter.divisionId ??
    undefined;
  return isValidUnitId(id) ? id : undefined;
}

export function unitQuery(filter: AdminFilterState): string {
  const id = activeUnitId(filter);
  if (!id) return "";
  return `?unitId=${encodeURIComponent(id)}`;
}

export function unitSearchParams(
  filter: AdminFilterState,
  base: Record<string, string> = {},
): URLSearchParams {
  const params = new URLSearchParams(base);
  const id = activeUnitId(filter);
  if (id) params.set("unitId", id);
  return params;
}

/** Division/district/upazila/union query string used by national intel endpoints. */
export function adminScopeQuery(
  filter: AdminFilterState,
  base: Record<string, string> = {},
): string {
  const params = new URLSearchParams(base);
  if (filter.divisionId) params.set("divisionId", filter.divisionId);
  if (filter.districtId) params.set("districtId", filter.districtId);
  if (filter.upazilaId) params.set("upazilaId", filter.upazilaId);
  if (filter.unionId) params.set("unionId", filter.unionId);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function appendAdminScope(
  params: URLSearchParams,
  filter: AdminFilterState,
): URLSearchParams {
  if (filter.divisionId) params.set("divisionId", filter.divisionId);
  if (filter.districtId) params.set("districtId", filter.districtId);
  if (filter.upazilaId) params.set("upazilaId", filter.upazilaId);
  if (filter.unionId) params.set("unionId", filter.unionId);
  return params;
}
