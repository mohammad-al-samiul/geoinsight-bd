"use client";

import { Suspense, type ReactNode } from "react";
import { AuthProvider } from "@/hooks/use-auth";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { RoleRouteGuard } from "@/components/layout/role-route-guard";
import { RouteSkeleton } from "@/components/ui/skeleton";

function DashboardLayoutInner({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <RoleRouteGuard>
        <DashboardShell>{children}</DashboardShell>
      </RoleRouteGuard>
    </AuthProvider>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<RouteSkeleton />}>
      <DashboardLayoutInner>{children}</DashboardLayoutInner>
    </Suspense>
  );
}
