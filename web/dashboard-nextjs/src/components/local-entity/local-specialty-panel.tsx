"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Boxes, Filter, Activity } from "lucide-react";
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
import { LocalWardMap } from "@/components/local-entity/local-ward-map";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api-client";
import { useRealtimeRefresh } from "@/hooks/use-realtime-refresh";
import { useLocalEntityId } from "@/hooks/use-local-entity-id";
import { useLocalEntityOverview } from "@/hooks/use-local-entity";
import { cn } from "@/lib/utils";
import type { LocalMapMarker } from "@/components/local-entity/local-ward-map-inner";

interface ApiOk<T> {
  success: boolean;
  data: T;
}

interface SpecialtyModuleMeta {
  id: string;
  titleEn: string;
  titleBn: string;
  status: "planned" | "active";
}

interface SpecialtySignal {
  id: string;
  moduleId: string;
  title: string;
  titleBn: string | null;
  detail: string | null;
  detailBn: string | null;
  status: "OK" | "WATCH" | "ALERT" | "IN_PROGRESS";
  metricLabel: string | null;
  metricLabelBn: string | null;
  metricValue: string | number | null;
  metricUnit: string | null;
  lat: number | null;
  lng: number | null;
  recordedAt: string;
  ward: { id: string; code: string; name: string; nameBn: string | null } | null;
}

interface SpecialtyModuleBlock {
  module: SpecialtyModuleMeta;
  signalCount: number;
  alertCount: number;
  watchCount: number;
  latestMetric: {
    label: string | null;
    labelBn: string | null;
    value: number | null;
    unit: string | null;
    recordedAt: string;
  } | null;
  signals: SpecialtySignal[];
}

interface SpecialtyPack {
  entityId: string;
  entityCode: string;
  entityName: string;
  entityNameBn: string | null;
  role: string;
  summary: {
    moduleCount: number;
    signalCount: number;
    alertCount: number;
    watchCount: number;
    inProgressCount: number;
  };
  modules: SpecialtyModuleBlock[];
}

function statusClass(status: string) {
  switch (status) {
    case "ALERT":
      return "border-destructive/40 bg-destructive/15 text-destructive";
    case "WATCH":
      return "border-amber-500/30 bg-amber-500/10 text-amber-200";
    case "IN_PROGRESS":
      return "border-sky-500/30 bg-sky-500/10 text-sky-200";
    case "OK":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
    default:
      return "border-border/50 bg-secondary/30 text-muted-foreground";
  }
}

export function LocalSpecialtyPanel() {
  const t = useTranslations("modules.localSpecialty");
  const tv = useTranslations("modules.localViz");
  const locale = useLocale();
  const isBn = locale.startsWith("bn");
  const entityId = useLocalEntityId();
  const { data: overview } = useLocalEntityOverview(entityId);

  const [data, setData] = useState<SpecialtyPack | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [moduleId, setModuleId] = useState<string>("ALL");
  const [scanBusy, setScanBusy] = useState(false);
  const [scanMsg, setScanMsg] = useState<string | null>(null);
  const hasDataRef = useRef(false);

  const reload = useCallback(async () => {
    if (!hasDataRef.current) setLoading(true);
    setError(null);
    try {
      const qs = entityId ? `?entityId=${encodeURIComponent(entityId)}` : "";
      const json = await apiClient<ApiOk<SpecialtyPack>>(
        `local-entity/specialty${qs}`,
        { cache: "no-store" },
      );
      setData(json.data);
      hasDataRef.current = true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load specialty pack");
      if (!hasDataRef.current) setData(null);
    } finally {
      setLoading(false);
    }
  }, [entityId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useRealtimeRefresh(reload, true, true);

  const activeModules = useMemo(() => {
    if (!data) return [];
    if (moduleId === "ALL") return data.modules;
    return data.modules.filter((m) => m.module.id === moduleId);
  }, [data, moduleId]);

  const flatSignals = useMemo(
    () => activeModules.flatMap((m) => m.signals),
    [activeModules],
  );

  const statusPie = useMemo(() => {
    if (!data) return [];
    return [
      { name: t("alerts"), value: data.summary.alertCount, color: "#f87171" },
      { name: t("watch"), value: data.summary.watchCount, color: "#fbbf24" },
      {
        name: tv("inProgress"),
        value: data.summary.inProgressCount,
        color: "#38bdf8",
      },
      {
        name: tv("ok"),
        value: Math.max(
          0,
          data.summary.signalCount -
            data.summary.alertCount -
            data.summary.watchCount -
            data.summary.inProgressCount,
        ),
        color: "#34d399",
      },
    ];
  }, [data, t, tv]);

  const moduleBars = useMemo(
    () =>
      (data?.modules ?? []).map((m) => ({
        name: isBn ? m.module.titleBn : m.module.titleEn,
        value: m.signalCount,
        alerts: m.alertCount,
      })),
    [data?.modules, isBn],
  );

  const sensorMarkers: LocalMapMarker[] = useMemo(
    () =>
      flatSignals
        .filter((s) => s.lat != null && s.lng != null)
        .slice(0, 40)
        .map((s) => ({
          id: s.id,
          lat: s.lat as number,
          lng: s.lng as number,
          severity:
            s.status === "ALERT"
              ? "CRITICAL"
              : s.status === "WATCH"
                ? "HIGH"
                : "MEDIUM",
          label: isBn ? s.titleBn || s.title : s.title,
        })),
    [flatSignals, isBn],
  );

  return (
    <ModuleShell
      title={t("title")}
      description={
        data
          ? `${isBn ? data.entityNameBn || data.entityName : data.entityName} · ${data.role}`
          : t("description")
      }
      loading={loading && !data}
      error={error}
      onRetry={reload}
      stats={
        data && (
          <LocalKpiSparkGrid>
            <LocalKpiSpark
              label={t("modules")}
              value={String(data.summary.moduleCount)}
              base={data.summary.moduleCount}
              color="#38bdf8"
            />
            <LocalKpiSpark
              label={t("signals")}
              value={String(data.summary.signalCount)}
              base={data.summary.signalCount}
              color="#a78bfa"
            />
            <LocalKpiSpark
              label={t("alerts")}
              value={String(data.summary.alertCount)}
              base={data.summary.alertCount}
              color="#f87171"
              accent="danger"
            />
            <LocalKpiSpark
              label={t("watch")}
              value={String(data.summary.watchCount)}
              base={data.summary.watchCount}
              color="#fbbf24"
              accent="warning"
            />
          </LocalKpiSparkGrid>
        )
      }
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={scanBusy}
          onClick={() => {
            setScanBusy(true);
            setScanMsg(null);
            const qs = entityId ? `?entityId=${encodeURIComponent(entityId)}` : "";
            void (async () => {
              try {
                const res = await apiClient<
                  ApiOk<{ scanned: number; escalated: number }>
                >(`local-entity/specialty/scan-anomalies${qs}`, { method: "POST" });
                setScanMsg(
                  t("scanResult", {
                    scanned: res.data.scanned,
                    escalated: res.data.escalated,
                  }),
                );
                await reload();
              } catch {
                setScanMsg(null);
              } finally {
                setScanBusy(false);
              }
            })();
          }}
        >
          {scanBusy ? t("scanBusy") : t("scanAnomalies")}
        </Button>
        {scanMsg ? <span className="text-xs text-muted-foreground">{scanMsg}</span> : null}
      </div>
      {overview && sensorMarkers.length > 0 && (
        <div className="mb-4">
          <LocalWardMap
            entityCode={overview.entity.code}
            wards={overview.wards}
            markers={sensorMarkers}
            heightClassName="min-h-[300px] h-[340px]"
          />
        </div>
      )}

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <LocalVizCard title={tv("signalStatus")} icon={Activity} delay={0.05}>
          <LocalDonut data={statusPie} height={260} />
        </LocalVizCard>
        <LocalVizCard title={tv("moduleSignals")} icon={Boxes} delay={0.1}>
          <LocalBars data={moduleBars} color="#38bdf8" height={260} />
        </LocalVizCard>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Button
          size="sm"
          variant={moduleId === "ALL" ? "default" : "outline"}
          onClick={() => setModuleId("ALL")}
        >
          {t("allModules")}
        </Button>
        {(data?.modules ?? []).map((m) => (
          <Button
            key={m.module.id}
            size="sm"
            variant={moduleId === m.module.id ? "default" : "outline"}
            onClick={() => setModuleId(m.module.id)}
          >
            {isBn ? m.module.titleBn : m.module.titleEn}
          </Button>
        ))}
      </div>

      <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {activeModules.map((m) => (
          <div
            key={m.module.id}
            className="glass-panel rounded-xl border border-border/50 p-4 shadow-panel"
          >
            <div className="mb-2 flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">
                  {isBn ? m.module.titleBn : m.module.titleEn}
                </p>
                <p className="text-[11px] text-muted-foreground">{m.module.id}</p>
              </div>
              <Boxes className="h-4 w-4 text-primary" />
            </div>
            <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span>
                {t("signals")}: {m.signalCount}
              </span>
              <span className="text-destructive">
                {t("alerts")}: {m.alertCount}
              </span>
              {m.latestMetric?.value != null && (
                <span className="text-foreground">
                  {(isBn
                    ? m.latestMetric.labelBn || m.latestMetric.label
                    : m.latestMetric.label) ?? t("metric")}
                  : {m.latestMetric.value}
                  {m.latestMetric.unit ? ` ${m.latestMetric.unit}` : ""}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <DataTable
        emptyMessage={t("empty")}
        columns={[
          {
            key: "status",
            label: t("colStatus"),
            render: (row) => (
              <span
                className={cn(
                  "rounded-md border px-2 py-0.5 text-[10px] uppercase tracking-wide",
                  statusClass(row.status),
                )}
              >
                {row.status}
              </span>
            ),
          },
          {
            key: "module",
            label: t("colModule"),
            render: (row) => (
              <code className="text-[11px] text-primary">{row.moduleId}</code>
            ),
          },
          {
            key: "title",
            label: t("colTitle"),
            render: (row) => (
              <div className="max-w-lg">
                <p className="font-medium">
                  {isBn ? row.titleBn || row.title : row.title}
                </p>
                <p className="text-[11px] text-muted-foreground line-clamp-2">
                  {isBn ? row.detailBn || row.detail : row.detail}
                </p>
              </div>
            ),
          },
          {
            key: "metric",
            label: t("colMetric"),
            render: (row) =>
              row.metricValue != null ? (
                <span className="tabular-nums">
                  {Number(row.metricValue)}
                  {row.metricUnit ? ` ${row.metricUnit}` : ""}
                </span>
              ) : (
                "—"
              ),
          },
          {
            key: "ward",
            label: t("colWard"),
            render: (row) =>
              row.ward
                ? isBn
                  ? row.ward.nameBn || row.ward.name
                  : row.ward.name
                : "—",
          },
          {
            key: "when",
            label: t("colWhen"),
            render: (row) => (
              <span className="text-xs text-muted-foreground">
                {new Date(row.recordedAt).toLocaleString(locale)}
              </span>
            ),
          },
        ]}
        rows={flatSignals}
      />
    </ModuleShell>
  );
}
