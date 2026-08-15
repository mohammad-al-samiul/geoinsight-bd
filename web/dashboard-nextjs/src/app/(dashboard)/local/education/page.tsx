"use client";

import { Suspense } from "react";
import { LocalSectorPanel } from "@/components/local-entity/local-sector-panel";

export default function LocalEducationPage() {
  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground">Loading…</div>}>
      <LocalSectorPanel sector="EDUCATION" />
    </Suspense>
  );
}
