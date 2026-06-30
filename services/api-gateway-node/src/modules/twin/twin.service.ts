import { createHash } from "crypto";
import { env } from "../../core/config/env";
import { prismaRead } from "../../core/database/prisma.client";
import { dashboardService } from "../dashboard/dashboard.service";

export interface TwinSimulateParams {
  targetDivisionId: string;
  budgetShiftPct: number;
  lang?: "bn" | "en";
}

export class TwinService {
  async simulate(params: TwinSimulateParams) {
    const metrics = await dashboardService.getNationalMetrics();
    const divisions = await prismaRead.adminUnit.findMany({
      where: { type: "DIVISION" },
      select: { id: true, name: true, nameBn: true },
    });

    const divisionInputs = await Promise.all(
      divisions.map(async (div) => {
        const score = metrics.unitScores.find((u) => u.unitId === div.id);
        const projects = await prismaRead.project.findMany({
          where: { adminUnit: { divisionId: div.id } },
          select: { budgetAllocated: true, budgetSpent: true, status: true },
        });
        const budget = projects.reduce((s, p) => s + Number(p.budgetAllocated), 0);
        const completion =
          projects.length === 0
            ? 70
            : projects.reduce((s, p) => {
                const ratio = Number(p.budgetSpent) / Math.max(Number(p.budgetAllocated), 1);
                const bonus = p.status === "COMPLETED" ? 20 : p.status === "STALLED" ? -15 : 0;
                return s + Math.min(100, ratio * 80 + bonus);
              }, 0) / projects.length;

        return {
          unit_id: div.id,
          name: div.name,
          name_bn: div.nameBn,
          performance_score: score?.performanceScore ?? 70,
          project_count: projects.length,
          budget_allocated: budget || 1,
          completion_rate: Math.round(completion * 10) / 10,
        };
      }),
    );

    const res = await fetch(`${env.AI_SERVICE_URL}/api/v1/twin/simulate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        divisions: divisionInputs,
        target_division_id: params.targetDivisionId,
        budget_shift_pct: params.budgetShiftPct,
        lang: params.lang ?? "bn",
      }),
    });
    if (!res.ok) throw new Error("Digital twin simulation unavailable");
    return res.json();
  }
}

export function hashAiExplanation(explanation: string, projectId: string): string {
  return createHash("sha256")
    .update(JSON.stringify({ explanation, projectId, ts: new Date().toISOString().slice(0, 10) }))
    .digest("hex");
}

export const twinService = new TwinService();
