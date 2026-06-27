"use client";

import { useCallback } from "react";
import { useAdminFilter } from "@/hooks/use-admin-filter";
import { useDashboardData } from "@/hooks/use-dashboard-data";
import { useAuth } from "@/hooks/use-auth";
import { getBreadcrumb } from "@/lib/admin-units";
import { BangladeshChoroplethMap } from "@/components/dashboard/bangladesh-choropleth-map";
import { KpiScorecards } from "@/components/dashboard/kpi-scorecards";
import { Badge } from "@/components/ui/badge";
import type { GeoFeatureProperties } from "@/types/dashboard";
import type { SocketConnectionStatus } from "@/hooks/use-socket";
import { Radio, Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

const SOCKET_STATUS: Record<
  SocketConnectionStatus,
  { label: string; className: string; icon: React.ComponentType<{ className?: string }> }
> = {
  connected: {
    label: "Live",
    className: "border-emerald-500/40 text-emerald-400",
    icon: Wifi,
  },
  connecting: {
    label: "Connecting",
    className: "border-amber-500/40 text-amber-400",
    icon: Radio,
  },
  disconnected: {
    label: "Offline",
    className: "border-muted-foreground/40 text-muted-foreground",
    icon: WifiOff,
  },
  error: {
    label: "Reconnecting",
    className: "border-destructive/40 text-destructive",
    icon: WifiOff,
  },
};

export function DashboardViewport() {
  const user = useAuth();
  const { filter, drillToUnit } = useAdminFilter();

  const { metrics, markers, loading, socketStatus, pulseKeys } =
    useDashboardData(filter);

  const breadcrumb = getBreadcrumb(filter);
  const scopeLabel = breadcrumb.length
    ? breadcrumb.map((b) => b.name).join(" → ")
    : user.adminUnitName ?? "National";

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

  const socketMeta = SOCKET_STATUS[socketStatus];
  const SocketIcon = socketMeta.icon;

  return (
    <div className="mx-auto max-w-[1600px] space-y-5 animate-fade-in">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground lg:text-3xl">
            National Command Viewport
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Scoped: <span className="text-primary">{scopeLabel}</span>
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

      <div className="grid gap-5 xl:grid-cols-5 xl:items-stretch">
        <div className="xl:col-span-3 xl:min-h-[480px]">
          <BangladeshChoroplethMap
            filter={filter}
            markers={markers}
            mapPulseKey={pulseKeys.map}
            onFeatureClick={handleFeatureClick}
          />
        </div>
        <div className="xl:col-span-2">
          <KpiScorecards
            metrics={metrics}
            loading={loading}
            pulseKeys={pulseKeys}
          />
        </div>
      </div>
    </div>
  );
}
