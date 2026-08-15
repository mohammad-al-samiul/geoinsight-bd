"use client";

import { Suspense } from "react";
import { LocalCommandPanel } from "@/components/local-entity/local-command-panel";

export default function LocalCommandPage() {
  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground">Loading…</div>}>
      <LocalCommandPanel />
    </Suspense>
  );
}
