"use client";

import { Suspense } from "react";
import { LocalComplaintsPanel } from "@/components/local-entity/local-complaints-panel";

export default function LocalComplaintsPage() {
  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground">Loading…</div>}>
      <LocalComplaintsPanel />
    </Suspense>
  );
}
