"use client";

import { Suspense } from "react";
import { LocalVisitsPanel } from "@/components/local-entity/local-visits-panel";

export default function LocalVisitsPage() {
  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground">Loading…</div>}>
      <LocalVisitsPanel />
    </Suspense>
  );
}
