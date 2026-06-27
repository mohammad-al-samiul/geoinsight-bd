"use client";

import { Suspense, type ReactNode } from "react";
import { AuthProvider } from "@/hooks/use-auth";
import { DashboardShell } from "@/components/layout/dashboard-shell";

function DashboardLayoutInner({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <DashboardShell>{children}</DashboardShell>
    </AuthProvider>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-background text-muted-foreground">
          Loading command center…
        </div>
      }
    >
      <DashboardLayoutInner>{children}</DashboardLayoutInner>
    </Suspense>
  );
}
