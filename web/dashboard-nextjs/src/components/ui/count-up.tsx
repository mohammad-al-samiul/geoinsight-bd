"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { duration } from "@/lib/motion";

function parseDisplayNumber(raw: string): {
  prefix: string;
  n: number;
  suffix: string;
  decimals: number;
} | null {
  if (/:\d/.test(raw)) return null;
  const match = raw.match(/^(.*?)(-?\d[\d,]*(?:\.\d+)?)(.*)$/);
  if (!match) return null;
  const token = match[2];
  if (token.replace(/[,\d.-]/g, "").length) return null;
  const n = Number(token.replace(/,/g, ""));
  if (!Number.isFinite(n) || Math.abs(n) > 1_000_000) return null;
  const decimals = token.includes(".") ? (token.split(".")[1]?.length ?? 0) : 0;
  return { prefix: match[1], n, suffix: match[3], decimals };
}

function formatPart(n: number, decimals: number) {
  if (decimals > 0) return n.toFixed(decimals);
  return String(Math.round(n));
}

export function CountUp({
  value,
  className,
  ms,
}: {
  value: string | number;
  className?: string;
  /** Animation length in milliseconds. Defaults to chart duration (~550ms). */
  ms?: number;
}) {
  const reduce = useReducedMotion();
  const raw = String(value);
  const [shown, setShown] = useState(() => {
    const parsed = parseDisplayNumber(raw);
    if (!parsed) return raw;
    return `${parsed.prefix}${formatPart(0, parsed.decimals)}${parsed.suffix}`;
  });
  const fromRef = useRef<number | null>(null);
  const frameRef = useRef(0);

  useEffect(() => {
    const parsed = parseDisplayNumber(raw);
    if (!parsed || reduce) {
      setShown(raw);
      if (parsed) fromRef.current = parsed.n;
      return;
    }

    const from = fromRef.current ?? 0;
    const to = parsed.n;
    fromRef.current = to;
    if (from === to) {
      setShown(raw);
      return;
    }

    // duration.chartMs is already milliseconds (Recharts uses it as-is).
    const length = ms ?? duration.chartMs;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / length);
      const eased = 1 - (1 - t) ** 3;
      const current = from + (to - from) * eased;
      setShown(`${parsed.prefix}${formatPart(current, parsed.decimals)}${parsed.suffix}`);
      if (t < 1) frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [raw, reduce, ms]);

  return <span className={cn("tabular-nums", className)}>{shown}</span>;
}
