"use client";

import { getChildren, getBreadcrumb } from "@/lib/admin-units";
import { useAdminFilter } from "@/hooks/use-admin-filter";
import { useAuth } from "@/hooks/use-auth";
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

interface CascadeSelectProps {
  label: string;
  placeholder: string;
  value: string | null;
  options: { id: string; name: string; nameBn?: string }[];
  onChange: (id: string | null) => void;
  disabled?: boolean;
}

function CascadeSelect({
  label,
  placeholder,
  value,
  options,
  onChange,
  disabled,
}: CascadeSelectProps) {
  return (
    <div className="flex min-w-[140px] flex-1 flex-col gap-1.5 sm:min-w-[160px]">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <Select
        value={value ?? "__all__"}
        onValueChange={(v) => onChange(v === "__all__" ? null : v)}
        disabled={disabled}
      >
        <SelectTrigger className="h-9 border-command-border bg-command/50">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">— All —</SelectItem>
          {options.map((o) => (
            <SelectItem key={o.id} value={o.id}>
              <span>{o.name}</span>
              {o.nameBn && (
                <span className="ml-1 text-muted-foreground">({o.nameBn})</span>
              )}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function AdminCascadeFilter({ className }: { className?: string }) {
  const { filter, isPending, setDivision, setDistrict, setUpazila, setUnion, clearFilter, isFiltered } =
    useAdminFilter();
  const user = useAuth();

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
        "glass-panel animate-slide-in rounded-lg p-3 shadow-panel sm:p-4",
        isPending && "opacity-70",
        className,
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <MapPin className="h-4 w-4 text-primary" />
          Administrative Scope
        </div>
        {isFiltered && (
          <Button variant="ghost" size="sm" onClick={clearFilter} className="h-7 text-xs">
            <RotateCcw className="mr-1 h-3 w-3" />
            Reset
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <CascadeSelect
          label="Division"
          placeholder="Select division"
          value={filter.divisionId}
          options={divisions}
          onChange={setDivision}
          disabled={roleLocked === "division" || roleLocked === "district" || roleLocked === "union"}
        />
        <ChevronRight className="hidden h-4 w-4 shrink-0 self-end pb-2.5 text-muted-foreground sm:block" />
        <CascadeSelect
          label="District"
          placeholder="Select district"
          value={filter.districtId}
          options={districts}
          onChange={setDistrict}
          disabled={!filter.divisionId || roleLocked === "district" || roleLocked === "union"}
        />
        <ChevronRight className="hidden h-4 w-4 shrink-0 self-end pb-2.5 text-muted-foreground sm:block" />
        <CascadeSelect
          label="Upazila"
          placeholder="Select upazila"
          value={filter.upazilaId}
          options={upazilas}
          onChange={setUpazila}
          disabled={!filter.districtId || roleLocked === "union"}
        />
        <ChevronRight className="hidden h-4 w-4 shrink-0 self-end pb-2.5 text-muted-foreground sm:block" />
        <CascadeSelect
          label="Union"
          placeholder="Select union"
          value={filter.unionId}
          options={unions}
          onChange={setUnion}
          disabled={!filter.upazilaId}
        />
      </div>

      {breadcrumb.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1 border-t border-border/50 pt-3 text-xs text-muted-foreground">
          <span className="font-medium text-primary">Active:</span>
          {breadcrumb.map((unit, i) => (
            <span key={unit.id} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-3 w-3" />}
              <span className="text-foreground">{unit.name}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
