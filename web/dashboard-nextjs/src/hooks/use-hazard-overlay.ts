"use client";

import { useCallback, useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { useAdminFilter } from "@/hooks/use-admin-filter";

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
  }>;
  projects_mapped: number;
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

export function useHazardOverlay() {
  const { filter } = useAdminFilter();
  const [overlay, setOverlay] = useState<HazardOverlay | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = scopeQuery(filter);
      const sep = qs ? `${qs}&` : "?";
      const json = await apiClient<{ success: boolean; data: HazardOverlay }>(
        `intelligence/hazards/overlay${sep}season=monsoon`,
      );
      setOverlay(json.data);
    } catch (err) {
      setOverlay(null);
      setError(err instanceof Error ? err.message : "Hazard overlay failed");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  return { overlay, loading, error, reload: load };
}
