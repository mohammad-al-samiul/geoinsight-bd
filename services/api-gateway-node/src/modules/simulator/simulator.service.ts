import { env } from "../../core/config/env";

export interface ScenarioParams {
  conflict_intensity: number;
  sanctions_level: number;
  trade_disruption: number;
  migration_pressure: number;
  oil_price_shock: number;
  region: string;
  budget_reallocation_pct?: number;
  agriculture_shock?: number;
  energy_shock?: number;
  lang?: "bn" | "en";
}

export class SimulatorService {
  async runScenario(params: ScenarioParams) {
    const res = await fetch(`${env.AI_SERVICE_URL}/api/v1/simulator/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        conflict_intensity: params.conflict_intensity,
        sanctions_level: params.sanctions_level,
        trade_disruption: params.trade_disruption,
        migration_pressure: params.migration_pressure,
        oil_price_shock: params.oil_price_shock,
        region: params.region,
        budget_reallocation_pct: params.budget_reallocation_pct ?? 0,
        agriculture_shock: params.agriculture_shock ?? 0,
        energy_shock: params.energy_shock ?? 0,
        lang: params.lang ?? "bn",
      }),
    });
    if (!res.ok) throw new Error("Scenario simulation unavailable");
    return res.json();
  }
}

export const simulatorService = new SimulatorService();
