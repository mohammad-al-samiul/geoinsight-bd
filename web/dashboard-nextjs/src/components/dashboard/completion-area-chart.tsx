"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";
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
  const gradientId = useMemo(() => `completion-${pulseKey ?? 0}`, [pulseKey]);

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
        <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(158 64% 42%)" stopOpacity={0.45} />
              <stop offset="100%" stopColor="hsl(158 64% 42%)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 28% 16%)" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fill: "hsl(215 18% 58%)", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[60, 100]}
            tick={{ fill: "hsl(215 18% 58%)", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip
            contentStyle={{
              background: "hsl(222 44% 9%)",
              border: "1px solid hsl(217 28% 16%)",
              borderRadius: "8px",
              fontSize: "12px",
            }}
            formatter={(value: number) => [`${value}%`, "Completion"]}
          />
          <Area
            type="monotone"
            dataKey="rate"
            stroke="hsl(158 64% 42%)"
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            animationDuration={800}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
