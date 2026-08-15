"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  Flame,
  Landmark,
  RefreshCw,
  ShieldAlert,
  Smartphone,
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
  CORRUPTION_LAYERS,
  CRIME_LAYERS,
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

export type IntegrityDomain = "CRIME" | "CORRUPTION";
type IncidentStatus = "OPEN" | "WATCH" | "CLOSED";

type IncidentKind =
  | "THEFT"
  | "SNATCH"
  | "MURDER"
  | "STREET_VIOLENCE"
  | "EVE_TEASING"
  | "NARCOTICS"
  | "CYBER"
  | "TRAFFIC_ACCIDENT"
  | "FIRE"
  | "BRIBE"
  | "HOLDING_TAX"
  | "TENDER"
  | "PROJECT_GHOST"
  | "LICENSE_DESK"
  | "RECRUITMENT";

interface IntegrityItem {
  id: string;
  domain: IntegrityDomain;
  kind: IncidentKind;
  status: IncidentStatus;
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
  occurredAt: string;
  hour: number;
  opsHint?: { en: string; bn: string; horizon: string };
  ward: { id: string; code: string; name: string; nameBn: string | null } | null;
}

interface IntegrityDesk {
  entityId: string;
  domain: IntegrityDomain;
  generatedAt: string;
  sourceNote?: string;
  summary: {
    incidents: number;
    open: number;
    watch: number;
    closed: number;
    hotWards: number;
    snatch?: number;
    theft?: number;
    nightSharePct?: number;
    patrolGaps?: number;
    tenderFlags?: number;
    bribes?: number;
    holdingTaxAvgGap?: number;
  };
  byHour: Array<{ hour: number; count: number }>;
  heat: Array<{
    wardId: string;
    code: string;
    name: string;
    nameBn: string | null;
    incidents: number;
    alerts: number;
    pressure: number;
    score: number;
  }>;
  items: IntegrityItem[];
}

const DOMAIN_LAYERS: Record<IntegrityDomain, MapLayerId[]> = {
  CRIME: CRIME_LAYERS,
  CORRUPTION: CORRUPTION_LAYERS,
};

const DOMAIN_LAYER: Record<IntegrityDomain, MapLayerId> = {
  CRIME: "CRIME",
  CORRUPTION: "CORRUPTION",
};

const EVIDENCE_TOPICS: Record<IntegrityDomain, string[]> = {
  CRIME: ["CRIME"],
  CORRUPTION: ["CORRUPTION"],
};

const KIND_ICON: Record<IncidentKind, typeof ShieldAlert> = {
  THEFT: ShieldAlert,
  SNATCH: Smartphone,
  MURDER: ShieldAlert,
  STREET_VIOLENCE: ShieldAlert,
  EVE_TEASING: ShieldAlert,
  NARCOTICS: ShieldAlert,
  CYBER: Smartphone,
  TRAFFIC_ACCIDENT: Flame,
  FIRE: Flame,
  BRIBE: Landmark,
  HOLDING_TAX: Landmark,
  TENDER: Landmark,
  PROJECT_GHOST: Landmark,
  LICENSE_DESK: Landmark,
  RECRUITMENT: Landmark,
};

function num(m: Record<string, unknown>, key: string): number | null {
  const v = m[key];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function flag(m: Record<string, unknown>, key: string): boolean {
  return m[key] === true;
}

function metricLine(domain: IntegrityDomain, metrics: Record<string, unknown>, t: (k: string) => string): string {
  if (domain === "CRIME") {
    const parts = [
      num(metrics, "count7d") != null ? `${t("metricCount7d")} ${num(metrics, "count7d")}` : null,
      num(metrics, "nightSharePct") != null ? `${t("metricNight")} ${num(metrics, "nightSharePct")}%` : null,
      flag(metrics, "patrolGap") ? t("metricPatrolGap") : null,
    ];
    return parts.filter(Boolean).join(" · ");
  }
  const parts = [
    flag(metrics, "tenderFlag") ? t("metricTenderFlag") : null,
    num(metrics, "holdingTaxGapPct") != null && num(metrics, "holdingTaxGapPct")! > 0
      ? `${t("metricTaxGap")} ${num(metrics, "holdingTaxGapPct")}%`
      : null,
    num(metrics, "extraFeeTk") != null && num(metrics, "extraFeeTk")! > 0
      ? `${t("metricFee")} ৳${num(metrics, "extraFeeTk")}`
      : null,
  ];
  return parts.filter(Boolean).join(" · ");
}

export function LocalIntegrityPanel({ domain }: { domain: IntegrityDomain }) {
  const t = useTranslations("modules.localIntegrity");
  const locale = useLocale();
  const isBn = locale.startsWith("bn");
  const entityId = useLocalEntityId();
  const { data: overview } = useLocalEntityOverview(entityId);
  const layerState = useLayerFilterState();

  const [data, setData] = useState<IntegrityDesk | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"ALL" | IncidentStatus>("ALL");
  const hasDataRef = useRef(false);

  const load = useCallback(async () => {
    if (!hasDataRef.current) setLoading(true);
    setError(null);
    try {
      const parts = [entityId ? `entityId=${entityId}` : null, `domain=${domain}`].filter(Boolean);
      const res = await apiClient<ApiOk<IntegrityDesk>>(`local-entity/integrity?${parts.join("&")}`);
      setData(res.data);
      hasDataRef.current = true;
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : t("loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [entityId, domain, t]);

  useEffect(() => {
    void load();
  }, [load]);
  useRealtimeRefresh(load, true, true);

  const title = domain === "CRIME" ? t("titleCrime") : t("titleCorruption");
  const description = domain === "CRIME" ? t("descCrime") : t("descCorruption");
  const mapTitle = domain === "CRIME" ? t("mapCrime") : t("mapCorruption");
  const maxHour = Math.max(1, ...(data?.byHour ?? []).map((h) => h.count));

  const statusPie = useMemo(
    () => [
      { name: t("statusOpen"), value: data?.summary.open ?? 0, color: "#f87171" },
      { name: t("statusWatch"), value: data?.summary.watch ?? 0, color: "#fbbf24" },
      { name: t("statusClosed"), value: data?.summary.closed ?? 0, color: "#34d399" },
    ],
    [data?.summary, t],
  );

  const kindBars = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of data?.items ?? []) {
      counts.set(row.kind, (counts.get(row.kind) ?? 0) + 1);
    }
    return [...counts.entries()].map(([name, value]) => ({
      name: t(`kind${name}` as "kindTHEFT"),
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
        layer: DOMAIN_LAYER[domain],
        lat: row.lat ?? fromWard?.lat ?? anchor.lat + Math.sin(i) * 0.008,
        lng: row.lng ?? fromWard?.lng ?? anchor.lng + Math.cos(i) * 0.01,
        severity: severityFromOutage(row.severity),
        source: isSignalSource(row.source) ? row.source : "OFFICIAL",
        occurredAt: row.occurredAt,
        wardId: row.ward?.id ?? null,
        label: isBn ? row.titleBn || row.title : row.title,
        kind: row.kind,
      };
    });
  }, [data?.items, overview?.entity.code, overview?.wards, isBn, domain]);

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
        label={t("kpiIncidents")}
        value={String(data.summary.incidents)}
        base={data.summary.incidents}
        color="#38bdf8"
      />
      <LocalKpiSpark
        label={t("statusOpen")}
        value={String(data.summary.open)}
        base={data.summary.open}
        color="#f87171"
        accent="danger"
      />
      {domain === "CRIME" ? (
        <>
          <LocalKpiSpark
            label={t("kpiSnatch")}
            value={String(data.summary.snatch ?? 0)}
            base={data.summary.snatch ?? 0}
            color="#fb7185"
            accent="danger"
          />
          <LocalKpiSpark
            label={t("kpiNight")}
            value={`${data.summary.nightSharePct ?? 0}%`}
            base={data.summary.nightSharePct ?? 0}
            color="#fbbf24"
            accent="warning"
          />
          <LocalKpiSpark
            label={t("kpiPatrol")}
            value={String(data.summary.patrolGaps ?? 0)}
            base={data.summary.patrolGaps ?? 0}
            color="#f97316"
            accent="danger"
          />
        </>
      ) : (
        <>
          <LocalKpiSpark
            label={t("kpiTender")}
            value={String(data.summary.tenderFlags ?? 0)}
            base={data.summary.tenderFlags ?? 0}
            color="#c084fc"
            accent="danger"
          />
          <LocalKpiSpark
            label={t("kpiBribe")}
            value={String(data.summary.bribes ?? 0)}
            base={data.summary.bribes ?? 0}
            color="#fbbf24"
            accent="warning"
          />
          <LocalKpiSpark
            label={t("kpiTaxGap")}
            value={`${data.summary.holdingTaxAvgGap ?? 0}%`}
            base={data.summary.holdingTaxAvgGap ?? 0}
            color="#fb7185"
            accent="warning"
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
        {(["ALL", "OPEN", "WATCH", "CLOSED"] as const).map((s) => (
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
            {s === "ALL"
              ? t("filterAll")
              : t(`status${s === "OPEN" ? "Open" : s === "WATCH" ? "Watch" : "Closed"}`)}
          </button>
        ))}
        <Button size="sm" variant="outline" className="ml-auto" onClick={() => void load()}>
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
          {t("refresh")}
        </Button>
      </div>

      <LocalMapLayerBar
        filter={layerState.filter}
        layers={DOMAIN_LAYERS[domain]}
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
              openComplaints: h.incidents,
              redAlerts: h.alerts,
            }))}
            markers={mapMarkers}
            title={mapTitle}
            heightClassName="min-h-[320px] h-[380px]"
          />
        </div>
      )}

      {domain === "CRIME" && data?.byHour ? (
        <div className="mb-4 rounded-xl border border-border/50 bg-secondary/15 p-4">
          <h3 className="mb-2 text-sm font-medium">{t("hourHeat")}</h3>
          <div className="flex gap-0.5">
            {data.byHour.map((h) => {
              const intensity = h.count / maxHour;
              return (
                <div key={h.hour} className="min-w-0 flex-1">
                  <div
                    className="h-10 rounded-sm"
                    style={{
                      background: `rgba(248, 113, 113, ${0.12 + intensity * 0.85})`,
                    }}
                    title={`${h.hour}:00 · ${h.count}`}
                  />
                  <p className="mt-1 text-center text-[9px] text-muted-foreground">
                    {h.hour % 3 === 0 ? h.hour : ""}
                  </p>
                </div>
              );
            })}
          </div>
          <p className="mt-1 text-[10px] text-muted-foreground">{t("hourHeatHint")}</p>
        </div>
      ) : null}

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <LocalVizCard title={t("byStatus")} icon={ShieldAlert} delay={0.05}>
          <LocalDonut data={statusPie} height={220} />
        </LocalVizCard>
        <LocalVizCard title={t("byKind")} icon={Landmark} delay={0.1}>
          <LocalBars data={kindBars} color={domain === "CRIME" ? "#ef4444" : "#c084fc"} height={220} layoutDir="horizontal" />
        </LocalVizCard>
      </div>

      <DataTable
        emptyMessage={t("empty")}
        columns={[
          {
            key: "kind",
            label: t("colKind"),
            render: (row) => {
              const Icon = KIND_ICON[row.kind] ?? ShieldAlert;
              return (
                <span className="inline-flex items-center gap-1.5 text-xs">
                  <Icon className="h-3.5 w-3.5" />
                  {t(`kind${row.kind}` as "kindTHEFT")}
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
                  {metricLine(domain, row.metrics, t)}
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
                  row.status === "OPEN" && "border-destructive/40 text-destructive",
                  row.status === "WATCH" && "border-amber-500/40 text-amber-200",
                  row.status === "CLOSED" && "border-emerald-500/40 text-emerald-200",
                )}
              >
                {t(`status${row.status === "OPEN" ? "Open" : row.status === "WATCH" ? "Watch" : "Closed"}`)}
              </span>
            ),
          },
          {
            key: "when",
            label: t("colWhen"),
            render: (row) =>
              new Date(row.occurredAt).toLocaleString(locale, {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                hourCycle: "h23",
              }),
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
        <LocalEvidenceFeed compact topics={EVIDENCE_TOPICS[domain]} />
      </div>
    </ModuleShell>
  );
}
