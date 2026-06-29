"use client";

import { AdminCascadeFilter } from "@/components/filters/admin-cascade-filter";
import { useAdminHierarchy } from "@/hooks/use-admin-hierarchy";
import { ScorecardSkeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ReactNode } from "react";

interface ModuleShellProps {
  title: string;
  description: string;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  stats?: ReactNode;
  children: ReactNode;
}

export function ModuleShell({
  title,
  description,
  loading,
  error,
  onRetry,
  stats,
  children,
}: ModuleShellProps) {
  useAdminHierarchy();

  return (
    <div className="mx-auto max-w-7xl animate-fade-in space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry} className="gap-2">
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        )}
      </div>

      <AdminCascadeFilter variant="glass" />

      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">Could not load data</p>
            <p className="mt-1 text-destructive/80">{error}</p>
          </div>
        </div>
      )}

      {stats}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <ScorecardSkeleton key={i} />
          ))}
        </div>
      ) : (
        children
      )}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  hint?: string;
  accent?: "default" | "success" | "warning" | "danger";
}

const ACCENT: Record<NonNullable<StatCardProps["accent"]>, string> = {
  default: "text-foreground",
  success: "text-emerald-400",
  warning: "text-amber-400",
  danger: "text-red-400",
};

export function StatCard({ label, value, hint, accent = "default" }: StatCardProps) {
  return (
    <div className="glass-panel rounded-xl p-4 shadow-panel">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={cn("mt-2 text-2xl font-bold tabular-nums", ACCENT[accent])}>{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function StatGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{children}</div>;
}

interface DataTableProps<T extends { id?: string }> {
  columns: {
    key: string;
    label: string;
    render?: (row: T) => ReactNode;
  }[];
  rows: T[];
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
}

export function DataTable<T extends { id?: string }>({
  columns,
  rows,
  emptyMessage = "No records found.",
  onRowClick,
}: DataTableProps<T>) {
  if (rows.length === 0) {
    return (
      <div className="glass-panel rounded-xl p-8 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="glass-panel overflow-hidden rounded-xl shadow-panel">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/60 bg-secondary/30 text-left text-xs uppercase tracking-wider text-muted-foreground">
              {columns.map((col) => (
                <th key={col.key} className="px-4 py-3 font-semibold">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={row.id ?? i}
                className={cn(
                  "border-b border-border/40 transition-colors",
                  onRowClick ? "cursor-pointer hover:bg-primary/5" : "hover:bg-secondary/20",
                )}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3">
                    {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? "—")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
