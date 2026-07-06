import { apiClient } from "@/lib/api-client";
import { getUnitCoords } from "@/lib/admin-hierarchy";
import { unitSearchParams } from "@/lib/unit-scope";
import type { AdminFilterState } from "@/types";
import type {
  DashboardMetrics,
  RedFlagMarker,
} from "@/types/dashboard";
import { buildMockMetrics } from "@/lib/dashboard-mock";

interface NationalDashboardResponse {
  success: boolean;
  data: {
    summary: {
      units: number;
      projects: number;
      openAlerts: number;
      representatives: number;
    };
    completionRate: number;
    completionTrend: DashboardMetrics["completionTrend"];
    budgetVariance: DashboardMetrics["budgetVariance"];
    arbitrageMatrix: DashboardMetrics["arbitrageMatrix"];
    unitScores: DashboardMetrics["unitScores"];
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

export async function fetchDashboardMetrics(
  filter: AdminFilterState,
): Promise<DashboardMetrics> {
  try {
    const json = await apiClient<NationalDashboardResponse>(
      `dashboard/national${filterQuery(filter)}`,
    );
    if (!json.success || !json.data) throw new Error("API error");
    const { data } = json;
    return {
      completionRate: data.completionRate,
      completionTrend: data.completionTrend,
      budgetVariance: data.budgetVariance,
      arbitrageMatrix: data.arbitrageMatrix,
      unitScores: data.unitScores,
      timestamp: data.timestamp,
    };
  } catch {
    return buildMockMetrics(filter);
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

    if (!json.success || !Array.isArray(json.data)) throw new Error("No data");

    const markers: RedFlagMarker[] = [];
    for (const a of json.data) {
      const coords = await getUnitCoords(a.project.adminUnitId);
      markers.push({
        id: a.id,
        unitId: a.project.adminUnitId,
        lat: coords?.[1] ?? 23.7,
        lng: coords?.[0] ?? 90.4,
        severity:
          a.severity >= 4
            ? "CRITICAL"
            : a.severity >= 3
              ? "HIGH"
              : a.severity >= 2
                ? "MEDIUM"
                : "LOW",
        flagType: a.flagType,
        message: a.aiExplanation ?? a.flagType,
        createdAt: a.createdAt,
      });
    }
    return markers;
  } catch {
    return [];
  }
}
