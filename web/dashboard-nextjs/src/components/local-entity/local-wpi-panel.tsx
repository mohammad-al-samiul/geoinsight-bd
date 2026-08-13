"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Gauge, Layers3, RefreshCw } from "lucide-react";
import { DataTable, ModuleShell } from "@/components/modules/module-shell";
import {
  LocalAreaTrend,
  LocalBars,
  LocalDonut,
  LocalKpiSpark,
  LocalKpiSparkGrid,
  LocalPulseRing,
  LocalVizCard,
} from "@/components/local-entity/local-viz";
import { LocalWardMap } from "@/components/local-entity/local-ward-map";
import { Button } from "@/components/ui/button";
import { useLocalWpi, useLocalWpiExplain, useLocalWpiHistory } from "@/hooks/use-local-dss";
import { useLocalEntityOverview } from "@/hooks/use-local-entity";
import { useLocalEntityId } from "@/hooks/use-local-entity-id";
import { cn } from "@/lib/utils";

function scoreTone(score: number) {
  if (score >= 80) return "text-emerald-300";
  if (score >= 65) return "text-sky-300";
  if (score >= 50) return "text-amber-300";
  return "text-destructive";
}

export function LocalWpiPanel() {
  const t = useTranslations("modules.localWpi");
  const tv = useTranslations("modules.localViz");
  const isBn = useLocale().startsWith("bn");
  const entityId = useLocalEntityId();
  const [focusWardId, setFocusWardId] = useState<string | null>(null);

  const { data: overview } = useLocalEntityOverview(entityId);
  const { data, error, loading, reload, recompute, recomputing } =
    useLocalWpi(entityId);
  const { data: history } = useLocalWpiHistory(entityId, focusWardId);
  const { data: explain, loading: explainLoading } = useLocalWpiExplain(
    entityId,
    focusWardId,
  );

  const scoreBars = useMemo(
    () =>
      (data?.items ?? [])
        .slice()
        .sort((a, b) => b.score - a.score)
        .map((row) => ({
          name: isBn ? row.ward.nameBn || row.ward.name : row.ward.name,
          value: row.score,
        })),
    [data?.items, isBn],
  );

  const bandPie = useMemo(() => {
    const bands = { strong: 0, steady: 0, watch: 0, risk: 0 };
    for (const row of data?.items ?? []) {
      if (row.score >= 80) bands.strong += 1;
      else if (row.score >= 65) bands.steady += 1;
      else if (row.score >= 50) bands.watch += 1;
      else bands.risk += 1;
    }
    return [
      { name: tv("bandStrong"), value: bands.strong, color: "#34d399" },
      { name: tv("bandSteady"), value: bands.steady, color: "#38bdf8" },
      { name: tv("bandWatch"), value: bands.watch, color: "#fbbf24" },
      { name: tv("bandRisk"), value: bands.risk, color: "#f87171" },
    ];
  }, [data?.items, tv]);

  const componentTrend = useMemo(() => {
    const items = data?.items ?? [];
    if (!items.length) return [];
    const avg = (key: "serviceScore" | "infraScore" | "resolutionScore") =>
      Math.round(items.reduce((s, r) => s + r[key], 0) / items.length);
    return [
      { name: t("colService"), value: avg("serviceScore") },
      { name: t("colInfra"), value: avg("infraScore") },
      { name: t("colResolution"), value: avg("resolutionScore") },
    ];
  }, [data?.items, t]);

  const historyTrend = useMemo(() => {
    const series = history?.series ?? [];
    if (series.length) {
      return series.slice(-12).map((p) => ({
        name: p.periodKey.slice(11) || p.periodKey,
        value: Math.round(p.value),
      }));
    }
    const monthly = history?.monthly ?? [];
    if (!monthly.length) return componentTrend;
    const byPeriod = new Map<string, number[]>();
    for (const row of monthly) {
      const arr = byPeriod.get(row.periodKey) ?? [];
      arr.push(row.score);
      byPeriod.set(row.periodKey, arr);
    }
    return [...byPeriod.entries()].map(([period, scores]) => ({
      name: period,
      value: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
    }));
  }, [history, componentTrend]);

  const focusWard = (data?.items ?? []).find((r) => r.wardId === focusWardId) ?? null;
  const wardScores =
    data?.items.map((row) => ({
      wardId: row.wardId,
      score: row.score,
    })) ?? [];

  return (
    <ModuleShell
      title={t("title")}
      description={t("description")}
      loading={loading && !data}
      error={error}
      onRetry={() => void reload()}
      stats={
        data ? (
          <LocalKpiSparkGrid>
            <LocalKpiSpark
              label={t("average")}
              value={String(data.summary.averageScore)}
              base={data.summary.averageScore}
              color="#34d399"
              accent="success"
            />
            <LocalKpiSpark
              label={t("wards")}
              value={String(data.summary.wardCount)}
              base={data.summary.wardCount}
              color="#38bdf8"
            />
            <LocalKpiSpark
              label={t("top")}
              value={data.summary.topWard ? String(data.summary.topWard.score) : "—"}
              base={data.summary.topWard?.score ?? 0}
              color="#a78bfa"
            />
            <LocalKpiSpark
              label={t("bottom")}
              value={data.summary.bottomWard ? String(data.summary.bottomWard.score) : "—"}
              base={data.summary.bottomWard?.score ?? 0}
              color="#f87171"
              accent="danger"
            />
          </LocalKpiSparkGrid>
        ) : undefined
      }
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">{t("formula")}</p>
        <Button size="sm" variant="outline" disabled={recomputing} onClick={() => void recompute()}>
          <RefreshCw className={cn("mr-2 h-3.5 w-3.5", recomputing && "animate-spin")} />
          {recomputing ? t("recomputing") : t("recompute")}
        </Button>
      </div>

      {(overview || data) && (
        <div className="mb-4">
          <LocalWardMap
            entityCode={overview?.entity.code ?? "CCC"}
            wards={
              overview?.wards ??
              (data?.items ?? []).map((row) => ({
                id: row.wardId,
                code: row.ward.code,
                name: row.ward.name,
                nameBn: row.ward.nameBn,
              }))
            }
            scores={wardScores}
            title={tv("wpiChoropleth")}
            heightClassName="min-h-[340px] h-[380px]"
          />
        </div>
      )}

      <div className="mb-4 grid gap-4 lg:grid-cols-3">
        <LocalVizCard title={tv("wpiLeaders")} icon={Gauge} delay={0.05}>
          <div className="flex flex-col items-center gap-3">
            <LocalPulseRing value={data?.summary.averageScore ?? 0} label={tv("opsHealth")} />
            <LocalBars data={scoreBars.slice(0, 6)} layoutDir="horizontal" color="#34d399" height={200} />
          </div>
        </LocalVizCard>
        <LocalVizCard title={tv("scoreBands")} icon={Layers3} delay={0.1}>
          <LocalDonut data={bandPie} height={280} />
        </LocalVizCard>
        <LocalVizCard title={t("historyTitle")} icon={Gauge} delay={0.15}>
          <LocalAreaTrend data={historyTrend} color="#a78bfa" height={280} />
        </LocalVizCard>
      </div>

      {focusWard && (
        <section className="glass-panel mb-4 rounded-xl border border-border/50 p-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-display text-base font-semibold">
              {t("whyTitle")} ·{" "}
              {isBn ? focusWard.ward.nameBn || focusWard.ward.name : focusWard.ward.name}
            </h3>
            <Button size="sm" variant="ghost" onClick={() => setFocusWardId(null)}>
              {t("clearFocus")}
            </Button>
          </div>
          <div className="mb-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span>
              {t("colService")}: {focusWard.serviceScore}
            </span>
            <span>
              {t("colInfra")}: {focusWard.infraScore}
            </span>
            <span>
              {t("colResolution")}: {focusWard.resolutionScore}
            </span>
            <span>
              {t("colOpen")}: {focusWard.openComplaints}
            </span>
          </div>
          <div className="space-y-2">
            {(focusWard.why ?? []).map((reason) => (
              <p
                key={reason.code}
                className="rounded-lg border border-border/40 bg-secondary/20 px-3 py-2 text-sm leading-relaxed"
              >
                {isBn ? reason.bn : reason.en}
              </p>
            ))}
            <div className="mt-3 rounded-lg border border-primary/25 bg-primary/5 px-3 py-2.5">
              <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-primary">
                {t("aiNarrative")}
              </p>
              {explainLoading && !explain?.item.aiNarrative ? (
                <p className="text-sm text-muted-foreground">{t("aiNarrativeLoading")}</p>
              ) : (
                <p className="text-sm leading-relaxed">
                  {isBn
                    ? explain?.item.aiNarrative?.bn ??
                      (focusWard.why ?? []).map((r) => r.bn).join(" ")
                    : explain?.item.aiNarrative?.en ??
                      (focusWard.why ?? []).map((r) => r.en).join(" ")}
                </p>
              )}
            </div>
          </div>
        </section>
      )}

      <DataTable
        emptyMessage={t("empty")}
        columns={[
          {
            key: "ward",
            label: t("colWard"),
            render: (row) => (
              <button type="button" className="text-left" onClick={() => setFocusWardId(row.wardId)}>
                <p className="font-medium hover:text-primary">
                  {isBn ? row.ward.nameBn || row.ward.name : row.ward.name}
                </p>
                <p className="text-[11px] text-muted-foreground">{row.ward.code}</p>
              </button>
            ),
          },
          {
            key: "score",
            label: t("colScore"),
            render: (row) => (
              <span className={cn("text-lg font-semibold", scoreTone(row.score))}>{row.score}</span>
            ),
          },
          {
            key: "why",
            label: t("colWhy"),
            render: (row) => {
              const reason = row.why?.[0];
              if (!reason) return "—";
              return (
                <button
                  type="button"
                  className="max-w-[260px] text-left text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setFocusWardId(row.wardId)}
                >
                  <span className="line-clamp-2">{isBn ? reason.bn : reason.en}</span>
                </button>
              );
            },
          },
          { key: "service", label: t("colService"), render: (row) => row.serviceScore },
          { key: "infra", label: t("colInfra"), render: (row) => row.infraScore },
          { key: "resolution", label: t("colResolution"), render: (row) => row.resolutionScore },
          { key: "open", label: t("colOpen"), render: (row) => row.openComplaints },
          {
            key: "sla",
            label: t("colSlaOk"),
            render: (row) => `${row.resolvedWithinSla}/${row.totalResolved}`,
          },
        ]}
        rows={data?.items ?? []}
      />
    </ModuleShell>
  );
}
