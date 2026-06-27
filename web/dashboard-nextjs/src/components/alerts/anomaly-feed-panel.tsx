"use client";

import { useState } from "react";
import { AlertDetailModal } from "@/components/alerts/alert-detail-modal";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAnomalyFeed } from "@/hooks/use-anomaly-feed";
import { useAdminFilter } from "@/hooks/use-admin-filter";
import type { AnomalyAlert } from "@/types/alerts";
import { cn } from "@/lib/utils";
import { AlertTriangle, ChevronRight, Radio, RefreshCw } from "lucide-react";

const SEVERITY_STYLES: Record<AnomalyAlert["severity"], string> = {
  LOW: "border-sky-500/30 bg-sky-500/5",
  MEDIUM: "border-amber-500/30 bg-amber-500/5",
  HIGH: "border-orange-500/30 bg-orange-500/5",
  CRITICAL: "border-destructive/40 bg-destructive/10",
};

interface AnomalyFeedPanelProps {
  className?: string;
  compact?: boolean;
}

export function AnomalyFeedPanel({ className, compact = false }: AnomalyFeedPanelProps) {
  const { filter } = useAdminFilter();
  const { alerts, loading, refresh } = useAnomalyFeed(filter);
  const [selected, setSelected] = useState<AnomalyAlert | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const openAlert = (alert: AnomalyAlert) => {
    setSelected(alert);
    setModalOpen(true);
  };

  return (
    <>
      <section
        className={cn(
          "glass-panel flex flex-col overflow-hidden rounded-xl shadow-panel",
          className,
        )}
      >
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <div>
              <h3 className="text-sm font-semibold">AI Anomaly & Red Flag Feed</h3>
              {!compact && (
                <p className="text-[10px] text-muted-foreground">
                  Real-time infractions · Hyperledger anchored
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1 border-primary/30 text-[10px] text-primary">
              <Radio className="h-3 w-3" />
              Live
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => refresh()}
              aria-label="Refresh alerts"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <div
          className={cn(
            "overflow-y-auto p-2",
            compact ? "max-h-[320px]" : "max-h-[min(70vh,560px)] flex-1",
          )}
        >
          {loading ? (
            <div className="space-y-2 p-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : alerts.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              No active anomalies in current scope.
            </p>
          ) : (
            <ul className="space-y-2">
              {alerts.map((alert) => (
                <li key={alert.id}>
                  <button
                    type="button"
                    onClick={() => openAlert(alert)}
                    className={cn(
                      "group flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-all hover:border-primary/40",
                      SEVERITY_STYLES[alert.severity],
                      alert.isNew && "animate-score-pulse ring-1 ring-primary/30",
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium leading-snug text-foreground">
                        {alert.headline}
                      </p>
                      <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
                        {alert.detail}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                        <span>{new Date(alert.createdAt).toLocaleTimeString("en-BD")}</span>
                        <Badge variant="outline" className="h-5 text-[9px]">
                          {alert.verificationStatus}
                        </Badge>
                      </div>
                    </div>
                    <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition group-hover:text-primary" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <AlertDetailModal
        alert={selected}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </>
  );
}
