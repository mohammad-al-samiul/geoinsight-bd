"use client";

import { Suspense } from "react";
import { LocalPulsePanel } from "@/components/local-entity/local-pulse-panel";

export default function LocalPulsePage() {
  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground">Loading…</div>}>
      <LocalPulsePanel />
    </Suspense>
  );
}
