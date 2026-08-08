"use client";

import { Suspense, type ReactNode } from "react";
import { AuthProvider } from "@/hooks/use-auth";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { ModuleCinematicLoader } from "@/components/ui/module-motion";

function DashboardLayoutInner({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <DashboardShell>{children}</DashboardShell>
    </AuthProvider>
  );
}

function LoadingFallback() {
  return (
    <ModuleCinematicLoader
      bn
      fullScreen
      label="কমান্ড সেন্টার প্রস্তুত হচ্ছে…"
    />
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <DashboardLayoutInner>{children}</DashboardLayoutInner>
    </Suspense>
  );
}
