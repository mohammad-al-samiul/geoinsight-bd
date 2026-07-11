"use client";

import { useEffect, useMemo, useState } from "react";
import { Circle, CircleMarker, MapContainer, TileLayer, Tooltip, useMap } from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import { BD_MAP_CENTER, BD_MAP_ZOOM, getMapBoundsForFilter } from "@/lib/geojson-bd";
import type { AdminFilterState } from "@/types";
import type { WeatherObservation, DisasterAlert } from "@/hooks/use-weather-live";
import { MapSkeleton } from "@/components/ui/skeleton";

interface HazardZone {
  zone_id: string;
  name: string;
  name_bn: string;
  hazard_type: string;
  risk_level: number;
  lat?: number;
  lng?: number;
  radius_km?: number;
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

export function HazardWeatherMapInner({
  filter,
  zones,
  observations,
  alerts,
}: HazardWeatherMapInnerProps) {
  const [mounted, setMounted] = useState(false);

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

      {zoneMarkers.map((z) => (
        <Circle
          key={z.zone_id}
          center={[z.lat!, z.lng!]}
          radius={kmToMeters(z.radius_km!)}
          pathOptions={{
            color: RISK_COLORS[z.risk_level] ?? "#eab308",
            fillColor: RISK_COLORS[z.risk_level] ?? "#eab308",
            fillOpacity: 0.18,
            weight: 2,
            opacity: 0.75,
            className:
              z.hazard_type === "cyclone"
                ? "hazard-zone-cyclone"
                : z.hazard_type === "flood"
                  ? "hazard-zone-flood"
                  : "hazard-zone-heat",
          }}
        >
          <Tooltip sticky className="geo-tooltip">
            <strong>{z.name_bn || z.name}</strong>
            <br />
            {z.hazard_type === "flood" && "বন্যা / Flood"}
            {z.hazard_type === "cyclone" && "ঘূর্ণিঝড় / Cyclone"}
            {z.hazard_type === "heat" && "তাপপ্রবাহ / Heat"}
            <br />
            Risk L{z.risk_level} · ~{z.radius_km} km
          </Tooltip>
        </Circle>
      ))}

      {observations.map((o) => {
        const maxRisk = Math.max(o.flood_risk, o.cyclone_risk, o.heat_stress);
        return (
          <CircleMarker
            key={o.division}
            center={[o.lat, o.lng]}
            radius={8 + maxRisk}
            pathOptions={{
              color: "#fff",
              weight: 1.5,
              fillColor: RISK_COLORS[maxRisk] ?? "#3b82f6",
              fillOpacity: 0.92,
            }}
          >
            <Tooltip sticky className="geo-tooltip">
              <strong>{o.name_bn}</strong> ({o.division})
              <br />
              {o.weather_label_bn} · {o.temp_c}°C
              <br />
              ২৪ঘ বৃষ্টি {o.rain_24h_mm ?? o.precipitation_mm} mm · বাতাস {o.wind_speed_kmh} km/h
              <br />
              বন্যা L{o.flood_risk} · ঘূর্ণিঝড় L{o.cyclone_risk} · তাপ L{o.heat_stress}
              {o.population_at_risk > 0 && (
                <>
                  <br />
                  ঝুঁকিতে ~{(o.population_at_risk / 1_000_000).toFixed(1)}M
                </>
              )}
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
