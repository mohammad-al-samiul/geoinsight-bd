"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import {
  ArrowLeft,
  Landmark,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Siren,
  Sparkles,
} from "lucide-react";
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

export function PoliticsOutlookPanel() {
  const t = useTranslations("modules.outlookPolitics");
  const locale = useLocale();
  const { data, loading, error, reload, refresh, refreshing } = useStrategicOutlook();
  useRealtimeRefresh(reload);

  const deep = data?.politics_deep;
  const sources =
    data?.sources.filter((s) => s.domain === "politics" || s.domain === "both").slice(0, 16) ?? [];
  const direction = data?.direction.find((d) => d.domain === "politics");
  const scenarios = data?.scenarios ?? [];

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
            <StatCard label={t("upcoming")} value={deep.upcoming_issues.length} accent="warning" />
            <StatCard label={t("solutions")} value={deep.solutions.length} />
            <StatCard
              label={t("trajectory")}
              value={direction?.trajectory ?? "—"}
            />
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
              {t("badgePolitics")}
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
            <SectionHead title={t("narrative")} icon={<Landmark className="h-4 w-4 text-primary" />} />
            <p className="text-sm leading-relaxed text-foreground/90">{deep.narrative}</p>
          </div>

          <section>
            <SectionHead title={t("gaugesTitle")} hint={t("gaugesHint")} />
            <GaugeGrid gauges={deep.gauges} />
          </section>

          <section>
            <SectionHead
              title={t("currentTitle")}
              hint={t("currentHint")}
              icon={<Siren className="h-4 w-4 text-red-400" />}
            />
            <PressureCards items={deep.current_pressures} evidenceLabel={t("evidence")} />
          </section>

          <section>
            <SectionHead
              title={t("upcomingTitle")}
              hint={t("upcomingHint")}
              icon={<ShieldAlert className="h-4 w-4 text-amber-400" />}
            />
            <RiskCards items={deep.upcoming_issues} />
          </section>

          <section>
            <SectionHead
              title={t("solutionsTitle")}
              hint={t("solutionsHint")}
              icon={<Sparkles className="h-4 w-4 text-sky-400" />}
            />
            <SolutionCards items={deep.solutions} />
          </section>

          <section>
            <SectionHead
              title={t("preventionTitle")}
              hint={t("preventionHint")}
              icon={<ShieldCheck className="h-4 w-4 text-emerald-400" />}
            />
            <PreventionCards items={deep.prevention} />
          </section>

          {scenarios.length > 0 && (
            <section>
              <SectionHead title={t("scenariosTitle")} hint={t("scenariosHint")} />
              <div className="grid gap-3 md:grid-cols-3">
                {scenarios.map((s) => (
                  <div
                    key={s.label}
                    className={cn(
                      "rounded-xl border p-4",
                      s.probability_band === "adverse" && "border-red-500/40 bg-red-500/5",
                      s.probability_band === "reform" && "border-emerald-500/40 bg-emerald-500/5",
                      s.probability_band === "base" && "border-sky-500/40 bg-sky-500/5",
                    )}
                  >
                    <h4 className="text-sm font-semibold">{s.label}</h4>
                    <p className="mt-1 text-[10px] text-muted-foreground">{s.horizon}</p>
                    <p className="mt-3 text-xs leading-relaxed">{s.politics}</p>
                    <ul className="mt-3 space-y-1">
                      {s.watchpoints.map((w) => (
                        <li key={w} className="text-[10px] text-muted-foreground">
                          • {w}
                        </li>
                      ))}
                    </ul>
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
