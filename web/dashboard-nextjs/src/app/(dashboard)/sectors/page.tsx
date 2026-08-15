"use client";

import { Suspense } from "react";
import { NationalSectorsPanel } from "@/components/national-sectors/national-sectors-panel";

export default function NationalSectorsPage() {
  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground">Loading…</div>}>
      <NationalSectorsPanel />
    </Suspense>
  );
}
