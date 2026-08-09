"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  CircleMarker,
  GeoJSON,
  MapContainer,
  Polyline,
  TileLayer,
  Tooltip,
  useMap,
} from "react-leaflet";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import type { GeoJSON as GeoJSONLayer, Layer, Path, PathOptions } from "leaflet";
import { BD_MAP_CENTER, BD_MAP_ZOOM } from "@/lib/geojson-bd";
import divisionBoundaries from "@/lib/bd-divisions.json";
import { blockadePath } from "@/lib/unrest-geo";
import type { DistrictUnrestCell, ProtestMovement } from "@/hooks/use-unrest-pulse";

type DivisionBoundaryFeature = {
  properties: { shapeName: string };
  geometry: Geometry;
};

const NAME_TO_KEY: Record<string, string> = {
  dhaka: "dhaka",
  chittagong: "chattogram",
  chattogram: "chattogram",
  khulna: "khulna",
  rajshahi: "rajshahi",
  rajshani: "rajshahi",
  sylhet: "sylhet",
  barishal: "barishal",
  barisal: "barishal",
  rangpur: "rangpur",
  mymensingh: "mymensingh",
};

function canon(name: string): string {
  return name
    .toLowerCase()
    .replace("chittagong", "chattogram")
    .replace("rajshani", "rajshahi")
    .replace("barisal", "barishal")
    .trim();
}

function scoreFill(score: number): string {
  if (score >= 70) return "#dc2626";
  if (score >= 50) return "#ea580c";
  if (score >= 30) return "#ca8a04";
  if (score > 0) return "#059669";
  return "#334155";
}

function MapResizeSync() {
  const map = useMap();
  useEffect(() => {
    const parent = map.getContainer().parentElement;
    if (!parent) return;
    const sync = () => map.invalidateSize({ animate: false });
    const t = window.setTimeout(sync, 0);
    const obs = new ResizeObserver(sync);
    obs.observe(parent);
    return () => {
      window.clearTimeout(t);
      obs.disconnect();
    };
  }, [map]);
  return null;
}

function FitAndFocus({ focus }: { focus: { lat: number; lng: number } | null }) {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(
      [
        [20.5, 88.0],
        [26.7, 92.7],
      ],
      { padding: [16, 16], maxZoom: 7.4, animate: false },
    );
  }, [map]);

  useEffect(() => {
    if (!focus) return;
    map.flyTo([focus.lat, focus.lng], 9, { duration: 0.75 });
  }, [focus, map]);

  return null;
}

export interface UnrestMapInnerProps {
  districts: DistrictUnrestCell[];
  movements: ProtestMovement[];
  showBlockades: boolean;
  focus: { lat: number; lng: number } | null;
  selectedId: string | null;
  bn: boolean;
  onSelectMovement: (id: string) => void;
}

export function UnrestMapInner({
  districts,
  movements,
  showBlockades,
  focus,
  selectedId,
  bn,
  onSelectMovement,
}: UnrestMapInnerProps) {
  const layerRef = useRef<GeoJSONLayer | null>(null);

  const divisionScore = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of districts) {
      const key = canon(d.division || "");
      if (!key) continue;
      map.set(key, Math.max(map.get(key) ?? 0, d.unrest_score));
    }
    return map;
  }, [districts]);

  const geoJson = useMemo((): FeatureCollection<Geometry, { key: string; name: string }> => {
    const features = (divisionBoundaries.features as unknown as DivisionBoundaryFeature[])
      .filter((f) => f.geometry.type === "Polygon" || f.geometry.type === "MultiPolygon")
      .map((f) => {
        const key = NAME_TO_KEY[canon(f.properties.shapeName)] || canon(f.properties.shapeName);
        return {
          type: "Feature" as const,
          properties: { key, name: f.properties.shapeName },
          geometry: f.geometry,
        };
      });
    return { type: "FeatureCollection", features };
  }, []);

  const styleFeature = (feature?: Feature): PathOptions => {
    const key = feature?.properties?.key as string | undefined;
    const score = key ? divisionScore.get(key) ?? 0 : 0;
    return {
      fillColor: scoreFill(score),
      fillOpacity: score > 0 ? 0.55 : 0.2,
      color: "#0f172a",
      weight: 1.1,
      opacity: 1,
    };
  };

  const onEachFeature = (feature: Feature, layer: Layer) => {
    const key = feature.properties?.key as string;
    const score = divisionScore.get(key) ?? 0;
    const name = feature.properties?.name ?? key;
    layer.bindTooltip(`${name} · score ${score}`, { sticky: true });
    layer.on({
      mouseover: (e) => {
        const path = e.target as Path;
        path.setStyle({ weight: 2.5, fillOpacity: 0.75 });
        path.bringToFront();
      },
      mouseout: (e) => {
        (e.target as Path).setStyle(styleFeature(feature));
      },
    });
  };

  useEffect(() => {
    layerRef.current?.setStyle((f) => styleFeature(f));
  }, [districts]);

  const pinMovements = movements.filter(
    (m) => typeof m.lat === "number" && typeof m.lng === "number",
  );

  const blockadeLines = showBlockades
    ? pinMovements.filter(
        (m) => m.theme_id === "hartal_blockade" || /hartal|blockade|অবরোধ|হরতাল/i.test(m.theme),
      )
    : [];

  return (
    <MapContainer
      center={BD_MAP_CENTER}
      zoom={BD_MAP_ZOOM}
      className="absolute inset-0 z-0 h-full w-full rounded-xl [&_.leaflet-container]:h-full [&_.leaflet-container]:w-full"
      style={{ height: "100%", width: "100%", minHeight: 360 }}
      scrollWheelZoom
      zoomControl
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> · CARTO'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      />
      <MapResizeSync />
      <FitAndFocus focus={focus} />

      <GeoJSON
        key="unrest-divisions"
        data={geoJson}
        style={styleFeature}
        onEachFeature={onEachFeature}
        ref={(ref) => {
          layerRef.current = ref;
        }}
      />

      {blockadeLines.map((m) => (
        <Polyline
          key={`blk-${m.id}`}
          positions={blockadePath(m.lat!, m.lng!)}
          pathOptions={{
            color: "#f97316",
            weight: 3,
            opacity: 0.75,
            dashArray: "6 8",
          }}
        >
          <Tooltip>
            {bn ? "অবরোধ/হরতাল করিডোর (আনুমানিক)" : "Blockade corridor (approx)"}
          </Tooltip>
        </Polyline>
      ))}

      {pinMovements.map((m) => {
        const active = selectedId === m.id;
        const r =
          m.status === "active" ? 9 : m.status === "recent" ? 7 : 5.5;
        const fill =
          m.source === "citizen"
            ? "#f472b6"
            : m.status === "active"
              ? "#ef4444"
              : m.status === "recent"
                ? "#f59e0b"
                : "#64748b";
        return (
          <CircleMarker
            key={m.id}
            center={[m.lat!, m.lng!]}
            radius={active ? r + 2 : r}
            pathOptions={{
              color: "#fff",
              weight: active ? 2.5 : 1.25,
              fillColor: fill,
              fillOpacity: 0.92,
            }}
            eventHandlers={{
              click: (e) => {
                e.originalEvent.stopPropagation();
                onSelectMovement(m.id);
              },
            }}
          >
            <Tooltip direction="top" offset={[0, -4]}>
              <div className="max-w-[220px] text-xs">
                <p className="font-semibold leading-snug">{bn ? m.title_bn : m.title}</p>
                <p className="mt-0.5 text-[11px] opacity-80">
                  {(bn ? m.theme_bn : m.theme) || ""}
                  {m.party_bn || m.party
                    ? ` · ${bn ? m.party_bn || m.party : m.party || m.party_bn}`
                    : ""}
                </p>
                <p className="text-[11px] opacity-80">
                  {bn ? m.place_bn : m.place}
                  {m.division ? ` · ${m.division}` : ""}
                </p>
              </div>
            </Tooltip>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
