"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  MessageSquareWarning,
  Radio,
  RefreshCw,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useSentimentHeatmap } from "@/hooks/use-sentiment-heatmap";
import { useIngestionArticles } from "@/hooks/use-ingestion-articles";
import { useRealtimeRefresh } from "@/hooks/use-realtime-refresh";
import { ModuleShell, StatCard, StatGrid } from "@/components/modules/module-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProgressMeter } from "@/components/ui/progress-meter";
import { IntelCard } from "@/components/ui/intel-card";
import { SourceLink } from "@/components/ui/source-link";
import { cn } from "@/lib/utils";

function sourceLabel(source: string, t: (key: string) => string): string {
  if (source === "news_rss_google") return t("sourceNews");
  return t("source333");
}

export function SentimentHeatmapPanel() {
  const t = useTranslations("modules.sentiment");
  const locale = useLocale();
  const [level, setLevel] = useState<"district" | "upazila">("district");
  const { data, loading, error, reload } = useSentimentHeatmap(level);
  const {
    articles,
    loading: articlesLoading,
    syncing,
    lastSync,
    sync,
    reload: reloadArticles,
  } = useIngestionArticles(15);

  useRealtimeRefresh(reload);

  const distressed = useMemo(
    () =>
      (data?.cells ?? [])
        .filter((c) => c.grievance_count > 0 || c.sentiment_score >= 20)
        .slice(0, 24),
    [data],
  );

  const topRising = useMemo(
    () =>
      (data?.cells ?? [])
        .filter((c) => c.trend === "rising" && (c.grievance_count > 0 || c.sentiment_score >= 25))
        .slice(0, 8),
    [data],
  );

  const trendLabel = (trend: string) => {
    if (trend === "rising") return t("trendRising");
    if (trend === "falling") return t("trendFalling");
    return t("trendStable");
  };

  const handleSync = async () => {
    await sync();
    await reload();
    await reloadArticles();
  };

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
            <StatCard label={t("logsAnalyzed")} value={data.total_logs} />
            <StatCard
              label={t("grievances")}
              value={data.grievance_total}
              accent="danger"
              hint={t("grievanceHint")}
            />
            <StatCard label={t("demands")} value={data.demand_total} accent="warning" />
            <StatCard
              label={t("source")}
              value={sourceLabel(data.source, t)}
              hint={t("levelHint", { level: data.level })}
            />
          </StatGrid>
        )
      }
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="flex flex-wrap items-center gap-2">
          <Radio className="h-4 w-4 shrink-0 text-primary" />
          <span className="text-sm font-medium">{t("aggregationLevel")}</span>
          <Button
            size="sm"
            variant={level === "district" ? "default" : "outline"}
            onClick={() => setLevel("district")}
          >
            {t("district")}
          </Button>
          <Button
            size="sm"
            variant={level === "upazila" ? "default" : "outline"}
            onClick={() => setLevel("upazila")}
          >
            {t("upazila")}
          </Button>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="w-full gap-2 sm:ml-auto sm:w-auto"
          disabled={syncing}
          onClick={() => void handleSync()}
        >
          <RefreshCw className={cn("h-4 w-4", syncing && "animate-spin")} />
          {syncing ? t("syncing") : t("syncNow")}
        </Button>
      </div>

      {lastSync && (
        <p className="mt-2 text-xs text-muted-foreground">
          {t("lastSync", {
            fetched: lastSync.fetched,
            inserted: lastSync.inserted,
            feeds: lastSync.feeds_ok,
          })}
        </p>
      )}

      {data && (data.narrative_bn || data.narrative_en) && (
        <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2.5 text-sm">
          <p className="font-medium text-red-300">{t("aiInsight")}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {locale === "bn" ? data.narrative_bn : data.narrative_en}
          </p>
          {data.top_distressed && data.top_distressed.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {data.top_distressed.map((d) => (
                <Badge key={d} className="bg-red-500/15 text-red-300">
                  {d}
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}

      {data && (
        <div className="mt-4 grid grid-cols-1 gap-4 md:gap-6 xl:grid-cols-2">
          <div className="glass-panel min-w-0 overflow-hidden rounded-xl shadow-panel">
            <div className="border-b border-border/60 px-3 py-3 sm:px-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <MessageSquareWarning className="h-4 w-4 shrink-0 text-red-400" />
                {t("dissatisfactionHeatmap")}
              </h3>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                {t("heatmapHint")}
              </p>
            </div>
            <div className="max-h-none overflow-visible p-2.5 sm:max-h-[560px] sm:overflow-y-auto sm:p-3">
              {distressed.length === 0 ? (
                <p className="p-2 text-sm text-muted-foreground">{t("noDistressed")}</p>
              ) : (
                <div className="grid grid-cols-1 gap-2 min-[480px]:grid-cols-2">
                  {distressed.map((cell, i) => (
                    <IntelCard
                      key={`${cell.district}-${cell.upazila ?? "all"}`}
                      index={i}
                      accent={
                        cell.sentiment_score >= 50
                          ? "danger"
                          : cell.sentiment_score >= 25
                            ? "warning"
                            : "default"
                      }
                      padding="sm"
                      className="min-w-0"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold tracking-tight">
                            {cell.district}
                          </p>
                          {cell.hardship_hint && (
                            <p className="truncate text-[11px] text-red-300/90">
                              {cell.hardship_hint}
                            </p>
                          )}
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(
                            "shrink-0 text-[10px]",
                            cell.trend === "rising" && "border-red-500/40 text-red-400",
                            cell.trend === "falling" && "border-emerald-500/40 text-emerald-400",
                          )}
                        >
                          {cell.trend === "rising" ? (
                            <TrendingUp className="mr-0.5 inline h-3 w-3" />
                          ) : cell.trend === "falling" ? (
                            <TrendingDown className="mr-0.5 inline h-3 w-3" />
                          ) : null}
                          <span className="hidden min-[380px]:inline">{trendLabel(cell.trend)}</span>
                          <span className="min-[380px]:hidden">
                            {cell.trend === "rising" ? "↑" : cell.trend === "falling" ? "↓" : "→"}
                          </span>
                        </Badge>
                      </div>
                      <div className="mt-2.5 flex items-center gap-2">
                        <ProgressMeter
                          value={cell.sentiment_score}
                          invert
                          className="min-w-0 flex-1"
                          delay={0.05 + i * 0.03}
                        />
                        <span className="shrink-0 font-display text-xs font-semibold tabular-nums">
                          {cell.sentiment_score}
                        </span>
                      </div>
                      <p className="mt-1.5 text-[10px] leading-snug text-muted-foreground">
                        {t("cellCounts", {
                          grievance: cell.grievance_count,
                          demand: cell.demand_count,
                          total: cell.total,
                        })}
                      </p>
                    </IntelCard>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="min-w-0 space-y-4 sm:space-y-6">
            <div className="glass-panel rounded-xl p-3 shadow-panel sm:p-4">
              <h3 className="text-sm font-semibold text-red-400">{t("risingDissatisfaction")}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{t("risingDesc")}</p>
              <ul className="mt-3 max-h-none space-y-2 overflow-visible sm:mt-4 sm:max-h-[280px] sm:space-y-3 sm:overflow-y-auto">
                {topRising.length === 0 ? (
                  <li className="text-sm text-muted-foreground">{t("noRisingZones")}</li>
                ) : (
                  topRising.map((cell) => (
                    <li
                      key={`rise-${cell.district}-${cell.upazila}`}
                      className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-sm"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="min-w-0 truncate font-medium">{cell.district}</span>
                        <span className="shrink-0 tabular-nums text-red-300">
                          {cell.sentiment_score}
                        </span>
                      </div>
                      <span className="block text-xs leading-snug text-red-400">
                        {t("grievanceRatio", { pct: Math.round(cell.grievance_ratio * 100) })}
                        {cell.hardship_hint ? ` · ${cell.hardship_hint}` : ""}
                      </span>
                    </li>
                  ))
                )}
              </ul>
            </div>

            <div className="glass-panel rounded-xl p-3 shadow-panel sm:p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">{t("recentNews")}</h3>
                <Button size="sm" variant="ghost" onClick={() => void reloadArticles()}>
                  {t("refreshNews")}
                </Button>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{t("recentNewsDesc")}</p>
              <ul className="mt-3 max-h-[280px] space-y-2 overflow-y-auto sm:mt-4 sm:max-h-[360px] sm:space-y-3">
                {articlesLoading ? (
                  <li className="text-sm text-muted-foreground">{t("loadingNews")}</li>
                ) : articles.length === 0 ? (
                  <li className="text-sm text-muted-foreground">{t("noNews")}</li>
                ) : (
                  articles.map((article) => (
                    <li
                      key={article.id}
                      className="rounded-lg border border-border/50 bg-secondary/10 px-3 py-2 text-sm"
                    >
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                        <Badge variant="outline" className="max-w-[140px] truncate text-[10px]">
                          {article.sourceName}
                        </Badge>
                        {article.sentimentCategory && (
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px]",
                              article.sentimentCategory === "Grievance" &&
                                "border-red-500/40 text-red-400",
                              article.sentimentCategory === "Demand" &&
                                "border-amber-500/40 text-amber-400",
                            )}
                          >
                            {article.sentimentCategory}
                          </Badge>
                        )}
                        {article.district && (
                          <span className="text-[10px] text-muted-foreground">
                            {article.district}
                          </span>
                        )}
                      </div>
                      <SourceLink
                        href={article.url}
                        title={article.title}
                        className="mt-1"
                        openText={locale === "bn" ? "খবর" : "Open"}
                        openLabel={locale === "bn" ? "সোর্স খবর খুলুন" : "Open source article"}
                      />
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
        </div>
      )}
    </ModuleShell>
  );
}
