"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Megaphone, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { DataTable } from "@/components/modules/module-shell";
import {
  LocalKpiSpark,
  LocalKpiSparkGrid,
  LocalVizCard,
} from "@/components/local-entity/local-viz";
import { LocalWardMap } from "@/components/local-entity/local-ward-map";
import { LocalMapLayerBar } from "@/components/local-entity/local-map-layer-bar";
import { LocalEvidenceFeed } from "@/components/local-entity/local-evidence-feed";
import { apiClient } from "@/lib/api-client";
import { useRealtimeRefresh } from "@/hooks/use-realtime-refresh";
import { useLocalEntityId } from "@/hooks/use-local-entity-id";
import { useLocalEntityOverview } from "@/hooks/use-local-entity";
import { useLayerFilterState } from "@/hooks/use-layer-filter-state";
import { resolveEntityAnchor } from "@/lib/local-ward-geo";
import {
  UNREST_LAYERS,
  filterLayerEvents,
  severityFromOutage,
  type LayerEvent,
} from "@/lib/local-map-layers";
import type { LocalMapMarker } from "@/components/local-entity/local-ward-map-inner";
import { cn } from "@/lib/utils";

interface UnrestDesk {
  generatedAt: string;
  sourceNote?: string;
  summary: {
    active: number;
    last24h: number;
    last7d: number;
    trend: "rising" | "stable" | "falling";
    localHits: number;
    signalCount: number;
  };
  tags: Array<{ id: string; labelEn: string; labelBn: string; count: number }>;
  movements: Array<{
    id: string;
    title: string;
    titleBn: string;
    theme: string;
    themeBn: string;
    place: string;
    placeBn: string;
    status: string;
    severity: number;
    articleCount: number;
    eventAt: string;
    local: boolean;
    solutionEn: string;
    solutionBn: string;
  }>;
  pins: Array<{
    id: string;
    lat: number | null;
    lng: number | null;
    severity: number;
    label: string;
    themeId: string;
    local: boolean;
    wardId: string | null;
    occurredAt: string;
  }>;
}

export function LocalUnrestSection() {
  const t = useTranslations("modules.localUnrest");
  const locale = useLocale();
  const isBn = locale.startsWith("bn");
  const entityId = useLocalEntityId();
  const { data: overview } = useLocalEntityOverview(entityId);
  const layerState = useLayerFilterState();
  const [data, setData] = useState<UnrestDesk | null>(null);

  const load = useCallback(async () => {
    const qs = entityId ? `?entityId=${entityId}` : "";
    try {
      const res = await apiClient<{ success: boolean; data: UnrestDesk }>(
        `local-entity/unrest${qs}`,
        { cache: "no-store" },
      );
      setData(res.data);
    } catch {
      setData(null);
    }
  }, [entityId]);

  useEffect(() => {
    void load();
  }, [load]);
  useRealtimeRefresh(load, true, true);

  const events: LayerEvent[] = useMemo(() => {
    const anchor = resolveEntityAnchor(overview?.entity.code ?? "CCC");
    return (data?.pins ?? []).map((p, i) => ({
      id: p.id,
      layer: "UNREST" as const,
      lat: p.lat ?? anchor.lat + Math.sin(i + 1) * 0.012,
      lng: p.lng ?? anchor.lng + Math.cos(i + 1) * 0.014,
      severity: severityFromOutage(p.severity),
      source: "NEWS" as const,
      occurredAt: p.occurredAt,
      wardId: p.wardId,
      label: p.label,
      kind: p.themeId,
    }));
  }, [data?.pins, overview?.entity.code]);

  const markers: LocalMapMarker[] = useMemo(
    () =>
      filterLayerEvents(events, layerState.filter).map((e) => ({
        id: e.id,
        lat: e.lat,
        lng: e.lng,
        severity: e.severity,
        label: e.label,
        layer: e.layer,
        source: e.source,
      })),
    [events, layerState.filter],
  );

  const TrendIcon =
    data?.summary.trend === "rising"
      ? TrendingUp
      : data?.summary.trend === "falling"
        ? TrendingDown
        : Minus;

  return (
    <div className="mb-6 space-y-4">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Megaphone className="h-4 w-4 text-orange-300" />
        {t("title")}
      </div>
      <p className="text-xs text-muted-foreground">{t("description")}</p>

      {data && (
        <LocalKpiSparkGrid>
          <LocalKpiSpark
            label={t("active")}
            value={String(data.summary.active)}
            base={data.summary.active}
            color="#fb923c"
            accent="warning"
          />
          <LocalKpiSpark
            label={t("last24h")}
            value={String(data.summary.last24h)}
            base={data.summary.last24h}
            color="#f87171"
          />
          <LocalKpiSpark
            label={t("last7d")}
            value={String(data.summary.last7d)}
            base={data.summary.last7d}
            color="#fbbf24"
          />
          <LocalKpiSpark
            label={t("trend")}
            value={t(`trend${data.summary.trend}` as "trendstable")}
            base={data.summary.last24h}
            color={data.summary.trend === "rising" ? "#f87171" : "#34d399"}
          />
        </LocalKpiSparkGrid>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <TrendIcon
          className={cn(
            "h-4 w-4",
            data?.summary.trend === "rising" && "text-destructive",
            data?.summary.trend === "falling" && "text-emerald-300",
          )}
        />
        {(data?.tags ?? []).map((tag) => (
          <span
            key={tag.id}
            className="rounded-full border border-orange-400/30 bg-orange-500/10 px-2 py-0.5 text-[11px] text-orange-100"
          >
            {isBn ? tag.labelBn : tag.labelEn} · {tag.count}
          </span>
        ))}
      </div>

      {overview && (
        <>
          <LocalMapLayerBar
            filter={layerState.filter}
            layers={UNREST_LAYERS}
            wards={overview.wards}
            isBn={isBn}
            onToggleLayer={layerState.toggleLayer}
            onToggleSource={layerState.toggleSource}
            onToggleSeverity={layerState.toggleSeverity}
            onTimeRange={layerState.setTimeRange}
            onWard={layerState.setWardId}
            onReset={layerState.reset}
          />
          <LocalWardMap
            entityCode={overview.entity.code}
            wards={overview.wards}
            markers={markers}
            title={t("mapTitle")}
            heightClassName="min-h-[280px] h-[340px]"
          />
        </>
      )}

      <LocalVizCard title={t("clusters")} icon={Megaphone} delay={0.05}>
        <DataTable
          emptyMessage={t("empty")}
          columns={[
            {
              key: "title",
              label: t("colTitle"),
              render: (row) => (
                <div>
                  <p className="font-medium">{isBn ? row.titleBn || row.title : row.title}</p>
                  <p className="line-clamp-2 text-[11px] text-sky-200/90">
                    {t("opsNow")}: {isBn ? row.solutionBn : row.solutionEn}
                  </p>
                </div>
              ),
            },
            {
              key: "theme",
              label: t("colTheme"),
              render: (row) => (isBn ? row.themeBn : row.theme),
            },
            {
              key: "place",
              label: t("colPlace"),
              render: (row) => (isBn ? row.placeBn || row.place : row.place),
            },
            {
              key: "status",
              label: t("colStatus"),
              render: (row) => row.status,
            },
          ]}
          rows={data?.movements ?? []}
        />
      </LocalVizCard>
      {data?.sourceNote ? (
        <p className="text-[10px] text-muted-foreground/80">{data.sourceNote}</p>
      ) : null}
      <LocalEvidenceFeed compact topics={["UNREST", "CORRUPTION", "ROAD"]} />
    </div>
  );
}
