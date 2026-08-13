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
    // Keep the ring small enough that outside labels stay inside the SVG box
    pieInner: narrow ? 36 : tablet ? 48 : 58,
    pieOuter: narrow ? 58 : tablet ? 74 : 88,
    pieLabelOffset: narrow ? 14 : 20,
    pieFontSize: narrow ? 12 : 14,
    /** Full names belong in the legend — outside labels are % only (avoids clip). */
    showPieNames: false,
    pieMargin: {
      top: narrow ? 20 : 28,
      right: narrow ? 28 : 40,
      bottom: narrow ? 8 : 12,
      left: narrow ? 28 : 40,
    },
    pieChartHeight: narrow ? 280 : tablet ? 320 : 360,
    showSecondaryYAxis: atLeast(bp, "sm"),
    barMaxSize: narrow ? 28 : 44,
  };
}

/** Outside pie/donut percentage labels — kept short so they never clip the card. */
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
  /** Soft clamp so labels stay inside the plot (defaults from Recharts viewBox). */
  viewBox?: { x?: number; y?: number; width?: number; height?: number };
}): ReactNode {
  const {
    cx = 0,
    cy = 0,
    midAngle = 0,
    outerRadius = 0,
    percent = 0,
    name,
    showName = false,
    fontSize = 14,
    offset = 20,
    viewBox,
  } = props;
  const pct = Math.round(percent * 100);
  if (pct < 3) return null;

  const RADIAN = Math.PI / 180;
  const radius = outerRadius + offset;
  let x = cx + radius * Math.cos(-midAngle * RADIAN);
  let y = cy + radius * Math.sin(-midAngle * RADIAN);

  // Prefer short "%"-only labels; names live in Legend to avoid "MEDIU"/"OW" clipping
  const text =
    showName && name
      ? `${name.length > 8 ? `${name.slice(0, 7)}…` : name} ${pct}%`
      : `${pct}%`;

  const pad = 10;
  if (viewBox?.width != null && viewBox?.height != null) {
    const minX = (viewBox.x ?? 0) + pad;
    const maxX = (viewBox.x ?? 0) + viewBox.width - pad;
    const minY = (viewBox.y ?? 0) + pad;
    const maxY = (viewBox.y ?? 0) + viewBox.height - pad;
    x = Math.min(maxX, Math.max(minX, x));
    y = Math.min(maxY, Math.max(minY, y));
  }

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

/** Word-wrap chart labels (no ellipsis) — used for radar axis ticks. */
export function wrapChartLabel(
  label: string,
  maxCharsPerLine = 12,
  maxLines = 3,
): string[] {
  const text = label.trim();
  if (!text) return [""];
  if (text.length <= maxCharsPerLine) return [text];

  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  const push = (chunk: string) => {
    if (!chunk) return;
    if (lines.length >= maxLines) {
      lines[maxLines - 1] = `${lines[maxLines - 1]} ${chunk}`.trim();
      return;
    }
    lines.push(chunk);
  };

  for (const word of words) {
    if (!current) {
      if (word.length <= maxCharsPerLine) {
        current = word;
      } else {
        // Hard-wrap long tokens across lines without dropping characters
        let rest = word;
        while (rest.length > maxCharsPerLine) {
          push(rest.slice(0, maxCharsPerLine));
          rest = rest.slice(maxCharsPerLine);
        }
        current = rest;
      }
      continue;
    }
    const next = `${current} ${word}`;
    if (next.length <= maxCharsPerLine) {
      current = next;
    } else {
      push(current);
      current = word.length <= maxCharsPerLine ? word : word.slice(0, maxCharsPerLine);
      if (word.length > maxCharsPerLine) {
        let rest = word.slice(maxCharsPerLine);
        while (rest.length > 0) {
          const take = rest.slice(0, maxCharsPerLine);
          rest = rest.slice(maxCharsPerLine);
          if (rest.length === 0) current = take;
          else push(take);
        }
      }
    }
  }
  if (current) push(current);

  // Flatten overflow from the last-line merge if we exceeded maxLines during hard wrap
  if (lines.length > maxLines) {
    const head = lines.slice(0, maxLines - 1);
    const tail = lines.slice(maxLines - 1).join(" ");
    return [...head, tail];
  }
  return lines.length ? lines : [text];
}

/** Multi-line PolarAngleAxis tick — shows the full label without "…". */
export function RadarAngleTick(props: {
  payload?: { value?: string };
  x?: number;
  y?: number;
  cx?: number;
  cy?: number;
  textAnchor?: string;
  fill?: string;
  fontSize?: number;
  maxCharsPerLine?: number;
  maxLines?: number;
}): ReactNode {
  const {
    payload,
    x = 0,
    y = 0,
    cy,
    textAnchor = "middle",
    fill = "#cbd5e1",
    fontSize = 11,
    maxCharsPerLine = 12,
    maxLines = 4,
  } = props;
  const lines = wrapChartLabel(String(payload?.value ?? ""), maxCharsPerLine, maxLines);
  const lineHeight = fontSize + 2;
  // Prefer shifting upward when above the chart center; otherwise start just below the tip
  const aboveCenter = cy == null ? textAnchor === "middle" && y < 180 : y < cy;
  const startDy = aboveCenter ? -((lines.length - 1) * lineHeight) / 2 : 2;

  return (
    <text
      x={x}
      y={y + startDy}
      textAnchor={textAnchor as "start" | "middle" | "end"}
      fill={fill}
      fontSize={fontSize}
      fontWeight={600}
      style={{ textShadow: "0 1px 3px rgba(0,0,0,0.55)" }}
    >
      {lines.map((line, i) => (
        <tspan key={`${i}-${line}`} x={x} dy={i === 0 ? 0 : lineHeight}>
          {line}
        </tspan>
      ))}
    </text>
  );
}
