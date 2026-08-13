"use client";

import { Suspense } from "react";
import { LocalEntityPanel } from "@/components/local-entity/local-entity-panel";

export default function LocalEntityPage() {
  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground">Loading…</div>}>
      <LocalEntityPanel />
    </Suspense>
  );
}
