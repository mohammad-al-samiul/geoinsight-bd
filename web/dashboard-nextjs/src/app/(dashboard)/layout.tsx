"use client";

import { Suspense, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { AuthProvider } from "@/hooks/use-auth";
import { DashboardShell } from "@/components/layout/dashboard-shell";

function DashboardLayoutInner({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <DashboardShell>{children}</DashboardShell>
    </AuthProvider>
  );
}

function LoadingFallback() {
  const t = useTranslations("shell");
  return (
    <div className="flex h-screen items-center justify-center bg-background text-muted-foreground">
      {t("loadingShell")}
    </div>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <DashboardLayoutInner>{children}</DashboardLayoutInner>
    </Suspense>
  );
}
