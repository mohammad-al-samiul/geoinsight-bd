import { cn } from "@/lib/utils";

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn("skeleton-shimmer rounded-md bg-muted/60", className)}
      {...props}
    />
  );
}

export function ScorecardSkeleton() {
  return (
    <div role="status" aria-label="Loading" className="glass-panel rounded-xl p-5 shadow-panel">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-3 w-32" />
        </div>
        <Skeleton className="h-10 w-10 rounded-lg" />
      </div>
      <Skeleton className="mt-4 h-36 w-full rounded-lg" />
    </div>
  );
}

export function MapSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading map"
      className="glass-panel flex h-full min-h-[220px] flex-col overflow-hidden rounded-xl shadow-panel sm:min-h-[320px]"
    >
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-6 w-24 rounded-full" />
      </div>
      <Skeleton className="m-4 flex-1 rounded-lg" />
      <div className="flex gap-2 border-t border-border/60 px-4 py-3">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
}

export function HeatmapSkeleton() {
  return (
    <div role="status" aria-label="Loading" className="glass-panel rounded-xl p-5 shadow-panel">
      <Skeleton className="h-4 w-48" />
      <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-5">
        {Array.from({ length: 20 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square rounded" />
        ))}
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 6, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div role="status" aria-label="Loading table" className="glass-panel overflow-hidden rounded-xl shadow-panel">
      <div className="flex gap-4 border-b border-border/60 px-5 py-3.5">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-3.5 flex-1" />
        ))}
      </div>
      <div className="divide-y divide-border/40">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex gap-4 px-5 py-4">
            {Array.from({ length: columns }).map((_, c) => (
              <Skeleton
                key={c}
                className="h-3.5 flex-1"
                style={{ animationDelay: `${r * 60}ms` }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ListSkeleton({ items = 5 }: { items?: number }) {
  return (
    <div role="status" aria-label="Loading" className="space-y-3">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="glass-panel flex items-center gap-4 rounded-xl p-4 shadow-panel">
          <Skeleton className="h-10 w-10 shrink-0 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}

/** Progressive in-layout module placeholder — SaaS pattern, never full-screen. */
export function ModuleContentSkeleton() {
  return (
    <div role="status" aria-label="Loading content" className="space-y-5 animate-fade-in">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="glass-panel rounded-xl p-4">
            <Skeleton className="h-2.5 w-16" />
            <Skeleton className="mt-3 h-7 w-20" />
            <Skeleton className="mt-2 h-3 w-28" />
          </div>
        ))}
      </div>
      <TableSkeleton rows={5} columns={4} />
    </div>
  );
}

/** Soft route transition inside the dashboard chrome (keeps shell visible). */
export function RouteSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading page"
      className="mx-auto max-w-7xl space-y-5 animate-fade-in"
    >
      <div className="surface-hero intel-rail relative px-3 py-5 sm:px-5 sm:py-6">
        <Skeleton className="h-2.5 w-28" />
        <Skeleton className="mt-3 h-8 w-56 sm:w-72" />
        <Skeleton className="mt-3 h-4 w-full max-w-xl" />
      </div>
      <ModuleContentSkeleton />
    </div>
  );
}

/** Home command viewport skeleton — map + KPI cards. */
export function DashboardViewportSkeleton() {
  return (
    <div role="status" aria-label="Loading dashboard" className="mx-auto max-w-[1600px] space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-52 sm:w-64" />
          <Skeleton className="h-4 w-40" />
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <div className="h-[260px] sm:h-[360px] lg:h-[480px]">
        <MapSkeleton />
      </div>
      <div className="grid grid-cols-1 gap-5">
        <ScorecardSkeleton />
        <ScorecardSkeleton />
        <ScorecardSkeleton />
      </div>
    </div>
  );
}
