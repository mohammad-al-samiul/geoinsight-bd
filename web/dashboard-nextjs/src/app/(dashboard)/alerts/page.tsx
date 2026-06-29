"use client";

import { AnomalyFeedPanel } from "@/components/alerts/anomaly-feed-panel";
import { AdminCascadeFilter } from "@/components/filters/admin-cascade-filter";
import { useAdminHierarchy } from "@/hooks/use-admin-hierarchy";

export default function AlertsPage() {
  useAdminHierarchy();

  return (
    <div className="mx-auto max-w-4xl animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Red Flag Command Log</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          AI-powered anomaly monitoring with Hyperledger verification
        </p>
      </div>
      <AdminCascadeFilter variant="glass" />
      <AnomalyFeedPanel />
    </div>
  );
}
