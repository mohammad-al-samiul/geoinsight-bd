import type { AdminUnitType } from "@/types";

export interface UnitScore {
  unitId: string;
  performanceScore: number;
  riskScore: number;
  openAlerts: number;
}

export interface CompletionTrendPoint {
  month: string;
  rate: number;
}

export interface BudgetVariancePoint {
  project: string;
  planned: number;
  actual: number;
  variance: number;
}

export interface ArbitrageCell {
  commodity: string;
  market: string;
  marginPct: number;
}

export interface DashboardMetrics {
  completionRate: number;
  completionTrend: CompletionTrendPoint[];
  budgetVariance: BudgetVariancePoint[];
  arbitrageMatrix: ArbitrageCell[];
  unitScores: UnitScore[];
  timestamp: string;
}

export interface RedFlagMarker {
  id: string;
  unitId: string;
  lat: number;
  lng: number;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  flagType: string;
  message: string;
  createdAt: string;
}

export interface SocketKpiPayload {
  kpiDefId?: string;
  metric?: "completion_rate" | "budget_variance" | "compliance";
  value?: number;
  unitId?: string;
  trend?: CompletionTrendPoint[];
  variance?: BudgetVariancePoint[];
}

export interface SocketAlertPayload {
  alertId?: string;
  unitId?: string;
  flagType?: string;
  severity?: RedFlagMarker["severity"];
  aiExplanation?: string;
  lat?: number;
  lng?: number;
}

export interface GeoFeatureProperties {
  id: string;
  name: string;
  nameBn?: string;
  type: AdminUnitType;
  parentId: string | null;
  performanceScore: number;
  riskScore: number;
}
