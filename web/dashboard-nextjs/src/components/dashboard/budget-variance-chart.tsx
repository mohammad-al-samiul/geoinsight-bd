"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";
import { chartTooltipProps } from "@/lib/chart-tooltip";
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
  return (
    <div
      className={cn(
        "h-52 w-full transition-all duration-500 sm:h-56",
        pulseKey ? "animate-score-pulse" : "",
        className,
      )}
      key={pulseKey}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 8, left: 4, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 28% 16%)" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fill: "hsl(215 18% 58%)", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v}%`}
          />
          <YAxis
            type="category"
            dataKey="project"
            width={140}
            tick={{ fill: "hsl(215 18% 58%)", fontSize: 11 }}
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
          />
          <Bar dataKey="variance" radius={[0, 4, 4, 0]} animationDuration={800}>
            {data.map((entry) => (
              <Cell key={entry.project} fill={varianceColor(entry.variance)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
