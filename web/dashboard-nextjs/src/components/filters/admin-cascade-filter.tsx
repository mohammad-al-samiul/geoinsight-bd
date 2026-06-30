"use client";

import { getChildren, getBreadcrumb } from "@/lib/admin-units";
import { formatUnitInline, formatUnitOptionLabel } from "@/lib/admin-labels";
import { useAdminFilter } from "@/hooks/use-admin-filter";
import { useAdminHierarchy } from "@/hooks/use-admin-hierarchy";
import { useAuth } from "@/hooks/use-auth";
import { useAppLang } from "@/hooks/use-app-lang";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronRight, MapPin, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import type { AdminUnit } from "@/types";

interface CascadeSelectProps {
  label: string;
  placeholder: string;
  value: string | null;
  options: AdminUnit[];
  onChange: (id: string | null) => void;
  disabled?: boolean;
}

function UnitOptionLabel({ unit }: { unit: Pick<AdminUnit, "name" | "nameBn"> }) {
  const locale = useAppLang();
  const { primary, secondary } = formatUnitOptionLabel(unit, locale);
  if (!secondary) {
    return <span className="truncate">{primary}</span>;
  }
  return (
    <span className="flex min-w-0 flex-col gap-0.5 leading-tight">
      <span className="truncate font-medium">{primary}</span>
      <span className="truncate font-bengali text-xs text-muted-foreground">{secondary}</span>
    </span>
  );
}

function CascadeSelect({
  label,
  placeholder,
  value,
  options,
  onChange,
  disabled,
}: CascadeSelectProps) {
  const tc = useTranslations("common");
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:min-w-[150px] sm:max-w-[200px]">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <Select
        value={value ?? "__all__"}
        onValueChange={(v) => onChange(v === "__all__" ? null : v)}
        disabled={disabled}
      >
        <SelectTrigger className="h-10 border-command-border bg-card">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">
            <span className="text-muted-foreground">{tc("all")}</span>
          </SelectItem>
          {options.map((o) => (
            <SelectItem key={o.id} value={o.id}>
              <UnitOptionLabel unit={o} />
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

interface AdminCascadeFilterProps {
  className?: string;
  /** Solid panel for sticky command bar; glass for in-page modules */
  variant?: "solid" | "glass";
}

export function AdminCascadeFilter({
  className,
  variant = "solid",
}: AdminCascadeFilterProps) {
  const { filter, isPending, setDivision, setDistrict, setUpazila, setUnion, clearFilter, isFiltered } =
    useAdminFilter();
  const { ready } = useAdminHierarchy();
  const user = useAuth();
  const locale = useAppLang();
  const t = useTranslations("filters");

  const divisions = getChildren(null, "DIVISION");
  const districts = filter.divisionId ? getChildren(filter.divisionId, "DISTRICT") : [];
  const upazilas = filter.districtId ? getChildren(filter.districtId, "UPAZILA") : [];
  const unions = filter.upazilaId ? getChildren(filter.upazilaId, "UNION") : [];
  const breadcrumb = getBreadcrumb(filter);

  const roleLocked =
    user.role === "UNION_CHAIRMAN"
      ? "union"
      : user.role === "DC"
        ? "district"
        : user.role === "MINISTER"
          ? "division"
          : null;

  return (
    <div
      className={cn(
        "animate-slide-in rounded-lg p-3 sm:p-4",
        variant === "glass"
          ? "glass-panel shadow-panel"
          : "border border-command-border/60 bg-card shadow-sm",
        isPending && "opacity-70",
        !ready && "opacity-60",
        className,
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <MapPin className="h-4 w-4 shrink-0 text-primary" />
          {t("title")}
        </div>
        {isFiltered && (
          <Button variant="ghost" size="sm" onClick={clearFilter} className="h-7 shrink-0 text-xs">
            <RotateCcw className="mr-1 h-3 w-3" />
            {t("reset")}
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <CascadeSelect
          label={t("division")}
          placeholder={t("allDivisions")}
          value={filter.divisionId}
          options={divisions}
          onChange={setDivision}
          disabled={roleLocked === "division" || roleLocked === "district" || roleLocked === "union"}
        />
        <ChevronRight className="hidden h-4 w-4 shrink-0 self-end pb-3 text-muted-foreground sm:block" />
        <CascadeSelect
          label={t("district")}
          placeholder={t("allDistricts")}
          value={filter.districtId}
          options={districts}
          onChange={setDistrict}
          disabled={!filter.divisionId || roleLocked === "district" || roleLocked === "union"}
        />
        <ChevronRight className="hidden h-4 w-4 shrink-0 self-end pb-3 text-muted-foreground sm:block" />
        <CascadeSelect
          label={t("upazila")}
          placeholder={t("allUpazilas")}
          value={filter.upazilaId}
          options={upazilas}
          onChange={setUpazila}
          disabled={!filter.districtId || roleLocked === "union"}
        />
        <ChevronRight className="hidden h-4 w-4 shrink-0 self-end pb-3 text-muted-foreground sm:block" />
        <CascadeSelect
          label={t("union")}
          placeholder={t("allUnions")}
          value={filter.unionId}
          options={unions}
          onChange={setUnion}
          disabled={!filter.upazilaId}
        />
      </div>

      {breadcrumb.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1 border-t border-border/50 pt-3 text-xs text-muted-foreground">
          <span className="font-medium text-primary">{t("active")}:</span>
          {breadcrumb.map((unit, i) => (
            <span key={unit.id} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-3 w-3" />}
              <span className="text-foreground">{formatUnitInline(unit, locale)}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
