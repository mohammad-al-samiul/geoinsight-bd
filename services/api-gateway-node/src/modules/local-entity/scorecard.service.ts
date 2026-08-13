import { UserRole } from "@prisma/client";
import { prismaRead } from "../../core/database/prisma.client";
import { AI_FETCH_LLM_MS, fetchAi } from "../../shared/http/fetch-ai";
import { LOCAL_ENTITY_CODES, catalogByUnitCode } from "./local-entity.catalog";
import { resolveLocalEntityId } from "./local-entity.scope";
import { wpiService } from "./wpi.service";
import { complaintService } from "./complaint.service";

export class LocalScorecardService {
  async getScorecard(
    user: { role: UserRole; adminUnitId: string | null },
    opts: { entityId?: string; compare?: "wards" | "entities" } = {},
  ) {
    const entityId = await resolveLocalEntityId(user, opts.entityId);
    const compare = opts.compare ?? "wards";

    if (compare === "entities" && user.role === "PMO") {
      const units = await prismaRead.adminUnit.findMany({
        where: { code: { in: [...LOCAL_ENTITY_CODES] } },
        select: { id: true, code: true, name: true, nameBn: true },
      });
      const rows = await Promise.all(
        units.map(async (u) => {
          const [wpi, complaints] = await Promise.all([
            wpiService.list(user, { entityId: u.id }).catch(() => null),
            complaintService.list(user, { entityId: u.id, limit: 5 }).catch(() => null),
          ]);
          const catalog = catalogByUnitCode(u.code);
          return {
            id: u.id,
            code: u.code,
            name: u.name,
            nameBn: u.nameBn,
            role: catalog?.role ?? null,
            wpiAverage: wpi?.summary.averageScore ?? 0,
            bottomWard: wpi?.summary.bottomWard ?? null,
            open: complaints?.summary.open ?? 0,
            overdue: complaints?.summary.overdue ?? 0,
            redAlerts: complaints?.summary.redAlerts ?? 0,
          };
        }),
      );
      const sorted = rows.sort((a, b) => b.wpiAverage - a.wpiAverage);
      const aiComment = await this.polishComment({
        mode: "entities",
        entityName: "All local entities",
        averageWpi: null,
        rows: sorted.map((r) => ({
          name: r.name,
          name_bn: r.nameBn,
          wpi: r.wpiAverage,
          open: r.open,
          overdue: r.overdue,
          red_alerts: r.redAlerts,
        })),
      });
      return {
        mode: "entities" as const,
        generatedAt: new Date().toISOString(),
        entityId,
        rows: sorted,
        aiComment,
      };
    }

    const entity = await prismaRead.adminUnit.findUnique({
      where: { id: entityId },
      select: { name: true, nameBn: true },
    });
    const [wpi, complaints] = await Promise.all([
      wpiService.list(user, { entityId }),
      complaintService.list(user, { entityId, limit: 40 }),
    ]);

    const openByWard = new Map<string, number>();
    const redByWard = new Map<string, number>();
    const overdueByWard = new Map<string, number>();
    for (const c of complaints.items) {
      if (c.status === "RESOLVED") continue;
      openByWard.set(c.wardId, (openByWard.get(c.wardId) ?? 0) + 1);
      if (c.isRedAlert) redByWard.set(c.wardId, (redByWard.get(c.wardId) ?? 0) + 1);
      if (c.operationalStatus === "OVERDUE") {
        overdueByWard.set(c.wardId, (overdueByWard.get(c.wardId) ?? 0) + 1);
      }
    }

    const rows = wpi.items.map((w) => ({
      id: w.wardId,
      code: w.ward.code,
      name: w.ward.name,
      nameBn: w.ward.nameBn,
      wpi: w.score,
      serviceScore: w.serviceScore,
      infraScore: w.infraScore,
      resolutionScore: w.resolutionScore,
      open: openByWard.get(w.wardId) ?? w.openComplaints,
      overdue: overdueByWard.get(w.wardId) ?? 0,
      redAlerts: redByWard.get(w.wardId) ?? 0,
      vsAverage: Number((w.score - wpi.summary.averageScore).toFixed(1)),
    }));

    const sorted = rows.sort((a, b) => b.wpi - a.wpi);
    const aiComment = await this.polishComment({
      mode: "wards",
      entityName: entity?.nameBn || entity?.name || "",
      averageWpi: wpi.summary.averageScore,
      rows: sorted.map((r) => ({
        name: r.name,
        name_bn: r.nameBn,
        wpi: r.wpi,
        open: r.open,
        overdue: r.overdue,
        red_alerts: r.redAlerts,
        vs_average: r.vsAverage,
      })),
    });

    return {
      mode: "wards" as const,
      generatedAt: new Date().toISOString(),
      entityId,
      averageWpi: wpi.summary.averageScore,
      rows: sorted,
      aiComment,
    };
  }

  private async polishComment(input: {
    mode: "wards" | "entities";
    entityName: string;
    averageWpi: number | null;
    rows: Array<{
      name: string;
      name_bn: string | null;
      wpi: number;
      open: number;
      overdue: number;
      red_alerts: number;
      vs_average?: number;
    }>;
  }) {
    const weak = [...input.rows].sort((a, b) => a.wpi - b.wpi).slice(0, 3);
    const fallback = {
      narrativeEn: `Weakest: ${weak.map((w) => `${w.name} (${w.wpi})`).join(", ") || "n/a"}.`,
      narrativeBn: `দুর্বল: ${weak.map((w) => `${w.name_bn || w.name} (${w.wpi})`).join(", ") || "ন/া"}।`,
      highlights: weak.map((w) => `${w.name}: ${w.wpi}`),
      llmUsed: false,
    };
    try {
      const res = await fetchAi(
        "/api/v1/local-ai/scorecard-comment",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: input.mode,
            entity_name: input.entityName,
            average_wpi: input.averageWpi,
            rows: input.rows.slice(0, 20),
            lang: "bn",
          }),
        },
        { timeoutMs: AI_FETCH_LLM_MS },
      );
      if (!res.ok) return fallback;
      const data = (await res.json()) as {
        narrative_en?: string;
        narrative_bn?: string;
        highlights?: string[];
        llm_used?: boolean;
      };
      if (!data.narrative_en || !data.narrative_bn) return fallback;
      return {
        narrativeEn: data.narrative_en,
        narrativeBn: data.narrative_bn,
        highlights: Array.isArray(data.highlights) ? data.highlights : fallback.highlights,
        llmUsed: Boolean(data.llm_used),
      };
    } catch {
      return fallback;
    }
  }
}

export const localScorecardService = new LocalScorecardService();
