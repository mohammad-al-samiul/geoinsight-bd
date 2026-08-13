"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { useAdminFilter } from "@/hooks/use-admin-filter";
import { useRealtimeRefresh } from "@/hooks/use-realtime-refresh";

export interface HazardExposure {
  project_id: string;
  title: string;
  hazard_type: string;
  exposure_score: number;
  nearest_zone: string;
  nearest_zone_bn: string;
  distance_km: number;
  season: string;
}

export interface HazardOverlay {
  season: string;
  lookback_days?: number;
  at_risk_count: number;
  exposures: HazardExposure[];
  narrative: string;
  narrative_bn: string;
  zones: Array<{
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
    source?: string;
  }>;
  projects_mapped: number;
}

export function useHazardOverlay(lookbackDays = 1) {
  const { filter } = useAdminFilter();
  const [overlay, setOverlay] = useState<HazardOverlay | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasDataRef = useRef(false);

  const load = useCallback(async () => {
    // Blocking loader only before the first payload; refreshes swap in place.
    if (!hasDataRef.current) setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filter.divisionId) params.set("divisionId", filter.divisionId);
      if (filter.districtId) params.set("districtId", filter.districtId);
      if (filter.upazilaId) params.set("upazilaId", filter.upazilaId);
      if (filter.unionId) params.set("unionId", filter.unionId);
      params.set("season", "monsoon");
      params.set("lookbackDays", String(lookbackDays));
      const json = await apiClient<{ success: boolean; data: HazardOverlay }>(
        `intelligence/hazards/overlay?${params.toString()}`,
      );
      setOverlay(json.data);
      hasDataRef.current = true;
    } catch (err) {
      setOverlay(null);
      hasDataRef.current = false;
      setError(err instanceof Error ? err.message : "Hazard overlay failed");
    } finally {
      setLoading(false);
    }
  }, [filter, lookbackDays]);

  useEffect(() => {
    void load();
  }, [load]);

  useRealtimeRefresh(load, true, true);

  return { overlay, loading, error, reload: load };
}
