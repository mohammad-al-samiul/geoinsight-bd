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
import { localUnrestService } from "./local-unrest.service";
import { outageOpsHint, unrestOpsHint, sectorOpsHint, integrityOpsHint, commandOpsHint } from "./ops-solutions";
import {
  localEvidenceService,
  outageKindToTopic,
  unrestThemeToTopics,
  type EvidenceTopic,
} from "./evidence.service";
import { localSectorService } from "./local-sector.service";
import { localIntegrityService } from "./integrity.service";

export type ActionQueueItem = {
  id: string;
  kind: "RED_ALERT" | "OVERDUE" | "WPI_DROP" | "OSINT" | "SPECIALTY" | "OUTAGE" | "UNREST" | "EVIDENCE" | "EDUCATION" | "HEALTH" | "JOBS" | "CRIME" | "CORRUPTION" | "COMMAND";
  priority: number;
  title: string;
  titleBn: string;
  detail: string;
  detailBn: string;
  href: string;
  solutionEn?: string;
  solutionBn?: string;
  solutionWeekEn?: string;
  solutionWeekBn?: string;
  solution90En?: string;
  solution90Bn?: string;
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

    const [complaints, wpi, osint, specialty, outages, unrest, sectorAlerts, integrityAlerts] = await Promise.all([
      complaintService.list(user, { entityId, limit: 40 }),
      wpiService.list(user, { entityId }),
      localOsintService.feed(user, { entityId, limit: 8 }).catch(() => null),
      specialtyService.getPack(user, { entityId }).catch(() => null),
      outageService.list(user, { entityId, status: "ACTIVE" }).catch(() => null),
      localUnrestService.getDesk(user, { entityId }).catch(() => null),
      localSectorService.listAlerts(user, { entityId, limit: 24 }).catch(() => [] as Awaited<ReturnType<typeof localSectorService.listAlerts>>),
      localIntegrityService.listAlerts(user, { entityId, limit: 24 }).catch(() => [] as Awaited<ReturnType<typeof localIntegrityService.listAlerts>>),
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
    const unrestMoves = unrest?.movements?.filter((m) => m.status === "active").slice(0, 4) ?? [];

    const wardTags = new Map<string, Set<string>>();
    const wardNames = new Map<string, { name: string; nameBn: string | null }>();
    const tagWard = (
      wardId: string | null | undefined,
      tag: string,
      ward?: { id: string; name: string; nameBn: string | null } | null,
    ) => {
      if (!wardId) return;
      const set = wardTags.get(wardId) ?? new Set<string>();
      set.add(tag);
      wardTags.set(wardId, set);
      if (ward && !wardNames.has(wardId)) {
        wardNames.set(wardId, { name: ward.name, nameBn: ward.nameBn });
      }
    };
    for (const o of outages?.items ?? []) {
      tagWard(o.wardId ?? o.ward?.id ?? null, "OUTAGE", o.ward);
    }
    for (const s of sectorAlerts) {
      tagWard(s.ward?.id, s.actionKind, s.ward);
    }
    for (const s of integrityAlerts) {
      tagWard(s.ward?.id, s.actionKind, s.ward);
    }
    const stackedWards = [...wardTags.entries()].filter(([, tags]) => tags.size >= 3);

    const topicSet = new Set<EvidenceTopic>();
    for (const o of activeOutages) topicSet.add(outageKindToTopic(String(o.kind)));
    for (const m of unrestMoves) {
      for (const t of unrestThemeToTopics(m.themeId)) topicSet.add(t);
    }
    for (const s of sectorAlerts) {
      topicSet.add(s.evidenceTopic as EvidenceTopic);
    }
    for (const s of integrityAlerts) {
      topicSet.add(s.evidenceTopic as EvidenceTopic);
    }
    if (!topicSet.size) {
      topicSet.add("POWER");
      topicSet.add("UNREST");
      topicSet.add("DRAINAGE");
    }
    const evidence = await localEvidenceService
      .forContext(user, { entityId, topics: [...topicSet], limit: 4 })
      .catch(() => null);

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
    if (unrestMoves.length) {
      bullets.push({
        tone: unrest?.summary.trend === "rising" ? "danger" : "warn",
        en: `${unrestMoves.length} active protest cluster${unrestMoves.length > 1 ? "s" : ""} in this jurisdiction (${unrest?.summary.last24h ?? 0} signals / 24h).`,
        bn: `এই এলাকায় ${unrestMoves.length}টি চলমান আন্দোলন ক্লাস্টার (২৪ ঘণ্টায় ${unrest?.summary.last24h ?? 0}টি সিগন্যাল)।`,
      });
    }
    if (sectorAlerts.length) {
      bullets.push({
        tone: "warn",
        en: `${sectorAlerts.length} education/health/jobs site${sectorAlerts.length > 1 ? "s" : ""} on ALERT.`,
        bn: `শিক্ষা/স্বাস্থ্য/কর্মসংস্থানের ${sectorAlerts.length}টি সাইট অ্যালার্টে আছে।`,
      });
    }
    if (integrityAlerts.length) {
      bullets.push({
        tone: "danger",
        en: `${integrityAlerts.length} crime/corruption incident${integrityAlerts.length > 1 ? "s" : ""} need a same-day desk.`,
        bn: `অপরাধ/দুর্নীতির ${integrityAlerts.length}টি ঘটনা আজই ডেস্কে নিতে হবে।`,
      });
    }
    if (stackedWards.length) {
      bullets.push({
        tone: "danger",
        en: `${stackedWards.length} ward${stackedWards.length > 1 ? "s" : ""} have 3+ hot layers — open the command room.`,
        bn: `${stackedWards.length}টি ওয়ার্ডে ৩+ হট লেয়ার — কমান্ড রুম খুলুন।`,
      });
    }
    if (evidence?.items.length) {
      bullets.push({
        tone: "info",
        en: `${evidence.items.length} thesis/expert solution${evidence.items.length > 1 ? "s" : ""} matched today's crises.`,
        bn: `আজকের সংকটে মিল আছে এমন ${evidence.items.length}টি থিসিস/বিশেষজ্ঞ সমাধান।`,
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
      const hint = o.opsHint ?? outageOpsHint(o.kind);
      actions.push({
        id: `out-${o.id}`,
        kind: "OUTAGE",
        priority: 85,
        title: o.title,
        titleBn: o.titleBn || o.title,
        detail: `${o.kind} · ${o.ward?.name ?? "entity-wide"} · ${hint.en}`,
        detailBn: `${o.kind} · ${o.ward?.nameBn || o.ward?.name || "সারা এলাকা"} · ${hint.bn}`,
        href: `/local/outage`,
        solutionEn: hint.en,
        solutionBn: hint.bn,
        meta: { outageId: o.id, kind: o.kind },
      });
    }
    for (const m of unrestMoves) {
      const hint = unrestOpsHint(m.themeId);
      actions.push({
        id: `unrest-${m.id}`,
        kind: "UNREST",
        priority: 88,
        title: m.title,
        titleBn: m.titleBn || m.title,
        detail: `${m.theme} · ${m.place} · ${hint.en}`,
        detailBn: `${m.themeBn} · ${m.placeBn || m.place} · ${hint.bn}`,
        href: `/local/pulse`,
        solutionEn: hint.en,
        solutionBn: m.solutionBn || hint.bn,
        meta: { themeId: m.themeId },
      });
    }
    for (const s of sectorAlerts) {
      const hint = s.opsHint ?? sectorOpsHint(s.sector, s.kind);
      actions.push({
        id: `sec-${s.id}`,
        kind: s.actionKind,
        priority: 80,
        title: s.title,
        titleBn: s.titleBn || s.title,
        detail: `${s.kind} · ${s.ward?.name ?? "entity-wide"} · ${hint.en}`,
        detailBn: `${s.kind} · ${s.ward?.nameBn || s.ward?.name || "সারা এলাকা"} · ${hint.bn}`,
        href: s.href,
        solutionEn: hint.en,
        solutionBn: hint.bn,
        meta: { sector: s.sector, siteId: s.id },
      });
    }
    for (const s of integrityAlerts) {
      const hint = s.opsHint ?? integrityOpsHint(s.domain, s.kind);
      actions.push({
        id: `int-${s.id}`,
        kind: s.actionKind,
        priority: 83,
        title: s.title,
        titleBn: s.titleBn || s.title,
        detail: `${s.kind} · ${s.ward?.name ?? "entity-wide"} · ${hint.en}`,
        detailBn: `${s.kind} · ${s.ward?.nameBn || s.ward?.name || "সারা এলাকা"} · ${hint.bn}`,
        href: s.href,
        solutionEn: hint.en,
        solutionBn: hint.bn,
        meta: { domain: s.domain, incidentId: s.id },
      });
    }
    for (const [wardId, tags] of stackedWards.slice(0, 3)) {
      const name = wardNames.get(wardId);
      const hint = commandOpsHint([...tags]);
      const tagList = [...tags].join(" + ");
      actions.push({
        id: `cmd-${wardId}`,
        kind: "COMMAND",
        priority: 92,
        title: `${name?.name ?? "Ward"} — ${tags.size} layers hot`,
        titleBn: `${name?.nameBn || name?.name || "ওয়ার্ড"} — ${tags.size}টি লেয়ার হট`,
        detail: `${tagList} · ${hint.en}`,
        detailBn: `${tagList} · ${hint.bn}`,
        href: "/local/command",
        solutionEn: hint.en,
        solutionBn: hint.bn,
        meta: { wardId, tags: [...tags] },
      });
    }
    for (const e of evidence?.items.slice(0, 3) ?? []) {
      actions.push({
        id: `ev-${e.id}`,
        kind: "EVIDENCE",
        priority: 72,
        title: e.title,
        titleBn: e.titleBn || e.title,
        detail: `${e.kind} · ${e.year} · ${e.sourceName}`,
        detailBn: `${e.kind} · ${e.year} · ${e.sourceName}`,
        href: `/local/evidence`,
        solutionEn: e.solutions.now.en,
        solutionBn: e.solutions.now.bn,
        solutionWeekEn: e.solutions.week.en,
        solutionWeekBn: e.solutions.week.bn,
        solution90En: e.solutions.days90.en,
        solution90Bn: e.solutions.days90.bn,
        meta: { evidenceId: e.id, kind: e.kind },
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
    const evidenceActions = actions.filter((a) => a.kind === "EVIDENCE");
    const sectorActions = actions.filter(
      (a) => a.kind === "EDUCATION" || a.kind === "HEALTH" || a.kind === "JOBS",
    );
    const integrityActions = actions.filter(
      (a) => a.kind === "CRIME" || a.kind === "CORRUPTION",
    );
    const otherActions = actions.filter(
      (a) =>
        a.kind !== "EVIDENCE" &&
        a.kind !== "EDUCATION" &&
        a.kind !== "HEALTH" &&
        a.kind !== "JOBS" &&
        a.kind !== "CRIME" &&
        a.kind !== "CORRUPTION",
    );
    const actionQueue = [
      ...otherActions.slice(0, 6),
      ...integrityActions.slice(0, 2),
      ...sectorActions.slice(0, 2),
      ...evidenceActions.slice(0, 2),
    ].sort((a, b) => b.priority - a.priority);
    const summary = {
      open: complaints.summary.open,
      overdue: complaints.summary.overdue,
      redAlerts: complaints.summary.redAlerts,
      unassigned: unassigned.length,
      wpiAverage: avg,
      bottomWard: bottom,
      activeOutages: activeOutages.length,
      activeUnrest: unrestMoves.length,
      unrestTrend: unrest?.summary.trend ?? "stable",
      evidenceHits: evidence?.items.length ?? 0,
      sectorAlerts: sectorAlerts.length,
      integrityAlerts: integrityAlerts.length,
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
      evidence: evidence?.items ?? [],
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
