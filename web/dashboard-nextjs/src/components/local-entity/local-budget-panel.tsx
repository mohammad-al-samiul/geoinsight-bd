"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Landmark, Sparkles } from "lucide-react";
import { DataTable, ModuleShell } from "@/components/modules/module-shell";
import {
  LocalBars,
  LocalKpiSpark,
  LocalKpiSparkGrid,
  LocalVizCard,
} from "@/components/local-entity/local-viz";
import { LocalFreshnessBadge } from "@/components/local-entity/local-freshness-badge";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { useRealtimeRefresh } from "@/hooks/use-realtime-refresh";
import { useLocalEntityId } from "@/hooks/use-local-entity-id";

interface ApiOk<T> {
  success: boolean;
  data: T;
}

interface BudgetFeed {
  entityId: string;
  generatedAt: string;
  summary: {
    projectCount: number;
    allocated: number;
    spent: number;
    burnPct: number;
    ongoing: number;
    stalled: number;
  };
  items: Array<{
    id: string;
    title: string;
    status: string;
    budgetAllocated: number;
    budgetSpent: number;
    progressPct: number;
    startDate: string;
    redFlags: number;
    scopedToEntity: boolean;
    adminUnit: { code: string; name: string; nameBn: string | null };
  }>;
  aiRisk?: {
    riskLevel: "LOW" | "MEDIUM" | "HIGH";
    narrativeEn: string;
    narrativeBn: string;
    topRisks: Array<{
      projectTitle: string;
      reasonEn: string;
      reasonBn: string;
      score: number;
    }>;
    llmUsed: boolean;
  };
}

export function LocalBudgetPanel() {
  const t = useTranslations("modules.localBudget");
  const locale = useLocale();
  const isBn = locale.startsWith("bn");
  const entityId = useLocalEntityId();
  const [data, setData] = useState<BudgetFeed | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const hasDataRef = useRef(false);

  const load = useCallback(async () => {
    if (!hasDataRef.current) setLoading(true);
    setError(null);
    try {
      const qs = entityId ? `?entityId=${entityId}` : "";
      const res = await apiClient<ApiOk<BudgetFeed>>(`local-entity/budget${qs}`);
      setData(res.data);
      hasDataRef.current = true;
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : t("loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [entityId, t]);

  useEffect(() => {
    void load();
  }, [load]);
  useRealtimeRefresh(load, true, true);

  const bars = useMemo(
    () =>
      (data?.items ?? []).slice(0, 8).map((i) => ({
        name: i.title.slice(0, 28),
        value: i.progressPct,
      })),
    [data?.items],
  );

  return (
    <ModuleShell
      title={t("title")}
      description={t("description")}
      loading={loading && !data}
      error={error}
      onRetry={() => void load()}
      stats={
        data ? (
          <LocalKpiSparkGrid>
            <LocalKpiSpark
              label={t("projects")}
              value={String(data.summary.projectCount)}
              base={data.summary.projectCount}
              color="#38bdf8"
            />
            <LocalKpiSpark
              label={t("allocated")}
              value={data.summary.allocated.toFixed(1)}
              base={data.summary.allocated}
              color="#a78bfa"
              hint="cr"
            />
            <LocalKpiSpark
              label={t("spent")}
              value={data.summary.spent.toFixed(1)}
              base={data.summary.spent}
              color="#34d399"
              hint={`${data.summary.burnPct}%`}
            />
            <LocalKpiSpark
              label={t("stalled")}
              value={String(data.summary.stalled)}
              base={data.summary.stalled}
              color="#f87171"
              accent="danger"
            />
          </LocalKpiSparkGrid>
        ) : undefined
      }
    >
      <div className="mb-3 flex justify-end">
        <LocalFreshnessBadge lastUpdatedAt={data?.generatedAt} freshness="live" />
      </div>
      {data?.aiRisk ? (
        <div className="mb-4 rounded-xl border border-primary/25 bg-primary/5 px-4 py-3">
          <p className="mb-1 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            {t("aiRisk")}
            {data.aiRisk.llmUsed ? " · AI" : ""}
            {" · "}
            {t("riskLevel", { level: data.aiRisk.riskLevel })}
          </p>
          <p className="text-sm leading-relaxed">
            {isBn ? data.aiRisk.narrativeBn : data.aiRisk.narrativeEn}
          </p>
          {data.aiRisk.topRisks.length > 0 ? (
            <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
              {data.aiRisk.topRisks.slice(0, 3).map((r) => (
                <li key={r.projectTitle}>
                  <span className="font-medium text-foreground/90">{r.projectTitle}</span>
                  {" — "}
                  {isBn ? r.reasonBn || r.reasonEn : r.reasonEn}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
      <div className="mb-4">
        <LocalVizCard title={t("progress")} icon={Landmark} delay={0.05}>
          <LocalBars data={bars} color="#38bdf8" height={240} layoutDir="horizontal" />
        </LocalVizCard>
      </div>
      <DataTable
        emptyMessage={t("empty")}
        columns={[
          { key: "title", label: t("colTitle") },
          { key: "status", label: t("colStatus") },
          {
            key: "budgetAllocated",
            label: t("colBudget"),
            render: (row) => (
              <span className="text-xs">
                {row.budgetSpent.toFixed(1)} / {row.budgetAllocated.toFixed(1)}
              </span>
            ),
          },
          {
            key: "progressPct",
            label: t("colProgress"),
            render: (row) => <span>{row.progressPct}%</span>,
          },
          {
            key: "adminUnit",
            label: t("colUnit"),
            render: (row) => (
              <span className="text-xs text-muted-foreground">
                {row.scopedToEntity ? t("entityScoped") : row.adminUnit.code}
              </span>
            ),
          },
          {
            key: "startDate",
            label: t("colStart"),
            render: (row) => (
              <span className="text-xs text-muted-foreground">
                {new Date(row.startDate).toLocaleDateString(locale)}
              </span>
            ),
          },
        ]}
        rows={data?.items ?? []}
      />
    </ModuleShell>
  );
}
