"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";
import { chartTooltipProps } from "@/lib/chart-tooltip";
import { chartLayout, truncateLabel } from "@/lib/chart-theme";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import type { BudgetVariancePoint } from "@/types/dashboard";

interface BudgetVarianceChartProps {
  data: BudgetVariancePoint[];
  pulseKey?: number;
  className?: string;
}

function varianceColor(variance: number): string {
  if (variance > 10) return "#ef4444";
  if (variance > 0) return "#f97316";
  if (variance > -5) return "#34d399";
  return "#10b981";
}

export function BudgetVarianceChart({
  data,
  pulseKey,
  className,
}: BudgetVarianceChartProps) {
  const bp = useBreakpoint();
  const layout = chartLayout(bp);
  const chartData = data.map((d) => ({
    ...d,
    projectShort: truncateLabel(d.project, layout.narrow ? 10 : layout.tablet ? 16 : 28),
  }));

  return (
    <div
      className={cn(
        "w-full transition-all duration-500",
        layout.areaHeightClass,
        pulseKey ? "animate-score-pulse" : "",
        className,
      )}
      key={pulseKey}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{
            top: 8,
            right: layout.narrow ? 36 : 48,
            left: 4,
            bottom: 4,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 28% 16%)" horizontal={false} />
          <XAxis
            type="number"
            tick={layout.tick}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v}%`}
          />
          <YAxis
            type="category"
            dataKey="projectShort"
            width={layout.yAxisCategoryWidth}
            tick={layout.tick}
            axisLine={false}
            tickLine={false}
          />
          <ReferenceLine x={0} stroke="hsl(217 28% 22%)" />
          <Tooltip
            {...chartTooltipProps}
            formatter={(value: number, _name, item) => {
              const row = item.payload as BudgetVariancePoint;
              return [
                `${value}% (৳${row.actual}M / ৳${row.planned}M)`,
                "Variance",
              ];
            }}
            labelFormatter={(_, payload) => {
              const row = payload?.[0]?.payload as BudgetVariancePoint | undefined;
              return row?.project ?? "";
            }}
          />
          <Bar
            dataKey="variance"
            radius={[0, 6, 6, 0]}
            animationDuration={550}
            maxBarSize={layout.narrow ? 18 : 28}
          >
            {chartData.map((entry) => (
              <Cell key={entry.project} fill={varianceColor(entry.variance)} />
            ))}
            <LabelList
              dataKey="variance"
              position="right"
              formatter={(v: number) => `${v}%`}
              style={layout.labelList}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
