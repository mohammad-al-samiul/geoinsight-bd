"use client";

import { useCallback, useState } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { ModuleShell, StatCard, StatGrid } from "@/components/modules/module-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { IntelCard } from "@/components/ui/intel-card";
import { ProgressMeter } from "@/components/ui/progress-meter";
import { ProximityMap } from "@/components/proximity/proximity-map";
import { useAppLang } from "@/hooks/use-app-lang";
import {
  useProximityLive,
  type PointCheckResult,
  type ProximityStatus,
} from "@/hooks/use-proximity-live";
import { cn } from "@/lib/utils";
import { DataTrustBanner } from "@/components/ui/data-trust-banner";
import {
  AlertTriangle,
  Crosshair,
  Loader2,
  MapPinned,
  Radio,
  RefreshCw,
  Shield,
} from "lucide-react";

const STATUS_CLASS: Record<ProximityStatus, string> = {
  INSIDE: "border-red-500/40 bg-red-500/15 text-red-400",
  APPROACHING: "border-amber-500/40 bg-amber-500/15 text-amber-400",
  OUTSIDE: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
};

function severityPercent(sev: string): number {
  if (sev === "critical") return 95;
  if (sev === "high") return 72;
  if (sev === "elevated") return 48;
  return 12;
}

export function ProximityAlertPanel() {
  const t = useTranslations("modules.proximity");
  const lang = useAppLang();
  const { data, loading, error, pulseKey, refresh, checkPoint } = useProximityLive(true);
  const [manual, setManual] = useState<PointCheckResult | null>(null);
  const [pinBusy, setPinBusy] = useState(false);

  const onMapClick = useCallback(
    async (lat: number, lng: number) => {
      setPinBusy(true);
      try {
        const res = await checkPoint(lat, lng, t("analystPin"));
        setManual(res.results[0] ?? null);
      } catch {
        setManual(null);
      } finally {
        setPinBusy(false);
      }
    },
    [checkPoint, t],
  );

  const tracks = data?.tracks ?? [];
  const zones = data?.zones ?? [];
  const alertTracks = tracks.filter((x) => x.alert);

  return (
    <ModuleShell
      title={t("title")}
      description={t("description")}
      loading={loading && !data}
      error={error}
      onRetry={() => void refresh()}
      stats={
        data && (
          <StatGrid>
            <StatCard
              label={t("activeAlerts")}
              value={data.alert_count}
              accent={data.alert_count > 0 ? "danger" : "success"}
            />
            <StatCard label={t("zones")} value={zones.length} />
            <StatCard label={t("tracks")} value={tracks.length} />
            <StatCard
              label={t("feed")}
              value={data.feed}
              hint={new Date(data.checked_at).toLocaleTimeString()}
            />
          </StatGrid>
        )
      }
    >
      <DataTrustBanner kind="demo" className="mb-4" />
      <IntelCard accent="info" padding="lg" hoverLift={false} className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 font-display text-sm font-semibold tracking-tight">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/25 bg-primary/10">
              <MapPinned className="h-4 w-4 text-primary" />
            </span>
            {t("mapTitle")}
          </h3>
          <div className="flex flex-wrap gap-2">
            {pinBusy && (
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {t("checking")}
              </span>
            )}
            <Button size="sm" variant="outline" onClick={() => void refresh()} className="gap-2">
              <RefreshCw className="h-3.5 w-3.5" />
              {t("refresh")}
            </Button>
          </div>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">{t("mapHint")}</p>
        <ProximityMap
          zones={zones}
          tracks={
            manual
              ? [...tracks, manual]
              : tracks
          }
          pulseKey={pulseKey}
          lang={lang}
          onMapClick={(lat, lng) => void onMapClick(lat, lng)}
        />
      </IntelCard>

      {manual && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4">
          <IntelCard
            hoverLift={false}
            accent={manual.alert ? "danger" : "success"}
            padding="md"
          >
            <p className="flex items-center gap-2 text-sm font-medium">
              <Crosshair className="h-4 w-4" />
              {t("analystResult")}
              <Badge
                className={cn(
                  "border text-[10px]",
                  STATUS_CLASS[manual.hits[0]?.status ?? "OUTSIDE"],
                )}
              >
                {manual.hits[0]?.status ?? "OUTSIDE"}
              </Badge>
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              {manual.point.lat.toFixed(5)}, {manual.point.lng.toFixed(5)} ·{" "}
              {lang === "bn"
                ? manual.hits[0]?.name_bn
                : manual.hits[0]?.name}{" "}
              · {Math.round(manual.hits[0]?.distance_m ?? 0)}m
            </p>
          </IntelCard>
        </motion.div>
      )}

      <div className="mt-6 grid gap-3 md:grid-cols-2">
        <IntelCard accent="warning" padding="lg" hoverLift={false} className="space-y-3">
          <h3 className="flex items-center gap-2 font-display text-sm font-semibold">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            {t("alertFeed")}
          </h3>
          {!alertTracks.length && (
            <p className="text-xs text-muted-foreground">{t("noAlerts")}</p>
          )}
          <div className="space-y-2">
            {alertTracks.map((tr, i) => (
              <div
                key={tr.point.track_id ?? i}
                className="rounded-lg border border-border/50 bg-background/40 p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium">{tr.point.label ?? tr.point.track_id}</p>
                  <Badge
                    variant="outline"
                    className={cn(
                      "border text-[10px]",
                      STATUS_CLASS[tr.hits[0]?.status ?? "OUTSIDE"],
                    )}
                  >
                    {tr.hits[0]?.status}
                  </Badge>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {lang === "bn" ? tr.hits[0]?.name_bn : tr.hits[0]?.name} ·{" "}
                  {Math.round(tr.hits[0]?.distance_m ?? 0)} m
                </p>
                <div className="mt-2">
                  <ProgressMeter
                    value={severityPercent(tr.max_severity)}
                    invert
                    delay={0.05 + i * 0.04}
                  />
                </div>
              </div>
            ))}
          </div>
        </IntelCard>

        <IntelCard accent="default" padding="lg" hoverLift={false} className="space-y-3">
          <h3 className="flex items-center gap-2 font-display text-sm font-semibold">
            <Shield className="h-4 w-4 text-primary" />
            {t("zoneList")}
          </h3>
          <div className="space-y-2">
            {zones.map((z, i) => (
              <div
                key={z.zone_id}
                className="flex items-center justify-between gap-2 rounded-lg border border-border/50 bg-background/40 px-3 py-2.5"
              >
                <div>
                  <p className="text-sm font-medium">
                    {lang === "bn" ? z.name_bn : z.name}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {z.category} · buffer {z.approach_buffer_m}m
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className="border-primary/30 bg-primary/10 text-[10px] text-primary"
                >
                  {z.alert_level}
                </Badge>
              </div>
            ))}
            {!zones.length && !loading && (
              <p className="text-xs text-muted-foreground">{t("noZones")}</p>
            )}
          </div>
          <p className="flex items-center gap-1.5 pt-1 text-[11px] text-muted-foreground">
            <Radio className="h-3 w-3 text-emerald-400" />
            {t("pollHint")}
          </p>
        </IntelCard>
      </div>
    </ModuleShell>
  );
}
