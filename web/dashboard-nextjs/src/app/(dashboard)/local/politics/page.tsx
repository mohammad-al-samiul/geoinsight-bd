"use client";

import { Suspense } from "react";
import { LocalPoliticsPanel } from "@/components/local-entity/local-politics-panel";

export default function LocalPoliticsPage() {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Loading local politics feed…</div>}>
      <LocalPoliticsPanel />
    </Suspense>
  );
}
