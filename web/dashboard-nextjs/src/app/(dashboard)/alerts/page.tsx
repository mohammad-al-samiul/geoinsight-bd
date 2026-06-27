"use client";

import { AnomalyFeedPanel } from "@/components/alerts/anomaly-feed-panel";

export default function AlertsPage() {
  return (
    <div className="mx-auto max-w-4xl animate-fade-in">
      <div className="mb-5">
        <h1 className="text-2xl font-bold">Red Flag Command Log</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          AI-powered anomaly monitoring with Hyperledger verification
        </p>
      </div>
      <AnomalyFeedPanel />
    </div>
  );
}
