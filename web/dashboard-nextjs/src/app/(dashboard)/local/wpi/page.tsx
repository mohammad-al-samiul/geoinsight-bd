"use client";

import { Suspense } from "react";
import { LocalWpiPanel } from "@/components/local-entity/local-wpi-panel";

export default function LocalWpiPage() {
  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground">Loading…</div>}>
      <LocalWpiPanel />
    </Suspense>
  );
}
