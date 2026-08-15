import { Suspense } from "react";
import { NarrativeShieldPanel } from "@/components/narrative-shield/narrative-shield-panel";

export default function NarrativeShieldPage() {
  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground">Loading…</div>}>
      <NarrativeShieldPanel />
    </Suspense>
  );
}
