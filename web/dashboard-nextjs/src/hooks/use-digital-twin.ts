"use client";

import { useCallback, useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { getCachedAdminUnits } from "@/lib/admin-hierarchy";
import { ensureAdminUnits } from "@/lib/admin-units";
import type { AdminUnit } from "@/types";

export interface TwinProjection {
  unit_id: string;
  name: string;
  name_bn: string | null;
  before_completion: number;
  after_completion: number;
  delta_pct: number;
}

export interface TwinResult {
  target_division_id: string;
  budget_shift_pct: number;
  national_completion_before: number;
  national_completion_after: number;
  projections: TwinProjection[];
  narrative: string;
  narrative_bn: string;
}

export function useDigitalTwin() {
  const [divisions, setDivisions] = useState<AdminUnit[]>([]);
  const [targetId, setTargetId] = useState<string>("");
  const [shift, setShift] = useState(5);
  const [lang, setLang] = useState<"bn" | "en">("bn");
  const [result, setResult] = useState<TwinResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void ensureAdminUnits().then(() => {
      const divs = getCachedAdminUnits().filter((u) => u.type === "DIVISION");
      setDivisions(divs);
      if (!targetId && divs[0]) setTargetId(divs[0].id);
    });
  }, [targetId]);

  const simulate = useCallback(async () => {
    if (!targetId) return;
    setLoading(true);
    setError(null);
    try {
      const json = await apiClient<{ success: boolean; data: TwinResult }>("twin/simulate", {
        method: "POST",
        body: JSON.stringify({
          targetDivisionId: targetId,
          budgetShiftPct: shift,
          lang,
        }),
      });
      setResult(json.data);
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : "Simulation failed");
    } finally {
      setLoading(false);
    }
  }, [targetId, shift, lang]);

  return {
    divisions,
    targetId,
    setTargetId,
    shift,
    setShift,
    lang,
    setLang,
    result,
    loading,
    error,
    simulate,
  };
}
