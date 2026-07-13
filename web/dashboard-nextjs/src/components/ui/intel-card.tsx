"use client";

import { type ReactNode } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

export const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.42, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

export const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.04 },
  },
};

export const itemFade = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
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
}

export function IntelCard({
  children,
  className,
  accent = "default",
  index = 0,
  hoverLift = true,
  padding = "md",
  ...props
}: IntelCardProps) {
  return (
    <motion.div
      custom={index}
      variants={fadeUp}
      initial="hidden"
      animate="show"
      whileHover={hoverLift ? { y: -4, transition: { duration: 0.2 } } : undefined}
      className={cn(
        "glass-panel relative overflow-hidden rounded-xl",
        "before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r",
        ACCENT_RING[accent],
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

export function MotionItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div variants={itemFade} className={className}>
      {children}
    </motion.div>
  );
}
