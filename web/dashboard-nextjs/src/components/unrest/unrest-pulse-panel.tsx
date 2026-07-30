"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  AlertTriangle,
  Home,
  MapPin,
  Megaphone,
  Radio,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ModuleShell, StatCard, StatGrid } from "@/components/modules/module-shell";
import { Badge } from "@/components/ui/badge";
import { useRealtimeRefresh } from "@/hooks/use-realtime-refresh";
import { useUnrestPulse, type ProtestMovement } from "@/hooks/use-unrest-pulse";
import { IntelCard } from "@/components/ui/intel-card";
import { SourceLink } from "@/components/ui/source-link";
import { cn } from "@/lib/utils";
import { chartTooltipProps } from "@/lib/chart-tooltip";

const THEME_ORDER = [
  "hsc_exam",
  "ssc_exam",
  "student",
  "corruption",
  "road_transport",
  "power",
  "gas_fuel",
  "law_bill",
  "wage",
  "quota",
  "farmer",
  "land_eviction",
  "water_flood",
  "hartal_blockade",
  "minority",
  "general",
] as const;

function themeKey(m: ProtestMovement): string {
  return m.theme_id || "general";
}

function movementWeight(m: ProtestMovement): number {
  const statusBoost = m.status === "active" ? 1000 : m.status === "recent" ? 400 : 0;
  return (
    statusBoost +
    m.impact.deaths * 100 +
    m.impact.injuries * 10 +
    m.article_count * 3 +
    m.severity
  );
}

export function UnrestPulsePanel() {
  const t = useTranslations("modules.unrest");
  const locale = useLocale();
  const { data, loading, error, reload } = useUnrestPulse();
  useRealtimeRefresh(reload);
  const [themeFilter, setThemeFilter] = useState<string>("all");
  const [timeFilterDays, setTimeFilterDays] = useState<number>(30); // default to 30 days

  /** Drop weak national “general” noise when named categories exist */
  const movements = useMemo(() => {
    const raw = data?.movements ?? [];
    
    const now = new Date();
    const filteredByTime = timeFilterDays === 0 ? raw : raw.filter(m => {
      const lastSeen = new Date(m.last_seen_at);
      const diffTime = Math.abs(now.getTime() - lastSeen.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= timeFilterDays;
    });

    const named = filteredByTime.filter((m) => themeKey(m) !== "general");
    const base = named.length > 0 ? named : filteredByTime;
    return [...base].sort((a, b) => movementWeight(b) - movementWeight(a));
  }, [data?.movements, timeFilterDays]);

  const themeGroups = useMemo(() => {
    const map = new Map<
      string,
      { id: string; label: string; label_bn: string; items: ProtestMovement[]; count: number }
    >();
    for (const m of movements) {
      const id = themeKey(m);
      const prev = map.get(id);
      if (!prev) {
        map.set(id, {
          id,
          label: m.theme,
          label_bn: m.theme_bn,
          items: [m],
          count: m.article_count,
        });
      } else {
        prev.items.push(m);
        prev.count += m.article_count;
      }
    }
    for (const g of map.values()) {
      g.items.sort((a, b) => movementWeight(b) - movementWeight(a));
    }
    return [...map.values()].sort((a, b) => {
      const ia = THEME_ORDER.indexOf(a.id as (typeof THEME_ORDER)[number]);
      const ib = THEME_ORDER.indexOf(b.id as (typeof THEME_ORDER)[number]);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });
  }, [movements]);

  const filteredGroups = useMemo(() => {
    if (themeFilter === "all") return themeGroups;
    return themeGroups.filter((g) => g.id === themeFilter);
  }, [themeGroups, themeFilter]);

  const districtChart = useMemo(() => {
    if (!data?.districts?.length) return [];
    return [...data.districts]
      .map((d) => ({
        name: d.district.length > 12 ? `${d.district.slice(0, 11)}…` : d.district,
        fullName: d.district,
        protests: Math.max(d.protest_count, 0),
      }))
      .filter((d) => d.protests > 0)
      .sort((a, b) => b.protests - a.protests)
      .slice(0, 10)
      .reverse();
  }, [data?.districts]);

  const totals = useMemo(() => {
    let deaths = 0;
    let injuries = 0;
    let active = 0;
    for (const m of movements) {
      deaths += m.impact.deaths;
      injuries += m.impact.injuries;
      if (m.status === "active") active += 1;
    }
    // Prefer segmented impact when available (avoids double-count across movements)
    const impact = data?.summary.impact;
    return {
      active: data?.summary.active_movements ?? active,
      districts: data?.summary.districts_at_risk ?? 0,
      deaths: impact?.deaths ?? deaths,
      injuries: impact?.injuries ?? injuries,
    };
  }, [movements, data?.summary]);

  const chartHeight = Math.max(200, districtChart.length * 30);
  const bn = locale === "bn";

  return (
    <ModuleShell
      title={t("title")}
      description={t("description")}
      loading={loading}
      error={error}
      onRetry={reload}
      stats={
        data && (
          <StatGrid>
            <StatCard label={t("activeProtests")} value={totals.active} accent="danger" />
            <StatCard label={t("districtsAtRisk")} value={totals.districts} accent="danger" />
            <StatCard label={t("impactDeaths")} value={totals.deaths} accent="danger" />
            <StatCard label={t("impactInjured")} value={totals.injuries} />
          </StatGrid>
        )
      }
    >
      {data && (
        <div className="space-y-8">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Radio className="h-3.5 w-3.5 text-emerald-400" />
            <span>{t("liveSources")}</span>
            {data.summary.refreshed_at && (
              <span className="tabular-nums">
                {t("lastUpdate")}: {new Date(data.summary.refreshed_at).toLocaleString()}
              </span>
            )}
            {data.summary.top_district && (
              <span className="ml-auto inline-flex items-center gap-1 text-red-300">
                <TrendingUp className="h-3.5 w-3.5" />
                {t("hottest")}: {data.summary.top_district}
              </span>
            )}
          </div>

          {districtChart.length > 0 && (
            <section>
              <h3 className="font-display text-sm font-semibold tracking-tight">
                {t("districtChartTitle")}
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">{t("districtChartSubtitle")}</p>
              <div
                className="mt-3 rounded-xl border border-border/40 bg-background/30 px-2 py-3"
                style={{ height: chartHeight }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={districtChart}
                    margin={{ top: 0, right: 12, left: 4, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} tick={{ fill: "#94a3b8", fontSize: 11 }} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={88}
                      tick={{ fill: "#cbd5e1", fontSize: 11 }}
                    />
                    <Tooltip
                      {...chartTooltipProps}
                      formatter={(value) => [value as number, t("protest")]}
                      labelFormatter={(_, payload) =>
                        (payload?.[0]?.payload as { fullName?: string } | undefined)?.fullName ?? ""
                      }
                    />
                    <Bar
                      dataKey="protests"
                      fill="rgba(248, 113, 113, 0.88)"
                      radius={[0, 4, 4, 0]}
                      maxBarSize={16}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          )}

          <section className="space-y-4">
            <div>
              <h3 className="font-display text-sm font-semibold tracking-tight">
                {t("movementsTitle")}
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">{t("movementsSubtitle")}</p>
            </div>

            {movements.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("noSignals")}</p>
            ) : (
              <>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex flex-wrap gap-1.5">
                    <FilterChip
                      active={themeFilter === "all"}
                      onClick={() => setThemeFilter("all")}
                      label={`${t("themeAll")} (${movements.length})`}
                    />
                    {themeGroups.map((g) => (
                      <FilterChip
                        key={g.id}
                        active={themeFilter === g.id}
                        onClick={() => setThemeFilter(g.id)}
                        label={`${bn ? g.label_bn : g.label} (${g.items.length})`}
                        danger
                      />
                    ))}
                  </div>

                  <div className="flex items-center gap-2 shrink-0 border border-border/40 bg-background/50 p-1.5 rounded-lg shadow-sm">
                    <span className="text-[11px] font-semibold text-muted-foreground pl-1">
                      {bn ? "সময়কাল ফিল্টার:" : "Timeframe:"}
                    </span>
                    <select
                      value={timeFilterDays}
                      onChange={(e) => setTimeFilterDays(Number(e.target.value))}
                      className="rounded-md border border-input bg-card px-2 py-1 text-xs text-foreground font-medium focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                    >
                      <option value={7}>{bn ? "গত ৭ দিন" : "Last 7 Days"}</option>
                      <option value={15}>{bn ? "গত ১৫ দিন" : "Last 15 Days"}</option>
                      <option value={30}>{bn ? "গত ৩০ দিন" : "Last 30 Days"}</option>
                      <option value={0}>{bn ? "সকল সময় (All Time)" : "All Time"}</option>
                    </select>
                  </div>
                </div>

                {filteredGroups.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("noThemeMovements")}</p>
                ) : (
                  filteredGroups.map((group) => (
                    <div key={group.id} className="space-y-2.5">
                      <div className="flex items-baseline gap-2 border-b border-border/30 pb-1.5">
                        <h4 className="text-sm font-semibold text-foreground">
                          {bn ? group.label_bn : group.label}
                        </h4>
                        <span className="text-[11px] text-muted-foreground">
                          {group.items.length} {t("placesLabel")}
                        </span>
                      </div>
                      <div className="grid gap-3 lg:grid-cols-2">
                        {group.items.map((m) => (
                          <MovementCard key={m.id} movement={m} locale={locale} t={t} />
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </>
            )}
          </section>
        </div>
      )}
    </ModuleShell>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  danger,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors",
        active
          ? danger
            ? "border-red-400/50 bg-red-500/15 text-red-200"
            : "border-teal-400/50 bg-teal-500/15 text-teal-200"
          : "border-border/60 bg-background/40 text-muted-foreground hover:border-border hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}

function MovementCard({
  movement,
  locale,
  t,
}: {
  movement: ProtestMovement;
  locale: string;
  t: (key: string) => string;
}) {
  const bn = locale === "bn";
  const statusClass =
    movement.status === "active"
      ? "border-red-500/40 bg-red-500/15 text-red-200"
      : movement.status === "recent"
        ? "border-amber-500/40 bg-amber-500/10 text-amber-200"
        : "border-border/50 text-muted-foreground";

  const hasCasualties = movement.impact.deaths > 0 || movement.impact.injuries > 0;
  const hasDamage =
    movement.impact.homes_damaged > 0 || movement.impact.damage_mentions > 0;

  return (
    <IntelCard
      accent={movement.status === "active" ? "danger" : hasCasualties ? "warning" : "default"}
      padding="md"
      hoverLift={false}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-snug tracking-tight">
            {bn ? movement.title_bn : movement.title}
          </p>
          <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
            <MapPin className="h-3 w-3 shrink-0 opacity-80" />
            <span>{bn ? movement.place_bn : movement.place}</span>
            {movement.division ? <span className="opacity-70">· {movement.division}</span> : null}
          </p>
        </div>
        <span className={cn("shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-medium", statusClass)}>
          {bn ? movement.status_bn : movement.status_en}
        </span>
      </div>

      {(hasCasualties || hasDamage) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {movement.impact.deaths > 0 && (
            <ImpactChip
              icon={<AlertTriangle className="h-3 w-3" />}
              label={t("impactDeaths")}
              value={movement.impact.deaths}
              hot
            />
          )}
          {movement.impact.injuries > 0 && (
            <ImpactChip
              icon={<Users className="h-3 w-3" />}
              label={t("impactInjured")}
              value={movement.impact.injuries}
              hot
            />
          )}
          {movement.impact.homes_damaged > 0 && (
            <ImpactChip
              icon={<Home className="h-3 w-3" />}
              label={t("impactHomes")}
              value={movement.impact.homes_damaged}
            />
          )}
          {movement.impact.damage_mentions > 0 && movement.impact.homes_damaged === 0 && (
            <ImpactChip
              icon={<Home className="h-3 w-3" />}
              label={t("impactDamageMentions")}
              value={movement.impact.damage_mentions}
            />
          )}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
        <Badge variant="outline" className="text-[10px]">
          <Megaphone className="mr-1 h-3 w-3" />
          {movement.article_count} {t("reports")}
        </Badge>
        <span className="tabular-nums">
          {t("lastUpdate")}: {new Date(movement.last_seen_at).toLocaleDateString()}
        </span>
      </div>

      {movement.articles.length > 0 && (
        <ul className="mt-3 space-y-1.5 border-t border-border/40 pt-2.5">
          {movement.articles.slice(0, 2).map((a) => (
            <li key={a.id}>
              <SourceLink
                href={a.url}
                title={a.title}
                meta={a.source_name}
                openText={bn ? "খবর" : "Open"}
                openLabel={bn ? "সোর্স খবর খুলুন" : "Open source article"}
              />
            </li>
          ))}
        </ul>
      )}
    </IntelCard>
  );
}

function ImpactChip({
  icon,
  label,
  value,
  hot,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  hot?: boolean;
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border px-2 py-1",
        hot ? "border-red-500/40 bg-red-500/10" : "border-border/50 bg-background/30",
      )}
    >
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <span className={cn("text-xs font-semibold tabular-nums", hot && "text-red-300")}>
        {value.toLocaleString()}
      </span>
    </div>
  );
}
