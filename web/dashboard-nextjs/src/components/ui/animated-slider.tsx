"use client";

import { useId, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface AnimatedSliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  /** 0–1 unit → show as %; bipolar → show signed % with center fill */
  format?: "percent" | "signedPercent" | "raw";
  /** Multiply display when format is percent (e.g. 0.4 → 40%) */
  displayScale?: number;
  index?: number;
  className?: string;
}

export function AnimatedSlider({
  label,
  value,
  onChange,
  min = 0,
  max = 1,
  step = 0.05,
  format = "percent",
  displayScale = 100,
  index = 0,
  className,
}: AnimatedSliderProps) {
  const id = useId();
  const [dragging, setDragging] = useState(false);
  const bipolar = min < 0 && max > 0;

  const pct = useMemo(() => {
    const span = max - min || 1;
    return Math.max(0, Math.min(100, ((value - min) / span) * 100));
  }, [value, min, max]);

  const centerPct = useMemo(() => {
    if (!bipolar) return 0;
    const span = max - min || 1;
    return ((0 - min) / span) * 100;
  }, [bipolar, min, max]);

  const fillStyle = useMemo(() => {
    if (!bipolar) {
      return { left: "0%", width: `${pct}%` };
    }
    const left = Math.min(centerPct, pct);
    const width = Math.abs(pct - centerPct);
    return { left: `${left}%`, width: `${width}%` };
  }, [bipolar, centerPct, pct]);

  const display = useMemo(() => {
    if (format === "signedPercent") {
      const n = value;
      return `${n > 0 ? "+" : ""}${n}%`;
    }
    if (format === "raw") return String(value);
    return `${Math.round(value * displayScale)}%`;
  }, [format, value, displayScale]);

  const tone =
    bipolar && value < 0
      ? "from-amber-500 via-orange-400 to-red-400"
      : "from-emerald-500 via-teal-400 to-cyan-300";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.04 + index * 0.05, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={cn("group space-y-2", className)}
    >
      <div className="flex items-end justify-between gap-3">
        <label htmlFor={id} className="text-xs font-medium text-muted-foreground">
          {label}
        </label>
        <motion.span
          key={display}
          initial={{ opacity: 0.4, y: 2 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-display text-sm font-semibold tabular-nums tracking-tight text-primary"
        >
          {display}
        </motion.span>
      </div>

      <div className="relative h-8 touch-none select-none">
        {/* Track */}
        <div className="absolute left-0 right-0 top-1/2 h-2 -translate-y-1/2 overflow-hidden rounded-full bg-secondary/80 shadow-inner">
          {bipolar && (
            <div
              className="absolute top-0 h-full w-px bg-foreground/25"
              style={{ left: `${centerPct}%` }}
            />
          )}
          <motion.div
            className={cn("absolute top-0 h-full rounded-full bg-gradient-to-r", tone)}
            animate={fillStyle}
            transition={{ type: "spring", stiffness: 280, damping: 28 }}
          />
        </div>

        {/* Thumb glow */}
        <motion.div
          className="pointer-events-none absolute top-1/2 z-[1] h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/30 blur-md"
          animate={{ left: `${pct}%`, scale: dragging ? 1.4 : 1 }}
          transition={{ type: "spring", stiffness: 320, damping: 26 }}
        />

        {/* Visible thumb */}
        <motion.div
          className={cn(
            "pointer-events-none absolute top-1/2 z-[2] h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/80 bg-gradient-to-br from-emerald-300 to-teal-500 shadow-glow",
            dragging && "ring-2 ring-primary/40",
          )}
          animate={{ left: `${pct}%`, scale: dragging ? 1.15 : 1 }}
          transition={{ type: "spring", stiffness: 320, damping: 26 }}
          whileHover={{ scale: 1.12 }}
        />

        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          aria-label={label}
          onPointerDown={() => setDragging(true)}
          onPointerUp={() => setDragging(false)}
          onPointerCancel={() => setDragging(false)}
          onChange={(e) => onChange(Number(e.target.value))}
          className="intel-range absolute inset-0 z-[3] h-full w-full cursor-pointer opacity-0"
        />
      </div>
    </motion.div>
  );
}
