"use client";

import { useCallback, useState } from "react";
import { apiClient } from "@/lib/api-client";

export interface MinistryImpact {
  ministry: string;
  ministry_bn: string;
  impact_score: number;
  direction: string;
  narrative: string;
  narrative_bn: string;
}

export interface ScenarioResult {
  scenario_label: string;
  scenario_label_bn: string;
  overall_risk_score: number;
  risk_band: string;
  ministry_impacts: MinistryImpact[];
  narrative: string;
  narrative_bn: string;
  computed_at: string;
}

export interface ScenarioParams {
  conflict_intensity: number;
  sanctions_level: number;
  trade_disruption: number;
  migration_pressure: number;
  oil_price_shock: number;
  region: string;
  budget_reallocation_pct: number;
  agriculture_shock: number;
  energy_shock: number;
  lang: "bn" | "en";
}

export function useImpactSimulator() {
  const [result, setResult] = useState<ScenarioResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (params: ScenarioParams) => {
    setLoading(true);
    setError(null);
    try {
      const json = await apiClient<{ success: boolean; data: ScenarioResult }>(
        "simulator/run",
        { method: "POST", body: JSON.stringify(params) },
      );
      setResult(json.data);
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : "Simulation failed");
    } finally {
      setLoading(false);
    }
  }, []);

  return { result, loading, error, run };
}
