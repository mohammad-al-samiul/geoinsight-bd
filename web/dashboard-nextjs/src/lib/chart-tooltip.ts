import type { CSSProperties } from "react";

/** Glass tooltip — readable on dark command panels, no flat gray chrome. */
export const CHART_TOOLTIP_CONTENT_STYLE: CSSProperties = {
  background: "linear-gradient(165deg, rgba(15, 23, 42, 0.96), rgba(8, 15, 30, 0.94))",
  border: "1px solid rgba(56, 189, 248, 0.28)",
  borderRadius: 12,
  fontSize: 13,
  lineHeight: 1.45,
  color: "#f1f5f9",
  boxShadow:
    "0 12px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04) inset, 0 0 24px rgba(14, 165, 233, 0.08)",
  padding: "10px 12px",
  backdropFilter: "blur(10px)",
};

export const CHART_TOOLTIP_LABEL_STYLE: CSSProperties = {
  color: "#f8fafc",
  fontWeight: 700,
  fontSize: 13,
  marginBottom: 6,
  letterSpacing: "0.01em",
};

export const CHART_TOOLTIP_ITEM_STYLE: CSSProperties = {
  color: "#cbd5e1",
  fontSize: 12,
  fontWeight: 600,
};

/**
 * Replaces Recharts’ default muddy gray hover band with a soft sky wash.
 * Works for bar (band) and line/area (vertical guide) tooltips.
 */
export const CHART_TOOLTIP_CURSOR = {
  fill: "hsla(199, 92%, 60%, 0.10)",
  stroke: "hsla(199, 92%, 70%, 0.35)",
  strokeWidth: 1,
  radius: 6,
} as const;

export const chartTooltipProps = {
  contentStyle: CHART_TOOLTIP_CONTENT_STYLE,
  labelStyle: CHART_TOOLTIP_LABEL_STYLE,
  itemStyle: CHART_TOOLTIP_ITEM_STYLE,
  cursor: CHART_TOOLTIP_CURSOR,
  wrapperStyle: { outline: "none", zIndex: 40 },
  animationDuration: 180,
} as const;
