"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";
import { chartTooltipProps } from "@/lib/chart-tooltip";
import { chartLayout } from "@/lib/chart-theme";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import type { CompletionTrendPoint } from "@/types/dashboard";

interface CompletionAreaChartProps {
  data: CompletionTrendPoint[];
  pulseKey?: number;
  className?: string;
}

export function CompletionAreaChart({
  data,
  pulseKey,
  className,
}: CompletionAreaChartProps) {
  const bp = useBreakpoint();
  const layout = chartLayout(bp);
  const gradientId = useMemo(() => `completion-${pulseKey ?? 0}`, [pulseKey]);

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
        <AreaChart
          data={data}
          margin={{
            top: layout.narrow ? 12 : 18,
            right: layout.narrow ? 8 : 16,
            left: 0,
            bottom: 4,
          }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(158 64% 42%)" stopOpacity={0.45} />
              <stop offset="100%" stopColor="hsl(158 64% 42%)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 28% 16%)" vertical={false} />
          <XAxis
            dataKey="month"
            tick={layout.tick}
            axisLine={false}
            tickLine={false}
            interval={layout.narrow ? "preserveStartEnd" : 0}
          />
          <YAxis
            domain={[60, 100]}
            tick={layout.tick}
            axisLine={false}
            tickLine={false}
            width={layout.yAxisNumberWidth}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip
            {...chartTooltipProps}
            formatter={(value: number) => [`${value}%`, "Completion"]}
          />
          <Area
            type="monotone"
            dataKey="rate"
            stroke="hsl(158 64% 42%)"
            strokeWidth={layout.narrow ? 2 : 3}
            fill={`url(#${gradientId})`}
            animationDuration={550}
            animationEasing="ease-out"
          >
            {!layout.narrow && (
              <LabelList
                dataKey="rate"
                position="top"
                formatter={(v: number) => `${v}%`}
                style={layout.labelList}
              />
            )}
          </Area>
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
