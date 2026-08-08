"use client";

import dynamic from "next/dynamic";
import { CloudRain, Radio, Thermometer, Wind } from "lucide-react";
import { MapSkeleton } from "@/components/ui/skeleton";
import type { WeatherObservation, DisasterAlert } from "@/hooks/use-weather-live";
import type { AdminFilterState } from "@/types";
import { cn } from "@/lib/utils";

const HazardWeatherMapInner = dynamic(
  () =>
    import("@/components/hazards/hazard-weather-map-inner").then(
      (m) => m.HazardWeatherMapInner,
    ),
  { ssr: false, loading: () => <MapSkeleton /> },
);

interface HazardZone {
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
  scale?: string;
}

interface HazardWeatherMapProps {
  filter: AdminFilterState;
  zones: HazardZone[];
  observations: WeatherObservation[];
  alerts: DisasterAlert[];
  className?: string;
}

export function HazardWeatherMap({
  filter,
  zones,
  observations,
  alerts,
  className,
}: HazardWeatherMapProps) {
  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Radio className="h-3.5 w-3.5 text-emerald-400" />
          Live Open-Meteo + GDACS
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-blue-400/80" />
          Flood zone
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-red-500 ring-1 ring-white/80" />
          Locality hotspot (upazila / area)
        </span>
        <span className="inline-flex items-center gap-1">
          <Wind className="h-3 w-3 text-sky-400" />
          Cyclone
        </span>
        <span className="inline-flex items-center gap-1">
          <Thermometer className="h-3 w-3 text-orange-400" />
          Heat stress
        </span>
      </div>
      <div className="glass-panel h-[240px] overflow-hidden rounded-xl shadow-panel sm:h-[340px] lg:h-[460px]">
        <HazardWeatherMapInner
          filter={filter}
          zones={zones}
          observations={observations}
          alerts={alerts}
        />
      </div>
    </div>
  );
}

export function WeatherDivisionCards({
  observations,
  className,
}: {
  observations: WeatherObservation[];
  className?: string;
}) {
  if (!observations.length) return null;

  return (
    <div
      className={cn(
        "grid gap-2 sm:grid-cols-2 xl:grid-cols-4",
        className,
      )}
    >
      {observations.map((o) => {
        const maxRisk = Math.max(o.flood_risk, o.cyclone_risk, o.heat_stress);
        return (
          <div
            key={o.division}
            className={cn(
              "rounded-lg border px-3 py-2.5 text-sm",
              maxRisk >= 4
                ? "border-red-500/40 bg-red-500/5"
                : maxRisk >= 3
                  ? "border-amber-500/40 bg-amber-500/5"
                  : "border-border/50 bg-background/40",
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium">{o.name_bn}</p>
                <p className="text-xs text-muted-foreground">{o.weather_label_bn}</p>
              </div>
              <span className="text-lg font-semibold tabular-nums">{o.temp_c}°</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-0.5">
                <CloudRain className="h-3 w-3" />
                {o.rain_24h_mm ?? o.precipitation_mm}mm/24h · L{o.flood_risk}
              </span>
              <span className="inline-flex items-center gap-0.5">
                <Wind className="h-3 w-3" />
                {o.wind_speed_kmh}km/h · L{o.cyclone_risk}
              </span>
              <span className="inline-flex items-center gap-0.5">
                <Thermometer className="h-3 w-3" />
                L{o.heat_stress}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
