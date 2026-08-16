"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { ListTodo, Newspaper, Radio, Tags } from "lucide-react";
import {
  LocalAreaTrend,
  LocalBars,
  LocalDonut,
  LocalKpiSpark,
  LocalKpiSparkGrid,
  LocalVizCard,
} from "@/components/local-entity/local-viz";
import { useLocalLiveIntel, type DeskTopic, type LiveIntelItem } from "@/hooks/use-local-live-intel";

const PATH_TOPICS: Array<{ prefix: string; topic: DeskTopic }> = [
  { prefix: "/local/education", topic: "EDUCATION" },
  { prefix: "/local/health", topic: "HEALTH" },
  { prefix: "/local/jobs", topic: "EMPLOYMENT" },
  { prefix: "/local/crime", topic: "CRIME" },
  { prefix: "/local/corruption", topic: "CORRUPTION" },
  { prefix: "/local/outage", topic: "OUTAGE" },
  { prefix: "/local/complaints", topic: "CIVIC" },
  { prefix: "/local/heatmap", topic: "CIVIC" },
  { prefix: "/local/field", topic: "CIVIC" },
  { prefix: "/local/visits", topic: "CIVIC" },
  { prefix: "/local/wpi", topic: "CIVIC" },
  { prefix: "/local/scorecard", topic: "ALL" },
  { prefix: "/local/budget", topic: "BUDGET" },
  { prefix: "/local/pulse", topic: "PULSE" },
  { prefix: "/local/specialty", topic: "SPECIALTY" },
  { prefix: "/local/command", topic: "ALL" },
  { prefix: "/local/alerts", topic: "CIVIC" },
  { prefix: "/local/osint", topic: "OSINT" },
  { prefix: "/local/evidence", topic: "ALL" },
  { prefix: "/local", topic: "ALL" },
];

const SKIP = new Set(["/local/security"]);

const TOPIC_KEYS: Record<DeskTopic, string> = {
  ALL: "all",
  EDUCATION: "education",
  HEALTH: "health",
  EMPLOYMENT: "employment",
  CRIME: "crime",
  CORRUPTION: "corruption",
  OUTAGE: "outage",
  CIVIC: "civic",
  OSINT: "osint",
  PULSE: "pulse",
  SPECIALTY: "specialty",
  BUDGET: "budget",
  UNREST: "unrest",
};

function topicForPath(pathname: string): DeskTopic | null {
  if (SKIP.has(pathname)) return null;
  const hit = PATH_TOPICS.find((row) => pathname === row.prefix || pathname.startsWith(`${row.prefix}/`));
  return hit?.topic ?? null;
}

function hoursAgo(iso: string): string {
  const h = (Date.now() - Date.parse(iso)) / 36e5;
  if (!Number.isFinite(h) || h < 0) return "";
  if (h < 1) return `${Math.max(1, Math.round(h * 60))}m`;
  if (h < 24) return `${Math.round(h)}h`;
  return `${Math.round(h / 24)}d`;
}

function HeadlineCard({
  row,
  t,
  isBn,
}: {
  row: LiveIntelItem;
  t: (k: string) => string;
  isBn: boolean;
}) {
  const originLabel =
    row.origin === "ops" ? t("originOps") : row.origin === "related" ? t("originRelated") : t("originNews");
  const body = (
    <>
      <span className="flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
        <span className="rounded-full bg-secondary px-1.5 py-0.5">{originLabel}</span>
        {row.local ? (
          <span className="rounded-full bg-emerald-400/15 px-1.5 py-0.5 text-emerald-300">{t("localTag")}</span>
        ) : null}
        <span>{row.sourceName}</span>
        <span>{hoursAgo(row.publishedAt)}</span>
        {row.keyword ? <span>{row.keyword}</span> : null}
      </span>
      <span className="mt-1 block text-[13px] font-semibold leading-snug text-foreground">{row.title}</span>
      {row.summary ? (
        <span className="mt-1 block line-clamp-3 text-[12px] leading-relaxed text-muted-foreground">
          {row.summary}
        </span>
      ) : null}
      {(isBn ? row.actionBn : row.actionEn) ? (
        <span className="mt-1.5 block text-[11px] text-sky-200/90">
          {t("doNow")}: {isBn ? row.actionBn : row.actionEn}
        </span>
      ) : null}
    </>
  );
  const cls = "block rounded-lg border border-border/40 bg-secondary/15 px-3 py-2.5 transition hover:border-primary/40";
  return row.url ? (
    <a href={row.url} target="_blank" rel="noreferrer" className={cls}>
      {body}
    </a>
  ) : (
    <div className={cls}>{body}</div>
  );
}

export function LocalDeskIntel() {
  const pathname = usePathname() ?? "";
  const topic = topicForPath(pathname);
  const enabled = Boolean(topic);
  const t = useTranslations("modules.localDeskIntel");
  const tv = useTranslations("modules.localViz");
  const locale = useLocale();
  const isBn = locale.startsWith("bn");
  const { data, loading } = useLocalLiveIntel(topic ?? "ALL", enabled);

  const sentimentPie = useMemo(() => {
    if (!data) return [];
    return [
      { name: t("positive"), value: data.summary.sentiment.positive, color: "#34d399" },
      { name: tv("neutral"), value: data.summary.sentiment.neutral, color: "#94a3b8" },
      { name: t("negative"), value: data.summary.sentiment.negative, color: "#f87171" },
    ];
  }, [data, t, tv]);

  const sourceBars = useMemo(
    () =>
      Object.entries(data?.summary.bySource ?? {})
        .map(([name, value]) => ({ name: name.slice(0, 18), value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8),
    [data?.summary.bySource],
  );

  const topicBars = useMemo(
    () =>
      Object.entries(data?.summary.byTopic ?? {})
        .map(([name, value]) => ({
          name: TOPIC_KEYS[name as DeskTopic] ? t(TOPIC_KEYS[name as DeskTopic]) : name,
          value,
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8),
    [data?.summary.byTopic, t],
  );

  const primaryItems = useMemo(
    () => (data?.items ?? []).filter((r) => !r.related).slice(0, 18),
    [data?.items],
  );
  const relatedItems = useMemo(
    () => (data?.items ?? []).filter((r) => r.related).slice(0, 8),
    [data?.items],
  );

  if (!enabled) return null;
  if (loading && !data) {
    return <div className="mb-4 h-40 animate-pulse rounded-xl border border-border/50 bg-secondary/20" />;
  }
  if (!data) return null;

  const topicLabel = t(TOPIC_KEYS[topic!]);

  return (
    <section className="mb-6 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-400/90">
            {t("liveBadge")}
          </p>
          <h2 className="text-base font-semibold tracking-tight">{t("title", { topic: topicLabel })}</h2>
          <p className="max-w-2xl text-[12px] text-muted-foreground">
            {t("hint")} · {data.entityName}
          </p>
        </div>
        <p className="text-[10px] text-muted-foreground">
          {data.entityCode} · {new Date(data.generatedAt).toLocaleTimeString()}
        </p>
      </div>

      {data.summary.total === 0 ? (
        <p className="rounded-xl border border-border/50 bg-secondary/20 px-4 py-3 text-sm text-muted-foreground">
          {t("empty")}
        </p>
      ) : (
        <>
          <LocalKpiSparkGrid>
            <LocalKpiSpark label={t("items")} value={String(data.summary.total)} base={data.summary.total} color="#38bdf8" />
            <LocalKpiSpark label={t("last24h")} value={String(data.summary.last24h)} base={data.summary.last24h} color="#34d399" accent="success" />
            <LocalKpiSpark label={t("last7d")} value={String(data.summary.last7d)} base={data.summary.last7d} color="#2dd4bf" />
            <LocalKpiSpark label={t("ops")} value={String(data.summary.ops)} base={data.summary.ops} color="#a78bfa" />
            <LocalKpiSpark label={t("news")} value={String(data.summary.news)} base={data.summary.news} color="#60a5fa" />
            <LocalKpiSpark
              label={t("negative")}
              value={String(data.summary.negative)}
              base={data.summary.negative}
              color="#f87171"
              accent={data.summary.negative > 0 ? "danger" : "default"}
            />
          </LocalKpiSparkGrid>

          {data.summary.keywords.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {data.summary.keywords.map((kw) => (
                <span
                  key={kw.name}
                  className="rounded-full border border-border/50 bg-secondary/30 px-2.5 py-1 text-[11px] text-muted-foreground"
                >
                  {kw.name} · {kw.value}
                </span>
              ))}
            </div>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-3">
            <LocalVizCard title={tv("sentimentMix")} icon={Newspaper} delay={0.04}>
              <LocalDonut data={sentimentPie} height={230} />
            </LocalVizCard>
            <LocalVizCard title={t("daily")} icon={Radio} delay={0.08}>
              <LocalAreaTrend data={data.summary.daily} color="#38bdf8" height={230} />
            </LocalVizCard>
            <LocalVizCard title={t("sources")} icon={Tags} delay={0.12}>
              <LocalBars data={sourceBars.length ? sourceBars : topicBars} color="#a78bfa" height={230} layoutDir="horizontal" />
            </LocalVizCard>
          </div>

          {data.summary.actions.length > 0 ? (
            <LocalVizCard title={t("actions")} icon={ListTodo} delay={0.14}>
              <ul className="grid gap-2 md:grid-cols-2">
                {data.summary.actions.map((a) => (
                  <li
                    key={a.en}
                    className="rounded-lg border border-sky-400/20 bg-sky-400/5 px-3 py-2 text-[12px] leading-relaxed text-sky-100"
                  >
                    {isBn ? a.bn : a.en}
                  </li>
                ))}
              </ul>
            </LocalVizCard>
          ) : null}

          <LocalVizCard title={t("headlines")} delay={0.16}>
            <div className="grid gap-2 md:grid-cols-2">
              {primaryItems.map((row) => (
                <HeadlineCard key={row.id} row={row} t={t} isBn={isBn} />
              ))}
            </div>
          </LocalVizCard>

          {relatedItems.length > 0 ? (
            <LocalVizCard title={t("related")} delay={0.2}>
              <div className="grid gap-2 md:grid-cols-2">
                {relatedItems.map((row) => (
                  <HeadlineCard key={row.id} row={row} t={t} isBn={isBn} />
                ))}
              </div>
            </LocalVizCard>
          ) : null}

          {topicBars.length > 1 ? (
            <p className="text-[11px] text-muted-foreground">
              {topicBars.map((row) => `${row.name} ${row.value}`).join(" · ")}
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}
