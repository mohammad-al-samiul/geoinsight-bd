"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { BookOpen, GraduationCap, Landmark, Newspaper } from "lucide-react";
import { DataTable } from "@/components/modules/module-shell";
import { LocalVizCard } from "@/components/local-entity/local-viz";
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
  if (kind === "THESIS") return "border-violet-400/40 text-violet-200";
  if (kind === "EXPERT") return "border-amber-400/40 text-amber-100";
  return "border-sky-400/40 text-sky-100";
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
      <div className="mb-3 flex flex-wrap gap-2">
        <AppSelect
          size="sm"
          value={kind}
          onValueChange={setKind}
          options={[
            { value: "ALL", label: t("allKinds") },
            { value: "THESIS", label: t("kindTHESIS") },
            { value: "EXPERT", label: t("kindEXPERT") },
            { value: "POLICY_BRIEF", label: t("kindPOLICY_BRIEF") },
          ]}
          triggerClassName="h-8 w-[160px]"
        />
        <AppSelect
          size="sm"
          value={topic}
          onValueChange={setTopic}
          options={topicOptions}
          triggerClassName="h-8 w-[170px]"
        />
      </div>
      <DataTable
        emptyMessage={t("empty")}
        columns={[
          {
            key: "kind",
            label: t("colKind"),
            render: (row) => {
              const Icon = KIND_ICON[row.kind];
              return (
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px]",
                    kindClass(row.kind),
                  )}
                >
                  <Icon className="h-3 w-3" />
                  {t(`kind${row.kind}`)}
                </span>
              );
            },
          },
          {
            key: "title",
            label: t("colTitle"),
            render: (row) => (
              <div className="max-w-xl">
                <p className="font-medium">
                  {isBn ? row.titleBn || row.title : row.title}
                </p>
                <p className="line-clamp-2 text-[11px] text-muted-foreground">
                  {isBn ? row.abstractBn || row.abstract : row.abstract}
                </p>
                <p className="mt-1 text-[10px] text-sky-200/90">
                  {t("horizonNow")}: {isBn ? row.solutions.now.bn : row.solutions.now.en}
                </p>
                {!compact ? (
                  <>
                    <p className="text-[10px] text-amber-100/80">
                      {t("horizonWeek")}: {isBn ? row.solutions.week.bn : row.solutions.week.en}
                    </p>
                    <p className="text-[10px] text-emerald-200/80">
                      {t("horizon90")}: {isBn ? row.solutions.days90.bn : row.solutions.days90.en}
                    </p>
                  </>
                ) : null}
              </div>
            ),
          },
          {
            key: "source",
            label: t("colSource"),
            render: (row) => (
              <div className="text-xs">
                <p>{row.sourceName}</p>
                <p className="text-[10px] text-muted-foreground">
                  {[row.author, row.institution, String(row.year)].filter(Boolean).join(" · ")}
                </p>
              </div>
            ),
          },
          {
            key: "link",
            label: t("colLink"),
            render: (row) => (
              <a
                href={row.url}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-primary underline-offset-2 hover:underline"
              >
                {t("openSource")}
              </a>
            ),
          },
        ]}
        rows={rows}
      />
      {data?.sourceNote ? (
        <p className="mt-2 text-[10px] text-muted-foreground/80">{data.sourceNote}</p>
      ) : null}
    </LocalVizCard>
  );
}
