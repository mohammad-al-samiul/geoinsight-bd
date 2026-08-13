"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CalendarDays } from "lucide-react";
import { DataTable, ModuleShell } from "@/components/modules/module-shell";
import {
  LocalKpiSpark,
  LocalKpiSparkGrid,
  LocalVizCard,
} from "@/components/local-entity/local-viz";
import { Button } from "@/components/ui/button";
import { LocalFreshnessBadge } from "@/components/local-entity/local-freshness-badge";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { useRealtimeRefresh } from "@/hooks/use-realtime-refresh";
import { useLocalEntityId } from "@/hooks/use-local-entity-id";

interface ApiOk<T> {
  success: boolean;
  data: T;
}

interface VisitFeed {
  entityId: string;
  generatedAt: string;
  summary: { planned: number; done: number; suggestions: number };
  items: Array<{
    id: string;
    title: string;
    titleBn: string | null;
    reason: string;
    status: string;
    scheduledAt: string;
    priority: number;
    ward: { id: string; name: string; nameBn: string | null } | null;
  }>;
  suggestions: Array<{
    reason: string;
    title: string;
    titleBn: string;
    wardId: string | null;
    wardName: string | null;
    priority: number;
  }>;
}

export function LocalVisitsPanel() {
  const t = useTranslations("modules.localVisits");
  const locale = useLocale();
  const isBn = locale.startsWith("bn");
  const entityId = useLocalEntityId();
  const [data, setData] = useState<VisitFeed | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const hasDataRef = useRef(false);

  const load = useCallback(async () => {
    if (!hasDataRef.current) setLoading(true);
    setError(null);
    try {
      const qs = entityId ? `?entityId=${entityId}` : "";
      const res = await apiClient<ApiOk<VisitFeed>>(`local-entity/visits${qs}`);
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

  const scheduleSuggestion = async (s: VisitFeed["suggestions"][number]) => {
    setBusy(s.title);
    try {
      await apiClient("local-entity/visits", {
        method: "POST",
        body: JSON.stringify({
          entityId: entityId ?? undefined,
          wardId: s.wardId ?? undefined,
          title: s.title,
          titleBn: s.titleBn,
          reason: s.reason,
          priority: s.priority,
        }),
      });
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : t("createFailed"));
    } finally {
      setBusy(null);
    }
  };

  const markDone = async (id: string) => {
    setBusy(id);
    try {
      await apiClient(`local-entity/visits/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "DONE" }),
      });
      await load();
    } finally {
      setBusy(null);
    }
  };

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
            <LocalKpiSpark label={t("planned")} value={String(data.summary.planned)} base={data.summary.planned} color="#38bdf8" />
            <LocalKpiSpark label={t("done")} value={String(data.summary.done)} base={data.summary.done} color="#34d399" accent="success" />
            <LocalKpiSpark label={t("suggestions")} value={String(data.summary.suggestions)} base={data.summary.suggestions} color="#fbbf24" accent="warning" />
          </LocalKpiSparkGrid>
        ) : undefined
      }
    >
      <div className="mb-3 flex justify-end">
        <LocalFreshnessBadge lastUpdatedAt={data?.generatedAt} freshness="live" />
      </div>

      <LocalVizCard title={t("suggestTitle")} icon={CalendarDays} delay={0.05} className="mb-4">
        <div className="mb-2 flex items-center gap-2 text-[11px] text-muted-foreground">
          <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-primary">
            {t("suggestAi")}
          </span>
        </div>
        <ul className="space-y-2">
          {(data?.suggestions ?? []).map((s, idx) => (
            <li
              key={`${s.reason}-${s.title}`}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/50 bg-secondary/20 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  <span className="mr-1.5 text-[11px] text-primary">#{idx + 1}</span>
                  {isBn ? s.titleBn : s.title}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {s.reason}
                  {s.wardName ? ` · ${s.wardName}` : ""} · P{s.priority}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={busy === s.title}
                onClick={() => void scheduleSuggestion(s)}
              >
                {t("schedule")}
              </Button>
            </li>
          ))}
          {!data?.suggestions?.length && (
            <li className="text-sm text-muted-foreground">{t("noSuggestions")}</li>
          )}
        </ul>
      </LocalVizCard>

      <DataTable
        emptyMessage={t("empty")}
        columns={[
          {
            key: "title",
            label: t("colTitle"),
            render: (row) => (isBn ? row.titleBn || row.title : row.title),
          },
          { key: "reason", label: t("colReason") },
          { key: "status", label: t("colStatus") },
          {
            key: "scheduledAt",
            label: t("colWhen"),
            render: (row) => (
              <span className="text-xs">{new Date(row.scheduledAt).toLocaleString(locale)}</span>
            ),
          },
          {
            key: "id",
            label: t("colAction"),
            render: (row) =>
              row.status === "PLANNED" ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7"
                  disabled={busy === row.id}
                  onClick={() => void markDone(row.id)}
                >
                  {t("markDone")}
                </Button>
              ) : (
                "—"
              ),
          },
        ]}
        rows={data?.items ?? []}
      />
    </ModuleShell>
  );
}
