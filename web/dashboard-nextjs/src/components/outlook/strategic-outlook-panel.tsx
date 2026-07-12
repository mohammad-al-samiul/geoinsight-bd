"use client";

import { useTranslations } from "next-intl";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Landmark,
  LineChart,
  RefreshCw,
  Scale,
} from "lucide-react";
import { ModuleShell, StatCard, StatGrid } from "@/components/modules/module-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRealtimeRefresh } from "@/hooks/use-realtime-refresh";
import { useStrategicOutlook } from "@/hooks/use-strategic-outlook";
import { cn } from "@/lib/utils";

function trajIcon(traj: string) {
  if (traj === "improving") return <ArrowUpRight className="h-3.5 w-3.5 text-emerald-400" />;
  if (traj === "deteriorating") return <ArrowDownRight className="h-3.5 w-3.5 text-red-400" />;
  return <ArrowRight className="h-3.5 w-3.5 text-amber-400" />;
}

function bandClass(band: string) {
  if (band === "adverse") return "border-red-500/40 bg-red-500/5";
  if (band === "reform") return "border-emerald-500/40 bg-emerald-500/5";
  return "border-sky-500/40 bg-sky-500/5";
}

export function StrategicOutlookPanel() {
  const t = useTranslations("modules.outlook");
  const { data, loading, error, reload, refresh, refreshing } = useStrategicOutlook();
  useRealtimeRefresh(reload);

  const politicsChallenges = data?.challenges.filter((c) => c.domain === "politics") ?? [];
  const economyChallenges = data?.challenges.filter((c) => c.domain === "economy") ?? [];
  const analystSources = data?.sources.filter((s) => s.analyst_like).slice(0, 12) ?? [];
  const allSources = data?.sources.slice(0, 20) ?? [];

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
            <StatCard label={t("sourcesUsed")} value={data.source_count ?? data.sources.length} />
            <StatCard
              label={t("politicalChallenges")}
              value={politicsChallenges.length}
              accent="danger"
            />
            <StatCard label={t("economicChallenges")} value={economyChallenges.length} />
            <StatCard
              label={t("aiMode")}
              value={data.llm_used ? t("llmOn") : t("rulesEngine")}
            />
          </StatGrid>
        )
      }
    >
      {data && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="text-[10px]">
              {t("horizon")}
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              {t("openSource")}
            </Badge>
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
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <BookOpen className="h-4 w-4 text-primary" />
              {t("executiveNarrative")}
            </h3>
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground/90">
              {data.narrative}
            </pre>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <ChallengeColumn
              title={t("politicsNow")}
              icon={<Landmark className="h-4 w-4 text-violet-400" />}
              items={politicsChallenges}
              empty={t("noChallenges")}
              evidenceLabel={t("evidence")}
            />
            <ChallengeColumn
              title={t("economyNow")}
              icon={<LineChart className="h-4 w-4 text-amber-400" />}
              items={economyChallenges}
              empty={t("noChallenges")}
              evidenceLabel={t("evidence")}
            />
          </div>

          <div className="glass-panel rounded-xl p-4 shadow-panel">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Scale className="h-4 w-4 text-sky-400" />
              {t("directionTitle")}
            </h3>
            <div className="grid gap-3 md:grid-cols-2">
              {data.direction.map((d) => (
                <div key={d.domain} className="rounded-lg border border-border/50 px-3 py-2.5">
                  <div className="mb-1 flex items-center gap-2">
                    {trajIcon(d.trajectory)}
                    <span className="text-sm font-medium capitalize">{d.domain}</span>
                    <Badge variant="outline" className="ml-auto text-[10px]">
                      {d.trajectory}
                    </Badge>
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground">{d.summary}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-panel rounded-xl p-4 shadow-panel">
            <h3 className="mb-1 text-sm font-semibold">{t("scenariosTitle")}</h3>
            <p className="mb-3 text-xs text-muted-foreground">{t("scenariosHint")}</p>
            <div className="grid gap-3 lg:grid-cols-3">
              {data.scenarios.map((s) => (
                <div key={s.label} className={cn("rounded-lg border px-3 py-3", bandClass(s.probability_band))}>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold">{s.label}</p>
                    <Badge variant="outline" className="text-[10px]">
                      {s.horizon}
                    </Badge>
                  </div>
                  <p className="text-xs leading-relaxed">
                    <span className="font-medium text-violet-300">{t("politics")}: </span>
                    {s.politics}
                  </p>
                  <p className="mt-2 text-xs leading-relaxed">
                    <span className="font-medium text-amber-300">{t("economy")}: </span>
                    {s.economy}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {s.watchpoints.map((w) => (
                      <Badge key={w} variant="outline" className="text-[10px]">
                        {w}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="glass-panel rounded-xl p-4 shadow-panel">
              <h3 className="mb-2 text-sm font-semibold">{t("analystSources")}</h3>
              <p className="mb-3 text-xs text-muted-foreground">{t("analystHint")}</p>
              <ul className="max-h-[320px] space-y-2 overflow-y-auto">
                {(analystSources.length ? analystSources : allSources.slice(0, 8)).map((s) => (
                  <li key={s.url} className="rounded-lg border border-border/50 px-3 py-2 text-sm">
                    <div className="mb-1 flex flex-wrap gap-1.5">
                      <Badge variant="outline" className="text-[10px]">
                        {s.source}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        {s.domain}
                      </Badge>
                    </div>
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium hover:text-primary hover:underline"
                    >
                      {s.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div className="glass-panel rounded-xl p-4 shadow-panel">
              <h3 className="mb-2 text-sm font-semibold">{t("allSources")}</h3>
              <ul className="max-h-[360px] space-y-2 overflow-y-auto">
                {allSources.map((s) => (
                  <li key={`${s.url}-all`} className="rounded-lg border border-border/40 px-3 py-2 text-sm">
                    <p className="text-[11px] text-muted-foreground">
                      {s.source} · {s.domain}
                    </p>
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="line-clamp-2 hover:text-primary hover:underline"
                    >
                      {s.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </ModuleShell>
  );
}

function ChallengeColumn({
  title,
  icon,
  items,
  empty,
  evidenceLabel,
}: {
  title: string;
  icon: React.ReactNode;
  items: { title: string; severity: number; summary: string; evidence: string[] }[];
  empty: string;
  evidenceLabel: string;
}) {
  return (
    <div className="glass-panel rounded-xl p-4 shadow-panel">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
        {icon}
        {title}
      </h3>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((c) => (
            <li
              key={c.title}
              className={cn(
                "rounded-lg border px-3 py-2.5",
                c.severity >= 4 ? "border-red-500/40 bg-red-500/5" : "border-border/50",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium">{c.title}</p>
                <Badge variant="outline">L{c.severity}</Badge>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{c.summary}</p>
              {c.evidence.length > 0 && (
                <div className="mt-2 space-y-1">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {evidenceLabel}
                  </p>
                  {c.evidence.slice(0, 2).map((e) => (
                    <p key={e} className="truncate text-[11px] text-foreground/70">
                      • {e}
                    </p>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
