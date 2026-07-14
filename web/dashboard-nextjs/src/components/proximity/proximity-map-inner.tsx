"use client";

import { useEffect, useMemo } from "react";
import {
  CircleMarker,
  MapContainer,
  Polygon,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents,
} from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import { MapSkeleton } from "@/components/ui/skeleton";
import type { PointCheckResult, ZoneFeature } from "@/hooks/use-proximity-live";

interface ProximityMapInnerProps {
  zones: ZoneFeature[];
  tracks: PointCheckResult[];
  center: LatLngExpression;
  zoom: number;
  pulseKey: number;
  lang: "bn" | "en";
  onMapClick?: (lat: number, lng: number) => void;
}

const ALERT_STROKE: Record<string, string> = {
  critical: "#ef4444",
  high: "#f97316",
  elevated: "#eab308",
};

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

function ClickCapture({ onMapClick }: { onMapClick?: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMapClick?.(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function FitDhaka({
  zones,
  tracks,
  pulseKey,
}: {
  zones: ZoneFeature[];
  tracks: PointCheckResult[];
  pulseKey: number;
}) {
  const map = useMap();
  useEffect(() => {
    const pts: [number, number][] = [];
    for (const z of zones) {
      for (const ring of z.ring_latlng) pts.push([ring[0], ring[1]]);
    }
    for (const t of tracks) pts.push([t.point.lat, t.point.lng]);
    if (pts.length < 2) {
      map.setView([23.7685, 90.3918], 12, { animate: true });
      return;
    }
    try {
      map.fitBounds(pts, { padding: [36, 36], maxZoom: 14, animate: true });
    } catch {
      map.setView([23.7685, 90.3918], 12, { animate: false });
    }
  }, [map, zones, tracks, pulseKey]);
  return null;
}

export function ProximityMapInner({
  zones,
  tracks,
  center,
  zoom,
  pulseKey,
  lang,
  onMapClick,
}: ProximityMapInnerProps) {
  const zonePolys = useMemo(
    () =>
      zones.map((z) => ({
        ...z,
        positions: z.ring_latlng as LatLngExpression[],
        color: ALERT_STROKE[z.alert_level] ?? "#38bdf8",
      })),
    [zones],
  );

  if (typeof window === "undefined") return <MapSkeleton />;

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      className="h-full w-full"
      zoomControl={false}
      attributionControl={false}
      scrollWheelZoom
    >
      <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
      <MapResizeSync />
      <FitDhaka zones={zones} tracks={tracks} pulseKey={pulseKey} />
      <ClickCapture onMapClick={onMapClick} />

      {zonePolys.map((z) => (
        <Polygon
          key={z.zone_id}
          positions={z.positions}
          pathOptions={{
            color: z.color,
            weight: 2,
            fillColor: z.color,
            fillOpacity: 0.18,
            dashArray: z.alert_level === "elevated" ? "6 4" : undefined,
          }}
        >
          <Tooltip sticky>
            <div className="text-xs">
              <p className="font-semibold">{lang === "bn" ? z.name_bn : z.name}</p>
              <p>
                {z.category} · {z.alert_level} · buffer {z.approach_buffer_m}m
              </p>
            </div>
          </Tooltip>
        </Polygon>
      ))}

      {tracks.map((t, i) => {
        const sever = t.max_severity;
        const fill =
          sever === "critical"
            ? "#ef4444"
            : sever === "high"
              ? "#f97316"
              : sever === "elevated"
                ? "#eab308"
                : "#22c55e";
        const r = t.alert ? 11 : 7;
        return (
          <CircleMarker
            key={`${t.point.track_id ?? i}-${pulseKey}`}
            center={[t.point.lat, t.point.lng]}
            radius={r}
            pathOptions={{
              color: "#fff",
              weight: 1.5,
              fillColor: fill,
              fillOpacity: 0.92,
            }}
          >
            <Tooltip direction="top" offset={[0, -6]}>
              <div className="max-w-[200px] text-xs">
                <p className="font-semibold">{t.point.label ?? "Track"}</p>
                <p>
                  {t.alert ? "⚠ " : ""}
                  {t.max_severity} · {t.hits[0]?.status ?? "—"}
                </p>
                {t.hits[0] && (
                  <p>
                    {lang === "bn" ? t.hits[0].name_bn : t.hits[0].name} ·{" "}
                    {Math.round(t.hits[0].distance_m)}m
                  </p>
                )}
              </div>
            </Tooltip>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
