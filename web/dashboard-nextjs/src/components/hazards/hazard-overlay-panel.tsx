"use client";

import { useHazardOverlay } from "@/hooks/use-hazard-overlay";
import { useWeatherLive } from "@/hooks/use-weather-live";
import { useAdminFilter } from "@/hooks/use-admin-filter";
import { useRealtimeRefresh } from "@/hooks/use-realtime-refresh";
import { ModuleShell, StatCard, StatGrid } from "@/components/modules/module-shell";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useTranslations, useLocale } from "next-intl";
import {
  AlertTriangle,
  CloudRain,
  Radio,
  ThermometerSun,
  Users,
  Wind,
} from "lucide-react";
import {
  HazardWeatherMap,
  WeatherDivisionCards,
} from "@/components/hazards/hazard-weather-map";
import { ImpactStatsPanel } from "@/components/shared/impact-stats-panel";

function formatPopulation(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

export function HazardOverlayPanel() {
  const t = useTranslations("modules.hazards");
  const locale = useLocale();
  const { filter, isFiltered } = useAdminFilter();
  const { overlay, loading, error, reload: reloadOverlay } = useHazardOverlay();
  const { data: weather, loading: weatherLoading, error: weatherError, reload: reloadWeather } =
    useWeatherLive();

  const reloadAll = () => {
    void reloadOverlay();
    void reloadWeather();
  };

  useRealtimeRefresh(reloadAll);

  const loadingAny = loading || weatherLoading;
  const errorAny = error ?? weatherError;
  const impact = weather?.impact;

  return (
    <ModuleShell
      title={t("title")}
      description={t("description")}
      loading={loadingAny}
      error={errorAny}
      onRetry={reloadAll}
      stats={
        (overlay || weather) && (
          <StatGrid>
            <StatCard
              label={t("populationAtRisk")}
              value={
                impact?.total_population_at_risk
                  ? formatPopulation(impact.total_population_at_risk)
                  : "—"
              }
              accent="danger"
            />
            <StatCard
              label={t("liveAlerts")}
              value={impact?.active_alert_count ?? 0}
              accent={impact && impact.active_alert_count > 0 ? "danger" : undefined}
            />
            <StatCard label={t("atRisk")} value={overlay?.at_risk_count ?? "—"} accent="danger" />
            <StatCard label={t("hazardZones")} value={overlay?.zones.length ?? 0} />
          </StatGrid>
        )
      }
    >
      {weather && (
        <div className="mb-6 space-y-4">
          {isFiltered && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs text-primary">
              {t("scopeFilterActive")}:{" "}
              {weather.scope?.districtName ?? weather.scope?.divisionName ?? t("scopedArea")}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Radio className="h-3.5 w-3.5 text-emerald-400" />
            <span>{t("liveDataSources")}</span>
            {impact?.sources.map((s) => (
              <Badge key={s} variant="outline" className="text-[10px]">
                {s}
              </Badge>
            ))}
            {impact?.refreshed_at && (
              <span className="ml-auto tabular-nums">
                {t("lastUpdated")}: {new Date(impact.refreshed_at).toLocaleString()}
              </span>
            )}
          </div>

          {impact?.flood_impact && (
            <ImpactStatsPanel
              title={t("floodImpactTitle")}
              subtitle={t("floodImpactSubtitle")}
              locale={locale}
              stats={impact.flood_impact}
              labels={{
                deaths: t("impactDeaths"),
                civilian: t("impactCivilian"),
                injuries: t("impactInjured"),
                homes: t("impactHomes"),
                livestock: t("impactLivestock"),
                damageMentions: t("impactDamageMentions"),
                evidence: t("impactEvidence"),
                estimate: t("impactEstimate"),
                mentions: t("impactMentions"),
                window1: t("impactWindow1"),
                window7: t("impactWindow7"),
                window30: t("impactWindow30"),
                byDistrict: t("impactByDistrict"),
                byEvent: t("impactByEvent"),
                byEventHint: t("impactByEventHint"),
                deathMentions: t("impactDeathMentions"),
                injuryMentions: t("impactInjuryMentions"),
                methodHint: t("impactMethodHint"),
              }}
            />
          )}

          <WeatherDivisionCards observations={weather.observations} />

          {(impact?.high_flood_divisions.length ?? 0) > 0 ||
          (impact?.high_cyclone_divisions.length ?? 0) > 0 ? (
            <div className="flex flex-wrap gap-2">
              {impact?.high_flood_divisions.map((d) => (
                <Badge key={`f-${d}`} className="bg-blue-500/15 text-blue-300">
                  <CloudRain className="mr-1 h-3 w-3" />
                  {t("floodWatch")}: {d}
                </Badge>
              ))}
              {impact?.high_cyclone_divisions.map((d) => (
                <Badge key={`c-${d}`} className="bg-sky-500/15 text-sky-300">
                  <Wind className="mr-1 h-3 w-3" />
                  {t("cycloneWatch")}: {d}
                </Badge>
              ))}
              {impact?.high_heat_divisions.map((d) => (
                <Badge key={`h-${d}`} className="bg-orange-500/15 text-orange-300">
                  <ThermometerSun className="mr-1 h-3 w-3" />
                  {t("heatWatch")}: {d}
                </Badge>
              ))}
            </div>
          ) : null}
        </div>
      )}

      {overlay && weather && (
        <HazardWeatherMap
          filter={filter}
          zones={overlay.zones}
          observations={weather.observations}
          alerts={weather.alerts}
          className="mb-6"
        />
      )}

      {weather && weather.alerts.length > 0 && (
        <div className="glass-panel mb-6 rounded-xl p-4 shadow-panel">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-red-400">
            <AlertTriangle className="h-4 w-4" />
            {t("activeDisasterAlerts")}
          </h3>
          <ul className="space-y-2">
            {weather.alerts.map((a) => (
              <li
                key={a.id}
                className={cn(
                  "rounded-lg border px-3 py-2.5 text-sm",
                  a.severity >= 4
                    ? "border-red-500/40 bg-red-500/5"
                    : "border-amber-500/40 bg-amber-500/5",
                )}
              >
                <div className="flex items-start gap-2">
                  <Badge variant="outline">L{a.severity}</Badge>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{a.title_bn ?? a.title}</p>
                    {a.division && (
                      <p className="text-xs text-muted-foreground">{a.division}</p>
                    )}
                    {a.population_at_risk != null && a.population_at_risk > 0 && (
                      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <Users className="h-3 w-3" />
                        {t("peopleAtRisk")}: {formatPopulation(a.population_at_risk)}
                      </p>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {overlay && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="glass-panel rounded-xl p-4 shadow-panel">
            <h3 className="mb-3 text-sm font-semibold">{t("activeHazardZones")}</h3>
            <ul className="max-h-[360px] space-y-2 overflow-y-auto">
              {overlay.zones.map((z) => (
                <li
                  key={z.zone_id}
                  className="flex items-center gap-2 rounded-lg border border-border/50 px-3 py-2 text-sm"
                >
                  {z.hazard_type === "cyclone" ? (
                    <Wind className="h-4 w-4 text-sky-400" />
                  ) : z.hazard_type === "heat" ? (
                    <ThermometerSun className="h-4 w-4 text-orange-400" />
                  ) : (
                    <CloudRain className="h-4 w-4 text-blue-400" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{z.name}</p>
                    <p className="font-bengali truncate text-xs text-muted-foreground">
                      {z.name_bn}
                    </p>
                  </div>
                  <Badge variant="outline" className="shrink-0">
                    L{z.risk_level}
                  </Badge>
                </li>
              ))}
            </ul>
          </div>

          <div className="glass-panel rounded-xl p-4 shadow-panel">
            <h3 className="mb-1 text-sm font-semibold text-red-400">{t("projectsAtRisk")}</h3>
            <p className="mb-3 text-xs text-muted-foreground">{overlay.narrative_bn}</p>
            <ul className="max-h-[360px] space-y-2 overflow-y-auto">
              {overlay.exposures.length === 0 ? (
                <li className="text-sm text-muted-foreground">{t("noHighExposure")}</li>
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
                      {t("exposureDetail", {
                        zone: e.nearest_zone_bn,
                        distance: e.distance_km,
                        score: e.exposure_score,
                      })}
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
