"use client";

import { MotionConfig } from "framer-motion";
import { ToastProvider } from "@/components/ui/toast";

/**
 * Client-side providers shared by every route.
 * `reducedMotion="user"` makes framer-motion honor prefers-reduced-motion
 * (transform/layout animations collapse to instant transitions).
 */
export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <ToastProvider>{children}</ToastProvider>
    </MotionConfig>
  );
}
