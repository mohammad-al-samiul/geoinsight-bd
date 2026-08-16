"use client";

import { motion } from "framer-motion";
import { useAdminHierarchy } from "@/hooks/use-admin-hierarchy";
import { cn } from "@/lib/utils";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IntelCard } from "@/components/ui/intel-card";
import { AnimatedContent, ModulePageAura } from "@/components/ui/module-motion";
import { ModuleContentSkeleton } from "@/components/ui/skeleton";
import { useTranslations } from "next-intl";
import { Children, memo, type ReactNode } from "react";

interface ModuleShellProps {
  title: string;
  description: string;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  stats?: ReactNode;
  children: ReactNode;
  /** Optional custom progressive placeholder (defaults to ModuleContentSkeleton). */
  loadingFallback?: ReactNode;
  /** @deprecated Kept for call-site compatibility; progressive skeletons replaced cinematic copy. */
  loadingLabel?: string;
}

export function ModuleShell({
  title,
  description,
  loading,
  error,
  onRetry,
  stats,
  children,
  loadingFallback,
}: ModuleShellProps) {
  useAdminHierarchy();
  const t = useTranslations("common");

  return (
    <div className="relative mx-auto max-w-7xl space-y-5 sm:space-y-7">
      <ModulePageAura />

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="surface-hero intel-rail relative z-10 px-3 py-5 sm:px-5 sm:py-6"
      >
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="pl-3">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary/80">
              GeoInsight · Command
            </p>
            <h1 className="font-display text-xl font-semibold tracking-tight sm:text-2xl lg:text-3xl">
              {title}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          </div>
          {onRetry && (
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Button variant="outline" size="sm" onClick={onRetry} className="gap-2 self-start sm:self-auto">
                <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
                {t("refresh")}
              </Button>
            </motion.div>
          )}
        </div>
      </motion.div>

      {error && (
        <motion.div
          role="alert"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 flex flex-col gap-3 rounded-xl border border-destructive/35 bg-destructive/10 p-4 text-sm text-destructive sm:flex-row sm:items-start"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="flex-1">
            <p className="font-medium">{t("loadFailed")}</p>
            <p className="mt-1 text-destructive/80">{error}</p>
          </div>
          {onRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="shrink-0 gap-2 border-destructive/40 text-destructive hover:bg-destructive/10"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              {t("refresh")}
            </Button>
          )}
        </motion.div>
      )}

      {stats && !loading ? <div className="relative z-10">{stats}</div> : null}

      <div className="relative z-10">
        {loading ? (
          (loadingFallback ?? <ModuleContentSkeleton />)
        ) : (
          <AnimatedContent>{children}</AnimatedContent>
        )}
      </div>
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
    <IntelCard accent={intelAccent} className="!p-4" hoverLift={false} float={false} shimmer={false}>
      <div className="flex items-start justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </p>
        {icon && <div className="text-muted-foreground/50">{icon}</div>}
      </div>
      <motion.p
        key={String(value)}
        className={cn(
          "mt-2.5 font-display text-2xl font-semibold tabular-nums tracking-tight",
          ACCENT[accent],
        )}
        initial={{ opacity: 0, scale: 0.86, y: 6 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        {value}
      </motion.p>
      {hint && <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{hint}</p>}
    </IntelCard>
  );
}

export function StatGrid({ children }: { children: ReactNode }) {
  const items = Children.toArray(children);
  return (
    <div className="grid min-w-0 grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map((child, i) => (
        <motion.div
          key={i}
          className="relative isolate min-w-0 overflow-hidden rounded-xl"
          initial={{ opacity: 0, y: 16, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{
            delay: i * 0.07,
            duration: 0.45,
            ease: [0.22, 1, 0.36, 1],
          }}
          whileHover={{ y: -4, scale: 1.02, transition: { duration: 0.2 } }}
        >
          {child}
        </motion.div>
      ))}
    </div>
  );
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

interface DataTableRowProps<T extends { id?: string }> {
  row: T;
  index: number;
  columns: DataTableProps<T>["columns"];
  onRowClick?: (row: T) => void;
}

function DataTableRowInner<T extends { id?: string }>({
  row,
  index,
  columns,
  onRowClick,
}: DataTableRowProps<T>) {
  const clickable = Boolean(onRowClick);

  return (
    <motion.tr
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.5), duration: 0.35 }}
      className={cn(
        "border-b border-border/30 transition-colors",
        clickable
          ? "cursor-pointer hover:bg-primary/5 focus-visible:bg-primary/10 focus-visible:outline-none"
          : "hover:bg-secondary/25",
      )}
      tabIndex={clickable ? 0 : undefined}
      onClick={clickable ? () => onRowClick?.(row) : undefined}
      onKeyDown={
        clickable
          ? (event: React.KeyboardEvent) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onRowClick?.(row);
              }
            }
          : undefined
      }
    >
      {columns.map((col) => (
        <td key={col.key} data-label={col.label} className="px-4 py-3.5 align-top">
          {col.render
            ? col.render(row)
            : String((row as Record<string, unknown>)[col.key] ?? "—")}
        </td>
      ))}
    </motion.tr>
  );
}

// Rows only re-render when their own data or column config changes.
const DataTableRow = memo(DataTableRowInner) as typeof DataTableRowInner;

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
    <div className="glass-panel min-w-0 overflow-hidden rounded-xl">
      <div className="min-w-0 overflow-x-auto overscroll-x-contain md:overflow-x-auto">
        <table className="data-table-stack w-full min-w-0 text-sm md:min-w-[36rem] lg:min-w-full">
          <thead>
            <tr className="border-b border-border/50 bg-secondary/25 text-left text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              {columns.map((col) => (
                <th key={col.key} scope="col" className="px-4 py-3.5 font-semibold">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <DataTableRow
                key={row.id ?? i}
                row={row}
                index={i}
                columns={columns}
                onRowClick={onRowClick}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
