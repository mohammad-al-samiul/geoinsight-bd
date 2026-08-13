"use client";

import { Suspense } from "react";
import { FaceIntelPanel } from "@/components/face-intel/face-intel-panel";

export default function FaceIntelPage() {
  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground">Loading…</div>}>
      <FaceIntelPanel />
    </Suspense>
  );
}
