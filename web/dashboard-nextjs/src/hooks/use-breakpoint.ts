"use client";

import { useEffect, useState } from "react";

/** Tailwind-aligned breakpoints (min-width). */
export type Breakpoint = "base" | "sm" | "md" | "lg" | "xl" | "2xl";

const QUERIES: { key: Exclude<Breakpoint, "base">; q: string }[] = [
  { key: "sm", q: "(min-width: 640px)" },
  { key: "md", q: "(min-width: 768px)" },
  { key: "lg", q: "(min-width: 1024px)" },
  { key: "xl", q: "(min-width: 1280px)" },
  { key: "2xl", q: "(min-width: 1536px)" },
];

/**
 * Current viewport breakpoint. SSR-safe: starts at `base` then hydrates.
 */
export function useBreakpoint(): Breakpoint {
  const [bp, setBp] = useState<Breakpoint>("base");

  useEffect(() => {
    const mqls = QUERIES.map(({ key, q }) => ({ key, mql: window.matchMedia(q) }));

    const update = () => {
      let next: Breakpoint = "base";
      for (const { key, mql } of mqls) {
        if (mql.matches) next = key;
      }
      setBp(next);
    };

    update();
    for (const { mql } of mqls) mql.addEventListener("change", update);
    return () => {
      for (const { mql } of mqls) mql.removeEventListener("change", update);
    };
  }, []);

  return bp;
}

export function useIsMobile(): boolean {
  const bp = useBreakpoint();
  return bp === "base" || bp === "sm";
}

export function useIsNarrow(): boolean {
  const bp = useBreakpoint();
  return bp === "base";
}
