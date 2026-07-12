"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  ExternalLink,
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
import { cn } from "@/lib/utils";

function scoreColor(score: number): string {
  if (score >= 70) return "bg-red-500";
  if (score >= 45) return "bg-orange-500";
  if (score >= 25) return "bg-amber-500";
  return "bg-emerald-500";
}

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
      <div className="flex flex-wrap items-center gap-2">
        <Radio className="h-4 w-4 text-primary" />
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
        <Button
          size="sm"
          variant="outline"
          className="ml-auto gap-2"
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
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="glass-panel overflow-hidden rounded-xl shadow-panel">
            <div className="border-b border-border/60 px-4 py-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <MessageSquareWarning className="h-4 w-4 text-red-400" />
                {t("dissatisfactionHeatmap")}
              </h3>
              <p className="mt-1 text-[11px] text-muted-foreground">{t("heatmapHint")}</p>
            </div>
            <div className="max-h-[520px] overflow-y-auto p-3">
              {distressed.length === 0 ? (
                <p className="p-2 text-sm text-muted-foreground">{t("noDistressed")}</p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {distressed.map((cell) => (
                    <div
                      key={`${cell.district}-${cell.upazila ?? "all"}`}
                      className={cn(
                        "rounded-lg border p-3",
                        cell.sentiment_score >= 50
                          ? "border-red-500/40 bg-red-500/5"
                          : cell.sentiment_score >= 25
                            ? "border-amber-500/40 bg-amber-500/5"
                            : "border-border/50 bg-secondary/20",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium">{cell.district}</p>
                          {cell.hardship_hint && (
                            <p className="text-[11px] text-red-300/90">{cell.hardship_hint}</p>
                          )}
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px]",
                            cell.trend === "rising" && "border-red-500/40 text-red-400",
                            cell.trend === "falling" && "border-emerald-500/40 text-emerald-400",
                          )}
                        >
                          {cell.trend === "rising" ? (
                            <TrendingUp className="mr-1 inline h-3 w-3" />
                          ) : cell.trend === "falling" ? (
                            <TrendingDown className="mr-1 inline h-3 w-3" />
                          ) : null}
                          {trendLabel(cell.trend)}
                        </Badge>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                          <div
                            className={cn("h-full rounded-full transition-all", scoreColor(cell.sentiment_score))}
                            style={{ width: `${Math.max(cell.sentiment_score, 4)}%` }}
                          />
                        </div>
                        <span className="text-xs tabular-nums font-medium text-foreground">
                          {cell.sentiment_score}
                        </span>
                      </div>
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        {t("cellCounts", {
                          grievance: cell.grievance_count,
                          demand: cell.demand_count,
                          total: cell.total,
                        })}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="glass-panel rounded-xl p-4 shadow-panel">
              <h3 className="text-sm font-semibold text-red-400">{t("risingDissatisfaction")}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{t("risingDesc")}</p>
              <ul className="mt-4 space-y-3">
                {topRising.length === 0 ? (
                  <li className="text-sm text-muted-foreground">{t("noRisingZones")}</li>
                ) : (
                  topRising.map((cell) => (
                    <li
                      key={`rise-${cell.district}-${cell.upazila}`}
                      className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-sm"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">{cell.district}</span>
                        <span className="tabular-nums text-red-300">{cell.sentiment_score}</span>
                      </div>
                      <span className="text-xs text-red-400">
                        {t("grievanceRatio", { pct: Math.round(cell.grievance_ratio * 100) })}
                        {cell.hardship_hint ? ` · ${cell.hardship_hint}` : ""}
                      </span>
                    </li>
                  ))
                )}
              </ul>
            </div>

            <div className="glass-panel rounded-xl p-4 shadow-panel">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">{t("recentNews")}</h3>
                <Button size="sm" variant="ghost" onClick={() => void reloadArticles()}>
                  {t("refreshNews")}
                </Button>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{t("recentNewsDesc")}</p>
              <ul className="mt-4 max-h-[320px] space-y-3 overflow-y-auto">
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
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">
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
                      <a
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 flex items-start gap-1 font-medium leading-snug hover:text-primary"
                      >
                        <span className="line-clamp-2">{article.title}</span>
                        <ExternalLink className="mt-0.5 h-3 w-3 shrink-0 opacity-60" />
                      </a>
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
