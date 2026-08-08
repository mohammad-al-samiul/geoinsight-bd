import type { CSSProperties, ReactNode } from "react";
import type { Breakpoint } from "@/hooks/use-breakpoint";

/** Shared Recharts typography — large enough to read on command panels. */
export const CHART_TICK: { fill: string; fontSize: number; fontWeight: number } = {
  fill: "hsl(210 24% 82%)",
  fontSize: 13,
  fontWeight: 600,
};

export const CHART_TICK_MUTED: { fill: string; fontSize: number; fontWeight: number } = {
  fill: "hsl(215 16% 68%)",
  fontSize: 12,
  fontWeight: 500,
};

export const CHART_LEGEND_STYLE: CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: "#e2e8f0",
  paddingTop: 12,
};

export const CHART_LABEL_LIST_STYLE: CSSProperties = {
  fill: "#f1f5f9",
  fontSize: 13,
  fontWeight: 700,
};

const ORDER: Breakpoint[] = ["base", "sm", "md", "lg", "xl", "2xl"];

function atLeast(bp: Breakpoint, min: Breakpoint): boolean {
  return ORDER.indexOf(bp) >= ORDER.indexOf(min);
}

/** Responsive axis / pie geometry for Recharts. */
export function chartLayout(bp: Breakpoint) {
  const narrow = !atLeast(bp, "sm");
  const tablet = atLeast(bp, "sm") && !atLeast(bp, "lg");

  return {
    narrow,
    tablet,
    tick: {
      ...CHART_TICK,
      fontSize: narrow ? 11 : 13,
    } as typeof CHART_TICK,
    tickMuted: {
      ...CHART_TICK_MUTED,
      fontSize: narrow ? 10 : 12,
    } as typeof CHART_TICK_MUTED,
    legend: {
      ...CHART_LEGEND_STYLE,
      fontSize: narrow ? 11 : 13,
    } as CSSProperties,
    labelList: {
      ...CHART_LABEL_LIST_STYLE,
      fontSize: narrow ? 11 : 13,
    } as CSSProperties,
    yAxisCategoryWidth: narrow ? 72 : tablet ? 110 : 160,
    yAxisNumberWidth: narrow ? 36 : 48,
    chartHeightSm: narrow ? 220 : tablet ? 280 : 320,
    chartHeightMd: narrow ? 260 : tablet ? 320 : 380,
    chartHeightLg: narrow ? 280 : tablet ? 360 : 440,
    areaHeightClass: narrow ? "h-56" : tablet ? "h-72" : "h-80",
    pieInner: narrow ? 42 : tablet ? 56 : 68,
    pieOuter: narrow ? 68 : tablet ? 88 : 108,
    pieLabelOffset: narrow ? 16 : 28,
    pieFontSize: narrow ? 12 : 15,
    showPieNames: atLeast(bp, "md"),
    showSecondaryYAxis: atLeast(bp, "sm"),
    barMaxSize: narrow ? 28 : 44,
  };
}

/** Outside pie/donut percentage labels */
export function piePercentLabel(props: {
  cx?: number;
  cy?: number;
  midAngle?: number;
  innerRadius?: number;
  outerRadius?: number;
  percent?: number;
  name?: string;
  showName?: boolean;
  fontSize?: number;
  offset?: number;
}): ReactNode {
  const {
    cx = 0,
    cy = 0,
    midAngle = 0,
    outerRadius = 0,
    percent = 0,
    name,
    showName = false,
    fontSize = 15,
    offset = 28,
  } = props;
  const pct = Math.round(percent * 100);
  if (pct < 3) return null;

  const RADIAN = Math.PI / 180;
  const radius = outerRadius + offset;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  const text = showName && name ? `${name} ${pct}%` : `${pct}%`;

  return (
    <text
      x={x}
      y={y}
      fill="#f8fafc"
      textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central"
      fontSize={fontSize}
      fontWeight={800}
      style={{ textShadow: "0 1px 4px rgba(0,0,0,0.65)" }}
    >
      {text}
    </text>
  );
}

export function formatPct(value: number, digits = 0): string {
  return `${value.toFixed(digits)}%`;
}

/** Truncate long category labels for narrow Y axes. */
export function truncateLabel(label: string, max = 14): string {
  if (label.length <= max) return label;
  return `${label.slice(0, max - 1)}…`;
}
