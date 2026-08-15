"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { useAdminFilter } from "@/hooks/use-admin-filter";
import { useRealtimeRefresh } from "@/hooks/use-realtime-refresh";

export interface WeatherObservation {
  division: string;
  district: string | null;
  name_bn: string;
  lat: number;
  lng: number;
  temp_c: number;
  humidity_pct: number;
  precipitation_mm: number;
  rain_24h_mm: number;
  wind_speed_kmh: number;
  weather_code: number;
  weather_label: string;
  weather_label_bn: string;
  flood_risk: number;
  cyclone_risk: number;
  heat_stress: number;
  population_at_risk: number;
  recorded_at: string;
}

export interface DisasterAlert {
  id: string;
  alert_type: string;
  severity: number;
  title: string;
  title_bn: string | null;
  description: string | null;
  division: string | null;
  lat: number | null;
  lng: number | null;
  population_at_risk: number | null;
  valid_from: string;
  valid_to: string | null;
  source: string;
}

export interface FloodImpactWindow {
  deaths: number;
  injuries: number;
  civilian_deaths?: number;
  homes_damaged: number;
  livestock_lost: number;
  damage_mentions: number;
  death_mentions?: number;
  injury_mentions?: number;
  article_count?: number;
  raw_sum_deaths?: number;
  excluded_historical_articles?: number;
  excluded_historical_peak?: number;
    by_district?: Array<{
      district: string;
      deaths: number;
      injuries: number;
      death_mentions?: number;
    }>;
    by_event?: Array<{
      id: string;
      label: string;
      title: string;
      district: string;
      day: string;
      deaths: number;
      injuries: number;
      url?: string | null;
    }>;
    evidence: string[];
  tally_kind?: "NEWS_DERIVED";
  disclaimer_bn: string;
  disclaimer_en: string;
  window_days?: number;
  method?: string;
}

export interface WeatherImpact {
  total_population_at_risk: number;
  high_flood_divisions: string[];
  high_cyclone_divisions: string[];
  high_heat_divisions: string[];
  active_alert_count: number;
  max_severity: number;
  refreshed_at: string;
  sources: string[];
  flood_impact?: FloodImpactWindow & {
    default_window?: number;
    windows?: Record<string, FloodImpactWindow>;
  };
}

export interface WeatherLiveData {
  observations: WeatherObservation[];
  alerts: DisasterAlert[];
  impact: WeatherImpact;
  scope?: {
    divisionName?: string;
    districtName?: string;
  };
}

function scopeQuery(filter: ReturnType<typeof useAdminFilter>["filter"]): string {
  const params = new URLSearchParams();
  if (filter.divisionId) params.set("divisionId", filter.divisionId);
  if (filter.districtId) params.set("districtId", filter.districtId);
  if (filter.upazilaId) params.set("upazilaId", filter.upazilaId);
  if (filter.unionId) params.set("unionId", filter.unionId);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function useWeatherLive() {
  const { filter } = useAdminFilter();
  const [data, setData] = useState<WeatherLiveData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasDataRef = useRef(false);

  const load = useCallback(async () => {
    // Blocking loader only before the first payload; refreshes swap in place.
    if (!hasDataRef.current) setLoading(true);
    setError(null);
    try {
      const qs = scopeQuery(filter);
      const json = await apiClient<{ success: boolean; data: WeatherLiveData }>(
        `weather/live${qs}`,
      );
      setData(json.data);
      hasDataRef.current = true;
    } catch (err) {
      setData(null);
      hasDataRef.current = false;
      setError(err instanceof Error ? err.message : "Weather data unavailable");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  useRealtimeRefresh(load, true, true);

  return { data, loading, error, reload: load };
}
