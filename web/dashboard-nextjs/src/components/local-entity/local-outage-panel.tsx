"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Bolt, Droplets, Flame, Fuel, RefreshCw, Route, Wifi } from "lucide-react";
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
import { AppSelect } from "@/components/ui/app-select";
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
  OUTAGE_LAYERS,
  filterLayerEvents,
  isSignalSource,
  outageKindToLayer,
  severityFromOutage,
  type LayerEvent,
  type SignalSource,
} from "@/lib/local-map-layers";
import type { LocalMapMarker } from "@/components/local-entity/local-ward-map-inner";
import { cn } from "@/lib/utils";
import { remainingClock } from "@/lib/live-countdown";

interface ApiOk<T> {
  success: boolean;
  data: T;
}

type OutageKind =
  | "POWER"
  | "GAS"
  | "FUEL"
  | "WATER"
  | "DRAINAGE"
  | "ROAD"
  | "INTERNET"
  | "OTHER";
type OutageStatus = "ACTIVE" | "WATCH" | "RESOLVED";

const OUTAGE_KINDS: OutageKind[] = [
  "POWER",
  "GAS",
  "FUEL",
  "WATER",
  "DRAINAGE",
  "ROAD",
  "INTERNET",
  "OTHER",
];

interface OutageItem {
  id: string;
  kind: OutageKind;
  source?: SignalSource;
  status: OutageStatus;
  title: string;
  titleBn: string | null;
  detail: string | null;
  detailBn: string | null;
  severity: number;
  affectedCount: number;
  startedAt: string;
  etaRestoreAt: string | null;
  lat?: number | null;
  lng?: number | null;
  pressure?: number;
  opsHint?: { en: string; bn: string; horizon: string };
  ward: { id: string; code: string; name: string; nameBn: string | null } | null;
}

interface OutageFeed {
  entityId: string;
  generatedAt?: string;
  summary: {
    active: number;
    watch: number;
    resolved: number;
    affectedPeople: number;
    byKind: Record<string, number>;
    hotWards?: number;
    overdueEta?: number;
  };
  heat?: Array<{
    wardId: string;
    code: string;
    name: string;
    nameBn: string | null;
    open: number;
    pressure: number;
    score: number;
    worstSeverity: number;
  }>;
  items: OutageItem[];
}

const KIND_ICON: Record<OutageKind, typeof Bolt> = {
  POWER: Bolt,
  GAS: Flame,
  FUEL: Fuel,
  WATER: Droplets,
  DRAINAGE: Droplets,
  ROAD: Route,
  INTERNET: Wifi,
  OTHER: Bolt,
};

export function LocalOutagePanel() {
  const t = useTranslations("modules.localOutage");
  const ts = useTranslations("modules.localMapLayers");
  const locale = useLocale();
  const isBn = locale.startsWith("bn");
  const entityId = useLocalEntityId();
  const { data: overview } = useLocalEntityOverview(entityId);
  const layerState = useLayerFilterState();

  const [data, setData] = useState<OutageFeed | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"ALL" | OutageStatus>("ALL");
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<OutageKind>("POWER");
  const [source, setSource] = useState<SignalSource>("OFFICIAL");
  const [wardId, setWardId] = useState("");
  const [etaLocal, setEtaLocal] = useState("");
  const hasDataRef = useRef(false);
  const [, setNowTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setNowTick((n) => n + 1), 15_000);
    return () => window.clearInterval(id);
  }, []);

  const load = useCallback(async () => {
    if (!hasDataRef.current) setLoading(true);
    setError(null);
    try {
      const parts = [
        entityId ? `entityId=${entityId}` : null,
        statusFilter !== "ALL" ? `status=${statusFilter}` : null,
      ].filter(Boolean);
      const qs = parts.length ? `?${parts.join("&")}` : "";
      const res = await apiClient<ApiOk<OutageFeed>>(`local-entity/outages${qs}`);
      setData(res.data);
      hasDataRef.current = true;
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : t("loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [entityId, statusFilter, t]);

  useEffect(() => {
    void load();
  }, [load]);
  useRealtimeRefresh(load, true, true);

  const kindBars = useMemo(
    () =>
      Object.entries(data?.summary.byKind ?? {}).map(([name, value]) => ({
        name: t(`kind${name}` as "kindPOWER"),
        value,
      })),
    [data?.summary.byKind, t],
  );

  const statusPie = useMemo(
    () => [
      { name: t("statusActive"), value: data?.summary.active ?? 0, color: "#f87171" },
      { name: t("statusWatch"), value: data?.summary.watch ?? 0, color: "#fbbf24" },
      { name: t("statusResolved"), value: data?.summary.resolved ?? 0, color: "#34d399" },
    ],
    [data?.summary, t],
  );

  const wardOptions = useMemo(
    () => [
      { value: "", label: t("allWards") },
      ...(overview?.wards ?? []).map((w) => ({
        value: w.id,
        label: isBn ? w.nameBn || w.name : w.name,
      })),
    ],
    [overview?.wards, isBn, t],
  );

  const layerEvents: LayerEvent[] = useMemo(() => {
    const code = overview?.entity.code ?? "CCC";
    const wardList = overview?.wards ?? [];
    const centroids = wardCentroidIndex(buildLocalWardGeoJson(code, wardList, []));
    const anchor = resolveEntityAnchor(code);
    return (data?.items ?? [])
      .filter((row) => row.status !== "RESOLVED")
      .map((row, i) => {
        const fromWard = row.ward ? centroids.get(row.ward.id) : undefined;
        return {
          id: row.id,
          layer: outageKindToLayer(row.kind),
          lat: row.lat ?? fromWard?.lat ?? anchor.lat + Math.sin(i) * 0.008,
          lng: row.lng ?? fromWard?.lng ?? anchor.lng + Math.cos(i) * 0.01,
          severity: severityFromOutage(row.severity),
          source: isSignalSource(row.source) ? row.source : "OFFICIAL",
          occurredAt: row.startedAt,
          wardId: row.ward?.id ?? null,
          label: [
            isBn ? row.titleBn || row.title : row.title,
            row.etaRestoreAt
              ? `ETA ${new Date(row.etaRestoreAt).toLocaleString(locale, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" })}`
              : null,
          ]
            .filter(Boolean)
            .join(" · "),
          kind: row.kind,
        };
      });
  }, [data?.items, overview?.entity.code, overview?.wards, isBn, locale]);

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
    const items = data?.items ?? [];
    if (layerState.filter.layers.length === 0 && layerState.filter.sources.length === 0) {
      return items;
    }
    return items.filter((row) => row.status === "RESOLVED" || filteredIds.has(row.id));
  }, [data?.items, filteredIds, layerState.filter.layers.length, layerState.filter.sources.length]);

  const create = async () => {
    if (title.trim().length < 3) return;
    setBusyId("create");
    try {
      await apiClient("local-entity/outages", {
        method: "POST",
        body: JSON.stringify({
          entityId: entityId ?? undefined,
          wardId: wardId || undefined,
          kind,
          source,
          title: title.trim(),
          etaRestoreAt: etaLocal ? new Date(etaLocal).toISOString() : undefined,
        }),
      });
      setTitle("");
      setEtaLocal("");
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : t("createFailed"));
    } finally {
      setBusyId(null);
    }
  };

  const resolve = async (id: string) => {
    if (!window.confirm(t("resolveConfirm"))) return;
    setBusyId(id);
    try {
      await apiClient(`local-entity/outages/${id}/resolve`, { method: "PATCH" });
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const utilityLabel = (k: OutageKind) => {
    if (k === "POWER") return t("utilityPOWER");
    if (k === "GAS") return t("utilityGAS");
    if (k === "FUEL") return t("utilityFUEL");
    if (k === "WATER") return t("utilityWATER");
    return null;
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
            <LocalKpiSpark
              label={t("statusActive")}
              value={String(data.summary.active)}
              base={data.summary.active}
              color="#f87171"
              accent="danger"
            />
            <LocalKpiSpark
              label={t("statusWatch")}
              value={String(data.summary.watch)}
              base={data.summary.watch}
              color="#fbbf24"
              accent="warning"
            />
            <LocalKpiSpark
              label={t("affected")}
              value={String(data.summary.affectedPeople)}
              base={data.summary.affectedPeople}
              color="#38bdf8"
            />
            <LocalKpiSpark
              label={t("statusResolved")}
              value={String(data.summary.resolved)}
              base={data.summary.resolved}
              color="#34d399"
              accent="success"
            />
            <LocalKpiSpark
              label={t("hotWards")}
              value={String(data.summary.hotWards ?? 0)}
              base={data.summary.hotWards ?? 0}
              color="#fb7185"
              accent="warning"
            />
            <LocalKpiSpark
              label={t("etaOverdue")}
              value={String(data.summary.overdueEta ?? 0)}
              base={data.summary.overdueEta ?? 0}
              color="#f97316"
              accent="danger"
            />
          </LocalKpiSparkGrid>
        ) : undefined
      }
    >
      <div className="mb-4 flex flex-wrap gap-2">
        {(["ALL", "ACTIVE", "WATCH", "RESOLVED"] as const).map((s) => (
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
            {s === "ALL" ? t("filterAll") : t(`status${s === "ACTIVE" ? "Active" : s === "WATCH" ? "Watch" : "Resolved"}`)}
          </button>
        ))}
        <Button size="sm" variant="outline" className="ml-auto" onClick={() => void load()}>
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
          {t("refresh")}
        </Button>
      </div>

      <LocalMapLayerBar
        filter={layerState.filter}
        layers={OUTAGE_LAYERS}
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
              openComplaints: h.open,
              redAlerts: h.worstSeverity >= 4 ? 1 : 0,
            }))}
            markers={mapMarkers}
            title={t("mapTitle")}
            heightClassName="min-h-[320px] h-[380px]"
          />
        </div>
      )}

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <LocalVizCard title={t("byStatus")} icon={Bolt} delay={0.05}>
          <LocalDonut data={statusPie} height={220} />
        </LocalVizCard>
        <LocalVizCard title={t("byKind")} icon={Droplets} delay={0.1}>
          <LocalBars data={kindBars} color="#fbbf24" height={220} layoutDir="horizontal" />
        </LocalVizCard>
      </div>

      <section className="glass-panel mb-4 rounded-xl p-4">
        <h3 className="mb-3 text-sm font-medium">{t("logNew")}</h3>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <AppSelect
            value={kind}
            onValueChange={(v) => setKind(v as OutageKind)}
            options={OUTAGE_KINDS.map((k) => ({ value: k, label: t(`kind${k}`) }))}
            triggerClassName="h-10"
          />
          <AppSelect
            value={source}
            onValueChange={(v) => setSource(v as SignalSource)}
            options={[
              { value: "OFFICIAL", label: ts("sourceOfficial") },
              { value: "CITIZEN", label: ts("sourceCitizen") },
              { value: "NEWS", label: ts("sourceNews") },
              { value: "ACADEMIC", label: ts("sourceAcademic") },
            ]}
            triggerClassName="h-10"
          />
          <AppSelect
            value={wardId || "__none__"}
            onValueChange={(v) => setWardId(v === "__none__" ? "" : v)}
            options={wardOptions.map((o) => ({
              value: o.value || "__none__",
              label: o.label,
            }))}
            triggerClassName="h-10"
          />
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="h-10 rounded-lg border border-input bg-secondary/40 px-3 text-sm sm:col-span-2 xl:col-span-2"
            placeholder={t("titlePlaceholder")}
          />
          <input
            type="datetime-local"
            value={etaLocal}
            onChange={(e) => setEtaLocal(e.target.value)}
            className="h-10 rounded-lg border border-input bg-secondary/40 px-3 text-sm"
            title={t("etaLabel")}
          />
        </div>
        <Button
          className="mt-3"
          size="sm"
          disabled={busyId === "create" || title.trim().length < 3}
          onClick={() => void create()}
        >
          {t("create")}
        </Button>
      </section>

      <DataTable
        emptyMessage={t("empty")}
        columns={[
          {
            key: "kind",
            label: t("colKind"),
            render: (row) => {
              const Icon = KIND_ICON[row.kind] ?? Bolt;
              const utility = utilityLabel(row.kind);
              return (
                <span className="inline-flex flex-col gap-0.5 text-xs">
                  <span className="inline-flex items-center gap-1.5">
                    <Icon className="h-3.5 w-3.5" />
                    {t(`kind${row.kind}` as "kindPOWER")}
                  </span>
                  {utility && (
                    <span className="rounded-md border border-border/50 bg-secondary/40 px-1.5 py-0.5 text-[9px] text-muted-foreground">
                      {utility}
                    </span>
                  )}
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
                  {isBn ? row.detailBn || row.detail : row.detail}
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
                  row.status === "ACTIVE" && "border-destructive/40 text-destructive",
                  row.status === "WATCH" && "border-amber-500/40 text-amber-200",
                  row.status === "RESOLVED" && "border-emerald-500/40 text-emerald-200",
                )}
              >
                {t(
                  `status${row.status === "ACTIVE" ? "Active" : row.status === "WATCH" ? "Watch" : "Resolved"}`,
                )}
              </span>
            ),
          },
          {
            key: "affected",
            label: t("colAffected"),
            render: (row) => row.affectedCount,
          },
          {
            key: "eta",
            label: t("colEta"),
            render: (row) => {
              if (!row.etaRestoreAt) return "—";
              const clock = remainingClock(row.etaRestoreAt);
              const span = `${clock.hours}h ${String(clock.mins).padStart(2, "0")}m`;
              const overdue = clock.breached && row.status !== "RESOLVED";
              return (
                <span className={cn("flex flex-col text-xs tabular-nums", overdue && "text-destructive")}>
                  <span>
                    {overdue ? t("etaOverdueLive", { span }) : t("etaLeft", { span })}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(row.etaRestoreAt).toLocaleString(locale, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      hourCycle: "h23",
                    })}
                  </span>
                </span>
              );
            },
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
            key: "actions",
            label: t("colAction"),
            render: (row) =>
              row.status === "RESOLVED" ? (
                "—"
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busyId === row.id}
                  onClick={() => void resolve(row.id)}
                >
                  {t("resolve")}
                </Button>
              ),
          },
        ]}
        rows={tableRows}
      />
      <div className="mt-4">
        <LocalEvidenceFeed
          compact
          topics={["POWER", "GAS", "FUEL", "WATER", "DRAINAGE", "ROAD"]}
        />
      </div>
    </ModuleShell>
  );
}
