"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Flame } from "lucide-react";
import { DataTable, ModuleShell } from "@/components/modules/module-shell";
import {
  LocalAreaTrend,
  LocalKpiSpark,
  LocalKpiSparkGrid,
  LocalVizCard,
} from "@/components/local-entity/local-viz";
import { LocalWardMap } from "@/components/local-entity/local-ward-map";
import { LocalFreshnessBadge } from "@/components/local-entity/local-freshness-badge";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { useRealtimeRefresh } from "@/hooks/use-realtime-refresh";
import { useLocalEntityId } from "@/hooks/use-local-entity-id";
import { useLocalEntityOverview } from "@/hooks/use-local-entity";
import type { LocalWardScore } from "@/lib/local-ward-geo";
import type { LocalMapMarker } from "@/components/local-entity/local-ward-map-inner";

interface ApiOk<T> {
  success: boolean;
  data: T;
}

interface HeatFeed {
  entityId: string;
  generatedAt: string;
  summary: { wards: number; open: number; overdue: number; red: number; hotWards: number };
  wards: Array<{
    wardId: string;
    code: string;
    name: string;
    nameBn: string | null;
    open: number;
    overdue: number;
    red: number;
    resolved: number;
    pressure: number;
    score: number;
  }>;
  weekly: Array<{ periodKey: string; opened: number; resolved: number; overdue: number }>;
  markers: Array<{
    id: string;
    lat: number;
    lng: number;
    severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
    label: string;
    isRedAlert: boolean;
  }>;
}

export function LocalHeatmapPanel() {
  const t = useTranslations("modules.localHeatmap");
  const locale = useLocale();
  const isBn = locale.startsWith("bn");
  const entityId = useLocalEntityId();
  const { data: overview } = useLocalEntityOverview(entityId);
  const [data, setData] = useState<HeatFeed | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const hasDataRef = useRef(false);

  const load = useCallback(async () => {
    if (!hasDataRef.current) setLoading(true);
    setError(null);
    try {
      const qs = entityId ? `?entityId=${entityId}` : "";
      const res = await apiClient<ApiOk<HeatFeed>>(`local-entity/heatmap${qs}`);
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

  const scores: LocalWardScore[] = useMemo(
    () =>
      (data?.wards ?? []).map((w) => ({
        wardId: w.wardId,
        score: w.score,
        openComplaints: w.open,
        redAlerts: w.red,
      })),
    [data?.wards],
  );

  const markers: LocalMapMarker[] = useMemo(
    () =>
      (data?.markers ?? []).map((m) => ({
        id: m.id,
        lat: m.lat,
        lng: m.lng,
        severity: m.severity,
        label: m.label,
      })),
    [data?.markers],
  );

  const trend = useMemo(
    () =>
      (data?.weekly ?? []).map((w) => ({
        name: w.periodKey.replace(/^\d+-W/, "W"),
        value: w.opened,
      })),
    [data?.weekly],
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
            <LocalKpiSpark label={t("open")} value={String(data.summary.open)} base={data.summary.open} color="#fbbf24" accent="warning" />
            <LocalKpiSpark label={t("overdue")} value={String(data.summary.overdue)} base={data.summary.overdue} color="#f87171" accent="danger" />
            <LocalKpiSpark label={t("red")} value={String(data.summary.red)} base={data.summary.red} color="#fb7185" accent="warning" />
            <LocalKpiSpark label={t("hotWards")} value={String(data.summary.hotWards)} base={data.summary.hotWards} color="#38bdf8" />
          </LocalKpiSparkGrid>
        ) : undefined
      }
    >
      <div className="mb-3 flex justify-end">
        <LocalFreshnessBadge lastUpdatedAt={data?.generatedAt} freshness="live" />
      </div>

      {overview && (
        <div className="mb-4">
          <LocalWardMap
            entityCode={overview.entity.code}
            wards={overview.wards}
            scores={scores}
            markers={markers}
            heightClassName="min-h-[320px] h-[360px]"
          />
        </div>
      )}

      <div className="mb-4">
        <LocalVizCard title={t("weeklyTrend")} icon={Flame} delay={0.05}>
          <LocalAreaTrend data={trend} color="#f87171" height={200} />
        </LocalVizCard>
      </div>

      <DataTable
        emptyMessage={t("empty")}
        columns={[
          {
            key: "wardId",
            label: t("colWard"),
            render: (row) => (isBn ? row.nameBn || row.name : row.name),
          },
          { key: "open", label: t("open") },
          { key: "overdue", label: t("overdue") },
          { key: "red", label: t("red") },
          { key: "pressure", label: t("pressure") },
        ]}
        rows={(data?.wards ?? []).map((w) => ({ ...w, id: w.wardId }))}
      />
    </ModuleShell>
  );
}
