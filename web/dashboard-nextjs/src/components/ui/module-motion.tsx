"use client";

import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion, type HTMLMotionProps } from "framer-motion";
import { Loader2, Radar } from "lucide-react";
import { cn } from "@/lib/utils";

/** Ambient aurora behind module content — same language as Narrative Shield. */
export function ModulePageAura({ className }: { className?: string }) {
  return (
    <div className={cn("shield-page-aura", className)} aria-hidden>
      <div className="orb-a" />
      <div className="orb-b" />
      <div className="orb-c" />
    </div>
  );
}

const DEFAULT_STEPS = [
  { bn: "সংযোগ স্থাপন", en: "Establishing link" },
  { bn: "ডেটা স্ক্যান", en: "Scanning data" },
  { bn: "বিশ্লেষণ", en: "Analyzing" },
  { bn: "ড্যাশবোর্ড সিঙ্ক", en: "Dashboard sync" },
] as const;

/** Full-bleed cinematic loader used across all command modules. */
export function ModuleCinematicLoader({
  label,
  bn = true,
  active = true,
  fullScreen = false,
  className,
}: {
  label: string;
  bn?: boolean;
  active?: boolean;
  /** Covers the complete dashboard while a module's first data payload arrives. */
  fullScreen?: boolean;
  className?: string;
}) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!active) {
      setStep(0);
      return;
    }
    const id = window.setInterval(() => setStep((s) => (s + 1) % DEFAULT_STEPS.length), 1100);
    return () => window.clearInterval(id);
  }, [active]);

  if (!active) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "shield-breath relative overflow-hidden border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-background/95 to-sky-500/10 px-6 py-10",
        fullScreen
          ? "fixed inset-0 z-[200] flex min-h-[100dvh] items-center justify-center rounded-none px-5 py-10 sm:px-8"
          : "rounded-2xl",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {fullScreen && (
          <>
            <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(16,185,129,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.08)_1px,transparent_1px)] [background-size:44px_44px]" />
            <motion.div
              className="absolute left-1/2 top-1/2 h-[min(74vw,760px)] w-[min(74vw,760px)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-emerald-400/15"
              animate={{ scale: [0.88, 1.08, 0.88], opacity: [0.2, 0.65, 0.2] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            />
          </>
        )}
        <div className="shield-scan-line absolute inset-x-0 h-24 bg-gradient-to-b from-transparent via-emerald-400/25 to-transparent" />
      </div>

      <div
        className={cn(
          "relative z-10 flex flex-col items-center gap-6 text-center",
          fullScreen && "w-full max-w-xl rounded-3xl border border-emerald-400/20 bg-slate-950/35 px-6 py-10 shadow-2xl backdrop-blur-xl sm:px-10",
        )}
      >
        <div className="relative flex h-28 w-28 items-center justify-center">
          <div className="absolute inset-0 rounded-full border border-emerald-400/20" />
          <div className="absolute inset-2 rounded-full border border-dashed border-emerald-400/35" />
          <motion.div
            className="shield-radar-sweep absolute inset-3 rounded-full"
            style={{
              background:
                "conic-gradient(from 0deg, transparent 0deg, rgb(16 185 129 / 0.45) 70deg, transparent 110deg)",
            }}
          />
          <motion.div
            animate={{ scale: [1, 1.12, 1], opacity: [0.9, 1, 0.9] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            className="relative z-10 flex h-14 w-14 items-center justify-center rounded-full border border-emerald-400/50 bg-emerald-500/15"
          >
            <Radar className="h-7 w-7 text-emerald-300" />
          </motion.div>
        </div>

        <div className="space-y-1">
          <p className="font-display text-lg font-semibold tracking-tight text-foreground">{label}</p>
          <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-400" />
            {bn ? "লাইভ কমান্ড স্ক্যান চলছে" : "Live command scan in progress"}
          </p>
        </div>

        <div className="flex w-full max-w-lg flex-wrap justify-center gap-2">
          {DEFAULT_STEPS.map((s, i) => (
            <motion.span
              key={s.en}
              animate={{ scale: step === i ? 1.06 : 1, opacity: step === i ? 1 : 0.45 }}
              className={cn(
                "rounded-full border px-3 py-1 text-[11px] font-semibold tracking-wide",
                step === i
                  ? "border-emerald-400/50 bg-emerald-500/20 text-emerald-200"
                  : "border-border/40 bg-secondary/20 text-muted-foreground",
              )}
            >
              {bn ? s.bn : s.en}
            </motion.span>
          ))}
        </div>

        <div className="h-1.5 w-full max-w-md overflow-hidden rounded-full bg-secondary/40">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-sky-400 to-emerald-400"
            initial={{ width: "8%" }}
            animate={{ width: ["12%", "88%", "35%", "95%"] }}
            transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      </div>
    </motion.div>
  );
}

/** Floating card shell — continuous motion + shimmer + hover lift. */
export function FloatCard({
  children,
  index = 0,
  danger = false,
  className,
  shimmer = true,
  ...props
}: {
  children: ReactNode;
  index?: number;
  danger?: boolean;
  shimmer?: boolean;
  className?: string;
} & Omit<HTMLMotionProps<"div">, "children">) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{
        opacity: 1,
        scale: 1,
        y: [0, -5, 0],
      }}
      transition={{
        opacity: { delay: Math.min(index * 0.07, 0.7), duration: 0.5 },
        scale: { delay: Math.min(index * 0.07, 0.7), duration: 0.5 },
        y: {
          delay: Math.min(index * 0.07, 0.7) + 0.45,
          duration: 3.3 + (index % 4) * 0.35,
          repeat: Infinity,
          ease: "easeInOut",
        },
      }}
      whileHover={{ y: -8, scale: 1.015, transition: { duration: 0.2 } }}
      className={cn(
        shimmer && "shield-shimmer-wrap",
        danger && "shield-glow-danger",
        className,
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/** Staggered section entrance. */
export function MotionSection({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function AnimatedContent({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="module-content"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className={cn("relative z-10 space-y-6", className)}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
