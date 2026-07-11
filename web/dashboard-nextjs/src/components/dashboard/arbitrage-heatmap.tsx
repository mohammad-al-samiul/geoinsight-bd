"use client";

import { Fragment, useMemo } from "react";
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

  if (!commodities.length || !markets.length) {
    return (
      <div
        className={cn(
          "flex min-h-[120px] items-center justify-center rounded-lg border border-dashed border-border/50 bg-muted/10 px-4 text-center text-xs text-muted-foreground",
          className,
        )}
      >
        No arbitrage matrix data for this scope
      </div>
    );
  }

  const gridMinWidth = 88 + markets.length * 68;

  return (
    <div
      className={cn(
        "transition-all duration-500",
        pulseKey ? "animate-score-pulse" : "",
        className,
      )}
      key={pulseKey}
    >
      <p className="mb-2 text-xs font-medium text-muted-foreground sm:mb-3">
        Margin by commodity &amp; source market
      </p>

      <div className="-mx-1 overflow-x-auto px-1 pb-1 [scrollbar-width:thin]">
        <div style={{ minWidth: `min(100%, ${gridMinWidth}px)` }}>
          <div
            className="grid gap-1 sm:gap-1.5"
            style={{
              gridTemplateColumns: `minmax(4.5rem, auto) repeat(${markets.length}, minmax(3.25rem, 1fr))`,
            }}
          >
            <div className="h-8 sm:h-9" aria-hidden />
            {markets.map((m) => (
              <div
                key={m}
                className="flex h-8 items-end justify-center px-0.5 pb-1 text-center text-[10px] font-medium leading-tight text-muted-foreground sm:h-9 sm:text-xs"
                title={m}
              >
                <span className="line-clamp-2">{m}</span>
              </div>
            ))}

            {commodities.map((commodity) => (
              <Fragment key={commodity}>
                <div
                  className="flex items-center pr-2 text-[10px] text-muted-foreground sm:text-xs"
                  title={commodity}
                >
                  <span className="line-clamp-2">{commodity}</span>
                </div>
                {markets.map((market) => {
                  const margin = matrix.get(`${commodity}|${market}`) ?? 0;
                  return (
                    <div
                      key={`${commodity}-${market}`}
                      className="flex min-h-[2rem] items-center justify-center rounded px-0.5 transition-transform duration-300 hover:scale-[1.03] sm:min-h-[2.25rem]"
                      style={{
                        backgroundColor: marginColor(margin),
                        opacity: marginOpacity(margin),
                      }}
                      title={`${commodity} → ${market}: ${margin}%`}
                    >
                      <span className="text-[9px] font-semibold text-white/90 sm:text-[10px]">
                        {margin > 0 ? `${margin}%` : "—"}
                      </span>
                    </div>
                  );
                })}
              </Fragment>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-2 text-[10px] text-muted-foreground sm:mt-4 sm:flex-row sm:items-center sm:justify-between sm:text-xs">
        <span>Low margin</span>
        <div className="flex flex-wrap gap-1">
          {[2, 5, 8, 12].map((v) => (
            <div
              key={v}
              className="h-2 w-5 rounded-sm sm:w-6"
              style={{
                backgroundColor: marginColor(v),
                opacity: marginOpacity(v),
              }}
            />
          ))}
        </div>
        <span className="sm:text-right">High arbitrage</span>
      </div>
    </div>
  );
}
