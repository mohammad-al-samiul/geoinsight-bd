"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";

function ForbiddenContent() {
  const searchParams = useSearchParams();
  const reason =
    searchParams.get("reason") ??
    "Your role or administrative tenant does not permit access to this resource.";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-center">
      <div className="glass-panel max-w-lg rounded-xl p-8 shadow-panel">
        <ShieldAlert className="mx-auto h-12 w-12 text-destructive" />
        <h1 className="mt-4 text-2xl font-bold">Access Denied</h1>
        <p className="mt-3 text-sm text-muted-foreground">{reason}</p>
        <p className="mt-2 text-xs text-muted-foreground">
          Multi-tenant RBAC enforces strict administrative scope. Contact your PMO
          administrator if you believe this is an error.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link href="/">Return to Overview</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/login">Switch Account</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function ForbiddenPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading…</div>}>
      <ForbiddenContent />
    </Suspense>
  );
}
