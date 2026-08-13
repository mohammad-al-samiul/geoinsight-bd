"use client";

import { Suspense } from "react";
import { LocalScorecardPanel } from "@/components/local-entity/local-scorecard-panel";

export default function LocalScorecardPage() {
  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground">Loading…</div>}>
      <LocalScorecardPanel />
    </Suspense>
  );
}
