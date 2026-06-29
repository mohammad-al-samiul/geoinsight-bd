import type { AdminFilterState } from "@/types";
import type { DashboardMetrics } from "@/types/dashboard";

const MOCK_COMPLETION_TREND = [
  { month: "Jan", rate: 72 },
  { month: "Feb", rate: 74 },
  { month: "Mar", rate: 76 },
  { month: "Apr", rate: 75 },
  { month: "May", rate: 78 },
  { month: "Jun", rate: 81 },
  { month: "Jul", rate: 83 },
  { month: "Aug", rate: 84 },
  { month: "Sep", rate: 86 },
  { month: "Oct", rate: 87 },
  { month: "Nov", rate: 88 },
  { month: "Dec", rate: 89 },
];

function scopeMultiplier(filter: AdminFilterState): number {
  if (filter.unionId) return 0.92;
  if (filter.upazilaId) return 0.95;
  if (filter.districtId) return 0.97;
  if (filter.divisionId) return 0.99;
  return 1;
}

export function buildMockMetrics(filter: AdminFilterState): DashboardMetrics {
  const m = scopeMultiplier(filter);
  return {
    completionRate: Math.round(87.4 * m * 10) / 10,
    completionTrend: MOCK_COMPLETION_TREND.map((p) => ({
      ...p,
      rate: Math.round(p.rate * m * 10) / 10,
    })),
    budgetVariance: [],
    arbitrageMatrix: [],
    unitScores: [],
    timestamp: new Date().toISOString(),
  };
}
