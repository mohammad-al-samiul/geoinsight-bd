"use client";

import { cn } from "@/lib/utils";
import { ScorecardSkeleton } from "@/components/ui/skeleton";
import { CompletionAreaChart } from "@/components/dashboard/completion-area-chart";
import { BudgetVarianceChart } from "@/components/dashboard/budget-variance-chart";
import { ArbitrageHeatmap } from "@/components/dashboard/arbitrage-heatmap";
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
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  pulseKey?: number;
}) {
  return (
    <div
      className={cn(
        "glass-panel rounded-xl p-5 shadow-panel transition-all duration-300 hover:border-primary/25",
        pulseKey ? "animate-score-pulse ring-1 ring-primary/40" : "",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p
            className="mt-2 text-3xl font-bold tabular-nums text-foreground transition-all duration-500"
            key={value}
          >
            {value}
          </p>
          {sub && <p className="mt-1 text-xs text-primary">{sub}</p>}
        </div>
        <div className="rounded-lg bg-primary/10 p-2.5">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

export function KpiScorecards({ metrics, loading, pulseKeys }: KpiScorecardsProps) {
  if (loading || !metrics) {
    return (
      <div className="grid gap-4 lg:grid-cols-3">
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
    <div className="grid gap-4 lg:grid-cols-3">
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
      >
        <ArbitrageHeatmap
          data={metrics.arbitrageMatrix}
          pulseKey={pulseKeys.arbitrage}
        />
      </ScorecardShell>
    </div>
  );
}
