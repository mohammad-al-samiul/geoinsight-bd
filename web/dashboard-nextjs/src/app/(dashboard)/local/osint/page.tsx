"use client";

import { Suspense } from "react";
import { LocalOsintPanel } from "@/components/local-entity/local-osint-panel";

export default function LocalOsintPage() {
  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground">Loading…</div>}>
      <LocalOsintPanel />
    </Suspense>
  );
}
