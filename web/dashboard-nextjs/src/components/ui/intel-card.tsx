"use client";

import { type ReactNode } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

export const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.07, duration: 0.48, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

export const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
};

export const itemFade = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.42, ease: [0.22, 1, 0.36, 1] as const },
  },
};

type Accent = "default" | "danger" | "warning" | "success" | "info";

const ACCENT_RING: Record<Accent, string> = {
  default: "before:from-primary/50 before:to-transparent",
  danger: "before:from-red-400/70 before:to-transparent border-red-500/25",
  warning: "before:from-amber-400/70 before:to-transparent border-amber-500/25",
  success: "before:from-emerald-400/70 before:to-transparent border-emerald-500/25",
  info: "before:from-sky-400/70 before:to-transparent border-sky-500/25",
};

interface IntelCardProps extends Omit<HTMLMotionProps<"div">, "children"> {
  children: ReactNode;
  accent?: Accent;
  index?: number;
  hoverLift?: boolean;
  padding?: "sm" | "md" | "lg";
  /** Continuous float after entrance — default on for live command feel */
  float?: boolean;
  shimmer?: boolean;
}

export function IntelCard({
  children,
  className,
  accent = "default",
  index = 0,
  hoverLift = true,
  padding = "md",
  float = true,
  shimmer = true,
  initial,
  animate,
  ...props
}: IntelCardProps) {
  const delay = index * 0.07;

  return (
    <motion.div
      initial={initial ?? { opacity: 0, y: 20, scale: 0.97 }}
      animate={
        animate ??
        (float
          ? {
              opacity: 1,
              scale: 1,
              y: [0, -5, 0],
              transition: {
                opacity: { delay, duration: 0.48, ease: [0.22, 1, 0.36, 1] },
                scale: { delay, duration: 0.48, ease: [0.22, 1, 0.36, 1] },
                y: {
                  delay: delay + 0.45,
                  duration: 3.4 + (index % 4) * 0.35,
                  repeat: Infinity,
                  ease: "easeInOut",
                },
              },
            }
          : {
              opacity: 1,
              y: 0,
              scale: 1,
              transition: { delay, duration: 0.48, ease: [0.22, 1, 0.36, 1] },
            })
      }
      whileHover={hoverLift ? { y: -8, scale: 1.015, transition: { duration: 0.2 } } : undefined}
      className={cn(
        "glass-panel relative overflow-hidden rounded-xl",
        "before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r",
        ACCENT_RING[accent],
        shimmer && "shield-shimmer-wrap",
        float && accent === "danger" && "shield-glow-danger",
        padding === "sm" && "p-3",
        padding === "md" && "p-4",
        padding === "lg" && "p-5 sm:p-6",
        className,
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function MotionList({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className={className}
    >
      {children}
    </motion.div>
  );
}
