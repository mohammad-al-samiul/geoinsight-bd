"use client";

import { useCallback, useMemo } from "react";
import { useAdminFilter } from "@/hooks/use-admin-filter";
import { useDashboardData } from "@/hooks/use-dashboard-data";
import { useAuth } from "@/hooks/use-auth";
import { getBreadcrumb } from "@/lib/admin-units";
import { BangladeshChoroplethMap } from "@/components/dashboard/bangladesh-choropleth-map";
import { KpiScorecards } from "@/components/dashboard/kpi-scorecards";
import { Badge } from "@/components/ui/badge";
import type { GeoFeatureProperties } from "@/types/dashboard";
import type { SocketConnectionStatus } from "@/hooks/use-socket";
import { useTranslations } from "next-intl";
import { Radio, Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

export function DashboardViewport() {
  const t = useTranslations("modules.dashboard");
  const tc = useTranslations("common");
  const user = useAuth();
  const { filter, drillToUnit } = useAdminFilter();

  const { metrics, markers, loading, socketStatus, pulseKeys } =
    useDashboardData(filter);

  const breadcrumb = getBreadcrumb(filter);
  const scopeLabel = breadcrumb.length
    ? breadcrumb.map((b) => b.name).join(" → ")
    : (user.adminUnitName ?? t("national"));

  const socketMeta = useMemo(() => {
    const SOCKET_STATUS: Record<
      SocketConnectionStatus,
      { label: string; className: string; icon: React.ComponentType<{ className?: string }> }
    > = {
      connected: {
        label: tc("live"),
        className: "border-emerald-500/40 text-emerald-400",
        icon: Wifi,
      },
      connecting: {
        label: t("connecting"),
        className: "border-amber-500/40 text-amber-400",
        icon: Radio,
      },
      disconnected: {
        label: t("offline"),
        className: "border-muted-foreground/40 text-muted-foreground",
        icon: WifiOff,
      },
      error: {
        label: t("reconnecting"),
        className: "border-destructive/40 text-destructive",
        icon: WifiOff,
      },
    };
    return SOCKET_STATUS[socketStatus];
  }, [socketStatus, t, tc]);

  const SocketIcon = socketMeta.icon;

  const handleFeatureClick = useCallback(
    (props: GeoFeatureProperties) => {
      drillToUnit({
        id: props.id,
        type: props.type,
        parentId: props.parentId,
      });
    },
    [drillToUnit],
  );

  // Progressive SaaS pattern: chrome + map + KPI skeletons paint immediately.
  // Data streams in without a full-screen blocker.
  return (
    <div className="mx-auto max-w-[1600px] space-y-5 animate-fade-in">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground lg:text-3xl">
            {t("viewport")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("scoped")}: <span className="text-primary">{scopeLabel}</span>
          </p>
        </div>
        <Badge
          variant="outline"
          className={cn("w-fit gap-1.5", socketMeta.className)}
        >
          <SocketIcon className="h-3 w-3" />
          {socketMeta.label}
          {socketStatus === "connected" && (
            <span className="relative ml-1 flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
          )}
        </Badge>
      </div>

      <div className="min-w-0 space-y-5">
        <div className="min-w-0 h-[260px] sm:h-[360px] lg:h-[480px]">
          <BangladeshChoroplethMap
            filter={filter}
            markers={markers}
            mapPulseKey={pulseKeys.map}
            onFeatureClick={handleFeatureClick}
          />
        </div>
        <div className="min-w-0">
          <KpiScorecards
            metrics={metrics}
            loading={loading && !metrics}
            pulseKeys={pulseKeys}
          />
        </div>
      </div>
    </div>
  );
}
