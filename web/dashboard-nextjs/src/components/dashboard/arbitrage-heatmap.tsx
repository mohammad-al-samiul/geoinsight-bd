"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { ArbitrageCell } from "@/types/dashboard";

interface ArbitrageHeatmapProps {
  data: ArbitrageCell[];
  pulseKey?: number;
  className?: string;
}

function marginColor(margin: number): string {
  if (margin >= 10) return "rgb(16 185 129)";
  if (margin >= 7) return "rgb(52 211 153)";
  if (margin >= 5) return "rgb(251 191 36)";
  if (margin >= 3) return "rgb(249 115 22)";
  return "rgb(239 68 68)";
}

function marginOpacity(margin: number): number {
  return Math.min(0.35 + margin / 20, 0.95);
}

export function ArbitrageHeatmap({
  data,
  pulseKey,
  className,
}: ArbitrageHeatmapProps) {
  const { commodities, markets, matrix } = useMemo(() => {
    const commodities = [...new Set(data.map((d) => d.commodity))];
    const markets = [...new Set(data.map((d) => d.market))];
    const matrix = new Map<string, number>();
    for (const cell of data) {
      matrix.set(`${cell.commodity}|${cell.market}`, cell.marginPct);
    }
    return { commodities, markets, matrix };
  }, [data]);

  return (
    <div
      className={cn(
        "transition-all duration-500",
        pulseKey ? "animate-score-pulse" : "",
        className,
      )}
      key={pulseKey}
    >
      <div className="h-[200px] w-full">
        <div className="mb-2 flex items-center gap-2 pl-16">
          {markets.map((m) => (
            <div
              key={m}
              className="flex-1 truncate text-center text-[10px] font-medium text-muted-foreground"
            >
              {m}
            </div>
          ))}
        </div>
        <div className="flex flex-1 flex-col gap-1">
          {commodities.map((commodity) => (
            <div key={commodity} className="flex flex-1 items-center gap-2">
              <span className="w-14 truncate text-[10px] text-muted-foreground">
                {commodity}
              </span>
              <div className="flex flex-1 gap-1">
                {markets.map((market) => {
                  const margin = matrix.get(`${commodity}|${market}`) ?? 0;
                  return (
                    <div
                      key={`${commodity}-${market}`}
                      className="group relative flex flex-1 items-center justify-center rounded transition-transform duration-300 hover:scale-105"
                      style={{
                        backgroundColor: marginColor(margin),
                        opacity: marginOpacity(margin),
                        minHeight: "28px",
                      }}
                      title={`${commodity} → ${market}: ${margin}%`}
                    >
                      <span className="text-[9px] font-semibold text-white/90">
                        {margin > 0 ? `${margin}%` : "—"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between text-[10px] text-muted-foreground">
        <span>Low margin</span>
        <div className="flex gap-1">
          {[2, 5, 8, 12].map((v) => (
            <div
              key={v}
              className="h-2 w-6 rounded-sm"
              style={{ backgroundColor: marginColor(v), opacity: marginOpacity(v) }}
            />
          ))}
        </div>
        <span>High arbitrage</span>
      </div>
    </div>
  );
}
