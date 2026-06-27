"use client";

import { useEffect, useRef } from "react";
import { CircleMarker, GeoJSON, MapContainer, TileLayer, useMap } from "react-leaflet";
import type { Feature, FeatureCollection, Polygon } from "geojson";
import type { GeoJSON as GeoJSONLayer, Layer, Path, PathOptions } from "leaflet";
import {
  BD_MAP_CENTER,
  BD_MAP_ZOOM,
  getMapBoundsForFilter,
  scoreToChoroplethColor,
} from "@/lib/geojson-bd";
import type { AdminFilterState } from "@/types";
import type { GeoFeatureProperties, RedFlagMarker } from "@/types/dashboard";
import { getDrillChildType } from "@/lib/filter-utils";
import { cn } from "@/lib/utils";

interface ChoroplethMapInnerProps {
  filter: AdminFilterState;
  geoJson: FeatureCollection<Polygon, GeoFeatureProperties>;
  markers: RedFlagMarker[];
  mapPulseKey?: number;
  onFeatureClick: (props: GeoFeatureProperties) => void;
}

function MapBoundsSync({ filter }: { filter: AdminFilterState }) {
  const map = useMap();
  useEffect(() => {
    const bounds = getMapBoundsForFilter(filter);
    if (bounds) {
      map.fitBounds(bounds, { padding: [24, 24], maxZoom: 10, animate: true });
    } else {
      map.setView(BD_MAP_CENTER, BD_MAP_ZOOM, { animate: true });
    }
  }, [filter, map]);
  return null;
}

const SEVERITY_COLORS: Record<RedFlagMarker["severity"], string> = {
  LOW: "#34d399",
  MEDIUM: "#fbbf24",
  HIGH: "#f97316",
  CRITICAL: "#ef4444",
};

export function ChoroplethMapInner({
  filter,
  geoJson,
  markers,
  mapPulseKey,
  onFeatureClick,
}: ChoroplethMapInnerProps) {
  const layerRef = useRef<GeoJSONLayer | null>(null);

  const style = (feature?: Feature): PathOptions => {
    const score = feature?.properties?.performanceScore ?? 50;
    return {
      fillColor: scoreToChoroplethColor(score),
      weight: 1.5,
      opacity: 0.9,
      color: "hsl(217 28% 22%)",
      fillOpacity: 0.72,
    };
  };

  const onEachFeature = (feature: Feature, layer: Layer) => {
    const props = feature.properties as GeoFeatureProperties;
    layer.bindTooltip(
      `<strong>${props.name}</strong><br/>Performance: ${props.performanceScore}%<br/>Risk: ${props.riskScore}%`,
      { sticky: true, className: "geo-tooltip" },
    );
    layer.on({
      mouseover: (e) => {
        const l = e.target as Path;
        l.setStyle({ weight: 2.5, fillOpacity: 0.88, color: "#34d399" });
      },
      mouseout: (e) => {
        layerRef.current?.resetStyle(e.target as Path);
      },
      click: () => onFeatureClick(props),
    });
  };

  const childLabel = getDrillChildType(filter);

  return (
    <div
      className={cn(
        "relative h-full min-h-[300px] w-full",
        mapPulseKey ? "animate-map-flash" : "",
      )}
    >
      <MapContainer
        center={BD_MAP_CENTER}
        zoom={BD_MAP_ZOOM}
        className="h-full w-full rounded-b-xl"
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        />
        <MapBoundsSync filter={filter} />
        <GeoJSON
          key={`${childLabel}-${geoJson.features.map((f) => f.properties?.id).join(",")}`}
          ref={layerRef}
          data={geoJson}
          style={style}
          onEachFeature={onEachFeature}
        />
        {markers.map((m) => (
          <CircleMarker
            key={m.id}
            center={[m.lat, m.lng]}
            radius={m.severity === "CRITICAL" ? 10 : 7}
            pathOptions={{
              color: SEVERITY_COLORS[m.severity],
              fillColor: SEVERITY_COLORS[m.severity],
              fillOpacity: 0.85,
              weight: 2,
              className: "marker-pulse",
            }}
          >
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
