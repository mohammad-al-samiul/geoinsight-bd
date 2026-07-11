"use client";

import { cn } from "@/lib/utils";
import { ScorecardSkeleton } from "@/components/ui/skeleton";
import { CompletionAreaChart } from "@/components/dashboard/completion-area-chart";
import { BudgetVarianceChart } from "@/components/dashboard/budget-variance-chart";
import { ArbitrageHeatmap } from "@/components/dashboard/arbitrage-heatmap";
import { TradeFlowMap } from "@/components/dashboard/trade-flow-map";
import type { DashboardMetrics } from "@/types/dashboard";
import { Globe2, Percent, Wallet } from "lucide-react";

interface KpiScorecardsProps {
  metrics: DashboardMetrics | null;
  loading: boolean;
  pulseKeys: Record<string, number>;
}

function ScorecardShell({
  label,
  value,
  sub,
  icon: Icon,
  children,
  pulseKey,
  contentClassName,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  pulseKey?: number;
  contentClassName?: string;
}) {
  return (
    <div
      className={cn(
        "glass-panel rounded-xl p-4 shadow-panel transition-all duration-300 hover:border-primary/25 sm:p-5 lg:p-6",
        pulseKey ? "animate-score-pulse ring-1 ring-primary/40" : "",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p
            className="mt-1.5 text-2xl font-bold tabular-nums text-foreground transition-all duration-500 sm:mt-2 sm:text-3xl"
            key={value}
          >
            {value}
          </p>
          {sub && (
            <p className="mt-1 truncate text-xs text-primary sm:whitespace-normal">
              {sub}
            </p>
          )}
        </div>
        <div className="shrink-0 rounded-lg bg-primary/10 p-2 sm:p-2.5">
          <Icon className="h-4 w-4 text-primary sm:h-5 sm:w-5" />
        </div>
      </div>
      <div className={cn("mt-4 sm:mt-5", contentClassName)}>{children}</div>
    </div>
  );
}

export function KpiScorecards({ metrics, loading, pulseKeys }: KpiScorecardsProps) {
  if (loading || !metrics) {
    return (
      <div className="grid grid-cols-1 gap-5">
        <ScorecardSkeleton />
        <ScorecardSkeleton />
        <ScorecardSkeleton />
      </div>
    );
  }

  const avgVariance =
    metrics.budgetVariance.reduce((s, b) => s + b.variance, 0) /
    metrics.budgetVariance.length;

  const topArbitrage = [...metrics.arbitrageMatrix].sort(
    (a, b) => b.marginPct - a.marginPct,
  )[0];

  return (
    <div className="grid grid-cols-1 gap-5">
      <ScorecardShell
        label="Project Completion Rate"
        value={`${metrics.completionRate}%`}
        sub="12-month rolling average"
        icon={Percent}
        pulseKey={pulseKeys.completion}
      >
        <CompletionAreaChart
          data={metrics.completionTrend}
          pulseKey={pulseKeys.completion}
        />
      </ScorecardShell>

      <ScorecardShell
        label="Budget Variance"
        value={`${avgVariance > 0 ? "+" : ""}${avgVariance.toFixed(1)}%`}
        sub="Planned vs. actual spend"
        icon={Wallet}
        pulseKey={pulseKeys.budget}
      >
        <BudgetVarianceChart
          data={metrics.budgetVariance}
          pulseKey={pulseKeys.budget}
        />
      </ScorecardShell>

      <ScorecardShell
        label="Global Arbitrage Matrix"
        value={topArbitrage ? `${topArbitrage.marginPct}%` : "—"}
        sub={
          topArbitrage
            ? `Peak: ${topArbitrage.commodity} → ${topArbitrage.market}`
            : "195-country feed"
        }
        icon={Globe2}
        pulseKey={pulseKeys.arbitrage}
        contentClassName="space-y-4 sm:space-y-5"
      >
        <TradeFlowMap
          flows={metrics.tradeFlows}
          matrixFallback={metrics.arbitrageMatrix}
          pulseKey={pulseKeys.arbitrage}
        />
        <div className="border-t border-border/50 pt-4 sm:pt-5">
          <ArbitrageHeatmap
            data={metrics.arbitrageMatrix}
            pulseKey={pulseKeys.arbitrage}
          />
        </div>
      </ScorecardShell>
    </div>
  );
}
