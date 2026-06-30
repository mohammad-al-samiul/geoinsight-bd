"use client";

import { useHazardOverlay } from "@/hooks/use-hazard-overlay";
import { ModuleShell, StatCard, StatGrid } from "@/components/modules/module-shell";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CloudRain, Wind } from "lucide-react";

export function HazardOverlayPanel() {
  const { overlay, loading, error, reload } = useHazardOverlay();

  return (
    <ModuleShell
      title="Flood & Cyclone Project Risk"
      description="BMD/FFWC hazard zones overlaid on project locations — এই মৌসুমে ঝুঁকিতে থাকা প্রকল্প।"
      loading={loading}
      error={error}
      onRetry={reload}
      stats={
        overlay && (
          <StatGrid>
            <StatCard label="Projects mapped" value={overlay.projects_mapped} />
            <StatCard label="At risk" value={overlay.at_risk_count} accent="danger" />
            <StatCard label="Hazard zones" value={overlay.zones.length} />
            <StatCard label="Season" value={overlay.season} />
          </StatGrid>
        )
      }
    >
      {overlay && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="glass-panel rounded-xl p-4 shadow-panel">
            <h3 className="mb-3 text-sm font-semibold">Active hazard zones</h3>
            <ul className="space-y-2">
              {overlay.zones.map((z) => (
                <li
                  key={z.zone_id}
                  className="flex items-center gap-2 rounded-lg border border-border/50 px-3 py-2 text-sm"
                >
                  {z.hazard_type === "cyclone" ? (
                    <Wind className="h-4 w-4 text-sky-400" />
                  ) : (
                    <CloudRain className="h-4 w-4 text-blue-400" />
                  )}
                  <div>
                    <p className="font-medium">{z.name}</p>
                    <p className="font-bengali text-xs text-muted-foreground">{z.name_bn}</p>
                  </div>
                  <Badge variant="outline" className="ml-auto">
                    L{z.risk_level}
                  </Badge>
                </li>
              ))}
            </ul>
          </div>

          <div className="glass-panel rounded-xl p-4 shadow-panel">
            <h3 className="mb-1 text-sm font-semibold text-red-400">Projects at risk</h3>
            <p className="mb-3 text-xs text-muted-foreground">{overlay.narrative_bn}</p>
            <ul className="max-h-[400px] space-y-2 overflow-y-auto">
              {overlay.exposures.length === 0 ? (
                <li className="text-sm text-muted-foreground">No high-exposure projects in scope.</li>
              ) : (
                overlay.exposures.map((e) => (
                  <li
                    key={e.project_id}
                    className={cn(
                      "rounded-lg border px-3 py-2.5",
                      e.exposure_score >= 70
                        ? "border-red-500/30 bg-red-500/5"
                        : "border-amber-500/30 bg-amber-500/5",
                    )}
                  >
                    <p className="text-sm font-medium">{e.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {e.nearest_zone_bn} · {e.distance_km} km · exposure {e.exposure_score}%
                    </p>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      )}
    </ModuleShell>
  );
}
