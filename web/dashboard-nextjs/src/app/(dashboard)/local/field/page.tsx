"use client";

import { Suspense } from "react";
import { LocalFieldBridgePanel } from "@/components/local-entity/local-field-bridge-panel";

export default function LocalFieldPage() {
  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground">Loading…</div>}>
      <LocalFieldBridgePanel />
    </Suspense>
  );
}
