import { API_BASE } from "@/lib/config";
import type {
  DashboardMetrics,
  RedFlagMarker,
  UnitScore,
} from "@/types/dashboard";
import { getUnitCentroid } from "@/lib/geojson-bd";
import type { AdminFilterState } from "@/types";

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

const MOCK_BUDGET_VARIANCE = [
  { project: "Padma Bridge Link", planned: 120, actual: 118, variance: -1.7 },
  { project: "Metro Rail P6", planned: 85, actual: 92, variance: 8.2 },
  { project: "Rural Roads", planned: 45, actual: 41, variance: -8.9 },
  { project: "Health Complex", planned: 32, actual: 38, variance: 18.8 },
  { project: "Irrigation", planned: 28, actual: 27, variance: -3.6 },
  { project: "School Upgrade", planned: 22, actual: 26, variance: 18.2 },
];

const MOCK_ARBITRAGE = [
  { commodity: "Rice", market: "India", marginPct: 4.2 },
  { commodity: "Rice", market: "Nepal", marginPct: 6.8 },
  { commodity: "Rice", market: "Myanmar", marginPct: 3.1 },
  { commodity: "Wheat", market: "India", marginPct: 5.5 },
  { commodity: "Wheat", market: "Pakistan", marginPct: 7.2 },
  { commodity: "Wheat", market: "Australia", marginPct: 2.4 },
  { commodity: "Onion", market: "India", marginPct: 12.4 },
  { commodity: "Onion", market: "Turkey", marginPct: 8.1 },
  { commodity: "Onion", market: "Egypt", marginPct: 5.6 },
  { commodity: "Lentil", market: "India", marginPct: 3.8 },
  { commodity: "Lentil", market: "Canada", marginPct: 6.2 },
  { commodity: "Lentil", market: "Australia", marginPct: 4.9 },
  { commodity: "Maize", market: "India", marginPct: 4.5 },
  { commodity: "Maize", market: "Ukraine", marginPct: 9.1 },
  { commodity: "Maize", market: "Brazil", marginPct: 6.3 },
];

const MOCK_UNIT_SCORES: UnitScore[] = [
  { unitId: "div-dhaka", performanceScore: 78, riskScore: 32, openAlerts: 12 },
  { unitId: "div-chattogram", performanceScore: 71, riskScore: 41, openAlerts: 18 },
  { unitId: "div-rajshahi", performanceScore: 82, riskScore: 24, openAlerts: 7 },
  { unitId: "dist-dhaka", performanceScore: 74, riskScore: 38, openAlerts: 5 },
  { unitId: "dist-gazipur", performanceScore: 69, riskScore: 45, openAlerts: 8 },
  { unitId: "upa-savar", performanceScore: 81, riskScore: 28, openAlerts: 2 },
  { unitId: "upa-keraniganj", performanceScore: 65, riskScore: 52, openAlerts: 4 },
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
  const completionRate = Math.round(87.4 * m * 10) / 10;

  return {
    completionRate,
    completionTrend: MOCK_COMPLETION_TREND.map((p) => ({
      ...p,
      rate: Math.round(p.rate * m * 10) / 10,
    })),
    budgetVariance: MOCK_BUDGET_VARIANCE.map((p) => ({
      ...p,
      actual: Math.round(p.actual * m),
      variance: Math.round(p.variance * m * 10) / 10,
    })),
    arbitrageMatrix: MOCK_ARBITRAGE,
    unitScores: MOCK_UNIT_SCORES,
    timestamp: new Date().toISOString(),
  };
}

export async function fetchDashboardMetrics(
  filter: AdminFilterState,
): Promise<DashboardMetrics> {
  try {
    const res = await fetch(`${API_BASE}/dashboard/national`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error("API unavailable");
    const json = await res.json();
    if (!json.success) throw new Error("API error");
    return buildMockMetrics(filter);
  } catch {
    await new Promise((r) => setTimeout(r, 600));
    return buildMockMetrics(filter);
  }
}

export async function fetchRedFlagMarkers(
  filter: AdminFilterState,
): Promise<RedFlagMarker[]> {
  try {
    const params = new URLSearchParams({ unresolvedOnly: "true", limit: "20" });
    const active =
      filter.unionId ??
      filter.upazilaId ??
      filter.districtId ??
      filter.divisionId;
    if (active) params.set("unitId", active);

    const res = await fetch(`${API_BASE}/alerts?${params}`, { cache: "no-store" });
    if (!res.ok) throw new Error("API unavailable");
    const json = await res.json();
    if (!json.success || !Array.isArray(json.data)) throw new Error("No data");
    return json.data.map(
      (a: {
        id: string;
        adminUnitId: string;
        flagType: string;
        severity: RedFlagMarker["severity"];
        aiExplanation?: string;
        createdAt: string;
      }) => ({
        id: a.id,
        unitId: a.adminUnitId,
        lat: 23.7,
        lng: 90.4,
        severity: a.severity ?? "MEDIUM",
        flagType: a.flagType,
        message: a.aiExplanation ?? a.flagType,
        createdAt: a.createdAt,
      }),
    );
  } catch {
    const demoUnits = ["upa-keraniganj", "dist-gazipur", "div-chattogram"];
    return demoUnits
      .map((unitId, i) => {
        const centroid = getUnitCentroid(unitId);
        if (!centroid) return null;
        return {
          id: `demo-${unitId}`,
          unitId,
          lng: centroid[0],
          lat: centroid[1],
          severity: (["HIGH", "CRITICAL", "MEDIUM"] as const)[i],
          flagType: "BUDGET_OVERRUN",
          message: "AI-detected budget anomaly (demo)",
          createdAt: new Date().toISOString(),
        };
      })
      .filter(Boolean) as RedFlagMarker[];
  }
}
