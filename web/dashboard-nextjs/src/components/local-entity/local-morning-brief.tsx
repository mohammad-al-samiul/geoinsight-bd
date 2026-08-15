"use client";

import Link from "next/link";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  Clock3,
  Download,
  GraduationCap,
  Gauge,
  Megaphone,
  Newspaper,
  School,
  ShieldAlert,
  Landmark,
  Siren,
  Sparkles,
  Zap,
  HeartPulse,
  Briefcase,
  Layers3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocalMorningBrief } from "@/hooks/use-local-dss";
import { withLocalEntityHref } from "@/hooks/use-local-entity-id";
import { apiClient } from "@/lib/api-client";
import { cn } from "@/lib/utils";

const KIND_ICON = {
  RED_ALERT: Siren,
  OVERDUE: Clock3,
  WPI_DROP: Gauge,
  OSINT: Newspaper,
  SPECIALTY: Boxes,
  OUTAGE: Zap,
  UNREST: Megaphone,
  EVIDENCE: GraduationCap,
  EDUCATION: School,
  HEALTH: HeartPulse,
  JOBS: Briefcase,
  CRIME: ShieldAlert,
  CORRUPTION: Landmark,
  COMMAND: Layers3,
} as const;

const TONE = {
  danger: "border-destructive/35 bg-destructive/10 text-destructive",
  warn: "border-amber-500/30 bg-amber-500/10 text-amber-100",
  ok: "border-emerald-500/30 bg-emerald-500/10 text-emerald-100",
  info: "border-sky-500/30 bg-sky-500/10 text-sky-100",
} as const;

export function LocalMorningBriefPanel({
  entityId,
  scope = "entity",
}: {
  entityId?: string | null;
  scope?: "entity" | "all";
}) {
  const t = useTranslations("modules.localMorningBrief");
  const locale = useLocale();
  const isBn = locale.startsWith("bn");
  const { data, loading, reload } = useLocalMorningBrief(entityId, { scope });
  const [digestBusy, setDigestBusy] = useState(false);
  const [digestMsg, setDigestMsg] = useState<string | null>(null);

  if (loading && !data) {
    return (
      <section className="mb-4 rounded-2xl border border-border/50 bg-secondary/15 p-4 text-sm text-muted-foreground">
        {t("loading")}
      </section>
    );
  }
  if (!data) return null;

  return (
    <section className="mb-4 overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-secondary/30 via-background/40 to-primary/5 shadow-panel">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/40 px-4 py-4 sm:px-5">
        <div className="min-w-0 flex-1">
          <div className="mb-1 inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            {t("eyebrow")}
            {data.llmUsed ? (
              <span className="rounded-full border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[10px] normal-case tracking-normal text-primary">
                {t("aiBadge")}
              </span>
            ) : null}
          </div>
          <h2 className="font-display text-base font-semibold tracking-tight sm:text-lg">{t("title")}
            {scope === "all" ? ` · ${t("pmoMulti")}` : ""}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">{t("subtitle")}</p>
        </div>
        <div className="flex w-full flex-wrap gap-2 text-[11px] sm:w-auto sm:justify-end">
          <span className="rounded-full border border-destructive/30 bg-destructive/10 px-2.5 py-1 text-destructive">
            {t("red", { count: data.summary.redAlerts })}
          </span>
          <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-amber-100">
            {t("overdue", { count: data.summary.overdue })}
          </span>
          <span className="rounded-full border border-border/50 bg-secondary/40 px-2.5 py-1 text-muted-foreground">
            {t("unassigned", { count: data.summary.unassigned })}
          </span>
          <span className="rounded-full border border-border/50 bg-secondary/40 px-2.5 py-1 text-muted-foreground">
            {t("wpiAvg", { score: data.summary.wpiAverage })}
          </span>
          <Button
            size="sm"
            variant="outline"
            className="h-7"
            onClick={() => {
              const qs = entityId ? `?entityId=${encodeURIComponent(entityId)}` : "";
              void (async () => {
                const res = await fetch(
                  `/api/proxy/local-entity/morning-brief/export${qs}`,
                  { credentials: "include" },
                );
                if (!res.ok) return;
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "local-morning-brief.csv";
                a.click();
                URL.revokeObjectURL(url);
              })();
            }}
          >
            <Download className="mr-1 h-3.5 w-3.5" />
            {t("exportCsv")}
          </Button>
          {scope !== "all" ? (
          <Button
            size="sm"
            variant="outline"
            className="h-7"
            disabled={digestBusy}
            onClick={() => {
              setDigestBusy(true);
              setDigestMsg(null);
              const qs = entityId ? `?entityId=${encodeURIComponent(entityId)}` : "";
              void (async () => {
                try {
                  await apiClient(`local-entity/morning-brief/digest${qs}`, {
                    method: "POST",
                  });
                  setDigestMsg(t("digestSent"));
                  void reload();
                } catch {
                  setDigestMsg(null);
                } finally {
                  setDigestBusy(false);
                }
              })();
            }}
          >
            {digestBusy ? t("digestBusy") : t("sendDigest")}
          </Button>
          ) : null}
        </div>
      </div>
      {digestMsg ? (
        <p className="border-b border-border/40 px-4 py-2 text-xs text-emerald-200 sm:px-5">
          {digestMsg}
        </p>
      ) : null}

      <div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-2 border-b border-border/40 p-4 sm:p-5 lg:border-b-0 lg:border-r">
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t("bulletsTitle")}
          </h3>
          {data.bullets.map((b, i) => (
            <div
              key={`${b.tone}-${i}`}
              className={cn("rounded-xl border px-3 py-2.5 text-sm leading-relaxed", TONE[b.tone])}
            >
              {isBn ? b.bn : b.en}
            </div>
          ))}
          {(isBn ? data.narrativeBn : data.narrativeEn) ? (
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              {isBn ? data.narrativeBn : data.narrativeEn}
            </p>
          ) : null}
        </div>

        <div className="p-4 sm:p-5">
          <h3 className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <AlertTriangle className="h-3.5 w-3.5" />
            {t("queueTitle")}
          </h3>
          <div className="max-h-[360px] space-y-2 overflow-y-auto sm:max-h-none">
            {data.actionQueue.length === 0 && (
              <p className="text-sm text-muted-foreground">{t("queueEmpty")}</p>
            )}
            {data.actionQueue.map((item) => {
              const Icon = KIND_ICON[item.kind] ?? AlertTriangle;
              return (
                <Link
                  key={item.id}
                  href={withLocalEntityHref(item.href, entityId)}
                  className="group flex items-start gap-3 rounded-xl border border-border/50 bg-background/50 px-3 py-2.5 transition hover:border-primary/40 hover:bg-primary/5"
                >
                  <span className="mt-0.5 rounded-md border border-border/50 bg-secondary/40 p-1.5 text-muted-foreground group-hover:text-primary">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {isBn ? item.titleBn : item.title}
                    </span>
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {isBn ? item.detailBn : item.detail}
                    </span>
                    {(item.solutionBn || item.solutionEn) && (
                      <span className="mt-0.5 block line-clamp-2 text-[10px] text-sky-200/90">
                        {t("opsNow")}: {isBn ? item.solutionBn || item.solutionEn : item.solutionEn}
                      </span>
                    )}
                    {(item.solutionWeekBn || item.solutionWeekEn) && (
                      <span className="block line-clamp-1 text-[10px] text-amber-100/80">
                        {t("horizonWeek")}: {isBn ? item.solutionWeekBn || item.solutionWeekEn : item.solutionWeekEn}
                      </span>
                    )}
                    {(item.solution90Bn || item.solution90En) && (
                      <span className="block line-clamp-1 text-[10px] text-emerald-200/80">
                        {t("horizon90")}: {isBn ? item.solution90Bn || item.solution90En : item.solution90En}
                      </span>
                    )}
                  </span>
                  <ArrowRight className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
