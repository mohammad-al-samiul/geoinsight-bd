"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { IntelCard } from "@/components/ui/intel-card";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  Home,
  Newspaper,
  PawPrint,
  UserRound,
  Users,
  HeartPulse,
} from "lucide-react";
import { SourceLink } from "@/components/ui/source-link";

export interface DistrictImpactRow {
  district: string;
  deaths: number;
  civilian_deaths?: number;
  injuries: number;
  homes_damaged?: number;
  livestock_lost?: number;
  damage_mentions?: number;
  death_mentions?: number;
  injury_mentions?: number;
}

export interface EventImpactRow {
  id: string;
  label: string;
  title: string;
  district: string;
  day: string;
  deaths: number;
  injuries: number;
  civilian_deaths?: number;
  homes_damaged?: number;
  livestock_lost?: number;
  url?: string | null;
}

export interface SegmentedImpactStats {
  window_days?: number;
  method?: string;
  deaths?: number;
  civilian_deaths?: number;
  injuries?: number;
  homes_damaged?: number;
  livestock_lost?: number;
  damage_mentions?: number;
  death_mentions?: number;
  injury_mentions?: number;
  article_count?: number;
  raw_sum_deaths?: number;
  excluded_historical_articles?: number;
  excluded_historical_peak?: number;
  by_district?: DistrictImpactRow[];
  by_event?: EventImpactRow[];
  evidence?: string[];
  disclaimer_bn?: string;
  disclaimer_en?: string;
  disclaimer?: string;
  default_window?: number;
  place_count?: number;
  windows?: Record<string, Omit<SegmentedImpactStats, "windows" | "default_window">>;
}

interface ImpactStatsPanelProps {
  title: string;
  subtitle?: string;
  stats: SegmentedImpactStats;
  locale?: string;
  labels: {
    deaths: string;
    civilian: string;
    injuries: string;
    homes: string;
    livestock: string;
    damageMentions: string;
    evidence: string;
    estimate?: string;
    mentions?: string;
    window1?: string;
    window7?: string;
    window30?: string;
    byDistrict?: string;
    byEvent?: string;
    byEventHint?: string;
    deathMentions?: string;
    injuryMentions?: string;
    historicalNote?: string;
    rawSumHint?: string;
    methodHint?: string;
  };
  className?: string;
}

function StatTile({
  icon,
  label,
  value,
  accent,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  accent: string;
  hint?: string;
}) {
  return (
    <div className={cn("rounded-xl border p-3", accent)}>
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-[10px] font-semibold uppercase tracking-wider">{label}</span>
      </div>
      <p className="mt-2 font-display text-2xl font-semibold tabular-nums">
        {value.toLocaleString()}
      </p>
      {hint ? <p className="mt-0.5 text-[10px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function hasPlaceLoss(d: DistrictImpactRow) {
  return (
    d.district !== "National" &&
    d.district !== "জাতীয়" &&
    ((d.deaths ?? 0) > 0 ||
      (d.injuries ?? 0) > 0 ||
      (d.homes_damaged ?? 0) > 0 ||
      (d.livestock_lost ?? 0) > 0)
  );
}

function placeSeverity(d: DistrictImpactRow) {
  return (
    (d.deaths ?? 0) * 1000 +
    (d.injuries ?? 0) * 100 +
    (d.homes_damaged ?? 0) * 10 +
    Math.min(d.livestock_lost ?? 0, 200)
  );
}

const tooltipStyle = {
  background: "#0f172a",
  border: "1px solid #334155",
  borderRadius: 8,
  fontSize: 12,
};

export function ImpactStatsPanel({
  title,
  subtitle,
  stats,
  locale = "bn",
  labels,
  className,
}: ImpactStatsPanelProps) {
  const windowKeys = useMemo(() => {
    if (stats.windows) {
      return Object.keys(stats.windows)
        .map(Number)
        .filter((n) => Number.isFinite(n))
        .sort((a, b) => a - b);
    }
    return [] as number[];
  }, [stats.windows]);

  const [windowDays, setWindowDays] = useState(
    stats.default_window ?? stats.window_days ?? 7,
  );
  const [showAllPlaces, setShowAllPlaces] = useState(false);

  const active = useMemo(() => {
    const fromWindow = stats.windows?.[String(windowDays)];
    return fromWindow ?? stats;
  }, [stats, windowDays]);

  const disclaimer =
    active.disclaimer ??
    (locale === "bn" ? active.disclaimer_bn ?? stats.disclaimer_bn : active.disclaimer_en ?? stats.disclaimer_en);

  const hasMentions =
    (active.death_mentions ?? 0) > 0 ||
    (active.injury_mentions ?? 0) > 0 ||
    active.death_mentions !== undefined;

  const placeRows = useMemo(() => {
    return [...(active.by_district ?? [])]
      .filter(hasPlaceLoss)
      .sort((a, b) => placeSeverity(b) - placeSeverity(a));
  }, [active.by_district]);

  const placeChart = useMemo(() => {
    const rows = showAllPlaces ? placeRows : placeRows.slice(0, 20);
    return rows
      .map((d) => ({
        name: d.district.length > 18 ? `${d.district.slice(0, 16)}…` : d.district,
        fullName: d.district,
        [labels.deaths]: d.deaths,
        [labels.injuries]: d.injuries,
        [labels.homes]: d.homes_damaged ?? 0,
        [labels.livestock]: d.livestock_lost ?? 0,
        deaths: d.deaths,
        injuries: d.injuries,
        homes: d.homes_damaged ?? 0,
        livestock: d.livestock_lost ?? 0,
      }))
      .reverse();
  }, [placeRows, showAllPlaces, labels.deaths, labels.injuries, labels.homes, labels.livestock]);

  const chartHeight = Math.max(260, placeChart.length * 36);

  return (
    <IntelCard accent="danger" padding="lg" hoverLift={false} className={className}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-sm font-semibold tracking-tight">{title}</h3>
          {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
          <p className="mt-1.5 text-[10px] text-muted-foreground/90">
            {labels.methodHint ??
              (locale === "bn"
                ? "খবরে নাম থাকা সব উপজেলা/জেলা — নিহত, আহত, ঘর, গবাদি পশু (দিনে সর্বোচ্চ)"
                : "Every named upazila/district from news — deaths, injuries, homes, livestock")}
          </p>
          {placeRows.length > 0 && (
            <p className="mt-1 text-[11px] text-sky-300/90">
              {locale === "bn"
                ? `${placeRows.length}টি স্থানে ক্ষয়ক্ষতির খবর পাওয়া গেছে`
                : `${placeRows.length} places with reported impact`}
            </p>
          )}
        </div>

        {windowKeys.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {windowKeys.map((d) => {
              const label =
                d === 1
                  ? labels.window1 ?? (locale === "bn" ? "আজ" : "1d")
                  : d === 7
                    ? labels.window7 ?? (locale === "bn" ? "৭ দিন" : "7d")
                    : d === 30
                      ? labels.window30 ?? (locale === "bn" ? "৩০ দিন" : "30d")
                      : `${d}d`;
              const selected = windowDays === d;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => setWindowDays(d)}
                  className={cn(
                    "rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors",
                    selected
                      ? "border-teal-400/50 bg-teal-500/15 text-teal-200"
                      : "border-border/60 bg-background/40 text-muted-foreground hover:border-border hover:text-foreground",
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <p className="mt-4 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {labels.estimate ?? (locale === "bn" ? "আনুমানিক মোট ক্ষয়ক্ষতি" : "Conservative estimate")}
      </p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatTile
          icon={<Users className="h-3.5 w-3.5 text-red-400" />}
          label={labels.deaths}
          value={active.deaths ?? 0}
          accent="border-red-500/30 bg-red-500/5"
        />
        <StatTile
          icon={<UserRound className="h-3.5 w-3.5 text-orange-400" />}
          label={labels.civilian}
          value={active.civilian_deaths ?? 0}
          accent="border-orange-500/30 bg-orange-500/5"
        />
        <StatTile
          icon={<HeartPulse className="h-3.5 w-3.5 text-amber-400" />}
          label={labels.injuries}
          value={active.injuries ?? 0}
          accent="border-amber-500/30 bg-amber-500/5"
        />
        <StatTile
          icon={<Home className="h-3.5 w-3.5 text-sky-400" />}
          label={labels.homes}
          value={active.homes_damaged ?? 0}
          accent="border-sky-500/30 bg-sky-500/5"
        />
        <StatTile
          icon={<PawPrint className="h-3.5 w-3.5 text-emerald-400" />}
          label={labels.livestock}
          value={active.livestock_lost ?? 0}
          accent="border-emerald-500/30 bg-emerald-500/5"
        />
        <StatTile
          icon={<AlertTriangle className="h-3.5 w-3.5 text-violet-400" />}
          label={labels.damageMentions}
          value={active.damage_mentions ?? 0}
          accent="border-violet-500/30 bg-violet-500/5"
        />
      </div>

      {/* Primary: full place table — clearest view of every upazila/district */}
      {placeRows.length > 0 && (
        <div className="mt-5">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {labels.byDistrict ??
                  (locale === "bn" ? "উপজেলা / জেলাভিত্তিক ক্ষয়ক্ষতি" : "Impact by upazila / district")}
              </p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                {locale === "bn"
                  ? "বাঁশখালী শুধু উদাহরণ — খবরে যেসব স্থান এসেছে সব এখানে"
                  : "Banshkhali is only an example — every place named in news appears here"}
              </p>
            </div>
            {placeRows.length > 20 && (
              <button
                type="button"
                onClick={() => setShowAllPlaces((v) => !v)}
                className="rounded-lg border border-border/60 px-2.5 py-1 text-[11px] text-sky-300 hover:border-sky-500/40"
              >
                {showAllPlaces
                  ? locale === "bn"
                    ? "কম দেখান"
                    : "Show less"
                  : locale === "bn"
                    ? `সব ${placeRows.length} স্থান`
                    : `All ${placeRows.length} places`}
              </button>
            )}
          </div>

          <div className="overflow-x-auto rounded-xl border border-border/50">
            <table className="w-full min-w-[520px] text-left text-xs">
              <thead className="bg-background/50 text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-semibold">
                    {locale === "bn" ? "স্থান" : "Place"}
                  </th>
                  <th className="px-3 py-2 font-semibold tabular-nums text-red-300">
                    {labels.deaths}
                  </th>
                  <th className="px-3 py-2 font-semibold tabular-nums text-amber-300">
                    {labels.injuries}
                  </th>
                  <th className="px-3 py-2 font-semibold tabular-nums text-sky-300">
                    {labels.homes}
                  </th>
                  <th className="px-3 py-2 font-semibold tabular-nums text-emerald-300">
                    {labels.livestock}
                  </th>
                </tr>
              </thead>
              <tbody>
                {(showAllPlaces ? placeRows : placeRows.slice(0, 20)).map((d) => (
                  <tr
                    key={d.district}
                    className="border-t border-border/40 odd:bg-background/20"
                  >
                    <td className="max-w-[200px] truncate px-3 py-2 font-medium" title={d.district}>
                      {d.district}
                    </td>
                    <td className="px-3 py-2 tabular-nums text-red-300">{d.deaths}</td>
                    <td className="px-3 py-2 tabular-nums text-amber-300">{d.injuries}</td>
                    <td className="px-3 py-2 tabular-nums text-sky-300">
                      {d.homes_damaged ?? 0}
                    </td>
                    <td className="px-3 py-2 tabular-nums text-emerald-300">
                      {d.livestock_lost ?? 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {placeChart.length > 0 && (
        <div className="mt-5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {locale === "bn" ? "তুলনামূলক চার্ট (৪ সূচক)" : "Comparison chart (4 metrics)"}
          </p>
          <div className="mt-3 rounded-xl border border-border/50 bg-background/30 p-2 sm:p-3">
            <ResponsiveContainer width="100%" height={chartHeight}>
              <BarChart
                data={placeChart}
                layout="vertical"
                margin={{ left: 8, right: 16, top: 8, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fill: "#94a3b8", fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={110}
                  tick={{ fill: "#cbd5e1", fontSize: 10 }}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelStyle={{ color: "#e2e8f0" }}
                  labelFormatter={(_, payload) => {
                    const row = payload?.[0]?.payload as { fullName?: string } | undefined;
                    return row?.fullName ?? "";
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey={labels.deaths} fill="#ef4444" radius={[0, 3, 3, 0]} maxBarSize={12} />
                <Bar dataKey={labels.injuries} fill="#f59e0b" radius={[0, 3, 3, 0]} maxBarSize={12} />
                <Bar dataKey={labels.homes} fill="#38bdf8" radius={[0, 3, 3, 0]} maxBarSize={12} />
                <Bar
                  dataKey={labels.livestock}
                  fill="#34d399"
                  radius={[0, 3, 3, 0]}
                  maxBarSize={12}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {hasMentions && (
        <>
          <p className="mt-4 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {labels.mentions ?? (locale === "bn" ? "খবরে উল্লেখ (বার)" : "News mentions (count)")}
          </p>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            <StatTile
              icon={<Newspaper className="h-3.5 w-3.5 text-red-300" />}
              label={labels.deathMentions ?? (locale === "bn" ? "নিহত উল্লেখ" : "Death mentions")}
              value={active.death_mentions ?? 0}
              accent="border-border/50 bg-background/30"
              hint={
                locale === "bn" ? "কতটা খবরে নিহতের কথা" : "Articles mentioning deaths"
              }
            />
            <StatTile
              icon={<Newspaper className="h-3.5 w-3.5 text-amber-300" />}
              label={labels.injuryMentions ?? (locale === "bn" ? "আহত উল্লেখ" : "Injury mentions")}
              value={active.injury_mentions ?? 0}
              accent="border-border/50 bg-background/30"
              hint={locale === "bn" ? "কতটা খবরে আহতের কথা" : "Articles mentioning injuries"}
            />
            {(active.raw_sum_deaths ?? 0) > (active.deaths ?? 0) && (
              <StatTile
                icon={<AlertTriangle className="h-3.5 w-3.5 text-muted-foreground" />}
                label={labels.rawSumHint ?? (locale === "bn" ? "পুরনো যোগফল" : "Old raw sum")}
                value={active.raw_sum_deaths ?? 0}
                accent="border-border/40 bg-muted/20"
                hint={
                  locale === "bn"
                    ? "খবর যোগ করলে যা হত (ভুল)"
                    : "If every headline were added (misleading)"
                }
              />
            )}
          </div>
        </>
      )}

      {active.by_event && active.by_event.length > 0 && (
        <div className="mt-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {locale === "bn" ? "ঘটনা ও সোর্স খবর" : "Incidents & source articles"}
          </p>
          <ul className="mt-2 max-h-56 space-y-1.5 overflow-y-auto">
            {active.by_event.slice(0, 24).map((e) => (
              <li
                key={e.id}
                className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-border/40 px-2.5 py-1.5 text-xs"
              >
                <SourceLink
                  href={e.url}
                  title={e.title}
                  meta={`${e.district} · ${e.day}`}
                  className="min-w-0 flex-1"
                  clamp={1}
                  openText={locale === "bn" ? "খবর" : "Open"}
                  openLabel={locale === "bn" ? "সোর্স খবর খুলুন" : "Open source article"}
                />
                <span className="shrink-0 self-center space-x-1.5 tabular-nums text-[11px] text-muted-foreground">
                  <span className="text-red-300">
                    {labels.deaths} {e.deaths}
                  </span>
                  <span className="text-amber-300">
                    {labels.injuries} {e.injuries}
                  </span>
                  <span className="text-sky-300">
                    {labels.homes} {e.homes_damaged ?? 0}
                  </span>
                  <span className="text-emerald-300">
                    {labels.livestock} {e.livestock_lost ?? 0}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {active.evidence && active.evidence.length > 0 && (
        <div className="mt-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {labels.evidence}
          </p>
          <ul className="mt-2 space-y-1">
            {active.evidence.slice(0, 8).map((e) => (
              <li key={e} className="truncate text-xs text-muted-foreground">
                • {e}
              </li>
            ))}
          </ul>
        </div>
      )}

      {(active.excluded_historical_articles ?? 0) > 0 && (
        <p className="mt-3 text-[10px] leading-relaxed text-amber-300/90">
          {labels.historicalNote ??
            (locale === "bn"
              ? `${active.excluded_historical_articles}টি খবরে বড়/ঐতিহাসিক মোট বাদ (চূড়া ${active.excluded_historical_peak})।`
              : `Excluded ${active.excluded_historical_articles} historical/large tallies (peak ${active.excluded_historical_peak}).`)}
        </p>
      )}

      {disclaimer && (
        <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground/90">{disclaimer}</p>
      )}
    </IntelCard>
  );
}
