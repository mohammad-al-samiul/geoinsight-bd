"use client";

import { Suspense } from "react";
import { LocalSpecialtyPanel } from "@/components/local-entity/local-specialty-panel";

export default function LocalSpecialtyPage() {
  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground">Loading…</div>}>
      <LocalSpecialtyPanel />
    </Suspense>
  );
}
