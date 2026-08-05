"use client";

import { motion } from "framer-motion";
import { useAdminHierarchy } from "@/hooks/use-admin-hierarchy";
import { ScorecardSkeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IntelCard } from "@/components/ui/intel-card";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("common");

  return (
    <div className="mx-auto max-w-7xl animate-rise space-y-7">
      <div className="surface-hero intel-rail px-5 py-5 sm:px-7 sm:py-6">
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="pl-3">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary/80">
              GeoInsight · Command
            </p>
            <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
              {title}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          </div>
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry} className="gap-2 self-start sm:self-auto">
              <RefreshCw className="h-3.5 w-3.5" />
              {t("refresh")}
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-destructive/35 bg-destructive/10 p-4 text-sm text-destructive animate-fade-in">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">{t("loadFailed")}</p>
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
        <div className="animate-rise-delay-1 space-y-6">{children}</div>
      )}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  hint?: string;
  accent?: "default" | "success" | "warning" | "danger";
  icon?: ReactNode;
}

const ACCENT: Record<NonNullable<StatCardProps["accent"]>, string> = {
  default: "text-foreground",
  success: "text-emerald-400",
  warning: "text-amber-400",
  danger: "text-red-400",
};

export function StatCard({ label, value, hint, accent = "default", icon }: StatCardProps) {
  const intelAccent =
    accent === "danger"
      ? "danger"
      : accent === "warning"
        ? "warning"
        : accent === "success"
          ? "success"
          : "default";

  return (
    <IntelCard accent={intelAccent} className="!p-4">
      <div className="flex items-start justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </p>
        {icon && <div className="text-muted-foreground/50">{icon}</div>}
      </div>
      <motion.p
        className={cn(
          "mt-2.5 font-display text-2xl font-semibold tabular-nums tracking-tight",
          ACCENT[accent],
        )}
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        {value}
      </motion.p>
      {hint && <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{hint}</p>}
    </IntelCard>
  );
}

export function StatGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{children}</div>;
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
  emptyMessage,
  onRowClick,
}: DataTableProps<T>) {
  const t = useTranslations("common");
  const empty = emptyMessage ?? t("noData");
  if (rows.length === 0) {
    return (
      <div className="glass-panel rounded-xl p-10 text-center text-sm text-muted-foreground">
        {empty}
      </div>
    );
  }

  return (
    <div className="glass-panel overflow-hidden rounded-xl">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50 bg-secondary/25 text-left text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              {columns.map((col) => (
                <th key={col.key} className="px-4 py-3.5 font-semibold">
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
                  "border-b border-border/30 transition-colors",
                  onRowClick ? "cursor-pointer hover:bg-primary/5" : "hover:bg-secondary/25",
                )}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3.5">
                    {col.render
                      ? col.render(row)
                      : String((row as Record<string, unknown>)[col.key] ?? "—")}
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
