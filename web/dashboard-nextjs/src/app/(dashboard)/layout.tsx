"use client";

import { Suspense, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { AuthProvider } from "@/hooks/use-auth";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import type { AuthUser } from "@/types";

const MOCK_USERS: Record<string, AuthUser> = {
  pmo: {
    id: "1",
    email: "pmo@geoinsight.gov.bd",
    fullName: "National PMO Analyst",
    role: "PMO",
    adminUnitId: null,
    adminUnitName: "People's Republic of Bangladesh",
  },
  minister: {
    id: "2",
    email: "minister@geoinsight.gov.bd",
    fullName: "Hon. Division Minister",
    role: "MINISTER",
    adminUnitId: "div-dhaka",
    adminUnitName: "Dhaka Division",
  },
  dc: {
    id: "3",
    email: "dc.dhaka@geoinsight.gov.bd",
    fullName: "Deputy Commissioner",
    role: "DC",
    adminUnitId: "dist-dhaka",
    adminUnitName: "Dhaka District",
  },
  chairman: {
    id: "4",
    email: "chairman@ashulia.gov.bd",
    fullName: "Union Chairman",
    role: "UNION_CHAIRMAN",
    adminUnitId: "uni-ashulia",
    adminUnitName: "Ashulia Union",
  },
};

function DashboardLayoutInner({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams();
  const roleKey = searchParams.get("role") ?? "pmo";

  return (
    <AuthProvider overrideUser={MOCK_USERS[roleKey] ?? MOCK_USERS.pmo}>
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
