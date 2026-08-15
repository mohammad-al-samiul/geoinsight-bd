"use client";

import { Suspense } from "react";
import { LocalIntegrityPanel } from "@/components/local-entity/local-integrity-panel";

export default function LocalCorruptionPage() {
  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground">Loading…</div>}>
      <LocalIntegrityPanel domain="CORRUPTION" />
    </Suspense>
  );
}
