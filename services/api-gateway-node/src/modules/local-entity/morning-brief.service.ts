import { ComplaintStatus, UserRole } from "@prisma/client";
import { prismaRead } from "../../core/database/prisma.client";
import { AI_FETCH_LLM_MS, fetchAi } from "../../shared/http/fetch-ai";
import { alertDeliveryService } from "../alert-delivery/alert-delivery.service";
import { resolveLocalEntityId } from "./local-entity.scope";
import { complaintService } from "./complaint.service";
import { wpiService } from "./wpi.service";
import { localOsintService } from "./osint.service";
import { specialtyService } from "./specialty.service";
import { outageService } from "./outage.service";

export type ActionQueueItem = {
  id: string;
  kind: "RED_ALERT" | "OVERDUE" | "WPI_DROP" | "OSINT" | "SPECIALTY" | "OUTAGE";
  priority: number;
  title: string;
  titleBn: string;
  detail: string;
  detailBn: string;
  href: string;
  meta?: Record<string, unknown>;
};

type BriefBullet = {
  en: string;
  bn: string;
  tone: "danger" | "warn" | "ok" | "info";
};

async function polishBriefWithAi(input: {
  entityName: string;
  entityNameBn: string | null;
  summary: Record<string, unknown>;
  bullets: BriefBullet[];
  actionQueue: ActionQueueItem[];
}): Promise<{
  bullets: BriefBullet[];
  narrativeEn?: string | null;
  narrativeBn?: string | null;
  llmUsed: boolean;
} | null> {
  try {
    const res = await fetchAi(
      "/api/v1/local-ai/morning-brief",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entity_name: input.entityName,
          entity_name_bn: input.entityNameBn,
          summary: input.summary,
          bullets: input.bullets,
          action_queue: input.actionQueue.map((a) => ({
            id: a.id,
            kind: a.kind,
            priority: a.priority,
            title: a.title,
            title_bn: a.titleBn,
            detail: a.detail,
            detail_bn: a.detailBn,
          })),
          lang: "bn",
        }),
      },
      { timeoutMs: AI_FETCH_LLM_MS },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      bullets?: BriefBullet[];
      narrative_en?: string | null;
      narrative_bn?: string | null;
      llm_used?: boolean;
    };
    if (!Array.isArray(data.bullets) || !data.bullets.length) return null;
    return {
      bullets: data.bullets.slice(0, 5).map((b) => ({
        en: String(b.en ?? ""),
        bn: String(b.bn ?? ""),
        tone:
          b.tone === "danger" || b.tone === "warn" || b.tone === "ok" || b.tone === "info"
            ? b.tone
            : "info",
      })),
      narrativeEn: data.narrative_en ?? null,
      narrativeBn: data.narrative_bn ?? null,
      llmUsed: Boolean(data.llm_used),
    };
  } catch {
    return null;
  }
}

export class MorningBriefService {
  async getBrief(
    user: { role: UserRole; adminUnitId: string | null },
    entityIdOpt?: string,
  ) {
    const entityId = await resolveLocalEntityId(user, entityIdOpt);
    const entity = await prismaRead.adminUnit.findUnique({
      where: { id: entityId },
      select: { id: true, code: true, name: true, nameBn: true },
    });

    const [complaints, wpi, osint, specialty, outages] = await Promise.all([
      complaintService.list(user, { entityId, limit: 40 }),
      wpiService.list(user, { entityId }),
      localOsintService.feed(user, { entityId, limit: 8 }).catch(() => null),
      specialtyService.getPack(user, { entityId }).catch(() => null),
      outageService.list(user, { entityId, status: "ACTIVE" }).catch(() => null),
    ]);

    const red = complaints.items.filter(
      (c) => c.isRedAlert && c.status !== ComplaintStatus.RESOLVED,
    );
    const overdue = complaints.items.filter((c) => c.operationalStatus === "OVERDUE");
    const unassigned = complaints.items.filter(
      (c) => !c.assignee && c.status !== ComplaintStatus.RESOLVED,
    );

    const bottom = wpi.summary.bottomWard;
    const avg = wpi.summary.averageScore;
    const weakWards = wpi.items
      .filter((w) => w.score < Math.max(55, avg - 8))
      .slice(0, 3);

    const propaganda =
      osint?.items?.filter((i) => i.propagandaFlag).slice(0, 2) ?? [];

    const alertSignals =
      specialty?.modules
        .flatMap((m) =>
          m.signals
            .filter((s) => s.status === "ALERT" || s.status === "WATCH")
            .map((s) => ({
              title: s.title,
              titleBn: s.titleBn,
              status: s.status,
              moduleId: m.module.id,
            })),
        )
        .slice(0, 3) ?? [];

    const activeOutages = outages?.items?.slice(0, 4) ?? [];

    const bullets: BriefBullet[] = [];
    if (red.length) {
      bullets.push({
        tone: "danger",
        en: `${red.length} red alert${red.length > 1 ? "s" : ""} need immediate dispatch.`,
        bn: `${red.length}টি জরুরি অ্যালার্ট এখনই ডিসপ্যাচ করতে হবে।`,
      });
    }
    if (overdue.length) {
      bullets.push({
        tone: "danger",
        en: `${overdue.length} complaint${overdue.length > 1 ? "s" : ""} breached 24h SLA.`,
        bn: `${overdue.length}টি অভিযোগের ২৪ ঘণ্টা সময়সীমা অতিক্রান্ত।`,
      });
    }
    if (activeOutages.length) {
      bullets.push({
        tone: "warn",
        en: `${activeOutages.length} active service outage${activeOutages.length > 1 ? "s" : ""} on the board.`,
        bn: `${activeOutages.length}টি সক্রিয় সেবা ব্যাঘাত বোর্ডে আছে।`,
      });
    }
    if (unassigned.length) {
      bullets.push({
        tone: "warn",
        en: `${unassigned.length} open item${unassigned.length > 1 ? "s are" : " is"} unassigned.`,
        bn: `${unassigned.length}টি খোলা অভিযোগ এখনো কাউকে দেওয়া হয়নি।`,
      });
    }
    if (bottom) {
      bullets.push({
        tone: bottom.score < 55 ? "warn" : "info",
        en: `Lowest WPI: ${bottom.name} (${bottom.score}). Focus field visit today.`,
        bn: `সর্বনিম্ন WPI: ${bottom.name} (${bottom.score}) — আজ ফিল্ড ভিজিট দিন।`,
      });
    }
    if (propaganda.length) {
      bullets.push({
        tone: "warn",
        en: `${propaganda.length} propaganda-flagged OSINT hit${propaganda.length > 1 ? "s" : ""} to review.`,
        bn: `${propaganda.length}টি প্রোপাগান্ডা‑ফ্ল্যাগড ওএসআইএনটি হিট পর্যালোচনা করুন।`,
      });
    }
    if (alertSignals.length) {
      bullets.push({
        tone: "info",
        en: `${alertSignals.length} specialty signal${alertSignals.length > 1 ? "s" : ""} on watch/alert.`,
        bn: `${alertSignals.length}টি স্পেসিয়ালটি সিগন্যাল নজরদারি/সতর্কতায়।`,
      });
    }
    if (!bullets.length) {
      bullets.push({
        tone: "ok",
        en: "No critical local pressures — maintain routine ward rounds.",
        bn: "কোনো সংকটজনক চাপ নেই — নিয়মিত ওয়ার্ড রাউন্ড চালিয়ে যান।",
      });
    }

    const actions: ActionQueueItem[] = [];
    for (const c of red.slice(0, 5)) {
      actions.push({
        id: `red-${c.id}`,
        kind: "RED_ALERT",
        priority: 100,
        title: c.title,
        titleBn: c.titleBn || c.title,
        detail: `${c.ward.name} · ${c.severity}`,
        detailBn: `${c.ward.nameBn || c.ward.name} · ${c.severity}`,
        href: `/local/complaints`,
        meta: { complaintId: c.id, wardId: c.wardId },
      });
    }
    for (const c of overdue.slice(0, 5)) {
      if (actions.some((a) => a.meta?.complaintId === c.id)) continue;
      actions.push({
        id: `od-${c.id}`,
        kind: "OVERDUE",
        priority: 90,
        title: c.title,
        titleBn: c.titleBn || c.title,
        detail: `${c.ward.name} · SLA breached`,
        detailBn: `${c.ward.nameBn || c.ward.name} · সময়সীমা অতিক্রান্ত`,
        href: `/local/complaints`,
        meta: { complaintId: c.id },
      });
    }
    for (const o of activeOutages) {
      actions.push({
        id: `out-${o.id}`,
        kind: "OUTAGE",
        priority: 85,
        title: o.title,
        titleBn: o.titleBn || o.title,
        detail: `${o.kind} · ${o.ward?.name ?? "entity-wide"}`,
        detailBn: `${o.kind} · ${o.ward?.nameBn || o.ward?.name || "সারা এলাকা"}`,
        href: `/local/outage`,
        meta: { outageId: o.id },
      });
    }
    for (const w of weakWards) {
      actions.push({
        id: `wpi-${w.wardId}`,
        kind: "WPI_DROP",
        priority: 70,
        title: `${w.ward.name} WPI ${w.score}`,
        titleBn: `${w.ward.nameBn || w.ward.name} WPI ${w.score}`,
        detail: `Open complaints ${w.openComplaints} · resolution ${w.resolutionScore}`,
        detailBn: `খোলা অভিযোগ ${w.openComplaints} · সমাধান স্কোর ${w.resolutionScore}`,
        href: `/local/wpi`,
        meta: { wardId: w.wardId, score: w.score },
      });
    }
    for (const p of propaganda) {
      actions.push({
        id: `osint-${p.title.slice(0, 24)}`,
        kind: "OSINT",
        priority: 60,
        title: p.title,
        titleBn: p.titleBn || p.title,
        detail: "Propaganda flag",
        detailBn: "প্রোপাগান্ডা ফ্ল্যাগ",
        href: `/local/osint`,
      });
    }
    for (const s of alertSignals) {
      actions.push({
        id: `spec-${s.moduleId}-${s.title.slice(0, 16)}`,
        kind: "SPECIALTY",
        priority: 50,
        title: s.title,
        titleBn: s.titleBn || s.title,
        detail: s.status,
        detailBn: s.status,
        href: `/local/specialty`,
        meta: { moduleId: s.moduleId },
      });
    }
    actions.sort((a, b) => b.priority - a.priority);

    const ruleBullets = bullets.slice(0, 5);
    const actionQueue = actions.slice(0, 12);
    const summary = {
      open: complaints.summary.open,
      overdue: complaints.summary.overdue,
      redAlerts: complaints.summary.redAlerts,
      unassigned: unassigned.length,
      wpiAverage: avg,
      bottomWard: bottom,
      activeOutages: activeOutages.length,
    };

    const ai = await polishBriefWithAi({
      entityName: entity?.name ?? "",
      entityNameBn: entity?.nameBn ?? null,
      summary,
      bullets: ruleBullets,
      actionQueue,
    });

    return {
      generatedAt: new Date().toISOString(),
      entity: entity
        ? {
            id: entity.id,
            code: entity.code,
            name: entity.name,
            nameBn: entity.nameBn,
          }
        : { id: entityId, code: "", name: "", nameBn: null },
      summary,
      bullets: ai?.bullets?.length ? ai.bullets : ruleBullets,
      actionQueue,
      llmUsed: Boolean(ai?.llmUsed),
      narrativeEn: ai?.narrativeEn ?? null,
      narrativeBn: ai?.narrativeBn ?? null,
    };
  }

  async exportCsv(
    user: { role: UserRole; adminUnitId: string | null },
    entityIdOpt?: string,
  ): Promise<string> {
    const brief = await this.getBrief(user, entityIdOpt);
    const esc = (v: string | number | null | undefined) => {
      const s = String(v ?? "");
      return `"${s.replace(/"/g, '""')}"`;
    };
    const lines = [
      ["kind", "priority", "title", "titleBn", "detail", "detailBn", "href"].join(","),
      ...brief.actionQueue.map((a) =>
        [a.kind, a.priority, a.title, a.titleBn, a.detail, a.detailBn, a.href]
          .map(esc)
          .join(","),
      ),
    ];
    return lines.join("\n");
  }

  async sendDigest(
    user: { role: UserRole; adminUnitId: string | null },
    entityIdOpt?: string,
  ) {
    const brief = await this.getBrief(user, entityIdOpt);
    let text = [
      `GeoInsight digest — ${brief.entity.name}`,
      ...brief.bullets.slice(0, 4).map((b) => `• ${b.en}`),
      ...brief.actionQueue.slice(0, 3).map((a) => `→ ${a.title}`),
    ].join("\n");
    let textBn = [
      `জিওইনসাইট ডাইজেস্ট — ${brief.entity.nameBn || brief.entity.name}`,
      ...brief.bullets.slice(0, 4).map((b) => `• ${b.bn}`),
      ...brief.actionQueue.slice(0, 3).map((a) => `→ ${a.titleBn}`),
    ].join("\n");
    let llmUsed = false;

    try {
      const res = await fetchAi(
        "/api/v1/local-ai/digest-compress",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            entity_name: brief.entity.nameBn || brief.entity.name,
            bullets: brief.bullets,
            action_titles: brief.actionQueue.slice(0, 5).map((a) => a.titleBn || a.title),
            lang: "bn",
            max_chars: 420,
          }),
        },
        { timeoutMs: AI_FETCH_LLM_MS },
      );
      if (res.ok) {
        const data = (await res.json()) as {
          text?: string;
          text_bn?: string;
          llm_used?: boolean;
        };
        if (data.text) text = data.text;
        if (data.text_bn) textBn = data.text_bn;
        llmUsed = Boolean(data.llm_used);
      }
    } catch {
      /* template digest */
    }

    const delivery = await alertDeliveryService.notifyCrisis({
      entityId: brief.entity.id,
      sourceKind: "morning_digest",
      sourceId: `digest:${brief.generatedAt}`,
      title: `Morning digest — ${brief.entity.name}`,
      detail: textBn || text,
      severity: "INFO",
      forceVoice: false,
    });

    return {
      entityId: brief.entity.id,
      text,
      textBn,
      llmUsed,
      delivery,
    };
  }

  /** Wave C1 — PMO rollup across all local DSS entities. */
  async getPmoMultiBrief(user: { role: UserRole; adminUnitId: string | null }) {
    if (user.role !== UserRole.PMO) {
      return this.getBrief(user);
    }
    const { localScorecardService } = await import("./scorecard.service");
    const scorecard = await localScorecardService.getScorecard(user, {
      compare: "entities",
    });
    const entityRows =
      scorecard.mode === "entities"
        ? scorecard.rows
        : [];

    const briefs = await Promise.all(
      entityRows.slice(0, 5).map(async (row) => {
        try {
          return await this.getBrief(user, row.id);
        } catch {
          return null;
        }
      }),
    );
    const actions = briefs
      .flatMap((b) => b?.actionQueue ?? [])
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 12);

    const ruleBullets = entityRows.slice(0, 5).map((r) => ({
      en: `${r.name}: WPI ${r.wpiAverage}, open ${r.open}, overdue ${r.overdue}, red ${r.redAlerts}`,
      bn: `${r.nameBn || r.name}: WPI ${r.wpiAverage}, খোলা ${r.open}, অতিক্রান্ত ${r.overdue}, জরুরি ${r.redAlerts}`,
      tone: (r.redAlerts > 0 || r.overdue > 0 ? "warn" : "info") as
        | "danger"
        | "warn"
        | "ok"
        | "info",
    }));

    let bullets = ruleBullets;
    let narrativeEn: string | null = null;
    let narrativeBn: string | null = null;
    let llmUsed = false;
    try {
      const res = await fetchAi(
        "/api/v1/local-ai/pmo-multi-brief",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            entities: entityRows.map((r) => ({
              code: r.code,
              name: r.name,
              name_bn: r.nameBn,
              wpi_average: r.wpiAverage,
              open: r.open,
              overdue: r.overdue,
              red_alerts: r.redAlerts,
              bottom_ward: r.bottomWard?.name ?? null,
            })),
            top_actions: actions.slice(0, 8).map((a) => ({
              id: a.id,
              kind: a.kind,
              priority: a.priority,
              title: a.title,
              title_bn: a.titleBn,
              detail: a.detail,
              detail_bn: a.detailBn,
            })),
            lang: "bn",
          }),
        },
        { timeoutMs: AI_FETCH_LLM_MS },
      );
      if (res.ok) {
        const data = (await res.json()) as {
          bullets?: Array<{ en: string; bn: string; tone: string }>;
          narrative_en?: string;
          narrative_bn?: string;
          llm_used?: boolean;
        };
        if (Array.isArray(data.bullets) && data.bullets.length) {
          bullets = data.bullets.slice(0, 5).map((b) => ({
            en: String(b.en),
            bn: String(b.bn),
            tone:
              b.tone === "danger" ||
              b.tone === "warn" ||
              b.tone === "ok" ||
              b.tone === "info"
                ? b.tone
                : "info",
          }));
        }
        narrativeEn = data.narrative_en ?? null;
        narrativeBn = data.narrative_bn ?? null;
        llmUsed = Boolean(data.llm_used);
      }
    } catch {
      /* rule bullets */
    }

    const totals = entityRows.reduce(
      (acc, r) => {
        acc.open += r.open;
        acc.overdue += r.overdue;
        acc.redAlerts += r.redAlerts;
        return acc;
      },
      { open: 0, overdue: 0, redAlerts: 0 },
    );

    return {
      generatedAt: new Date().toISOString(),
      scope: "pmo_multi" as const,
      entity: {
        id: "pmo-multi",
        code: "PMO",
        name: "All local entities",
        nameBn: "সব লোকাল এন্টিটি",
      },
      summary: {
        open: totals.open,
        overdue: totals.overdue,
        redAlerts: totals.redAlerts,
        unassigned: 0,
        wpiAverage:
          entityRows.length > 0
            ? Math.round(
                entityRows.reduce((s, r) => s + r.wpiAverage, 0) / entityRows.length,
              )
            : 0,
        bottomWard: null,
        activeOutages: 0,
        entityCount: entityRows.length,
      },
      bullets,
      actionQueue: actions,
      llmUsed,
      narrativeEn,
      narrativeBn,
    };
  }
}

export const morningBriefService = new MorningBriefService();
