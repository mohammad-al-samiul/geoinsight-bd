"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowUpRight, BookOpen, GraduationCap, Landmark, Newspaper } from "lucide-react";
import { LocalVizCard } from "@/components/local-entity/local-viz";
import { EvidenceAbstractDialog } from "@/components/local-entity/evidence-abstract-dialog";
import { AppSelect } from "@/components/ui/app-select";
import { apiClient } from "@/lib/api-client";
import { useLocalEntityId } from "@/hooks/use-local-entity-id";
import { useRealtimeRefresh } from "@/hooks/use-realtime-refresh";
import { cn } from "@/lib/utils";

export const EVIDENCE_TOPICS = [
  "POWER",
  "GAS",
  "FUEL",
  "WATER",
  "DRAINAGE",
  "ROAD",
  "UNREST",
  "EDUCATION",
  "HEALTH",
  "UNEMPLOYMENT",
  "CRIME",
  "CORRUPTION",
  "OTHER",
] as const;

export type EvidenceKind = "THESIS" | "EXPERT" | "POLICY_BRIEF";

export type EvidenceItem = {
  id: string;
  kind: EvidenceKind;
  topics: string[];
  title: string;
  titleBn: string | null;
  abstract: string;
  abstractBn: string | null;
  author: string | null;
  institution: string | null;
  sourceName: string;
  url: string;
  year: number;
  strength: number;
  geoScope: string;
  local: boolean;
  solutions: {
    now: { en: string; bn: string };
    week: { en: string; bn: string };
    days90: { en: string; bn: string };
  };
};

export type EvidenceFeed = {
  generatedAt: string;
  sourceNote?: string;
  summary: {
    total: number;
    thesis: number;
    expert: number;
    policy: number;
    localHits: number;
    topics: Array<{ id: string; count: number }>;
  };
  items: EvidenceItem[];
};

const KIND_ICON: Record<EvidenceKind, typeof GraduationCap> = {
  THESIS: GraduationCap,
  EXPERT: Newspaper,
  POLICY_BRIEF: Landmark,
};

function kindClass(kind: EvidenceKind) {
  if (kind === "THESIS") return "border-violet-400/35 bg-violet-400/10 text-violet-100";
  if (kind === "EXPERT") return "border-amber-400/35 bg-amber-400/10 text-amber-100";
  return "border-sky-400/35 bg-sky-400/10 text-sky-100";
}

function kindBar(kind: EvidenceKind) {
  if (kind === "THESIS") return "bg-violet-400";
  if (kind === "EXPERT") return "bg-amber-400";
  return "bg-sky-400";
}

function EvidenceCard({
  row,
  compact,
  isBn,
  t,
  onOpen,
}: {
  row: EvidenceItem;
  compact: boolean;
  isBn: boolean;
  t: ReturnType<typeof useTranslations>;
  onOpen: (row: EvidenceItem) => void;
}) {
  const Icon = KIND_ICON[row.kind];
  const title = isBn ? row.titleBn || row.title : row.title;
  const abstract = isBn ? row.abstractBn || row.abstract : row.abstract;
  const now = isBn ? row.solutions?.now?.bn : row.solutions?.now?.en;
  const week = isBn ? row.solutions?.week?.bn : row.solutions?.week?.en;
  const days90 = isBn ? row.solutions?.days90?.bn : row.solutions?.days90?.en;
  const meta = [row.author, row.institution, String(row.year)].filter(Boolean).join(" · ");

  return (
    <article
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-xl border pl-5 pr-4 py-4",
        "bg-gradient-to-br from-white/[0.05] via-card/75 to-secondary/30",
        "border-white/[0.08] shadow-[0_12px_36px_-20px_rgba(0,0,0,0.7)]",
        "transition-[transform,border-color,box-shadow] duration-200",
        "hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[0_18px_44px_-22px_rgba(16,185,129,0.35)]",
      )}
    >
      <span aria-hidden className={cn("absolute inset-y-4 left-0 w-[3px] rounded-full", kindBar(row.kind))} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold",
            kindClass(row.kind),
          )}
        >
          <Icon className="h-3.5 w-3.5" />
          {t(`kind${row.kind}`)}
        </span>
        <p className="text-xs text-muted-foreground">{row.year}</p>
      </div>
      <h3 className="mt-3 font-display text-[17px] font-semibold leading-snug tracking-tight text-foreground sm:text-lg">
        {title}
      </h3>
      <p className="mt-2 line-clamp-3 text-[15px] leading-[1.7] text-muted-foreground">{abstract}</p>
      {now ? (
        <p className="mt-3 text-[13.5px] leading-relaxed text-sky-200/95">
          <span className="font-semibold text-sky-300">{t("horizonNow")}: </span>
          {now}
        </p>
      ) : null}
      {!compact && week ? (
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-amber-100/90">
          <span className="font-semibold text-amber-200">{t("horizonWeek")}: </span>
          {week}
        </p>
      ) : null}
      {!compact && days90 ? (
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-emerald-200/90">
          <span className="font-semibold text-emerald-300">{t("horizon90")}: </span>
          {days90}
        </p>
      ) : null}
      <div className="mt-auto flex flex-wrap items-end justify-between gap-3 border-t border-white/[0.07] pt-3.5">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground/90">{row.sourceName}</p>
          {meta ? <p className="mt-0.5 truncate text-xs text-muted-foreground">{meta}</p> : null}
        </div>
        <button
          type="button"
          data-testid="open-abstract"
          onClick={() => onOpen(row)}
          className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary transition hover:bg-primary/20"
        >
          {t("openSource")}
          <ArrowUpRight className="h-4 w-4" />
        </button>
      </div>
    </article>
  );
}

export function LocalEvidenceFeed({
  topics,
  compact = false,
  title,
}: {
  topics?: string[];
  compact?: boolean;
  title?: string;
}) {
  const t = useTranslations("modules.localEvidence");
  const locale = useLocale();
  const isBn = locale.startsWith("bn");
  const entityId = useLocalEntityId();
  const [kind, setKind] = useState<string>("ALL");
  const [topic, setTopic] = useState<string>(topics?.[0] ?? "ALL");
  const [data, setData] = useState<EvidenceFeed | null>(null);
  const [openItem, setOpenItem] = useState<EvidenceItem | null>(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (entityId) params.set("entityId", entityId);
    const topicList =
      topic !== "ALL" ? [topic] : topics && topics.length ? topics : [];
    if (topicList.length) params.set("topics", topicList.join(","));
    if (kind !== "ALL") params.set("kind", kind);
    params.set("limit", compact ? "6" : "40");
    try {
      const res = await apiClient<{ success: boolean; data: EvidenceFeed }>(
        `local-entity/evidence?${params.toString()}`,
        { cache: "no-store" },
      );
      setData(res.data);
    } catch {
      setData(null);
    }
  }, [entityId, kind, topic, topics, compact]);

  useEffect(() => {
    void load();
  }, [load]);
  useRealtimeRefresh(load, true, true);

  const rows = data?.items ?? [];

  const topicOptions = useMemo(() => {
    const base = topics?.length ? topics : [...EVIDENCE_TOPICS];
    return [
      { value: "ALL", label: t("allTopics") },
      ...base.map((id) => ({ value: id, label: t(`topic${id}` as "topicPOWER") })),
    ];
  }, [topics, t]);

  return (
    <LocalVizCard title={title ?? t("panelTitle")} icon={BookOpen} delay={0.04}>
      <div className="mb-4 toolbar-wrap">
        <AppSelect
          size="sm"
          className="w-full min-w-0 sm:w-auto"
          value={kind}
          onValueChange={setKind}
          options={[
            { value: "ALL", label: t("allKinds") },
            { value: "THESIS", label: t("kindTHESIS") },
            { value: "EXPERT", label: t("kindEXPERT") },
            { value: "POLICY_BRIEF", label: t("kindPOLICY_BRIEF") },
          ]}
          triggerClassName="h-9 w-full min-w-[9rem] sm:w-[170px] text-sm"
        />
        <AppSelect
          size="sm"
          className="w-full min-w-0 sm:w-auto"
          value={topic}
          onValueChange={setTopic}
          options={topicOptions}
          triggerClassName="h-9 w-full min-w-[9rem] sm:w-[180px] text-sm"
        />
      </div>
      {rows.length === 0 ? (
        <p className="rounded-xl border border-border/50 bg-secondary/20 px-4 py-8 text-center text-sm text-muted-foreground">
          {t("empty")}
        </p>
      ) : (
        <div className={cn("grid gap-3", compact ? "sm:grid-cols-2" : "lg:grid-cols-2")}>
          {rows.map((row) => (
            <EvidenceCard
              key={row.id}
              row={row}
              compact={compact}
              isBn={isBn}
              t={t}
              onOpen={setOpenItem}
            />
          ))}
        </div>
      )}
      <EvidenceAbstractDialog
        item={openItem}
        open={Boolean(openItem)}
        onOpenChange={(next) => {
          if (!next) setOpenItem(null);
        }}
      />
      {data?.sourceNote ? (
        <p className="mt-3 text-xs text-muted-foreground/80">{data.sourceNote}</p>
      ) : null}
    </LocalVizCard>
  );
}
