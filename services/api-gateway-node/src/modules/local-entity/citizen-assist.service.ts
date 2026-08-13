import { UserRole } from "@prisma/client";
import { AI_FETCH_LLM_MS, fetchAi } from "../../shared/http/fetch-ai";
import { resolveLocalEntityId } from "./local-entity.scope";
import { complaintService } from "./complaint.service";
import { prismaRead } from "../../core/database/prisma.client";

export class LocalCitizenAssistService {
  async chat(
    user: { role: UserRole; adminUnitId: string | null },
    input: { entityId?: string; message: string; lang?: "bn" | "en" },
  ) {
    const entityId = await resolveLocalEntityId(user, input.entityId);
    const entity = await prismaRead.adminUnit.findUnique({
      where: { id: entityId },
      select: { name: true, nameBn: true },
    });
    const complaints = await complaintService.list(user, { entityId, limit: 20 });
    const openTitles = complaints.items
      .filter((c) => c.status !== "RESOLVED")
      .slice(0, 5)
      .map((c) => c.titleBn || c.title);

    const fallback = {
      reply: `${entity?.name}: open ${complaints.summary.open}, overdue ${complaints.summary.overdue}, red ${complaints.summary.redAlerts}.`,
      replyBn: `${entity?.nameBn || entity?.name}: খোলা ${complaints.summary.open}, অতিক্রান্ত ${complaints.summary.overdue}, জরুরি ${complaints.summary.redAlerts}।`,
      intent: "status" as const,
      draftTitle: null as string | null,
      draftCategory: null as string | null,
      draftSeverity: null as string | null,
      llmUsed: false,
      summary: complaints.summary,
    };

    try {
      const res = await fetchAi(
        "/api/v1/local-ai/citizen-assist",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: input.message,
            entity_name: entity?.name ?? "",
            entity_name_bn: entity?.nameBn,
            summary: complaints.summary,
            open_titles: openTitles,
            lang: input.lang ?? "bn",
          }),
        },
        { timeoutMs: AI_FETCH_LLM_MS },
      );
      if (!res.ok) return fallback;
      const data = (await res.json()) as {
        reply?: string;
        reply_bn?: string;
        intent?: string;
        draft_title?: string | null;
        draft_category?: string | null;
        draft_severity?: string | null;
        llm_used?: boolean;
      };
      return {
        reply: data.reply || fallback.reply,
        replyBn: data.reply_bn || fallback.replyBn,
        intent: data.intent || "general",
        draftTitle: data.draft_title ?? null,
        draftCategory: data.draft_category ?? null,
        draftSeverity: data.draft_severity ?? null,
        llmUsed: Boolean(data.llm_used),
        summary: complaints.summary,
      };
    } catch {
      return fallback;
    }
  }
}

export const localCitizenAssistService = new LocalCitizenAssistService();
