"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { BookOpen, GraduationCap, Landmark, Newspaper } from "lucide-react";
import {
  useNationalBoard,
  type NationalBoard,
  type NationalEvidenceSnippet,
} from "@/hooks/use-national-board";
import { cn } from "@/lib/utils";

const KIND_ICON = {
  THESIS: GraduationCap,
  EXPERT: Newspaper,
  POLICY_BRIEF: Landmark,
} as const;

function kindClass(kind: NationalEvidenceSnippet["kind"]) {
  if (kind === "THESIS") return "border-violet-400/40 text-violet-200";
  if (kind === "EXPERT") return "border-amber-400/40 text-amber-100";
  return "border-sky-400/40 text-sky-100";
}

export function PmoLocalEvidenceCards({
  data,
  framed = false,
}: {
  data: NationalBoard;
  framed?: boolean;
}) {
  const t = useTranslations("modules.pmoLocal");
  const te = useTranslations("modules.localEvidence");
  const isBn = useLocale().startsWith("bn");

  if (!data.evidence.items.length) return null;

  return (
    <div
      className={
        framed
          ? "glass-panel rounded-xl border border-border/50 p-3"
          : "mt-3 border-t border-border/40 pt-3"
      }
    >
      <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
        <p className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          <BookOpen className="h-3.5 w-3.5 text-violet-300" />
          {t("evidenceTitle")}
        </p>
        {data.summary.hotTopics.length ? (
          <p className="text-[10px] text-muted-foreground">
            {data.summary.hotTopics.slice(0, 4).map((id) => te(`topic${id}` as "topicPOWER")).join(" · ")}
          </p>
        ) : null}
      </div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {data.evidence.items.map((item) => {
          const Icon = KIND_ICON[item.kind];
          const title = isBn ? item.titleBn || item.title : item.title;
          const abstract = isBn ? item.abstractBn || item.abstract : item.abstract;
          const doNow = isBn ? item.doNow.bn || item.doNow.en : item.doNow.en;
          const deskHref = item.localEntityId
            ? `/local/evidence?entityId=${item.localEntityId}`
            : "/local/evidence";
          return (
            <article
              key={item.id}
              className="rounded-lg border border-border/60 bg-secondary/20 px-3 py-2.5"
            >
              <div className="flex items-start justify-between gap-2">
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px]",
                    kindClass(item.kind),
                  )}
                >
                  <Icon className="h-3 w-3" />
                  {te(`kind${item.kind}` as "kindTHESIS")}
                </span>
                {item.localCode ? (
                  <Link href={deskHref} className="text-[10px] text-muted-foreground hover:text-primary">
                    {item.localCode}
                  </Link>
                ) : null}
              </div>
              <p className="mt-1.5 line-clamp-2 text-sm font-medium leading-snug">{title}</p>
              <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">{abstract}</p>
              {doNow ? (
                <p className="mt-1.5 text-[10px] text-sky-200/90">
                  {te("horizonNow")}: {doNow}
                </p>
              ) : null}
              <div className="mt-2 flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground">
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-primary"
                >
                  {te("openSource")}
                </a>
                <Link href={deskHref} className="hover:text-primary">
                  {t("openEvidence")}
                </Link>
              </div>
            </article>
          );
        })}
      </div>
      <p className="mt-2 text-[10px] text-muted-foreground/80">{t("evidenceNote")}</p>
    </div>
  );
}

/** Briefing / other PMO pages that do not already hold the board payload. */
export function PmoLocalEvidenceSnippets() {
  const { data, allowed } = useNationalBoard();
  if (!allowed || !data) return null;
  return <PmoLocalEvidenceCards data={data} framed />;
}
