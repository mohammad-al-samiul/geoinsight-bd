"use client";

import { useEffect, useState } from "react";

/** Deterministic seed series so SSR/hydration stay stable before the live tick. */
export function seedSparkSeries(base: number, points = 14): number[] {
  const safe = Number.isFinite(base) ? Math.max(0, base) : 0;
  if (safe === 0) return Array.from({ length: points }, () => 0);
  const out: number[] = [];
  let v = safe * 0.86;
  for (let i = 0; i < points; i += 1) {
    const wave = Math.sin(i * 0.7 + safe * 0.03) * Math.max(1.2, safe * 0.06);
    v = Math.max(0, safe * 0.75 + wave + (i / points) * safe * 0.2);
    out.push(Math.round(v * 10) / 10);
  }
  out[out.length - 1] = Math.round(safe * 10) / 10;
  return out;
}

/**
 * Live KPI sparkline series — nudges every few seconds around the current base.
 */
export function useLiveSpark(base: number, points = 14, intervalMs = 2800) {
  const [series, setSeries] = useState(() => seedSparkSeries(base, points));

  useEffect(() => {
    setSeries(seedSparkSeries(base, points));
  }, [base, points]);

  useEffect(() => {
    if (!Number.isFinite(base) || base <= 0) return;
    const id = window.setInterval(() => {
      setSeries((prev) => {
        const last = prev[prev.length - 1] ?? base;
        const jitter =
          (Math.random() - 0.42) * Math.max(1.5, Math.abs(base) * 0.07 || 2);
        const next = Math.max(0, last * 0.72 + base * 0.28 + jitter);
        return [...prev.slice(1), Math.round(next * 10) / 10];
      });
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [base, intervalMs]);

  return series;
}
