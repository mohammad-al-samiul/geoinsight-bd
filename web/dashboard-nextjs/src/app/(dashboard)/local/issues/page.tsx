"use client";

import { Suspense } from "react";
import { LocalIssuesPanel } from "@/components/local-entity/local-issues-panel";

export default function LocalIssuesPage() {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Loading local issue tracker…</div>}>
      <LocalIssuesPanel />
    </Suspense>
  );
}
