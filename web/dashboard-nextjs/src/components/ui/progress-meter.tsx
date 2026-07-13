"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export type MeterTone = "auto" | "good" | "warn" | "bad" | "info";

function toneFromValue(value: number, invert = false): Exclude<MeterTone, "auto"> {
  const v = invert ? 100 - value : value;
  if (v >= 75) return "good";
  if (v >= 50) return "warn";
  return "bad";
}

const TONE_CLASS: Record<Exclude<MeterTone, "auto">, string> = {
  good: "bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-300",
  warn: "bg-gradient-to-r from-amber-500 via-orange-400 to-amber-300",
  bad: "bg-gradient-to-r from-red-600 via-rose-500 to-orange-400",
  info: "bg-gradient-to-r from-sky-500 via-cyan-400 to-teal-300",
};

interface ProgressMeterProps {
  value: number;
  tone?: MeterTone;
  /** Higher value = worse (e.g. unrest, dissatisfaction) */
  invert?: boolean;
  className?: string;
  height?: "sm" | "md";
  delay?: number;
  showGlow?: boolean;
}

export function ProgressMeter({
  value,
  tone = "auto",
  invert = false,
  className,
  height = "md",
  delay = 0.1,
  showGlow = true,
}: ProgressMeterProps) {
  const clamped = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  const resolved = tone === "auto" ? toneFromValue(clamped, invert) : tone;

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-full bg-secondary/70",
        height === "sm" ? "h-1.5" : "h-2.5",
        className,
      )}
    >
      <motion.div
        className={cn(
          "h-full rounded-full",
          TONE_CLASS[resolved],
          showGlow && "shadow-[0_0_12px_-2px_rgba(251,113,133,0.45)]",
        )}
        initial={{ width: 0 }}
        animate={{ width: `${Math.max(clamped, 3)}%` }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay }}
      />
    </div>
  );
}
