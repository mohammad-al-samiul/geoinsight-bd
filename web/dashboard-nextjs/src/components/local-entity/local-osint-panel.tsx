"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Flag, Newspaper, Radio, ShieldOff } from "lucide-react";
import Link from "next/link";
import {
  DataTable,
  ModuleShell,
} from "@/components/modules/module-shell";
import {
  LocalBars,
  LocalDonut,
  LocalKpiSpark,
  LocalKpiSparkGrid,
  LocalVizCard,
} from "@/components/local-entity/local-viz";
import { Button } from "@/components/ui/button";
import { useLocalOsint } from "@/hooks/use-local-osint-pulse";
import { useLocalEntityId } from "@/hooks/use-local-entity-id";
import { CROSS_TOPIC_FILTERS, itemHasCrossTopic, type CrossTopicFilter } from "@/hooks/use-local-live-intel";
import { cn } from "@/lib/utils";

function sentimentClass(s: string) {
  if (s === "POSITIVE") return "text-emerald-300";
  if (s === "NEGATIVE") return "text-destructive";
  return "text-muted-foreground";
}

function sentimentLabel(
  s: string,
  labels: { positive: string; neutral: string; negative: string },
) {
  if (s === "POSITIVE") return labels.positive;
  if (s === "NEGATIVE") return labels.negative;
  return labels.neutral;
}

export function LocalOsintPanel() {
  const t = useTranslations("modules.localOsint");
  const tv = useTranslations("modules.localViz");
  const locale = useLocale();
  const isBn = locale.startsWith("bn");
  const entityId = useLocalEntityId();
  const [propagandaOnly, setPropagandaOnly] = useState(false);
  const [crossFilter, setCrossFilter] = useState<"ALL" | CrossTopicFilter>("ALL");

  const { data, error, loading, reload } = useLocalOsint(entityId, propagandaOnly);

  const sentimentPie = useMemo(() => {
    if (!data) return [];
    return [
      {
        name: t("positive"),
        value: data.summary.sentiment.positive,
        color: "#34d399",
      },
      {
        name: tv("neutral"),
        value: data.summary.sentiment.neutral,
        color: "#94a3b8",
      },
      {
        name: t("negative"),
        value: data.summary.sentiment.negative,
        color: "#f87171",
      },
    ];
  }, [data, t, tv]);

  const channelBars = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of data?.items ?? []) {
      map.set(row.channel, (map.get(row.channel) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [data?.items]);

  const filteredItems = useMemo(
    () => (data?.items ?? []).filter((row) => itemHasCrossTopic(row, crossFilter)),
    [data?.items, crossFilter],
  );

  const riskPie = useMemo(() => {
    if (!data) return [];
    return [
      {
        name: t("propaganda"),
        value: data.summary.propagandaFlagged,
        color: "#f87171",
      },
      {
        name: tv("clean"),
        value: Math.max(0, data.summary.total - data.summary.propagandaFlagged),
        color: "#34d399",
      },
    ];
  }, [data, t, tv]);

  return (
    <ModuleShell
      title={t("title")}
      description={t("description")}
      loading={loading && !data}
      error={error}
      onRetry={reload}
      stats={
        data && (
          <LocalKpiSparkGrid>
            <LocalKpiSpark
              label={t("total")}
              value={String(data.summary.total)}
              base={data.summary.total}
              color="#38bdf8"
            />
            <LocalKpiSpark
              label={t("propaganda")}
              value={String(data.summary.propagandaFlagged)}
              base={data.summary.propagandaFlagged}
              color="#f87171"
              accent="danger"
            />
            <LocalKpiSpark
              label={t("negative")}
              value={String(data.summary.sentiment.negative)}
              base={data.summary.sentiment.negative}
              color="#fbbf24"
              accent="warning"
            />
            <LocalKpiSpark
              label={t("positive")}
              value={String(data.summary.sentiment.positive)}
              base={data.summary.sentiment.positive}
              color="#34d399"
              accent="success"
            />
          </LocalKpiSparkGrid>
        )
      }
    >
      <div className="mb-4 grid gap-4 lg:grid-cols-3">
        <LocalVizCard title={tv("sentimentMix")} icon={Newspaper} delay={0.05}>
          <LocalDonut data={sentimentPie} height={250} />
        </LocalVizCard>
        <LocalVizCard title={tv("channelMix")} icon={Radio} delay={0.1}>
          <LocalBars data={channelBars} color="#38bdf8" height={250} />
        </LocalVizCard>
        <LocalVizCard title={tv("propagandaMix")} icon={Flag} delay={0.15}>
          <LocalDonut data={riskPie} height={250} />
        </LocalVizCard>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {(["ALL", ...CROSS_TOPIC_FILTERS] as const).map((key) => {
            const active = crossFilter === key;
            const label =
              key === "ALL" ? t("filterAll") : key === "UNREST" ? t("unrest") : key === "PARTY" ? t("party") : t("issue");
            return (
              <button
                key={key}
                type="button"
                onClick={() => setCrossFilter(key)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors",
                  active
                    ? "border-primary/40 bg-primary/15 text-primary"
                    : "border-white/10 bg-white/[0.03] text-muted-foreground hover:border-white/20 hover:text-foreground",
                )}
              >
                {label}
              </button>
            );
          })}
          {(data?.keywords ?? []).slice(0, 8).map((kw) => (
            <Link
              key={kw}
              href={`/narrative-shield?q=${encodeURIComponent(kw)}`}
              className="rounded-md border border-border/50 bg-secondary/30 px-2 py-1 text-[11px] text-muted-foreground hover:border-primary/40 hover:text-foreground"
              title={t("openInShield")}
            >
              {kw}
            </Link>
          ))}
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={propagandaOnly ? "default" : "outline"}
            onClick={() => setPropagandaOnly((v) => !v)}
          >
            <Flag className="mr-1.5 h-3.5 w-3.5" />
            {propagandaOnly ? t("showingPropaganda") : t("filterPropaganda")}
          </Button>
          <Button size="sm" variant="outline" onClick={() => void reload()}>
            {t("refresh")}
          </Button>
        </div>
      </div>

      <DataTable
        emptyMessage={t("empty")}
        columns={[
          {
            key: "flag",
            label: t("colFlag"),
            render: (row) =>
              row.propagandaFlag ? (
                <span className="inline-flex flex-col gap-0.5 text-xs text-destructive">
                  <span className="inline-flex items-center gap-1">
                    <Flag className="h-3.5 w-3.5" /> {t("flagged")}
                  </span>
                  {typeof row.propagandaConfidence === "number" ? (
                    <span className="text-[10px] text-muted-foreground">
                      {t("confidence", {
                        pct: Math.round(row.propagandaConfidence * 100),
                      })}
                    </span>
                  ) : null}
                </span>
              ) : (
                "—"
              ),
          },
          {
            key: "title",
            label: t("colTitle"),
            render: (row) => (
              <div className="max-w-md">
                <p className="font-medium">
                  {isBn ? row.titleBn || row.title : row.title}
                </p>
                <p className="line-clamp-1 text-[11px] text-muted-foreground">
                  {row.summary}
                </p>
                {(row.topics?.length || row.places?.length) ? (
                  <p className="mt-1 flex flex-wrap gap-1">
                    {(row.topics ?? [])
                      .filter((tag) => tag === "UNREST" || tag === "PARTY" || tag === "ISSUE")
                      .map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-muted-foreground"
                        >
                          {tag === "UNREST" ? t("unrest") : tag === "PARTY" ? t("party") : t("issue")}
                        </span>
                      ))}
                    {(row.places ?? []).slice(0, 2).map((place) => (
                      <span
                        key={place}
                        className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-1.5 py-0.5 text-[10px] text-emerald-200/90"
                      >
                        {place}
                      </span>
                    ))}
                  </p>
                ) : null}
              </div>
            ),
          },
          {
            key: "channel",
            label: t("colChannel"),
            render: (row) => (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                {row.source === "live_news" ? (
                  <Newspaper className="h-3.5 w-3.5" />
                ) : (
                  <Radio className="h-3.5 w-3.5" />
                )}
                {row.channel}
              </span>
            ),
          },
          {
            key: "keyword",
            label: t("colKeyword"),
            render: (row) =>
              row.matchedKeyword ? (
                <Link
                  href={`/narrative-shield?q=${encodeURIComponent(row.matchedKeyword)}`}
                  className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                  title={t("openInShield")}
                >
                  <code>{row.matchedKeyword}</code>
                  <ShieldOff className="h-3 w-3" />
                </Link>
              ) : (
                "—"
              ),
          },
          {
            key: "sentiment",
            label: t("colSentiment"),
            render: (row) => (
              <span className={cn("text-xs font-medium", sentimentClass(row.sentiment))}>
                {sentimentLabel(row.sentiment, {
                  positive: t("sentimentPositive"),
                  neutral: t("sentimentNeutral"),
                  negative: t("sentimentNegative"),
                })}
              </span>
            ),
          },
          {
            key: "when",
            label: t("colWhen"),
            render: (row) => (
              <span className="text-xs text-muted-foreground">
                {new Date(row.publishedAt).toLocaleString(locale)}
              </span>
            ),
          },
        ]}
        rows={filteredItems}
      />
    </ModuleShell>
  );
}
