"use client";

import dynamic from "next/dynamic";
import { MapPin, Radio } from "lucide-react";
import type { AdminFilterState } from "@/types";
import type { AgroMarketRow } from "@/lib/module-types";
import { MapSkeleton } from "@/components/ui/skeleton";

const AgroMarketsMapInner = dynamic(
  () =>
    import("@/components/agro/agro-markets-map-inner").then(
      (module) => module.AgroMarketsMapInner,
    ),
  { ssr: false, loading: () => <MapSkeleton /> },
);

const MARKET_COLOR: Record<string, string> = {
  WHOLESALE: "#10b981",
  RETAIL: "#38bdf8",
  HAAT: "#f59e0b",
  MANDI: "#a78bfa",
};

export function AgroMarketsMap({
  filter,
  markets,
}: {
  filter: AdminFilterState;
  markets: AgroMarketRow[];
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5 text-emerald-300">
          <Radio className="h-3.5 w-3.5" /> লাইভ বাজার মূল্য
        </span>
        {[
          ["WHOLESALE", "পাইকারি"],
          ["RETAIL", "খুচরা"],
          ["HAAT", "হাট"],
          ["MANDI", "মাণ্ডি"],
        ].map(([type, label]) => (
          <span key={type} className="inline-flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-full ring-2 ring-background"
              style={{ backgroundColor: MARKET_COLOR[type] }}
            />
            {label}
          </span>
        ))}
        <span className="ml-auto inline-flex items-center gap-1">
          <MapPin className="h-3.5 w-3.5 text-primary" />
          {markets.length} বাজার
        </span>
      </div>
      <div className="relative h-[240px] overflow-hidden rounded-xl border border-emerald-500/20 bg-background/40 shadow-panel sm:h-[340px] lg:h-[460px]">
        <AgroMarketsMapInner filter={filter} markets={markets} />
      </div>
    </div>
  );
}
