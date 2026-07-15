import type { CSSProperties } from "react";

/** Dark-theme Recharts tooltip — keeps label + value readable on navy panels. */
export const CHART_TOOLTIP_CONTENT_STYLE: CSSProperties = {
  background: "#0f172a",
  border: "1px solid #334155",
  borderRadius: 8,
  fontSize: 12,
  color: "#f1f5f9",
  boxShadow: "0 8px 24px rgba(0,0,0,0.45)",
};

export const CHART_TOOLTIP_LABEL_STYLE: CSSProperties = {
  color: "#f8fafc",
  fontWeight: 600,
  marginBottom: 4,
};

export const CHART_TOOLTIP_ITEM_STYLE: CSSProperties = {
  color: "#e2e8f0",
};

export const chartTooltipProps = {
  contentStyle: CHART_TOOLTIP_CONTENT_STYLE,
  labelStyle: CHART_TOOLTIP_LABEL_STYLE,
  itemStyle: CHART_TOOLTIP_ITEM_STYLE,
} as const;
