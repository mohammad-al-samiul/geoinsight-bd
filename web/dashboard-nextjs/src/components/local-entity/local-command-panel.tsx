"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Layers3, RefreshCw } from "lucide-react";
import { DataTable, ModuleShell } from "@/components/modules/module-shell";
import {
  LocalBars,
  LocalKpiSpark,
  LocalKpiSparkGrid,
  LocalVizCard,
} from "@/components/local-entity/local-viz";
import { LocalWardMap } from "@/components/local-entity/local-ward-map";
import { LocalMapLayerBar } from "@/components/local-entity/local-map-layer-bar";
import { LocalEvidenceFeed } from "@/components/local-entity/local-evidence-feed";
import { Button } from "@/components/ui/button";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { useRealtimeRefresh } from "@/hooks/use-realtime-refresh";
import { useLocalEntityId, withLocalEntityHref } from "@/hooks/use-local-entity-id";
import { useLocalEntityOverview } from "@/hooks/use-local-entity";
import { useLayerFilterState } from "@/hooks/use-layer-filter-state";
import {
  COMMAND_LAYERS,
  MAP_LAYERS,
  filterLayerEvents,
  isSignalSource,
  type LayerEvent,
  type MapLayerId,
} from "@/lib/local-map-layers";
import type { LocalMapMarker } from "@/components/local-entity/local-ward-map-inner";
import { cn } from "@/lib/utils";

interface ApiOk<T> {
  success: boolean;
  data: T;
}

type LayerKey =
  | "outage"
  | "complaints"
  | "education"
  | "health"
  | "jobs"
  | "crime"
  | "corruption";

type ScenarioId =
  | "DRAIN_CLEAR"
  | "NIGHT_PATROL"
  | "LIGHTING"
  | "DIGITAL_COUNTER"
  | "FEVER_DESK"
  | "SMC_TODAY";

const LAYER_KEYS: LayerKey[] = [
  "outage",
  "complaints",
  "education",
  "health",
  "jobs",
  "crime",
  "corruption",
];

const LAYER_HREF: Record<LayerKey, string> = {
  outage: "/local/outage",
  complaints: "/local/heatmap",
  education: "/local/education",
  health: "/local/health",
  jobs: "/local/jobs",
  crime: "/local/crime",
  corruption: "/local/corruption",
};

const LAYER_COLOR: Record<LayerKey, string> = {
  outage: "#fbbf24",
  complaints: "#f87171",
  education: "#34d399",
  health: "#2dd4bf",
  jobs: "#f59e0b",
  crime: "#ef4444",
  corruption: "#c084fc",
};

const SCENARIO_IDS: ScenarioId[] = [
  "DRAIN_CLEAR",
  "NIGHT_PATROL",
  "LIGHTING",
  "DIGITAL_COUNTER",
  "FEVER_DESK",
  "SMC_TODAY",
];

const HOT = 28;

type OpsHint = { en: string; bn: string; horizon: string };

interface CommandWard {
  wardId: string;
  code: string;
  name: string;
  nameBn: string | null;
  wpi: number;
  commandScore: number;
  layers: Record<LayerKey, number>;
  hot: LayerKey[];
  signals: number;
  warning: boolean;
  opsHint: OpsHint;
}

interface WardDelta {
  wardId: string;
  layer: LayerKey;
  pressureDelta: number;
  commandDelta: number;
}

interface Scenario {
  id: ScenarioId;
  layer: LayerKey;
  title: string;
  titleBn: string;
  detail: string;
  detailBn: string;
  affectedWards: number;
  avgCommandLift: number;
  wardDeltas: WardDelta[];
}

interface CommandDesk {
  entityId: string;
  generatedAt: string;
  sourceNote?: string;
  formula?: string;
  summary: {
    wards: number;
    warningWards: number;
    wpiAverage: number;
    commandAverage: number;
    activeOutages: number;
    unrestTrend: "rising" | "stable" | "falling";
    unrestActive: number;
  };
  warnings: Array<{
    wardId: string;
    name: string;
    nameBn: string | null;
    signals: number;
    hot: LayerKey[];
    commandScore: number;
    wpi: number;
    opsHint: OpsHint;
  }>;
  scenarios: Scenario[];
  wards: CommandWard[];
  markers: Array<{
    id: string;
    layer: string;
    lat: number;
    lng: number;
    severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    source: string;
    occurredAt: string;
    wardId: string | null;
    label: string;
    kind?: string;
  }>;
}

function clamp(n: number): number {
  return Math.max(1, Math.min(100, Math.round(n)));
}

function commandScore(wpi: number, p: Record<LayerKey, number>): number {
  const s = (k: LayerKey) => Math.max(8, 100 - p[k]);
  return clamp(
    0.3 * wpi +
      0.16 * s("outage") +
      0.14 * s("crime") +
      0.12 * s("health") +
      0.1 * s("education") +
      0.1 * s("corruption") +
      0.08 * s("complaints"),
  );
}

function asLayer(value: string): MapLayerId {
  return (MAP_LAYERS as readonly string[]).includes(value) ? (value as MapLayerId) : "OTHER";
}

function layerI18nKey(k: LayerKey): "layerOutage" {
  if (k === "outage") return "layerOutage";
  if (k === "complaints") return "layerComplaints" as "layerOutage";
  if (k === "education") return "layerEducation" as "layerOutage";
  if (k === "health") return "layerHealth" as "layerOutage";
  if (k === "jobs") return "layerJobs" as "layerOutage";
  if (k === "crime") return "layerCrime" as "layerOutage";
  return "layerCorruption" as "layerOutage";
}

function scenarioTitleKey(id: ScenarioId): "scenarioDRAIN_CLEAR" {
  return `scenario${id}` as "scenarioDRAIN_CLEAR";
}

export function LocalCommandPanel() {
  const t = useTranslations("modules.localCommand");
  const locale = useLocale();
  const isBn = locale.startsWith("bn");
  const entityId = useLocalEntityId();
  const { data: overview } = useLocalEntityOverview(entityId);
  const layerState = useLayerFilterState();

  const [data, setData] = useState<CommandDesk | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ScenarioId[]>([]);
  const hasDataRef = useRef(false);

  const load = useCallback(async () => {
    if (!hasDataRef.current) setLoading(true);
    setError(null);
    try {
      const q = entityId ? `?entityId=${entityId}` : "";
      const res = await apiClient<ApiOk<CommandDesk>>(`local-entity/command${q}`);
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

  const simulated = useMemo(() => {
    const wards = data?.wards ?? [];
    if (!selected.length) {
      return wards.map((w) => ({
        ...w,
        id: w.wardId,
        simScore: w.commandScore,
        simHot: w.hot,
        simSignals: w.signals,
        simWarning: w.warning,
      }));
    }
    const deltaByWard = new Map<string, Partial<Record<LayerKey, number>>>();
    for (const id of selected) {
      const sc = data?.scenarios.find((s) => s.id === id);
      if (!sc) continue;
      for (const d of sc.wardDeltas) {
        const cur = deltaByWard.get(d.wardId) ?? {};
        cur[d.layer] = (cur[d.layer] ?? 0) + d.pressureDelta;
        deltaByWard.set(d.wardId, cur);
      }
    }
    return wards.map((w) => {
      const d = deltaByWard.get(w.wardId);
      if (!d) {
        return {
          ...w,
          id: w.wardId,
          simScore: w.commandScore,
          simHot: w.hot,
          simSignals: w.signals,
          simWarning: w.warning,
        };
      }
      const layers = { ...w.layers };
      for (const k of LAYER_KEYS) {
        if (d[k] != null) layers[k] = Math.max(0, layers[k] + (d[k] ?? 0));
      }
      const simHot = LAYER_KEYS.filter((k) => layers[k] >= HOT);
      return {
        ...w,
        id: w.wardId,
        simScore: commandScore(w.wpi, layers),
        simHot,
        simSignals: simHot.length,
        simWarning: simHot.length >= 3,
      };
    });
  }, [data, selected]);

  const simAvg = useMemo(() => {
    if (!simulated.length) return 0;
    return Math.round(simulated.reduce((s, w) => s + w.simScore, 0) / simulated.length);
  }, [simulated]);

  const simWarnings = useMemo(
    () => simulated.filter((w) => w.simWarning).length,
    [simulated],
  );

  const hotLayerCount = useMemo(() => {
    const set = new Set<LayerKey>();
    for (const w of simulated) for (const h of w.simHot) set.add(h);
    return set.size;
  }, [simulated]);

  const layerEvents: LayerEvent[] = useMemo(
    () =>
      (data?.markers ?? []).map((m) => ({
        id: m.id,
        layer: asLayer(m.layer),
        lat: m.lat,
        lng: m.lng,
        severity: m.severity,
        source: isSignalSource(m.source) ? m.source : "OFFICIAL",
        occurredAt: m.occurredAt,
        wardId: m.wardId,
        label: m.label,
        kind: m.kind,
      })),
    [data?.markers],
  );

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

  const tableRows = useMemo(() => {
    const wardFilter = layerState.filter.wardId;
    const rows = wardFilter
      ? simulated.filter((w) => w.wardId === wardFilter)
      : simulated;
    return rows.slice().sort((a, b) => b.simSignals - a.simSignals || a.simScore - b.simScore);
  }, [simulated, layerState.filter.wardId]);

  const warningBars = useMemo(
    () =>
      simulated
        .filter((w) => w.simSignals > 0)
        .slice(0, 8)
        .map((w) => ({
          name: isBn ? w.nameBn || w.name : w.name,
          value: w.simSignals,
        })),
    [simulated, isBn],
  );

  const evidenceTopics = useMemo(() => {
    const set = new Set<string>();
    for (const w of simulated.filter((w) => w.simWarning || w.simSignals >= 2)) {
      for (const h of w.simHot) {
        if (h === "outage") set.add("POWER");
        if (h === "education") set.add("EDUCATION");
        if (h === "health") set.add("HEALTH");
        if (h === "jobs") set.add("UNEMPLOYMENT");
        if (h === "crime") set.add("CRIME");
        if (h === "corruption") set.add("CORRUPTION");
        if (h === "complaints") set.add("DRAINAGE");
      }
    }
    if (!set.size) {
      set.add("POWER");
      set.add("CRIME");
      set.add("HEALTH");
    }
    return [...set];
  }, [simulated]);

  const toggleScenario = (id: ScenarioId) => {
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  };

  const kpis = data ? (
    <LocalKpiSparkGrid>
      <LocalKpiSpark
        label={t("kpiWarning")}
        value={String(simWarnings)}
        base={simWarnings}
        color="#f87171"
        accent="danger"
      />
      <LocalKpiSpark
        label={t("kpiHotLayers")}
        value={String(hotLayerCount)}
        base={hotLayerCount}
        color="#fb7185"
        accent="warning"
      />
      <LocalKpiSpark
        label={t("kpiWpi")}
        value={String(data.summary.wpiAverage)}
        base={data.summary.wpiAverage}
        color="#38bdf8"
      />
      <LocalKpiSpark
        label={t("kpiCommand")}
        value={String(simAvg)}
        base={simAvg}
        color="#34d399"
        accent={simAvg >= data.summary.commandAverage ? "success" : "warning"}
      />
      <LocalKpiSpark
        label={t("kpiUnrest")}
        value={t(`trend${data.summary.unrestTrend === "rising" ? "Rising" : data.summary.unrestTrend === "falling" ? "Falling" : "Stable"}`)}
        base={data.summary.unrestActive}
        color="#fb923c"
        accent={data.summary.unrestTrend === "rising" ? "danger" : "default"}
      />
    </LocalKpiSparkGrid>
  ) : undefined;

  return (
    <ModuleShell
      title={t("title")}
      description={t("description")}
      loading={loading && !data}
      error={error}
      onRetry={() => void load()}
      stats={kpis}
    >
      {data?.sourceNote ? (
        <p className="mb-3 text-[11px] text-muted-foreground">{t("sourceNote")}</p>
      ) : null}
      <p className="mb-3 text-[11px] text-muted-foreground">{t("formula")}</p>

      <div className="mb-4 space-y-2 rounded-xl border border-border/50 bg-background/30 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {t("whatIf")}
          </span>
          <span className="text-[11px] text-muted-foreground">{t("whatIfHint")}</span>
          <Button size="sm" variant="outline" className="ml-auto" onClick={() => void load()}>
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            {t("refresh")}
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {SCENARIO_IDS.map((id) => {
            const sc = data?.scenarios.find((s) => s.id === id);
            const on = selected.includes(id);
            const dead = (sc?.affectedWards ?? 0) === 0;
            return (
              <button
                key={id}
                type="button"
                disabled={dead}
                onClick={() => toggleScenario(id)}
                className={cn(
                  "rounded-md border px-2.5 py-1 text-left text-[11px] font-medium transition",
                  on
                    ? "border-primary/40 bg-primary/15 text-primary"
                    : "border-border/50 bg-background/40 text-muted-foreground",
                  dead && "opacity-40",
                )}
              >
                <span className="block">{t(scenarioTitleKey(id))}</span>
                <span className="block text-[10px] font-normal opacity-80">
                  {t("lift")} +{sc?.avgCommandLift ?? 0} · {sc?.affectedWards ?? 0} {t("wards")}
                </span>
              </button>
            );
          })}
        </div>
        {selected.length ? (
          <p className="text-[11px] text-emerald-200/90">{t("simulated")}</p>
        ) : null}
      </div>

      <LocalMapLayerBar
        filter={layerState.filter}
        layers={COMMAND_LAYERS}
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
            scores={simulated.map((w) => ({
              wardId: w.wardId,
              score: w.simScore,
              openComplaints: w.simSignals,
              redAlerts: w.simWarning ? 1 : 0,
            }))}
            markers={mapMarkers}
            title={t("mapTitle")}
            metricLabel={t("kpiCommand")}
            heightClassName="min-h-[360px] h-[400px]"
          />
        </div>
      )}

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <LocalVizCard title={t("warningsTitle")} icon={Layers3} delay={0.05}>
          {warningBars.length ? (
            <LocalBars data={warningBars} layoutDir="horizontal" color="#f87171" height={220} />
          ) : (
            <p className="text-sm text-muted-foreground">{t("empty")}</p>
          )}
        </LocalVizCard>
        <LocalVizCard title={t("stackedTitle")} icon={Layers3} delay={0.1}>
          <div className="space-y-2">
            {simulated
              .filter((w) => w.simWarning)
              .slice(0, 6)
              .map((w) => (
                <div key={w.wardId} className="rounded-md border border-destructive/25 bg-destructive/5 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">
                      {isBn ? w.nameBn || w.name : w.name}
                    </p>
                    <span className="text-[10px] uppercase tracking-wide text-destructive">
                      {t("warningBadge")} · {w.simSignals}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {isBn ? w.opsHint.bn : w.opsHint.en}
                  </p>
                </div>
              ))}
            {!simulated.some((w) => w.simWarning) ? (
              <p className="text-sm text-muted-foreground">{t("empty")}</p>
            ) : null}
          </div>
        </LocalVizCard>
      </div>

      <DataTable
        columns={[
          {
            key: "ward",
            label: t("colWard"),
            render: (row) => (
              <div>
                <p className="font-medium">{isBn ? row.nameBn || row.name : row.name}</p>
                <p className="text-[10px] text-muted-foreground">{row.code}</p>
              </div>
            ),
          },
          {
            key: "wpi",
            label: t("colWpi"),
            render: (row) => <span className="tabular-nums">{row.wpi}</span>,
          },
          {
            key: "command",
            label: t("colCommand"),
            render: (row) => (
              <span
                className={cn(
                  "tabular-nums font-semibold",
                  row.simScore >= 70 ? "text-emerald-300" : row.simScore >= 55 ? "text-sky-300" : "text-amber-300",
                )}
              >
                {row.simScore}
                {row.simScore !== row.commandScore ? (
                  <span className="ml-1 text-[10px] font-normal text-emerald-200/80">
                    ({row.simScore - row.commandScore > 0 ? "+" : ""}
                    {row.simScore - row.commandScore})
                  </span>
                ) : null}
              </span>
            ),
          },
          {
            key: "signals",
            label: t("colSignals"),
            render: (row) => (
              <span className={cn("tabular-nums", row.simWarning && "text-destructive")}>
                {row.simSignals}
              </span>
            ),
          },
          {
            key: "issues",
            label: t("colIssues"),
            render: (row) => (
              <div className="flex flex-wrap gap-1">
                {row.simWarning ? (
                  <span className="rounded border border-destructive/40 px-1.5 py-0.5 text-[10px] text-destructive">
                    {t("warningBadge")}
                  </span>
                ) : null}
                {row.simHot.map((k) => (
                  <Link
                    key={k}
                    href={withLocalEntityHref(LAYER_HREF[k], entityId)}
                    className="rounded border px-1.5 py-0.5 text-[10px]"
                    style={{
                      borderColor: `${LAYER_COLOR[k]}66`,
                      color: LAYER_COLOR[k],
                    }}
                  >
                    {t(layerI18nKey(k))}
                  </Link>
                ))}
              </div>
            ),
          },
          {
            key: "ops",
            label: t("colOps"),
            render: (row) => (
              <p className="max-w-[280px] text-[11px] text-muted-foreground">
                {isBn ? row.opsHint.bn : row.opsHint.en}
              </p>
            ),
          },
        ]}
        rows={tableRows}
      />

      <div className="mt-4">
        <LocalEvidenceFeed compact topics={evidenceTopics} />
      </div>
    </ModuleShell>
  );
}
