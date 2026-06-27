import { cn } from "@/lib/utils";

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted/60", className)}
      {...props}
    />
  );
}

export function ScorecardSkeleton() {
  return (
    <div className="glass-panel rounded-xl p-5 shadow-panel">
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
    <div className="glass-panel flex h-full min-h-[320px] flex-col overflow-hidden rounded-xl shadow-panel">
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
    <div className="glass-panel rounded-xl p-5 shadow-panel">
      <Skeleton className="h-4 w-48" />
      <div className="mt-4 grid grid-cols-5 gap-2">
        {Array.from({ length: 20 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square rounded" />
        ))}
      </div>
    </div>
  );
}
