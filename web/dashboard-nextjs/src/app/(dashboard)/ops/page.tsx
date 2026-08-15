"use client";

import { MustHaveOpsPanel } from "@/components/ops/must-have-ops-panel";
import { DataTrustBanner } from "@/components/ui/data-trust-banner";

export default function MustHaveOpsPage() {
  return (
    <div className="space-y-4">
      <DataTrustBanner kind="seed" />
      <MustHaveOpsPanel />
    </div>
  );
}
