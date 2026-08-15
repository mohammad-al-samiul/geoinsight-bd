"use client";

import { Suspense } from "react";
import { LocalEvidencePanel } from "@/components/local-entity/local-evidence-panel";

export default function LocalEvidencePage() {
  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground">Loading…</div>}>
      <LocalEvidencePanel />
    </Suspense>
  );
}
