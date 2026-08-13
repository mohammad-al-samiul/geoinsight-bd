"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  ArrowRight,
  ClipboardList,
  MapPinned,
  Siren,
  Sparkles,
} from "lucide-react";
import { ModuleShell } from "@/components/modules/module-shell";
import { Button } from "@/components/ui/button";
import { useLocalComplaints } from "@/hooks/use-local-dss";
import { useLocalEntityId, withLocalEntityHref } from "@/hooks/use-local-entity-id";
import { apiClient } from "@/lib/api-client";
import { cn } from "@/lib/utils";

export function LocalFieldBridgePanel() {
  const t = useTranslations("modules.localField");
  const locale = useLocale();
  const isBn = locale.startsWith("bn");
  const entityId = useLocalEntityId();
  const { data, loading, error, reload } = useLocalComplaints(entityId);
  const [briefBusy, setBriefBusy] = useState(false);
  const [brief, setBrief] = useState<{
    summaryEn: string;
    summaryBn: string;
    checklist: string[];
    llmUsed: boolean;
  } | null>(null);

  const queue = useMemo(() => {
    const items = data?.items ?? [];
    return items
      .filter((c) => c.status !== "RESOLVED")
      .sort((a, b) => {
        const score = (c: (typeof items)[number]) =>
          (c.isRedAlert ? 100 : 0) +
          (c.operationalStatus === "OVERDUE" ? 80 : 0) +
          (c.severity === "CRITICAL" ? 40 : c.severity === "HIGH" ? 20 : 0);
        return score(b) - score(a);
      })
      .slice(0, 12);
  }, [data?.items]);

  const loadOfflineBrief = () => {
    setBriefBusy(true);
    void (async () => {
      try {
        const qs = entityId ? `?entityId=${entityId}` : "";
        const res = await apiClient<{
          success: boolean;
          data: {
            summaryEn: string;
            summaryBn: string;
            checklist: string[];
            llmUsed: boolean;
          };
        }>(`local-entity/field-summary${qs}`);
        setBrief(res.data);
      } catch {
        setBrief(null);
      } finally {
        setBriefBusy(false);
      }
    })();
  };

  return (
    <ModuleShell
      title={t("title")}
      description={t("description")}
      loading={loading && !data}
      error={error}
      onRetry={reload}
    >
      <div className="mb-4 grid gap-2 sm:grid-cols-3">
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-3 text-sm">
          <div className="text-[11px] uppercase tracking-wide text-destructive">{t("red")}</div>
          <div className="mt-1 text-2xl font-semibold">{data?.summary.redAlerts ?? 0}</div>
        </div>
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-3 text-sm">
          <div className="text-[11px] uppercase tracking-wide text-amber-100">{t("overdue")}</div>
          <div className="mt-1 text-2xl font-semibold">{data?.summary.overdue ?? 0}</div>
        </div>
        <div className="rounded-xl border border-border/50 bg-secondary/30 px-3 py-3 text-sm">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{t("open")}</div>
          <div className="mt-1 text-2xl font-semibold">{data?.summary.open ?? 0}</div>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <Button asChild size="sm">
          <Link href={withLocalEntityHref("/local/complaints", entityId)}>
            <ClipboardList className="mr-1.5 h-3.5 w-3.5" />
            {t("openSla")}
          </Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href={withLocalEntityHref("/local/visits", entityId)}>
            <MapPinned className="mr-1.5 h-3.5 w-3.5" />
            {t("openVisits")}
          </Link>
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={briefBusy}
          onClick={loadOfflineBrief}
        >
          <Sparkles className="mr-1.5 h-3.5 w-3.5" />
          {briefBusy ? t("offlineBusy") : t("offlineBrief")}
        </Button>
      </div>

      {brief ? (
        <div className="mb-4 rounded-xl border border-primary/25 bg-primary/5 px-4 py-3">
          <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-primary">
            {t("offlineBrief")}
            {brief.llmUsed ? " · AI" : ""}
          </p>
          <p className="text-sm leading-relaxed">
            {isBn ? brief.summaryBn : brief.summaryEn}
          </p>
          {brief.checklist.length > 0 ? (
            <div className="mt-2">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {t("checklist")}
              </p>
              <ol className="mt-1 list-decimal space-y-0.5 pl-4 text-xs text-muted-foreground">
                {brief.checklist.slice(0, 8).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ol>
            </div>
          ) : null}
        </div>
      ) : null}

      <ul className="space-y-2">
        {queue.map((c) => (
          <li key={c.id}>
            <Link
              href={withLocalEntityHref("/local/complaints", entityId)}
              className={cn(
                "flex items-start gap-3 rounded-xl border px-3 py-3 transition active:scale-[0.99]",
                c.isRedAlert
                  ? "border-destructive/40 bg-destructive/10"
                  : "border-border/50 bg-background/50",
              )}
            >
              <span className="mt-0.5 rounded-md border border-border/50 bg-secondary/40 p-1.5">
                <Siren className="h-3.5 w-3.5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium leading-snug">
                  {isBn ? c.titleBn || c.title : c.title}
                </span>
                <span className="mt-0.5 block text-[11px] text-muted-foreground">
                  {isBn ? c.ward.nameBn || c.ward.name : c.ward.name} · {c.operationalStatus}
                  {c.assignee ? ` · ${c.assignee.email}` : ` · ${t("unassigned")}`}
                </span>
              </span>
              <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
            </Link>
          </li>
        ))}
        {!queue.length && (
          <li className="rounded-xl border border-border/40 px-3 py-6 text-center text-sm text-muted-foreground">
            {t("empty")}
          </li>
        )}
      </ul>
    </ModuleShell>
  );
}
