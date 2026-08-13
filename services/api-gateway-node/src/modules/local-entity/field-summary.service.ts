import { UserRole } from "@prisma/client";
import { AI_FETCH_LLM_MS, fetchAi } from "../../shared/http/fetch-ai";
import { resolveLocalEntityId } from "./local-entity.scope";
import { complaintService } from "./complaint.service";
import { localVisitService } from "./visit.service";
import { outageService } from "./outage.service";
import { prismaRead } from "../../core/database/prisma.client";

export class LocalFieldSummaryService {
  async getSummary(
    user: { role: UserRole; adminUnitId: string | null },
    opts: { entityId?: string } = {},
  ) {
    const entityId = await resolveLocalEntityId(user, opts.entityId);
    const entity = await prismaRead.adminUnit.findUnique({
      where: { id: entityId },
      select: { name: true, nameBn: true },
    });

    const [complaints, visits, outages] = await Promise.all([
      complaintService.list(user, { entityId, limit: 40 }),
      localVisitService.suggest(user, { entityId }).catch(() => []),
      outageService.list(user, { entityId, status: "ACTIVE" }).catch(() => null),
    ]);

    const queue = complaints.items
      .filter((c) => c.status !== "RESOLVED")
      .sort((a, b) => {
        const score = (c: (typeof complaints.items)[number]) =>
          (c.isRedAlert ? 100 : 0) +
          (c.operationalStatus === "OVERDUE" ? 80 : 0) +
          (c.severity === "CRITICAL" ? 40 : c.severity === "HIGH" ? 20 : 0);
        return score(b) - score(a);
      })
      .slice(0, 12);

    const fallback = {
      entityId,
      summaryEn: `Field pack — ${entity?.name}: ${queue.length} open items.`,
      summaryBn: `ফিল্ড প্যাক — ${entity?.nameBn || entity?.name}: ${queue.length}টি খোলা আইটেম।`,
      checklist: queue.slice(0, 6).map((c) => c.title),
      llmUsed: false,
    };

    try {
      const res = await fetchAi(
        "/api/v1/local-ai/field-summary",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            entity_name: entity?.nameBn || entity?.name || "",
            queue: queue.map((c) => ({
              title: c.titleBn || c.title,
              severity: c.severity,
              status: c.operationalStatus,
              ward_name: c.ward.nameBn || c.ward.name,
              is_red_alert: c.isRedAlert,
            })),
            visits: visits.slice(0, 5).map((v) => ({
              reason: v.reason,
              title: v.title,
              title_bn: v.titleBn,
              ward_id: v.wardId,
              ward_name: v.wardName,
              priority: v.priority,
              meta: v.meta ?? {},
            })),
            outages: (outages?.items ?? []).slice(0, 4).map((o) => o.titleBn || o.title),
            lang: "bn",
            max_chars: 500,
          }),
        },
        { timeoutMs: AI_FETCH_LLM_MS },
      );
      if (!res.ok) return fallback;
      const data = (await res.json()) as {
        summary_en?: string;
        summary_bn?: string;
        checklist?: string[];
        llm_used?: boolean;
      };
      return {
        entityId,
        summaryEn: data.summary_en || fallback.summaryEn,
        summaryBn: data.summary_bn || fallback.summaryBn,
        checklist: Array.isArray(data.checklist) ? data.checklist : fallback.checklist,
        llmUsed: Boolean(data.llm_used),
      };
    } catch {
      return fallback;
    }
  }
}

export const localFieldSummaryService = new LocalFieldSummaryService();
