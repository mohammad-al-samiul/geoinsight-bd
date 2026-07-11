"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Globe2 } from "lucide-react";
import { MapSkeleton } from "@/components/ui/skeleton";
import { buildTradeFlowsFromMatrix } from "@/lib/trade-flows";
import type { TradeFlow } from "@/types/dashboard";
import { cn } from "@/lib/utils";

const TradeFlowMapInner = dynamic(
  () =>
    import("@/components/dashboard/trade-flow-map-inner").then(
      (m) => m.TradeFlowMapInner,
    ),
  { ssr: false, loading: () => <MapSkeleton /> },
);

interface TradeFlowMapProps {
  flows: TradeFlow[];
  matrixFallback?: { commodity: string; market: string; marginPct: number }[];
  pulseKey?: number;
  className?: string;
}

export function TradeFlowMap({
  flows,
  matrixFallback = [],
  pulseKey,
  className,
}: TradeFlowMapProps) {
  const resolvedFlows = useMemo(
    () => (flows.length ? flows : buildTradeFlowsFromMatrix(matrixFallback)),
    [flows, matrixFallback],
  );

  const commodities = useMemo(
    () => [...new Set(resolvedFlows.map((f) => f.commodity))],
    [resolvedFlows],
  );

  const [selected, setSelected] = useState<string | null>(null);

  const topImport = resolvedFlows
    .filter((f) => f.flowType === "import")
    .sort((a, b) => a.landedCostUsd - b.landedCostUsd || b.marginPct - a.marginPct)[0];
  const topExport = resolvedFlows
    .filter((f) => f.flowType === "export")
    .sort((a, b) => b.marginPct - a.marginPct)[0];

  return (
    <div className={cn("space-y-3 sm:space-y-4", className)}>
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Globe2 className="h-3.5 w-3.5 shrink-0 text-primary" />
          <span>Import / Export corridors</span>
        </div>
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5 [scrollbar-width:thin]">
          <button
            type="button"
            onClick={() => setSelected(null)}
            className={cn(
              "shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-medium transition-colors sm:px-3 sm:text-xs",
              selected === null
                ? "border-primary/50 bg-primary/15 text-primary"
                : "border-border/60 text-muted-foreground hover:border-primary/30",
            )}
          >
            All
          </button>
          {commodities.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setSelected(c === selected ? null : c)}
              className={cn(
                "shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-medium transition-colors sm:px-3 sm:text-xs",
                selected === c
                  ? "border-primary/50 bg-primary/15 text-primary"
                  : "border-border/60 text-muted-foreground hover:border-primary/30",
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="relative h-[200px] overflow-hidden rounded-lg border border-border/50 sm:h-[260px] md:h-[300px] lg:h-[320px]">
        <TradeFlowMapInner
          flows={resolvedFlows}
          selectedCommodity={selected}
          pulseKey={pulseKey}
        />
      </div>

      <div className="space-y-2.5 text-[10px] text-muted-foreground sm:text-xs">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-2">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-5 shrink-0 rounded bg-emerald-400 sm:w-6" />
            <ArrowDownLeft className="h-3 w-3 shrink-0 text-emerald-400" />
            Cheap import source
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-5 shrink-0 rounded bg-amber-400 sm:w-6" />
            <ArrowUpRight className="h-3 w-3 shrink-0 text-amber-400" />
            High-price export market
          </span>
        </div>
        {(topImport || topExport) && (
          <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:gap-x-4">
            {topImport && (
              <span className="text-emerald-400/90">
                Best import: {topImport.countryName} ({topImport.commodity})
              </span>
            )}
            {topExport && (
              <span className="text-amber-400/90">
                Best export: {topExport.countryName} (+{topExport.marginPct}%)
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
