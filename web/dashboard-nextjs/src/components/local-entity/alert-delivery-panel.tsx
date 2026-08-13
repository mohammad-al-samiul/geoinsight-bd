"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { MessageSquare, Phone, RefreshCw } from "lucide-react";
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
import { apiClient, ApiClientError } from "@/lib/api-client";
import { useRealtimeRefresh } from "@/hooks/use-realtime-refresh";
import { useLocalEntityId } from "@/hooks/use-local-entity-id";

interface ApiOk<T> {
  success: boolean;
  data: T;
}

interface DeliveryItem {
  id: string;
  channel: "WHATSAPP" | "VOICE" | "SMS";
  status: "QUEUED" | "SENT" | "DRY_RUN" | "FAILED";
  toAddress: string;
  bodyPreview: string;
  providerRef: string | null;
  error: string | null;
  sourceKind: string;
  retryCount?: number;
  nextRetryAt?: string | null;
  createdAt: string;
}

interface DeliveryFeed {
  entityId: string;
  mode: string;
  voiceEnabled: boolean;
  summary: {
    total: number;
    dryRun: number;
    sent: number;
    failed: number;
    queued: number;
    whatsapp: number;
    voice: number;
  };
  items: DeliveryItem[];
}

export function AlertDeliveryPanel() {
  const t = useTranslations("modules.localAlerts");
  const tv = useTranslations("modules.localViz");
  const locale = useLocale();
  const entityId = useLocalEntityId() ?? undefined;
  const [data, setData] = useState<DeliveryFeed | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [retryId, setRetryId] = useState<string | null>(null);
  const hasDataRef = useRef(false);

  const load = useCallback(async () => {
    if (!hasDataRef.current) setLoading(true);
    setError(null);
    try {
      const qs = entityId ? `?entityId=${entityId}` : "";
      const res = await apiClient<ApiOk<DeliveryFeed>>(
        `local-entity/alert-deliveries${qs}`,
      );
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

  const runTest = async () => {
    setBusy(true);
    setError(null);
    try {
      await apiClient("local-entity/alert-deliveries/test", {
        method: "POST",
        body: JSON.stringify({
          entityId,
          title: "Local DSS WhatsApp / voice dry-run test",
          severity: "CRITICAL",
        }),
      });
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : t("testFailed"));
    } finally {
      setBusy(false);
    }
  };

  const retryOne = async (id: string) => {
    setRetryId(id);
    setError(null);
    try {
      await apiClient(`local-entity/alert-deliveries/${id}/retry`, {
        method: "POST",
      });
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : t("retryFailed"));
    } finally {
      setRetryId(null);
    }
  };

  const statusPie = useMemo(() => {
    if (!data) return [];
    return [
      { name: t("queued"), value: data.summary.queued ?? 0, color: "#94a3b8" },
      { name: t("dryRun"), value: data.summary.dryRun, color: "#fbbf24" },
      { name: tv("sent"), value: data.summary.sent, color: "#34d399" },
      { name: t("failed"), value: data.summary.failed, color: "#f87171" },
    ];
  }, [data, t, tv]);

  const channelPie = useMemo(() => {
    if (!data) return [];
    return [
      { name: "WhatsApp", value: data.summary.whatsapp, color: "#34d399" },
      { name: "Voice", value: data.summary.voice, color: "#38bdf8" },
    ];
  }, [data]);

  const timelineBars = useMemo(() => {
    const buckets = new Map<string, number>();
    for (const item of data?.items ?? []) {
      const day = new Date(item.createdAt).toLocaleDateString(locale, {
        month: "short",
        day: "numeric",
      });
      buckets.set(day, (buckets.get(day) ?? 0) + 1);
    }
    return Array.from(buckets.entries()).map(([name, value]) => ({ name, value }));
  }, [data?.items, locale]);

  return (
    <ModuleShell
      title={t("title")}
      description={t("description")}
      loading={loading && !data}
      error={error}
      onRetry={() => void load()}
      stats={
        data && (
          <LocalKpiSparkGrid>
            <LocalKpiSpark
              label={t("mode")}
              value={data.mode}
              base={data.summary.total || 4}
              color="#94a3b8"
              hint={data.voiceEnabled ? "voice on" : "voice off"}
            />
            <LocalKpiSpark
              label={t("total")}
              value={String(data.summary.total)}
              base={data.summary.total}
              color="#38bdf8"
            />
            <LocalKpiSpark
              label={t("queued")}
              value={String(data.summary.queued ?? 0)}
              base={data.summary.queued ?? 0}
              color="#94a3b8"
            />
            <LocalKpiSpark
              label={t("dryRun")}
              value={String(data.summary.dryRun)}
              base={data.summary.dryRun}
              color="#fbbf24"
            />
            <LocalKpiSpark
              label={t("failed")}
              value={String(data.summary.failed)}
              base={data.summary.failed}
              color="#f87171"
              accent="danger"
            />
          </LocalKpiSparkGrid>
        )
      }
    >
      <div className="mb-4 grid gap-4 lg:grid-cols-3">
        <LocalVizCard title={tv("deliveryStatus")} icon={MessageSquare} delay={0.05}>
          <LocalDonut data={statusPie} height={240} />
        </LocalVizCard>
        <LocalVizCard title={tv("channelMix")} icon={Phone} delay={0.1}>
          <LocalDonut data={channelPie} height={240} />
        </LocalVizCard>
        <LocalVizCard title={tv("deliveryVolume")} icon={MessageSquare} delay={0.15}>
          <LocalBars data={timelineBars} color="#38bdf8" height={240} />
        </LocalVizCard>
      </div>

      <div className="mb-4 flex justify-end">
        <Button size="sm" disabled={busy} onClick={() => void runTest()}>
          {busy ? t("testing") : t("sendTest")}
        </Button>
      </div>

      <DataTable
        emptyMessage={t("empty")}
        columns={[
          { key: "channel", label: t("colChannel") },
          { key: "status", label: t("colStatus") },
          { key: "toAddress", label: t("colTo") },
          { key: "sourceKind", label: t("colSource") },
          {
            key: "bodyPreview",
            label: t("colPreview"),
            render: (row) => (
              <span className="line-clamp-2 max-w-xs text-xs text-muted-foreground">
                {row.bodyPreview}
              </span>
            ),
          },
          {
            key: "createdAt",
            label: t("colWhen"),
            render: (row) => (
              <span className="text-xs text-muted-foreground">
                {new Date(row.createdAt).toLocaleString(locale)}
              </span>
            ),
          },
          {
            key: "id",
            label: t("colAction"),
            render: (row) =>
              row.status === "FAILED" || row.status === "QUEUED" ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7"
                  disabled={retryId === row.id}
                  onClick={() => void retryOne(row.id)}
                >
                  <RefreshCw className="mr-1 h-3 w-3" />
                  {retryId === row.id ? t("retrying") : t("retryNow")}
                </Button>
              ) : (
                <span className="text-[11px] text-muted-foreground">—</span>
              ),
          },
        ]}
        rows={data?.items ?? []}
      />
    </ModuleShell>
  );
}
