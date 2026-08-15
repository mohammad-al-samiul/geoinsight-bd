"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  Briefcase,
  GraduationCap,
  HeartPulse,
  RefreshCw,
  School,
} from "lucide-react";
import { DataTable, ModuleShell } from "@/components/modules/module-shell";
import {
  LocalBars,
  LocalDonut,
  LocalKpiSpark,
  LocalKpiSparkGrid,
  LocalVizCard,
} from "@/components/local-entity/local-viz";
import { LocalWardMap } from "@/components/local-entity/local-ward-map";
import { LocalMapLayerBar } from "@/components/local-entity/local-map-layer-bar";
import { LocalSourceBadge } from "@/components/local-entity/local-source-badge";
import { LocalEvidenceFeed } from "@/components/local-entity/local-evidence-feed";
import { Button } from "@/components/ui/button";
import { DataTrustBanner } from "@/components/ui/data-trust-banner";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { useRealtimeRefresh } from "@/hooks/use-realtime-refresh";
import { useLocalEntityId } from "@/hooks/use-local-entity-id";
import { useLocalEntityOverview } from "@/hooks/use-local-entity";
import { useLayerFilterState } from "@/hooks/use-layer-filter-state";
import {
  buildLocalWardGeoJson,
  resolveEntityAnchor,
  wardCentroidIndex,
} from "@/lib/local-ward-geo";
import {
  EDUCATION_LAYERS,
  HEALTH_LAYERS,
  JOBS_LAYERS,
  filterLayerEvents,
  isSignalSource,
  severityFromOutage,
  type LayerEvent,
  type MapLayerId,
  type SignalSource,
} from "@/lib/local-map-layers";
import type { LocalMapMarker } from "@/components/local-entity/local-ward-map-inner";
import { cn } from "@/lib/utils";

interface ApiOk<T> {
  success: boolean;
  data: T;
}

export type SectorCode = "EDUCATION" | "HEALTH" | "EMPLOYMENT";
type SiteStatus = "OK" | "WATCH" | "ALERT";

type SiteKind =
  | "PRIMARY_SCHOOL"
  | "SECONDARY_SCHOOL"
  | "COLLEGE"
  | "HOSPITAL"
  | "CLINIC"
  | "PHARMACY"
  | "TRAINING_CENTER"
  | "JOB_FAIR"
  | "EPZ_GATE";

interface SectorSite {
  id: string;
  sector: SectorCode;
  kind: SiteKind;
  status: SiteStatus;
  source?: SignalSource;
  title: string;
  titleBn: string | null;
  detail: string | null;
  detailBn: string | null;
  metrics: Record<string, unknown>;
  severity: number;
  pressure: number;
  lat?: number | null;
  lng?: number | null;
  observedAt: string;
  opsHint?: { en: string; bn: string; horizon: string };
  ward: { id: string; code: string; name: string; nameBn: string | null } | null;
}

interface SectorDesk {
  entityId: string;
  sector: SectorCode;
  generatedAt: string;
  sourceNote?: string;
  summary: {
    sites: number;
    alert: number;
    watch: number;
    ok: number;
    hotWards: number;
    attendanceAvg?: number;
    dropoutAvg?: number;
    teacherGap?: number;
    dengue7d?: number;
    occupancyAvg?: number;
    stockouts?: number;
    unemploymentAvg?: number;
    vacancies?: number;
    trainingSeats?: number;
    jobFairGaps?: number;
  };
  heat: Array<{
    wardId: string;
    code: string;
    name: string;
    nameBn: string | null;
    sites: number;
    alerts: number;
    pressure: number;
    score: number;
  }>;
  items: SectorSite[];
}

const SECTOR_LAYERS: Record<SectorCode, MapLayerId[]> = {
  EDUCATION: EDUCATION_LAYERS,
  HEALTH: HEALTH_LAYERS,
  EMPLOYMENT: JOBS_LAYERS,
};

const SECTOR_LAYER: Record<SectorCode, MapLayerId> = {
  EDUCATION: "EDUCATION",
  HEALTH: "HEALTH",
  EMPLOYMENT: "UNEMPLOYMENT",
};

const EVIDENCE_TOPICS: Record<SectorCode, string[]> = {
  EDUCATION: ["EDUCATION"],
  HEALTH: ["HEALTH"],
  EMPLOYMENT: ["UNEMPLOYMENT"],
};

const KIND_ICON: Record<SiteKind, typeof School> = {
  PRIMARY_SCHOOL: School,
  SECONDARY_SCHOOL: GraduationCap,
  COLLEGE: GraduationCap,
  HOSPITAL: HeartPulse,
  CLINIC: HeartPulse,
  PHARMACY: HeartPulse,
  TRAINING_CENTER: Briefcase,
  JOB_FAIR: Briefcase,
  EPZ_GATE: Briefcase,
};

function num(m: Record<string, unknown>, key: string): number | null {
  const v = m[key];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function flag(m: Record<string, unknown>, key: string): boolean {
  return m[key] === true;
}

function metricLine(sector: SectorCode, metrics: Record<string, unknown>, t: (k: string) => string): string {
  if (sector === "EDUCATION") {
    const parts = [
      num(metrics, "attendancePct") != null ? `${t("metricAttendance")} ${num(metrics, "attendancePct")}%` : null,
      num(metrics, "dropoutPct") != null ? `${t("metricDropout")} ${num(metrics, "dropoutPct")}%` : null,
      num(metrics, "teacherGap") != null ? `${t("metricTeacherGap")} ${num(metrics, "teacherGap")}` : null,
    ];
    return parts.filter(Boolean).join(" · ");
  }
  if (sector === "HEALTH") {
    const parts = [
      num(metrics, "dengueCases7d") != null ? `${t("metricDengue")} ${num(metrics, "dengueCases7d")}` : null,
      num(metrics, "occupancyPct") != null ? `${t("metricOccupancy")} ${num(metrics, "occupancyPct")}%` : null,
      flag(metrics, "stockout") ? t("metricStockout") : num(metrics, "orsStockDays") != null
        ? `${t("metricOrs")} ${num(metrics, "orsStockDays")}d`
        : null,
    ];
    return parts.filter(Boolean).join(" · ");
  }
  const parts = [
    num(metrics, "unemploymentPct") != null ? `${t("metricUnemp")} ${num(metrics, "unemploymentPct")}%` : null,
    num(metrics, "vacanciesListed") != null ? `${t("metricVacancies")} ${num(metrics, "vacanciesListed")}` : null,
    flag(metrics, "jobFairGap") ? t("metricFairGap") : num(metrics, "trainingSeats") != null
      ? `${t("metricSeats")} ${num(metrics, "trainingSeats")}`
      : null,
  ];
  return parts.filter(Boolean).join(" · ");
}

export function LocalSectorPanel({ sector }: { sector: SectorCode }) {
  const t = useTranslations("modules.localSector");
  const locale = useLocale();
  const isBn = locale.startsWith("bn");
  const entityId = useLocalEntityId();
  const { data: overview } = useLocalEntityOverview(entityId);
  const layerState = useLayerFilterState();

  const [data, setData] = useState<SectorDesk | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"ALL" | SiteStatus>("ALL");
  const hasDataRef = useRef(false);

  const load = useCallback(async () => {
    if (!hasDataRef.current) setLoading(true);
    setError(null);
    try {
      const parts = [entityId ? `entityId=${entityId}` : null, `sector=${sector}`].filter(Boolean);
      const res = await apiClient<ApiOk<SectorDesk>>(`local-entity/sector?${parts.join("&")}`);
      setData(res.data);
      hasDataRef.current = true;
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : t("loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [entityId, sector, t]);

  useEffect(() => {
    void load();
  }, [load]);
  useRealtimeRefresh(load, true, true);

  const title =
    sector === "EDUCATION" ? t("titleEducation") : sector === "HEALTH" ? t("titleHealth") : t("titleJobs");
  const description =
    sector === "EDUCATION" ? t("descEducation") : sector === "HEALTH" ? t("descHealth") : t("descJobs");
  const mapTitle =
    sector === "EDUCATION" ? t("mapEducation") : sector === "HEALTH" ? t("mapHealth") : t("mapJobs");

  const statusPie = useMemo(
    () => [
      { name: t("statusAlert"), value: data?.summary.alert ?? 0, color: "#f87171" },
      { name: t("statusWatch"), value: data?.summary.watch ?? 0, color: "#fbbf24" },
      { name: t("statusOk"), value: data?.summary.ok ?? 0, color: "#34d399" },
    ],
    [data?.summary, t],
  );

  const kindBars = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of data?.items ?? []) {
      counts.set(row.kind, (counts.get(row.kind) ?? 0) + 1);
    }
    return [...counts.entries()].map(([name, value]) => ({
      name: t(`kind${name}` as "kindPRIMARY_SCHOOL"),
      value,
    }));
  }, [data?.items, t]);

  const layerEvents: LayerEvent[] = useMemo(() => {
    const code = overview?.entity.code ?? "CCC";
    const wardList = overview?.wards ?? [];
    const centroids = wardCentroidIndex(buildLocalWardGeoJson(code, wardList, []));
    const anchor = resolveEntityAnchor(code);
    return (data?.items ?? []).map((row, i) => {
      const fromWard = row.ward ? centroids.get(row.ward.id) : undefined;
      return {
        id: row.id,
        layer: SECTOR_LAYER[sector],
        lat: row.lat ?? fromWard?.lat ?? anchor.lat + Math.sin(i) * 0.008,
        lng: row.lng ?? fromWard?.lng ?? anchor.lng + Math.cos(i) * 0.01,
        severity: severityFromOutage(row.severity),
        source: isSignalSource(row.source) ? row.source : "OFFICIAL",
        occurredAt: row.observedAt,
        wardId: row.ward?.id ?? null,
        label: isBn ? row.titleBn || row.title : row.title,
        kind: row.kind,
      };
    });
  }, [data?.items, overview?.entity.code, overview?.wards, isBn, sector]);

  const filteredEvents = useMemo(
    () => filterLayerEvents(layerEvents, layerState.filter),
    [layerEvents, layerState.filter],
  );

  const mapMarkers: LocalMapMarker[] = useMemo(
    () =>
      filteredEvents.map((e) => ({
        id: e.id,
        lat: e.lat,
        lng: e.lng,
        severity: e.severity,
        label: e.label,
        layer: e.layer,
        source: e.source,
      })),
    [filteredEvents],
  );

  const filteredIds = useMemo(() => new Set(filteredEvents.map((e) => e.id)), [filteredEvents]);
  const tableRows = useMemo(() => {
    const items = (data?.items ?? []).filter((row) => statusFilter === "ALL" || row.status === statusFilter);
    if (
      layerState.filter.layers.length === 0 &&
      layerState.filter.sources.length === 0 &&
      !layerState.filter.wardId
    ) {
      return items;
    }
    return items.filter((row) => filteredIds.has(row.id));
  }, [data?.items, filteredIds, layerState.filter, statusFilter]);

  const kpis = data ? (
    <LocalKpiSparkGrid>
      <LocalKpiSpark
        label={t("kpiSites")}
        value={String(data.summary.sites)}
        base={data.summary.sites}
        color="#38bdf8"
      />
      <LocalKpiSpark
        label={t("statusAlert")}
        value={String(data.summary.alert)}
        base={data.summary.alert}
        color="#f87171"
        accent="danger"
      />
      {sector === "EDUCATION" ? (
        <>
          <LocalKpiSpark
            label={t("kpiAttendance")}
            value={`${data.summary.attendanceAvg ?? 0}%`}
            base={data.summary.attendanceAvg ?? 0}
            color="#34d399"
          />
          <LocalKpiSpark
            label={t("kpiDropout")}
            value={`${data.summary.dropoutAvg ?? 0}%`}
            base={data.summary.dropoutAvg ?? 0}
            color="#fbbf24"
            accent="warning"
          />
          <LocalKpiSpark
            label={t("kpiTeacherGap")}
            value={String(data.summary.teacherGap ?? 0)}
            base={data.summary.teacherGap ?? 0}
            color="#fb7185"
            accent="danger"
          />
        </>
      ) : sector === "HEALTH" ? (
        <>
          <LocalKpiSpark
            label={t("kpiDengue")}
            value={String(data.summary.dengue7d ?? 0)}
            base={data.summary.dengue7d ?? 0}
            color="#fb7185"
            accent="danger"
          />
          <LocalKpiSpark
            label={t("kpiOccupancy")}
            value={`${data.summary.occupancyAvg ?? 0}%`}
            base={data.summary.occupancyAvg ?? 0}
            color="#fbbf24"
            accent="warning"
          />
          <LocalKpiSpark
            label={t("kpiStockout")}
            value={String(data.summary.stockouts ?? 0)}
            base={data.summary.stockouts ?? 0}
            color="#f97316"
            accent="danger"
          />
        </>
      ) : (
        <>
          <LocalKpiSpark
            label={t("kpiUnemp")}
            value={`${data.summary.unemploymentAvg ?? 0}%`}
            base={data.summary.unemploymentAvg ?? 0}
            color="#f59e0b"
            accent="warning"
          />
          <LocalKpiSpark
            label={t("kpiVacancies")}
            value={String(data.summary.vacancies ?? 0)}
            base={data.summary.vacancies ?? 0}
            color="#34d399"
          />
          <LocalKpiSpark
            label={t("kpiFairGap")}
            value={String(data.summary.jobFairGaps ?? 0)}
            base={data.summary.jobFairGaps ?? 0}
            color="#fb7185"
            accent="danger"
          />
        </>
      )}
      <LocalKpiSpark
        label={t("hotWards")}
        value={String(data.summary.hotWards)}
        base={data.summary.hotWards}
        color="#fb7185"
        accent="warning"
      />
    </LocalKpiSparkGrid>
  ) : undefined;

  return (
    <ModuleShell
      title={title}
      description={description}
      loading={loading && !data}
      error={error}
      onRetry={() => void load()}
      stats={kpis}
    >
      {data ? <DataTrustBanner kind="seed" className="mb-3" /> : null}

      <div className="mb-4 flex flex-wrap gap-2">
        {(["ALL", "ALERT", "WATCH", "OK"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            className={cn(
              "rounded-md border px-2.5 py-1 text-[11px] font-medium transition",
              statusFilter === s
                ? "border-primary/40 bg-primary/15 text-primary"
                : "border-border/50 bg-background/40 text-muted-foreground",
            )}
          >
            {s === "ALL" ? t("filterAll") : t(`status${s === "ALERT" ? "Alert" : s === "WATCH" ? "Watch" : "Ok"}`)}
          </button>
        ))}
        <Button size="sm" variant="outline" className="ml-auto" onClick={() => void load()}>
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
          {t("refresh")}
        </Button>
      </div>

      <LocalMapLayerBar
        filter={layerState.filter}
        layers={SECTOR_LAYERS[sector]}
        wards={overview?.wards}
        isBn={isBn}
        onToggleLayer={layerState.toggleLayer}
        onToggleSource={layerState.toggleSource}
        onToggleSeverity={layerState.toggleSeverity}
        onTimeRange={layerState.setTimeRange}
        onWard={layerState.setWardId}
        onReset={layerState.reset}
      />

      {overview && (
        <div className="mb-4">
          <LocalWardMap
            entityCode={overview.entity.code}
            wards={overview.wards}
            scores={(data?.heat ?? []).map((h) => ({
              wardId: h.wardId,
              score: h.score,
              openComplaints: h.sites,
              redAlerts: h.alerts,
            }))}
            markers={mapMarkers}
            title={mapTitle}
            heightClassName="min-h-[320px] h-[380px]"
          />
        </div>
      )}

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <LocalVizCard title={t("byStatus")} icon={HeartPulse} delay={0.05}>
          <LocalDonut data={statusPie} height={220} />
        </LocalVizCard>
        <LocalVizCard title={t("byKind")} icon={School} delay={0.1}>
          <LocalBars data={kindBars} color="#34d399" height={220} layoutDir="horizontal" />
        </LocalVizCard>
      </div>

      <DataTable
        emptyMessage={t("empty")}
        columns={[
          {
            key: "kind",
            label: t("colKind"),
            render: (row) => {
              const Icon = KIND_ICON[row.kind] ?? School;
              return (
                <span className="inline-flex items-center gap-1.5 text-xs">
                  <Icon className="h-3.5 w-3.5" />
                  {t(`kind${row.kind}` as "kindPRIMARY_SCHOOL")}
                </span>
              );
            },
          },
          {
            key: "title",
            label: t("colTitle"),
            render: (row) => (
              <div>
                <p className="font-medium">{isBn ? row.titleBn || row.title : row.title}</p>
                <p className="line-clamp-1 text-[11px] text-muted-foreground">
                  {metricLine(sector, row.metrics, t)}
                </p>
                {row.opsHint ? (
                  <p className="mt-0.5 line-clamp-1 text-[10px] text-sky-200/90">
                    {t("opsNow")}: {isBn ? row.opsHint.bn : row.opsHint.en}
                  </p>
                ) : null}
              </div>
            ),
          },
          {
            key: "source",
            label: t("colSource"),
            render: (row) => <LocalSourceBadge source={row.source} />,
          },
          {
            key: "status",
            label: t("colStatus"),
            render: (row) => (
              <span
                className={cn(
                  "rounded-full border px-2 py-0.5 text-[11px]",
                  row.status === "ALERT" && "border-destructive/40 text-destructive",
                  row.status === "WATCH" && "border-amber-500/40 text-amber-200",
                  row.status === "OK" && "border-emerald-500/40 text-emerald-200",
                )}
              >
                {t(`status${row.status === "ALERT" ? "Alert" : row.status === "WATCH" ? "Watch" : "Ok"}`)}
              </span>
            ),
          },
          {
            key: "ward",
            label: t("colWard"),
            render: (row) =>
              row.ward ? (isBn ? row.ward.nameBn || row.ward.name : row.ward.name) : "—",
          },
        ]}
        rows={tableRows}
      />

      <div className="mt-4">
        <LocalEvidenceFeed compact topics={EVIDENCE_TOPICS[sector]} />
      </div>
    </ModuleShell>
  );
}
