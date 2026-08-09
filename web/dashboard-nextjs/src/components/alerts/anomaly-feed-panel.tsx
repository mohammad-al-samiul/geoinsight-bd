"use client";

import { memo, useCallback, useState } from "react";
import { AlertDetailModal } from "@/components/alerts/alert-detail-modal";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAnomalyFeed } from "@/hooks/use-anomaly-feed";
import { useAdminFilter } from "@/hooks/use-admin-filter";
import type { AnomalyAlert } from "@/types/alerts";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { AlertTriangle, ChevronRight, Radio, RefreshCw } from "lucide-react";

const SEVERITY_STYLES: Record<AnomalyAlert["severity"], string> = {
  LOW: "border-sky-500/30 bg-sky-500/5",
  MEDIUM: "border-amber-500/30 bg-amber-500/5",
  HIGH: "border-orange-500/30 bg-orange-500/5",
  CRITICAL: "border-destructive/40 bg-destructive/10",
};

interface AnomalyAlertItemProps {
  alert: AnomalyAlert;
  statusLabel: string;
  onOpen: (alert: AnomalyAlert) => void;
}

// Memoized: the live socket feed pulses the parent frequently, so each row
// only re-renders when its own alert data changes.
const AnomalyAlertItem = memo(function AnomalyAlertItem({
  alert,
  statusLabel,
  onOpen,
}: AnomalyAlertItemProps) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(alert)}
        className={cn(
          "group flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-all hover:border-primary/40",
          SEVERITY_STYLES[alert.severity],
          alert.isNew && "animate-score-pulse ring-1 ring-primary/30",
        )}
      >
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold leading-relaxed text-foreground break-words whitespace-normal">
            {alert.headline}
          </p>
          {alert.detail ? (
            <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground break-words whitespace-normal">
              {alert.detail}
            </p>
          ) : null}
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
            <span>{new Date(alert.createdAt).toLocaleTimeString("en-BD")}</span>
            {alert.unitName ? (
              <Badge variant="outline" className="h-5 max-w-full truncate text-[9px]">
                {alert.unitName}
              </Badge>
            ) : null}
            <Badge variant="outline" className="h-5 text-[9px]">
              {statusLabel}
            </Badge>
          </div>
        </div>
        <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition group-hover:text-primary" />
      </button>
    </li>
  );
});

interface AnomalyFeedPanelProps {
  className?: string;
  compact?: boolean;
}

export function AnomalyFeedPanel({
  className,
  compact = false,
}: AnomalyFeedPanelProps) {
  const t = useTranslations("modules.alerts");
  const tc = useTranslations("common");
  const ts = useTranslations("status");
  const { filter } = useAdminFilter();
  const { alerts, loading, error, refresh } = useAnomalyFeed(filter);
  const [selected, setSelected] = useState<AnomalyAlert | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const openAlert = useCallback((alert: AnomalyAlert) => {
    setSelected(alert);
    setModalOpen(true);
  }, []);

  const statusLabel = useCallback(
    (status: string) => {
      try {
        return ts(status as "VERIFIED" | "PENDING" | "UNANCHORED");
      } catch {
        return status;
      }
    },
    [ts],
  );

  return (
    <>
      <section
        className={cn(
          "glass-panel flex h-full min-h-0 flex-col overflow-hidden rounded-xl shadow-panel",
          className,
        )}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border/60 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold">{t("feedTitle")}</h3>
              {!compact && (
                <p className="text-[10px] text-muted-foreground">{t("feedSubtitle")}</p>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Badge variant="outline" className="gap-1 border-primary/30 text-[10px] text-primary">
              <Radio className="h-3 w-3" />
              {tc("live")}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => refresh()}
              aria-label={t("refreshAlerts")}
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Fill parent height; list scrolls — do not cap at 320px (left empty gap). */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
          {error && (
            <p className="m-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
              {tc("loadFailed")}: {error}
            </p>
          )}
          {loading ? (
            <div className="space-y-2 p-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : alerts.length === 0 && !error ? (
            <p className="p-6 text-center text-sm text-muted-foreground">{t("empty")}</p>
          ) : (
            <ul className="space-y-2 pb-2">
              {alerts.map((alert) => (
                <AnomalyAlertItem
                  key={alert.id}
                  alert={alert}
                  statusLabel={statusLabel(alert.verificationStatus)}
                  onOpen={openAlert}
                />
              ))}
            </ul>
          )}
        </div>
      </section>

      <AlertDetailModal
        alert={selected}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onResolved={refresh}
      />
    </>
  );
}
