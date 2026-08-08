import { apiClient } from "@/lib/api-client";
import { getUnitCoords, loadAdminHierarchy } from "@/lib/admin-hierarchy";
import { unitSearchParams } from "@/lib/unit-scope";
import type { AdminFilterState } from "@/types";
import type {
  DashboardMetrics,
  RedFlagMarker,
} from "@/types/dashboard";

interface NationalDashboardResponse {
  success: boolean;
  data: {
    summary: {
      units: number;
      projects: number;
      openAlerts: number;
      representatives: number;
      newsArticles?: number;
    };
    completionRate: number;
    completionTrend: DashboardMetrics["completionTrend"];
    budgetVariance: DashboardMetrics["budgetVariance"];
    arbitrageMatrix: DashboardMetrics["arbitrageMatrix"];
    tradeFlows: DashboardMetrics["tradeFlows"];
    unitScores: DashboardMetrics["unitScores"];
    dataSource?: string;
    timestamp: string;
  };
}

function filterQuery(filter: AdminFilterState): string {
  const params = new URLSearchParams();
  if (filter.divisionId) params.set("divisionId", filter.divisionId);
  if (filter.districtId) params.set("districtId", filter.districtId);
  if (filter.upazilaId) params.set("upazilaId", filter.upazilaId);
  if (filter.unionId) params.set("unionId", filter.unionId);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

const EMPTY_METRICS: DashboardMetrics = {
  completionRate: 0,
  completionTrend: [],
  budgetVariance: [],
  arbitrageMatrix: [],
  tradeFlows: [],
  unitScores: [],
  timestamp: new Date().toISOString(),
};

export async function fetchDashboardMetrics(
  filter: AdminFilterState,
): Promise<DashboardMetrics> {
  const json = await apiClient<NationalDashboardResponse>(
    `dashboard/national${filterQuery(filter)}`,
  );
  if (!json.success || !json.data) throw new Error("Live dashboard unavailable");
  const { data } = json;
  return {
    completionRate: data.completionRate,
    completionTrend: data.completionTrend,
    budgetVariance: data.budgetVariance,
    arbitrageMatrix: data.arbitrageMatrix,
    tradeFlows: data.tradeFlows ?? [],
    unitScores: data.unitScores,
    timestamp: data.timestamp,
  };
}

export async function fetchDashboardMetricsSafe(
  filter: AdminFilterState,
): Promise<DashboardMetrics> {
  try {
    return await fetchDashboardMetrics(filter);
  } catch {
    return { ...EMPTY_METRICS, timestamp: new Date().toISOString() };
  }
}

export async function fetchRedFlagMarkers(
  filter: AdminFilterState,
): Promise<RedFlagMarker[]> {
  try {
    const params = unitSearchParams(filter, { unresolvedOnly: "true", limit: "50" });

    const json = await apiClient<{
      success: boolean;
      data: Array<{
        id: string;
        flagType: string;
        severity: number;
        aiExplanation?: string;
        createdAt: string;
        project: { adminUnitId: string; title?: string };
      }>;
    }>(`alerts?${params}`);

    if (!json.success || !Array.isArray(json.data)) return [];

    // One hierarchy fetch (shared/cached) so getUnitCoords resolves from the
    // in-memory cache instead of firing one admin-units/:id request per alert.
    await loadAdminHierarchy();

    const markers = await Promise.all(
      json.data.map(async (a) => {
        const coords = await getUnitCoords(a.project.adminUnitId);
        return {
          id: a.id,
          unitId: a.project.adminUnitId,
          lat: coords?.[1] ?? 23.7,
          lng: coords?.[0] ?? 90.4,
          severity:
            a.severity >= 4
              ? ("CRITICAL" as const)
              : a.severity >= 3
                ? ("HIGH" as const)
                : a.severity >= 2
                  ? ("MEDIUM" as const)
                  : ("LOW" as const),
          flagType: a.flagType,
          message: a.aiExplanation ?? a.flagType,
          createdAt: a.createdAt,
        };
      }),
    );
    return markers;
  } catch {
    return [];
  }
}
