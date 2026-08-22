"use client";

import { Suspense } from "react";
import { LocalUnrestPanel } from "@/components/local-entity/local-unrest-panel";

export default function LocalUnrestPage() {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Loading local unrest feed…</div>}>
      <LocalUnrestPanel />
    </Suspense>
  );
}
