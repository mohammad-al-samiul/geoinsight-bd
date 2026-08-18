"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Children } from "react";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import { useLiveSpark } from "@/hooks/use-live-spark";
import { chartLayout, piePercentLabel } from "@/lib/chart-theme";
import { cn } from "@/lib/utils";
import { MotionSection } from "@/components/ui/module-motion";
import { CountUp } from "@/components/ui/count-up";
import { enterDelay, hoverLift, itemFade, staggerContainer, tapPress, useChartMotion } from "@/lib/motion";

export const LOCAL_VIZ_COLORS = [
  "#38bdf8",
  "#34d399",
  "#fbbf24",
  "#f87171",
  "#a78bfa",
  "#fb7185",
  "#2dd4bf",
  "#60a5fa",
] as const;

export type LocalSlice = { name: string; value: number; color?: string };

export function LocalVizCard({
  title,
  icon: Icon,
  children,
  className,
  delay = 0,
  action,
}: {
  title: string;
  icon?: LucideIcon;
  children: ReactNode;
  className?: string;
  delay?: number;
  action?: ReactNode;
}) {
  return (
    <MotionSection delay={delay} className={cn("glass-panel min-w-0 rounded-xl p-3 shadow-panel sm:p-4", className)}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {Icon ? <Icon className="h-4 w-4 text-primary" /> : null}
          <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </MotionSection>
  );
}

export function LocalDonut({
  data,
  height,
}: {
  data: LocalSlice[];
  height?: number;
}) {
  const bp = useBreakpoint();
  const layout = chartLayout(bp);
  const chartMotion = useChartMotion();
  const rows = data.filter((d) => d.value > 0);
  const empty = rows.length === 0;

  return (
    <div style={{ height: height ?? layout.pieChartHeight }} className="chart-box">
      {empty ? (
        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
          —
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart margin={layout.pieMargin}>
            <Pie
              data={rows}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={layout.pieInner}
              outerRadius={layout.pieOuter}
              paddingAngle={2}
              stroke="rgba(15,23,42,0.55)"
              strokeWidth={2}
              label={(props) =>
                piePercentLabel({
                  ...props,
                  fontSize: layout.pieFontSize,
                  offset: layout.pieLabelOffset,
                  showName: layout.showPieNames,
                })
              }
              labelLine={false}
              isAnimationActive={chartMotion.isAnimationActive}
              animationDuration={chartMotion.animationDuration}
            >
              {rows.map((row, i) => (
                <Cell
                  key={row.name}
                  fill={row.color ?? LOCAL_VIZ_COLORS[i % LOCAL_VIZ_COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: "rgba(15,23,42,0.95)",
                border: "1px solid rgba(148,163,184,0.25)",
                borderRadius: 10,
                fontSize: 12,
              }}
            />
            <Legend wrapperStyle={layout.legend} />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export function LocalBars({
  data,
  dataKey = "value",
  nameKey = "name",
  color = LOCAL_VIZ_COLORS[0],
  height,
  layoutDir = "vertical",
}: {
  data: Array<Record<string, string | number>>;
  dataKey?: string;
  nameKey?: string;
  color?: string;
  height?: number;
  layoutDir?: "vertical" | "horizontal";
}) {
  const bp = useBreakpoint();
  const layout = chartLayout(bp);
  const chartMotion = useChartMotion();
  const h = height ?? layout.chartHeightSm;

  return (
    <div style={{ height: h }} className="chart-box">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout={layoutDir === "horizontal" ? "vertical" : "horizontal"}
          margin={{ top: 8, right: 12, left: 4, bottom: 8 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
          {layoutDir === "horizontal" ? (
            <>
              <XAxis type="number" tick={layout.tickMuted} />
              <YAxis
                type="category"
                dataKey={nameKey}
                width={layout.yAxisCategoryWidth}
                tick={layout.tick}
              />
            </>
          ) : (
            <>
              <XAxis dataKey={nameKey} tick={layout.tickMuted} interval={0} angle={-20} textAnchor="end" height={56} />
              <YAxis tick={layout.tickMuted} width={layout.yAxisNumberWidth} />
            </>
          )}
          <Tooltip
            contentStyle={{
              background: "rgba(15,23,42,0.95)",
              border: "1px solid rgba(148,163,184,0.25)",
              borderRadius: 10,
              fontSize: 12,
            }}
          />
          <Bar
            dataKey={dataKey}
            fill={color}
            radius={layoutDir === "horizontal" ? [0, 6, 6, 0] : [6, 6, 0, 0]}
            maxBarSize={layout.barMaxSize}
            isAnimationActive={chartMotion.isAnimationActive}
            animationDuration={chartMotion.animationDuration}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function LocalAreaTrend({
  data,
  dataKey = "value",
  nameKey = "name",
  color = LOCAL_VIZ_COLORS[0],
  height,
}: {
  data: Array<Record<string, string | number>>;
  dataKey?: string;
  nameKey?: string;
  color?: string;
  height?: number;
}) {
  const bp = useBreakpoint();
  const layout = chartLayout(bp);
  const chartMotion = useChartMotion();
  const h = height ?? layout.chartHeightSm;
  const gradId = `local-area-${dataKey}`;

  return (
    <div style={{ height: h }} className="chart-box">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.45} />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
          <XAxis dataKey={nameKey} tick={layout.tickMuted} />
          <YAxis tick={layout.tickMuted} width={layout.yAxisNumberWidth} />
          <Tooltip
            contentStyle={{
              background: "rgba(15,23,42,0.95)",
              border: "1px solid rgba(148,163,184,0.25)",
              borderRadius: 10,
              fontSize: 12,
            }}
          />
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            fill={`url(#${gradId})`}
            strokeWidth={2.5}
            isAnimationActive={chartMotion.isAnimationActive}
            animationDuration={chartMotion.animationDuration}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function LocalQuickNav({
  items,
}: {
  items: Array<{
    href: string;
    label: string;
    hint?: string;
    icon: LucideIcon;
  }>;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item, i) => {
        const Icon = item.icon;
        return (
          <motion.div
            key={item.href}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={enterDelay(i)}
            whileHover={hoverLift}
            whileTap={tapPress}
          >
            <Link
              href={item.href}
              className="group flex h-full items-start gap-3 rounded-xl border border-border/60 bg-gradient-to-br from-secondary/40 to-secondary/10 p-4 shadow-panel transition hover:border-primary/40 hover:from-primary/15"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary transition group-hover:bg-primary/20">
                <Icon className="h-5 w-5" />
              </span>
              <span>
                <span className="block text-sm font-semibold text-foreground">{item.label}</span>
                {item.hint ? (
                  <span className="mt-1 block text-[11px] text-muted-foreground">{item.hint}</span>
                ) : null}
              </span>
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}

export function LocalPulseRing({
  value,
  label,
  max = 100,
}: {
  value: number;
  label: string;
  max?: number;
}) {
  const pct = Math.max(0, Math.min(100, Math.round((value / max) * 100)));
  const r = 42;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="110" height="110" viewBox="0 0 110 110" className="drop-shadow">
        <circle
          cx="55"
          cy="55"
          r={r}
          fill="none"
          stroke="rgba(148,163,184,0.18)"
          strokeWidth="10"
        />
        <motion.circle
          cx="55"
          cy="55"
          r={r}
          fill="none"
          stroke="#38bdf8"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          transform="rotate(-90 55 55)"
        />
        <text
          x="55"
          y="58"
          textAnchor="middle"
          className="fill-foreground text-lg font-bold"
          style={{ fontSize: 18, fontWeight: 700 }}
        >
          {pct}%
        </text>
      </svg>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

export function LocalSparkline({
  values,
  color = LOCAL_VIZ_COLORS[0],
  height = 36,
  width = 120,
}: {
  values: number[];
  color?: string;
  height?: number;
  width?: number;
}) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pts = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * width;
      const y = height - ((v - min) / range) * (height - 6) - 3;
      return `${x},${y}`;
    })
    .join(" ");
  const area = `0,${height} ${pts} ${width},${height}`;
  const gradId = `spark-${color.replace("#", "")}-${values.length}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="overflow-visible"
      aria-hidden
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.35} />
          <stop offset="100%" stopColor={color} stopOpacity={0.02} />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${gradId})`} />
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function LocalKpiSpark({
  label,
  value,
  hint,
  base,
  color = LOCAL_VIZ_COLORS[0],
  accent = "default",
  liveLabel = "live",
}: {
  label: string;
  value: string | number;
  hint?: string;
  base: number;
  color?: string;
  accent?: "default" | "success" | "warning" | "danger";
  liveLabel?: string;
}) {
  const series = useLiveSpark(base);
  const tone =
    accent === "danger"
      ? "text-red-400"
      : accent === "warning"
        ? "text-amber-400"
        : accent === "success"
          ? "text-emerald-400"
          : "text-foreground";

  return (
    <motion.div
      whileHover={hoverLift}
      className="glass-panel min-w-0 rounded-xl border border-border/50 p-3 shadow-panel sm:p-4"
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
      <div className="mt-2 flex items-end justify-between gap-3">
        <div>
          <p className={cn("font-display text-xl font-semibold tabular-nums sm:text-2xl", tone)}>
            <CountUp value={value} />
          </p>
          {hint ? (
            <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>
          ) : null}
        </div>
        <LocalSparkline values={series} color={color} />
      </div>
      <p className="mt-2 text-[10px] uppercase tracking-wider text-muted-foreground/80">
        {liveLabel}
      </p>
    </motion.div>
  );
}

export function LocalKpiSparkGrid({ children }: { children: ReactNode }) {
  return (
    <motion.div
      className="grid min-w-0 grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4"
      variants={staggerContainer}
      initial="hidden"
      animate="show"
    >
      {Children.map(children, (child) => (
        <motion.div variants={itemFade} className="min-w-0">
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
}
