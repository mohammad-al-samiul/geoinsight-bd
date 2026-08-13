"use client";

import { Suspense } from "react";
import { AlertDeliveryPanel } from "@/components/local-entity/alert-delivery-panel";

export default function LocalAlertsPage() {
  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground">Loading…</div>}>
      <AlertDeliveryPanel />
    </Suspense>
  );
}
