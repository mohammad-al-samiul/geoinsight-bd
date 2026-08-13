"use client";

import { Suspense } from "react";
import { LocalBudgetPanel } from "@/components/local-entity/local-budget-panel";

export default function LocalBudgetPage() {
  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground">Loading…</div>}>
      <LocalBudgetPanel />
    </Suspense>
  );
}
