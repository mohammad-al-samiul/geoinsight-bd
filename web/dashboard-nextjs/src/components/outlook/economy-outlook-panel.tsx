"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  LineChart,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Wallet,
} from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ModuleShell, StatCard, StatGrid } from "@/components/modules/module-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SourceLink } from "@/components/ui/source-link";
import { useRealtimeRefresh } from "@/hooks/use-realtime-refresh";
import { useStrategicOutlook } from "@/hooks/use-strategic-outlook";
import { cn } from "@/lib/utils";
import {
  GaugeGrid,
  PreventionCards,
  PressureCards,
  RiskCards,
  SectionHead,
  SolutionCards,
} from "./outlook-visuals";

function DirIcon({ direction }: { direction: string }) {
  if (direction === "up") return <ArrowUpRight className="h-4 w-4 text-red-400" />;
  if (direction === "down") return <ArrowDownRight className="h-4 w-4 text-emerald-400" />;
  return <ArrowRight className="h-4 w-4 text-amber-400" />;
}

export function EconomyOutlookPanel() {
  const t = useTranslations("modules.outlookEconomy");
  const locale = useLocale();
  const { data, loading, error, reload, refresh, refreshing } = useStrategicOutlook();
  useRealtimeRefresh(reload);

  const deep = data?.economy_deep;
  const sources =
    data?.sources.filter((s) => s.domain === "economy" || s.domain === "both").slice(0, 16) ?? [];
  const direction = data?.direction.find((d) => d.domain === "economy");
  const scenarios = data?.scenarios ?? [];
  const gdpChart =
    deep?.gdp_levers.map((g) => ({
      name: g.sector.length > 18 ? `${g.sector.slice(0, 16)}…` : g.sector,
      score: g.score,
    })) ?? [];

  return (
    <ModuleShell
      title={t("title")}
      description={t("description")}
      loading={loading}
      error={error}
      onRetry={reload}
      stats={
        data && deep && (
          <StatGrid>
            <StatCard label={t("pressures")} value={deep.current_pressures.length} accent="danger" />
            <StatCard label={t("prices")} value={deep.price_outlook.length} accent="warning" />
            <StatCard label={t("gdpLevers")} value={deep.gdp_levers.length} />
            <StatCard label={t("trajectory")} value={direction?.trajectory ?? "—"} />
          </StatGrid>
        )
      }
    >
      {data && deep && (
        <div className="space-y-8">
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild size="sm" variant="ghost" className="gap-1.5 px-2">
              <Link href="/outlook">
                <ArrowLeft className="h-3.5 w-3.5" />
                {t("backHub")}
              </Link>
            </Button>
            <Badge variant="outline" className="text-[10px]">
              {t("badgeEconomy")}
            </Badge>
            {data.government && (
              <Badge className="border-teal-500/40 bg-teal-500/10 text-[10px] text-teal-200">
                {locale === "bn" ? data.government.label_bn : data.government.label_en}
              </Badge>
            )}
            <Button
              size="sm"
              variant="outline"
              className="ml-auto gap-2"
              disabled={refreshing}
              onClick={() => void refresh()}
            >
              <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
              {refreshing ? t("refreshing") : t("refresh")}
            </Button>
          </div>

          <p className="text-xs leading-relaxed text-muted-foreground">{data.disclaimer}</p>

          <div className="glass-panel rounded-xl p-4 shadow-panel">
            <SectionHead title={t("narrative")} icon={<LineChart className="h-4 w-4 text-primary" />} />
            <p className="text-sm leading-relaxed text-foreground/90">{deep.narrative}</p>
          </div>

          <section>
            <SectionHead title={t("gaugesTitle")} hint={t("gaugesHint")} />
            <GaugeGrid gauges={deep.gauges} />
          </section>

          <section>
            <SectionHead title={t("currentTitle")} hint={t("currentHint")} />
            <PressureCards items={deep.current_pressures} evidenceLabel={t("evidence")} />
          </section>

          <section>
            <SectionHead
              title={t("priceTitle")}
              hint={t("priceHint")}
              icon={<TrendingUp className="h-4 w-4 text-amber-400" />}
            />
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {deep.price_outlook.map((p) => (
                <div key={p.item} className="glass-panel flex gap-3 rounded-xl p-3 shadow-panel">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary">
                    <DirIcon direction={p.direction} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <h4 className="text-sm font-semibold">{p.item}</h4>
                      <Badge variant="outline" className="text-[10px]">
                        {p.direction}/{p.magnitude}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{p.reason}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {t("confidence")}: {p.confidence}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <SectionHead title={t("gdpTitle")} hint={t("gdpHint")} />
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="glass-panel min-h-[280px] rounded-xl p-3 shadow-panel">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={gdpChart} margin={{ top: 8, right: 8, left: 0, bottom: 48 }}>
                    <XAxis
                      dataKey="name"
                      interval={0}
                      angle={-28}
                      textAnchor="end"
                      tick={{ fill: "#94a3b8", fontSize: 10 }}
                      height={60}
                    />
                    <YAxis domain={[0, 100]} tick={{ fill: "#94a3b8", fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        background: "#0f172a",
                        border: "1px solid #334155",
                        borderRadius: 8,
                      }}
                    />
                    <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                      {gdpChart.map((d) => (
                        <Cell key={d.name} fill={d.score >= 75 ? "#10b981" : "#38bdf8"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                {deep.gdp_levers.map((g) => (
                  <div key={g.sector} className="rounded-xl border border-border/60 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-sm font-semibold">{g.sector}</h4>
                      <Badge variant="outline" className="text-[10px]">
                        {g.score}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{g.action}</p>
                    <p className="mt-1 text-xs text-foreground/85">{g.gdp_impact}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {t("feasibility")}: {g.feasibility}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section>
            <SectionHead
              title={t("investTitle")}
              hint={t("investHint")}
              icon={<Wallet className="h-4 w-4 text-sky-400" />}
            />
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {deep.investments.map((inv) => (
                <div
                  key={inv.sector}
                  className={cn(
                    "rounded-xl border p-4",
                    inv.outlook === "profit" && "border-emerald-500/40 bg-emerald-500/5",
                    inv.outlook === "loss" && "border-red-500/40 bg-red-500/5",
                    inv.outlook === "mixed" && "border-amber-500/40 bg-amber-500/5",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-semibold">{inv.sector}</h4>
                    <Badge variant="outline" className="text-[10px]">
                      {inv.outlook}
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{inv.rationale}</p>
                  <p className="mt-2 text-[10px] text-foreground/80">
                    {t("risk")}: {inv.risk}
                  </p>
                  <p className="mt-1 text-[10px] text-muted-foreground">{inv.horizon}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <SectionHead
              title={t("upcomingTitle")}
              icon={<ShieldAlert className="h-4 w-4 text-amber-400" />}
            />
            <RiskCards items={deep.upcoming_issues} />
          </section>

          <section>
            <SectionHead
              title={t("solutionsTitle")}
              icon={<Sparkles className="h-4 w-4 text-sky-400" />}
            />
            <SolutionCards items={deep.solutions} />
          </section>

          <section>
            <SectionHead
              title={t("preventionTitle")}
              icon={<ShieldCheck className="h-4 w-4 text-emerald-400" />}
            />
            <PreventionCards items={deep.prevention} />
          </section>

          {scenarios.length > 0 && (
            <section>
              <SectionHead title={t("scenariosTitle")} />
              <div className="grid gap-3 md:grid-cols-3">
                {scenarios.map((s) => (
                  <div key={s.label} className="glass-panel rounded-xl p-4 shadow-panel">
                    <h4 className="text-sm font-semibold">{s.label}</h4>
                    <p className="mt-3 text-xs leading-relaxed">{s.economy}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section>
            <SectionHead title={t("sourcesTitle")} />
            <ul className="space-y-2">
              {sources.map((s) => (
                <li key={s.url || s.title} className="glass-panel rounded-lg px-3 py-2 text-xs">
                  <SourceLink
                    href={s.url}
                    title={s.title}
                    meta={s.source}
                    openText="খবর"
                    openLabel="মূল খবর নতুন ট্যাবে খুলুন"
                  />
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </ModuleShell>
  );
}
