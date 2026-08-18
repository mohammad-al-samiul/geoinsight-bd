"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  CircleMarker,
  GeoJSON,
  MapContainer,
  Marker,
  TileLayer,
  Tooltip,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import type { Feature, FeatureCollection } from "geojson";
import type { GeoJSON as GeoJSONLayer, Layer, Path, PathOptions } from "leaflet";
import divisionBoundaries from "@/lib/bd-divisions.json";
import districtBoundaries from "@/lib/bd-districts.json";
import {
  localWardBounds,
  resolveEntityMapMeta,
  wpiFillColor,
  type LocalWardFeatureProps,
} from "@/lib/local-ward-geo";
import {
  LAYER_COLORS,
  SOURCE_COLORS,
  type MapLayerId,
  type MarkerSeverity,
  type SignalSource,
} from "@/lib/local-map-layers";

export type LocalMapMarker = {
  id: string;
  lat: number;
  lng: number;
  severity?: MarkerSeverity;
  label?: string;
  layer?: MapLayerId;
  source?: SignalSource;
};

const SEVERITY_COLORS: Record<MarkerSeverity, string> = {
  LOW: "#34d399",
  MEDIUM: "#fbbf24",
  HIGH: "#f97316",
  CRITICAL: "#ef4444",
};

type DivisionFc = FeatureCollection & {
  features: Array<Feature & { properties: { shapeName: string } }>;
};

const BD_DIVISIONS = divisionBoundaries as DivisionFc;
const BD_DISTRICTS = districtBoundaries as DivisionFc;

function MapFit({
  geo,
  entityCode,
}: {
  geo: FeatureCollection;
  entityCode: string;
}) {
  const map = useMap();
  useEffect(() => {
    const bounds = localWardBounds(geo);
    if (!bounds) return;
    const t = window.setTimeout(() => {
      map.invalidateSize({ animate: false });
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13, animate: true });
    }, 80);
    return () => window.clearTimeout(t);
  }, [geo, entityCode, map]);
  return null;
}

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

/** Corner locator: Bangladesh silhouette + pin on active entity. */
function BdLocatorInset({
  lat,
  lng,
  accent,
  label,
}: {
  lat: number;
  lng: number;
  accent: string;
  label: string;
}) {
  const west = 88.0;
  const east = 92.75;
  const south = 20.55;
  const north = 26.7;
  const w = 118;
  const h = 156;
  const project = (lo: number, la: number) => [
    ((lo - west) / (east - west)) * w,
    ((north - la) / (north - south)) * h,
  ] as const;

  // Coarse Bangladesh coastline (enough for national recognition in inset)
  const ring: Array<[number, number]> = [
    [88.1, 26.55],
    [89.0, 26.6],
    [89.8, 26.45],
    [90.5, 26.2],
    [91.5, 25.2],
    [92.4, 25.0],
    [92.35, 24.0],
    [92.2, 22.8],
    [92.35, 21.4],
    [92.2, 20.75],
    [91.5, 21.0],
    [90.5, 21.7],
    [89.6, 21.8],
    [89.1, 21.7],
    [88.3, 21.9],
    [88.05, 22.8],
    [88.1, 24.0],
    [88.05, 25.2],
    [88.1, 26.55],
  ];
  const d =
    ring
      .map((p, i) => {
        const [x, y] = project(p[0], p[1]);
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ") + " Z";

  const [px, py] = project(lng, lat);

  return (
    <div className="pointer-events-none absolute bottom-3 left-3 z-[500] overflow-hidden rounded-lg border border-sky-300/45 bg-slate-950/90 p-2 shadow-lg backdrop-blur-sm">
      <p className="mb-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-sky-200">
        Bangladesh
      </p>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden>
        <rect width={w} height={h} fill="rgba(15,23,42,0.4)" rx="4" />
        <path
          d={d}
          fill="rgba(56,189,248,0.22)"
          stroke="rgba(125,211,252,0.95)"
          strokeWidth="2.4"
          strokeLinejoin="round"
        />
        <circle cx={px} cy={py} r="9" fill={accent} opacity="0.28" />
        <circle
          cx={px}
          cy={py}
          r="4"
          fill={accent}
          stroke="#fff"
          strokeWidth="1.4"
        />
      </svg>
      <p className="mt-1 max-w-[118px] truncate text-[10px] font-medium text-foreground">
        {label}
      </p>
    </div>
  );
}

function entityBadgeIcon(label: string, role: string, accent: string) {
  return L.divIcon({
    className: "local-entity-badge",
    iconSize: [168, 44],
    iconAnchor: [84, 22],
    html: `<div style="
      display:flex;flex-direction:column;align-items:center;gap:2px;
      padding:6px 10px;border-radius:10px;
      background:rgba(2,6,23,0.92);
      border:1.5px solid ${accent};
      box-shadow:0 0 0 3px ${accent}33, 0 8px 24px rgba(0,0,0,.45);
      color:#f8fafc;font:600 11px/1.2 ui-sans-serif,system-ui,sans-serif;
      white-space:nowrap;pointer-events:none;
    ">
      <span style="font-size:9px;letter-spacing:.14em;text-transform:uppercase;color:${accent}">${role}</span>
      <span>${label}</span>
    </div>`,
  });
}

interface LocalWardMapInnerProps {
  entityCode: string;
  geo: FeatureCollection;
  markers?: LocalMapMarker[];
  metricLabel: string;
  isBn?: boolean;
  onWardClick?: (props: LocalWardFeatureProps) => void;
}

export function LocalWardMapInner({
  entityCode,
  geo,
  markers = [],
  metricLabel,
  isBn,
  onWardClick,
}: LocalWardMapInnerProps) {
  const layerRef = useRef<GeoJSONLayer | null>(null);
  const meta = useMemo(() => resolveEntityMapMeta(entityCode), [entityCode]);
  const entityLabel = isBn ? meta.labelBn : meta.labelEn;

  const districtFc = useMemo(() => {
    const features = BD_DISTRICTS.features.filter(
      (f) => f.properties?.shapeName === meta.districtName,
    );
    return { type: "FeatureCollection" as const, features };
  }, [meta.districtName]);

  const center = useMemo((): [number, number] => {
    return [meta.anchor.lat, meta.anchor.lng];
  }, [meta.anchor.lat, meta.anchor.lng]);

  const badge = useMemo(
    () => entityBadgeIcon(entityLabel, meta.role, meta.accent),
    [entityLabel, meta.role, meta.accent],
  );

  const style = (feature?: Feature): PathOptions => {
    const props = feature?.properties as LocalWardFeatureProps | undefined;
    if (props?.kind === "outline") {
      return {
        color: meta.accent,
        weight: 3.4,
        dashArray: undefined,
        fillColor: meta.accent,
        fillOpacity: 0.12,
        interactive: false,
      };
    }
    const score = props?.score ?? 0;
    return {
      color: "rgba(15, 23, 42, 0.7)",
      weight: 1.15,
      fillColor: wpiFillColor(score),
      fillOpacity: score > 0 ? 0.8 : 0.34,
    };
  };

  const onEachFeature = (feature: Feature, layer: Layer) => {
    const props = feature.properties as LocalWardFeatureProps;
    if (props.kind === "outline") return;
    const path = layer as Path;
    const name = isBn ? props.nameBn || props.name : props.name;
    path.bindTooltip(
      `<div style="font-size:12px;line-height:1.4">
        <strong>${name}</strong>
        <div style="opacity:.75;font-size:10px;margin-top:2px">${props.code}</div>
        <div style="margin-top:4px">${metricLabel}: <b>${props.score || "—"}</b></div>
        <div>Open ${props.openComplaints} · Red ${props.redAlerts}</div>
      </div>`,
      { sticky: true, className: "local-ward-tip" },
    );
    path.on({
      mouseover: () =>
        path.setStyle({ weight: 2.6, fillOpacity: 0.92, color: "#e2e8f0" }),
      mouseout: () => path.setStyle(style(feature)),
      click: () => onWardClick?.(props),
    });
  };

  const geoKey = `${entityCode}-${geo.features.length}-${
    (geo.features[1]?.properties as LocalWardFeatureProps | undefined)?.score ?? 0
  }`;

  return (
    <div className="absolute inset-0">
      <MapContainer
        key={entityCode}
        center={center}
        zoom={12}
        className="h-full w-full rounded-b-xl"
        style={{ height: "100%", width: "100%", background: "#0b1220" }}
        zoomControl
        scrollWheelZoom
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          opacity={0.88}
        />
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png"
          opacity={0.8}
        />

        {/* Bangladesh — all divisions faintly outlined */}
        <GeoJSON
          data={BD_DIVISIONS}
          interactive={false}
          style={() => ({
            color: "rgba(56, 189, 248, 0.55)",
            weight: 1.1,
            fillColor: "rgba(14, 165, 233, 0.05)",
            fillOpacity: 1,
          })}
        />

        {/* Parent district strongly marked (Chittagong / Comilla) */}
        <GeoJSON
          key={`district-${meta.districtName}`}
          data={districtFc}
          interactive={false}
          style={() => ({
            color: "rgba(251, 191, 36, 0.95)",
            weight: 2.4,
            dashArray: "5 4",
            fillColor: "rgba(251, 191, 36, 0.08)",
            fillOpacity: 1,
          })}
        />

        <MapResizeSync />
        <MapFit geo={geo} entityCode={entityCode} />

        {/* Entity jurisdiction + wards */}
        <GeoJSON
          key={geoKey}
          ref={layerRef}
          data={geo}
          style={style}
          onEachFeature={onEachFeature}
        />

        {/* MP / Mayor badge at entity center */}
        <Marker position={[meta.anchor.lat, meta.anchor.lng]} icon={badge} />

        {/* Pulse ring under badge */}
        <CircleMarker
          center={[meta.anchor.lat, meta.anchor.lng]}
          radius={18}
          pathOptions={{
            color: meta.accent,
            fillColor: meta.accent,
            fillOpacity: 0.12,
            weight: 2,
            opacity: 0.85,
          }}
        />

        {markers.map((m) => {
          const fill = m.layer
            ? LAYER_COLORS[m.layer]
            : SEVERITY_COLORS[m.severity ?? "HIGH"];
          const ring = m.source ? SOURCE_COLORS[m.source] : "#fff7ed";
          return (
            <CircleMarker
              key={m.id}
              center={[m.lat, m.lng]}
              radius={m.severity === "CRITICAL" ? 9 : 7}
              pathOptions={{
                color: ring,
                fillColor: fill,
                fillOpacity: 0.92,
                weight: 1.8,
                className:
                  m.severity === "CRITICAL" ? "map-marker-enter map-marker-critical" : "map-marker-enter",
              }}
            >
              {m.label ? (
                <Tooltip direction="top" offset={[0, -4]}>
                  <span>
                    {m.label}
                    {m.layer ? ` · ${m.layer}` : ""}
                    {m.source ? ` · ${m.source}` : ""}
                  </span>
                </Tooltip>
              ) : null}
            </CircleMarker>
          );
        })}
      </MapContainer>

      <BdLocatorInset
        lat={meta.anchor.lat}
        lng={meta.anchor.lng}
        accent={meta.accent}
        label={entityLabel}
      />
    </div>
  );
}
