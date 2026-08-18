"use client";

import { useReducedMotion, type Transition, type Variants } from "framer-motion";

/** Shared command-console easing — snappy, no bounce. */
export const easeOutExpo: [number, number, number, number] = [0.22, 1, 0.36, 1];

export const duration = {
  micro: 0.15,
  short: 0.22,
  enter: 0.32,
  section: 0.4,
  chartMs: 550,
} as const;

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: Math.min(i * 0.05, 0.36), duration: duration.enter, ease: easeOutExpo },
  }),
};

export const itemFade: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: duration.enter, ease: easeOutExpo },
  },
};

export const staggerContainer: Variants = {
  hidden: { opacity: 1 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.04 },
  },
};

export function enterTransition(delay = 0): Transition {
  return { delay, duration: duration.enter, ease: easeOutExpo };
}

/** Cap stagger so long lists don't take seconds to appear. */
export function enterDelay(index: number, step = 0.045, cap = 0.36): Transition {
  return { delay: Math.min(index * step, cap), duration: duration.enter, ease: easeOutExpo };
}

export const hoverLift = { y: -3 };
export const tapPress = { scale: 0.98 };

export function useChartMotion() {
  const reduce = useReducedMotion();
  return {
    isAnimationActive: !reduce,
    animationDuration: reduce ? 0 : duration.chartMs,
    animationEasing: "ease-out" as const,
  };
}
