"use client";

import { Suspense } from "react";
import { LocalHeatmapPanel } from "@/components/local-entity/local-heatmap-panel";

export default function LocalHeatmapPage() {
  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground">Loading…</div>}>
      <LocalHeatmapPanel />
    </Suspense>
  );
}
