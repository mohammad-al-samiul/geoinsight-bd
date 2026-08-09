"use client";

import type { ReactNode } from "react";
import { AnimatePresence, motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";
import { ModuleContentSkeleton } from "@/components/ui/skeleton";

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

/**
 * @deprecated Full-screen cinematic loaders are retired.
 * Resolves to an in-layout skeleton for any leftover call sites.
 */
export function ModuleCinematicLoader({
  label,
  active = true,
  className,
}: {
  label: string;
  bn?: boolean;
  active?: boolean;
  fullScreen?: boolean;
  className?: string;
}) {
  if (!active) return null;
  return (
    <div role="status" aria-label={label} className={cn("w-full", className)}>
      <ModuleContentSkeleton />
    </div>
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
