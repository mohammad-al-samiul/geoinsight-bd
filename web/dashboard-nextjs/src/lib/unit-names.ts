import { getUnitById } from "@/lib/admin-units";
import { formatUnitInline } from "@/lib/admin-labels";

export function resolveUnitName(unitId: string | null | undefined): string {
  if (!unitId) return "—";
  const unit = getUnitById(unitId);
  if (!unit) return unitId.slice(0, 8) + "…";
  return formatUnitInline(unit);
}
