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
