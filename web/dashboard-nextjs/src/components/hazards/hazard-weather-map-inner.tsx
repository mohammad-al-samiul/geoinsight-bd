"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Circle,
  CircleMarker,
  MapContainer,
  Marker,
  TileLayer,
  Tooltip,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import type { LatLngExpression } from "leaflet";
import { BD_MAP_CENTER, BD_MAP_ZOOM } from "@/lib/geojson-bd";
import { getMapBoundsForFilter } from "@/lib/bd-boundaries";
import type { AdminFilterState } from "@/types";
import type { WeatherObservation, DisasterAlert } from "@/hooks/use-weather-live";
import { MapSkeleton } from "@/components/ui/skeleton";

export interface HazardZone {
  zone_id: string;
  name: string;
  name_bn: string;
  hazard_type: string;
  risk_level: number;
  lat?: number;
  lng?: number;
  radius_km?: number;
  division?: string;
  district?: string;
  locality?: string;
  locality_bn?: string;
  water_note_bn?: string;
  water_note_en?: string;
  scale?: "local" | "regional" | string;
  source?: string;
}

interface HazardWeatherMapInnerProps {
  filter: AdminFilterState;
  zones: HazardZone[];
  observations: WeatherObservation[];
  alerts: DisasterAlert[];
  pulseKey?: number;
}

const RISK_COLORS: Record<number, string> = {
  1: "#22c55e",
  2: "#84cc16",
  3: "#eab308",
  4: "#f97316",
  5: "#ef4444",
};

function MapBoundsSync({ filter }: { filter: AdminFilterState }) {
  const map = useMap();
  useEffect(() => {
    try {
      const bounds = getMapBoundsForFilter(filter);
      const maxZoom = filter.upazilaId ? 12 : filter.districtId ? 11 : filter.divisionId ? 9 : 10;
      if (bounds) {
        map.fitBounds(bounds, { padding: [24, 24], maxZoom, animate: true });
      } else {
        map.setView(BD_MAP_CENTER, BD_MAP_ZOOM, { animate: true });
      }
    } catch {
      map.setView(BD_MAP_CENTER, BD_MAP_ZOOM, { animate: false });
    }
  }, [filter, map]);
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

function kmToMeters(km: number) {
  return km * 1000;
}

function isLocalZone(z: HazardZone) {
  return z.scale === "local" || (typeof z.radius_km === "number" && z.radius_km <= 12);
}

function localityLabel(z: HazardZone) {
  return z.locality_bn || z.locality || z.name_bn || z.name;
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function localLabelIcon(z: HazardZone) {
  const color = RISK_COLORS[z.risk_level] ?? "#eab308";
  const text = escapeHtml(localityLabel(z));
  return L.divIcon({
    className: "hazard-local-label",
    html: `<div style="
      transform: translate(-50%, -100%);
      white-space: nowrap;
      pointer-events: none;
      font: 600 10px/1.2 'Segoe UI', system-ui, sans-serif;
      color: #f8fafc;
      text-shadow: 0 1px 2px rgba(0,0,0,.9), 0 0 6px rgba(0,0,0,.7);
      padding: 2px 5px;
      border-radius: 4px;
      background: rgba(15,23,42,.55);
      border: 1px solid ${color}99;
    ">${text}</div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 6],
  });
}

export function HazardWeatherMapInner({
  filter,
  zones,
  observations,
  alerts,
}: HazardWeatherMapInnerProps) {
  const [mounted, setMounted] = useState(false);
  const [zoom, setZoom] = useState(BD_MAP_ZOOM);

  useEffect(() => {
    setMounted(true);
  }, []);

  const zoneMarkers = useMemo(
    () =>
      zones.filter(
        (z) =>
          typeof z.lat === "number" &&
          typeof z.lng === "number" &&
          typeof z.radius_km === "number",
      ),
    [zones],
  );

  const localZones = useMemo(() => zoneMarkers.filter(isLocalZone), [zoneMarkers]);

  if (!mounted) return <MapSkeleton />;

  return (
    <MapContainer
      center={BD_MAP_CENTER as LatLngExpression}
      zoom={BD_MAP_ZOOM}
      className="h-full w-full rounded-lg"
      scrollWheelZoom
      attributionControl={false}
    >
      <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
      <MapBoundsSync filter={filter} />
      <MapResizeSync />
      <ZoomWatcher onZoom={setZoom} />

      {zoneMarkers.map((z) => {
        const local = isLocalZone(z);
        return (
          <Circle
            key={z.zone_id}
            center={[z.lat!, z.lng!]}
            radius={kmToMeters(z.radius_km!)}
            pathOptions={{
              color: RISK_COLORS[z.risk_level] ?? "#eab308",
              fillColor: RISK_COLORS[z.risk_level] ?? "#eab308",
              fillOpacity: local ? 0.32 : 0.14,
              weight: local ? 2.5 : 1.5,
              opacity: local ? 0.9 : 0.55,
              className:
                z.hazard_type === "cyclone"
                  ? "hazard-zone-cyclone"
                  : z.hazard_type === "flood"
                    ? "hazard-zone-flood"
                    : "hazard-zone-heat",
            }}
          >
            <Tooltip sticky className="geo-tooltip">
              <strong>{localityLabel(z)}</strong>
              {(z.district || z.division) && (
                <>
                  <br />
                  {[z.district, z.division].filter(Boolean).join(" · ")}
                </>
              )}
              <br />
              {z.hazard_type === "flood" && "বন্যা / Flood"}
              {z.hazard_type === "cyclone" && "ঘূর্ণিঝড় / Cyclone"}
              {z.hazard_type === "heat" && "তাপপ্রবাহ / Heat"}
              {" · "}Risk L{z.risk_level}
              {z.water_note_bn && (
                <>
                  <br />
                  {z.water_note_bn}
                </>
              )}
            </Tooltip>
          </Circle>
        );
      })}

      {/* Solid pin so small localities stay visible at country zoom */}
      {localZones.map((z) => (
        <CircleMarker
          key={`${z.zone_id}-pin`}
          center={[z.lat!, z.lng!]}
          radius={4 + Math.min(3, z.risk_level)}
          pathOptions={{
            color: "#fff",
            weight: 1.25,
            fillColor: RISK_COLORS[z.risk_level] ?? "#ef4444",
            fillOpacity: 0.95,
          }}
        >
          <Tooltip direction="top" offset={[0, -4]} className="geo-tooltip">
            <strong>{localityLabel(z)}</strong>
            {z.water_note_bn && (
              <>
                <br />
                {z.water_note_bn}
              </>
            )}
          </Tooltip>
        </CircleMarker>
      ))}

      {/* Named locality labels once zoomed into a division/district */}
      {zoom >= 9 &&
        localZones.map((z) => (
          <Marker
            key={`${z.zone_id}-label`}
            position={[z.lat!, z.lng!]}
            icon={localLabelIcon(z)}
            interactive={false}
          />
        ))}

      {observations.map((o) => {
        const maxRisk = Math.max(o.flood_risk, o.cyclone_risk, o.heat_stress);
        const key = o.district ? `${o.division}-${o.district}` : o.division;
        return (
          <CircleMarker
            key={`wx-${key}`}
            center={[o.lat, o.lng]}
            radius={7 + maxRisk}
            pathOptions={{
              color: "#94a3b8",
              weight: 1,
              fillColor: RISK_COLORS[maxRisk] ?? "#3b82f6",
              fillOpacity: 0.85,
            }}
          >
            <Tooltip sticky className="geo-tooltip">
              <strong>{o.name_bn}</strong> ({o.division}
              {o.district ? ` · ${o.district}` : ""})
              <br />
              {o.weather_label_bn} · {o.temp_c}°C
              <br />
              ২৪ঘ বৃষ্টি {o.rain_24h_mm ?? o.precipitation_mm} mm · বাতাস {o.wind_speed_kmh}{" "}
              km/h
              <br />
              বন্যা L{o.flood_risk} · ঘূর্ণিঝড় L{o.cyclone_risk} · তাপ L{o.heat_stress}
            </Tooltip>
          </CircleMarker>
        );
      })}

      {alerts
        .filter((a) => a.lat != null && a.lng != null)
        .map((a) => (
          <CircleMarker
            key={a.id}
            center={[a.lat!, a.lng!]}
            radius={10 + a.severity}
            pathOptions={{
              color: RISK_COLORS[a.severity] ?? "#ef4444",
              weight: 3,
              fillColor: "transparent",
              fillOpacity: 0,
              dashArray: "4 6",
            }}
          >
            <Tooltip sticky className="geo-tooltip">
              <strong>{a.title_bn ?? a.title}</strong>
              <br />
              {a.alert_type} · Severity L{a.severity}
              {a.division && (
                <>
                  <br />
                  {a.division}
                </>
              )}
            </Tooltip>
          </CircleMarker>
        ))}
    </MapContainer>
  );
}

function ZoomWatcher({ onZoom }: { onZoom: (z: number) => void }) {
  const map = useMap();
  useEffect(() => {
    const sync = () => onZoom(map.getZoom());
    sync();
    map.on("zoomend", sync);
    return () => {
      map.off("zoomend", sync);
    };
  }, [map, onZoom]);
  return null;
}
