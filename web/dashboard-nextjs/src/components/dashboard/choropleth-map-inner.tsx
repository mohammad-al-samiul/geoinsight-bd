"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CircleMarker, GeoJSON, MapContainer, TileLayer, Tooltip, useMap } from "react-leaflet";
import type { Feature } from "geojson";
import type { GeoJSON as GeoJSONLayer, Layer, Path, PathOptions } from "leaflet";
import { AlertTriangle, MapPin, X } from "lucide-react";
import { BD_MAP_CENTER, BD_MAP_ZOOM } from "@/lib/geojson-bd";
// Heavy boundary polygons only load with this dynamically-imported component.
import { getMapBoundsForFilter, getVisibleGeoJson } from "@/lib/bd-boundaries";
import type { AdminFilterState } from "@/types";
import type { GeoFeatureProperties, RedFlagMarker } from "@/types/dashboard";
import { getDrillChildType, getDrillParentId } from "@/lib/filter-utils";
import { cn } from "@/lib/utils";
import { MapSkeleton } from "@/components/ui/skeleton";

interface ChoroplethMapInnerProps {
  filter: AdminFilterState;
  /** Bumped when the admin hierarchy or live unit scores change. */
  geoVersion?: string | number;
  markers: RedFlagMarker[];
  mapPulseKey?: number;
  onFeatureClick: (props: GeoFeatureProperties) => void;
}

function MapBoundsSync({ filter }: { filter: AdminFilterState }) {
  const map = useMap();
  useEffect(() => {
    try {
      const bounds = getMapBoundsForFilter(filter);
      if (bounds) {
        map.fitBounds(bounds, { padding: [24, 24], maxZoom: 10, animate: true });
      } else {
        map.setView(BD_MAP_CENTER, BD_MAP_ZOOM, { animate: true });
      }
    } catch {
      map.setView(BD_MAP_CENTER, BD_MAP_ZOOM, { animate: false });
    }
  }, [filter, map]);
  return null;
}

/** Leaflet needs invalidateSize after flex layout settles. */
function MapResizeSync() {
  const map = useMap();
  useEffect(() => {
    const container = map.getContainer().parentElement;
    if (!container) return;

    const sync = () => map.invalidateSize({ animate: false });
    const timer = window.setTimeout(sync, 0);
    const observer = new ResizeObserver(sync);
    observer.observe(container);

    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
    };
  }, [map]);
  return null;
}

const SEVERITY_COLORS: Record<RedFlagMarker["severity"], string> = {
  LOW: "#34d399",
  MEDIUM: "#fbbf24",
  HIGH: "#f97316",
  CRITICAL: "#ef4444",
};

const SEVERITY_ORDER: Record<RedFlagMarker["severity"], number> = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4,
};

interface IssueCluster {
  id: string;
  lat: number;
  lng: number;
  severity: RedFlagMarker["severity"];
  markers: RedFlagMarker[];
}

function buildIssueClusters(markers: RedFlagMarker[]): IssueCluster[] {
  const groups = new Map<string, RedFlagMarker[]>();

  for (const marker of markers) {
    // Group nearby alerts: national map remains readable, while the panel
    // retains every alert for the selected area.
    const key = `${Math.round(marker.lat * 3) / 3}:${Math.round(marker.lng * 3) / 3}`;
    const group = groups.get(key) ?? [];
    group.push(marker);
    groups.set(key, group);
  }

  return [...groups.entries()].map(([id, group]) => {
    const severity = group.reduce<RedFlagMarker["severity"]>(
      (highest, marker) =>
        SEVERITY_ORDER[marker.severity] > SEVERITY_ORDER[highest]
          ? marker.severity
          : highest,
      "LOW",
    );
    return {
      id,
      lat: group.reduce((sum, marker) => sum + marker.lat, 0) / group.length,
      lng: group.reduce((sum, marker) => sum + marker.lng, 0) / group.length,
      severity,
      markers: group.sort(
        (a, b) => SEVERITY_ORDER[b.severity] - SEVERITY_ORDER[a.severity],
      ),
    };
  });
}

export function ChoroplethMapInner({
  filter,
  geoVersion,
  markers,
  mapPulseKey,
  onFeatureClick,
}: ChoroplethMapInnerProps) {
  const layerRef = useRef<GeoJSONLayer | null>(null);
  const [mounted, setMounted] = useState(false);
  const [selectedClusterId, setSelectedClusterId] = useState<string | null>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps -- geoVersion signals hierarchy/score updates
  const geoJson = useMemo(() => getVisibleGeoJson(filter), [filter, geoVersion]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const style = (feature?: Feature): PathOptions => {
    return {
      // Deliberately neutral: a red issue marker should never visually
      // conflict with an unrelated area's green performance surface.
      fillColor: "#163244",
      weight: 1.25,
      opacity: 0.8,
      color: "#2d5b70",
      fillOpacity: 0.28,
    };
  };

  const onEachFeature = (feature: Feature, layer: Layer) => {
    const props = feature.properties as GeoFeatureProperties;
    layer.bindTooltip(
      `<strong>${props.nameBn ?? props.name}</strong><br/>কর্মদক্ষতা: <strong>${props.performanceScore}%</strong><br/>ঝুঁকি স্কোর: <strong>${props.riskScore}%</strong><br/><small>ক্লিক করে বিস্তারিত দেখুন</small>`,
      { sticky: true, className: "geo-tooltip" },
    );
    layer.on({
      mouseover: (e) => {
        try {
          const l = e.target as Path;
          l.setStyle({ weight: 2.5, fillOpacity: 0.48, color: "#22d3ee" });
        } catch {
          // layer detached during re-render
        }
      },
      mouseout: (e) => {
        try {
          const target = e.target as Path;
          if (layerRef.current) {
            layerRef.current.resetStyle(target);
          } else {
            target.setStyle(style(feature));
          }
        } catch {
          // GeoJSON layer was replaced while pointer was over a feature
        }
      },
      click: () => onFeatureClick(props),
    });
  };

  const childLabel = getDrillChildType(filter);
  const parentId = getDrillParentId(filter);
  const geoKey = `${childLabel}-${parentId ?? "root"}-${geoJson.features.length}`;
  const issueClusters = useMemo(() => buildIssueClusters(markers), [markers]);
  const selectedCluster =
    issueClusters.find((cluster) => cluster.id === selectedClusterId) ?? null;

  if (!mounted) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-muted/20">
        <MapSkeleton />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "absolute inset-0",
        mapPulseKey ? "animate-map-flash" : "",
      )}
    >
      <MapContainer
        center={BD_MAP_CENTER}
        zoom={BD_MAP_ZOOM}
        className="h-full w-full rounded-b-xl"
        style={{ height: "100%", width: "100%" }}
        zoomControl
        scrollWheelZoom
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        />
        <MapResizeSync />
        <MapBoundsSync filter={filter} />
        <GeoJSON
          key={geoKey}
          ref={layerRef}
          data={geoJson}
          style={style}
          onEachFeature={onEachFeature}
        />
        {issueClusters.map((cluster) => (
          <CircleMarker
            key={cluster.id}
            center={[cluster.lat, cluster.lng]}
            radius={Math.min(19, 8 + cluster.markers.length * 2)}
            pathOptions={{
              color: "#fff7ed",
              fillColor: SEVERITY_COLORS[cluster.severity],
              fillOpacity: 0.9,
              weight: selectedClusterId === cluster.id ? 3.5 : 2,
              className:
                cluster.severity === "CRITICAL"
                  ? "marker-pulse"
                  : "marker-pulse-soft",
            }}
            eventHandlers={{ click: () => setSelectedClusterId(cluster.id) }}
          >
            <Tooltip sticky direction="top" offset={[0, -8]} className="geo-tooltip">
              <strong>
                {cluster.markers.length}টি সমস্যা ·{" "}
                {cluster.severity === "CRITICAL" ? "জরুরি" : cluster.severity}
              </strong>
              <br />
              ক্লিক করে সব বিস্তারিত দেখুন
            </Tooltip>
          </CircleMarker>
        ))}
      </MapContainer>

      {selectedCluster && (
        <aside className="absolute inset-x-3 bottom-3 z-[1000] max-h-[42%] max-w-full overflow-hidden rounded-xl border border-orange-400/35 bg-slate-950/95 shadow-2xl backdrop-blur sm:inset-x-auto sm:left-3 sm:max-h-none sm:w-[min(360px,calc(100%-24px))]">
          <div className="flex items-center justify-between border-b border-white/10 bg-orange-500/10 px-3.5 py-2.5">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-500/20 text-orange-300">
                <AlertTriangle className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs font-semibold text-orange-100">
                  নির্বাচিত এলাকার সমস্যা
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {selectedCluster.markers.length}টি খোলা সতর্কতা
                </p>
              </div>
            </div>
            <button
              type="button"
              aria-label="Close issue details"
              onClick={() => setSelectedClusterId(null)}
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="max-h-52 space-y-2 overflow-y-auto p-3">
            {selectedCluster.markers.map((marker) => (
              <div
                key={marker.id}
                className="rounded-lg border border-white/10 bg-white/[0.03] p-2.5"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: SEVERITY_COLORS[marker.severity] }}
                  />
                  <span className="text-[10px] font-semibold text-orange-100">
                    {marker.severity} · {marker.flagType}
                  </span>
                </div>
                <p className="mt-1.5 text-[11px] leading-relaxed text-slate-300">
                  {marker.message}
                </p>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-1.5 border-t border-white/10 px-3.5 py-2 text-[10px] text-muted-foreground">
            <MapPin className="h-3 w-3 text-orange-300" />
            মানচিত্রে অন্য সমস্যা marker-এ ক্লিক করে এলাকা পরিবর্তন করুন
          </div>
        </aside>
      )}
    </div>
  );
}
