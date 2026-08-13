"use client";

import { Suspense } from "react";
import { LocalOutagePanel } from "@/components/local-entity/local-outage-panel";

export default function LocalOutagePage() {
  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground">Loading…</div>}>
      <LocalOutagePanel />
    </Suspense>
  );
}
