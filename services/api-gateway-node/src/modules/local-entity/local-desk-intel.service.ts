import {
  ComplaintStatus,
  IngestionSentiment,
  LocalIntegrityDomain,
  LocalSector,
  LocalSiteStatus,
  ProjectStatus,
  ServiceOutageStatus,
  SpecialtySignalStatus,
  UserRole,
} from "@prisma/client";
import { prismaRead } from "../../core/database/prisma.client";
import { resolveLocalEntityId } from "./local-entity.scope";
import { integrityOpsHint, outageOpsHint, sectorOpsHint } from "./ops-solutions";
import {
  classifyTopics,
  matchEntity,
  primaryTopic,
  topicMatches,
  type DeskTopic,
  type TopicHit,
} from "./local-desk-topics";

export type LiveIntelOrigin = "news" | "ops" | "related";

export type LiveIntelItem = {
  id: string;
  title: string;
  summary: string | null;
  sourceName: string;
  url: string | null;
  publishedAt: string;
  topic: Exclude<DeskTopic, "ALL">;
  topics: Array<Exclude<DeskTopic, "ALL">>;
  local: boolean;
  related: boolean;
  origin: LiveIntelOrigin;
  sentiment: "POSITIVE" | "NEUTRAL" | "NEGATIVE";
  keyword: string | null;
  matchScore: number;
  actionEn: string | null;
  actionBn: string | null;
};

export type LiveIntelFeed = {
  entityId: string;
  entityCode: string;
  entityName: string;
  topic: DeskTopic;
  generatedAt: string;
  sourceNote: string;
  summary: {
    total: number;
    last24h: number;
    last7d: number;
    localHits: number;
    related: number;
    ops: number;
    news: number;
    negative: number;
    byTopic: Record<string, number>;
    bySource: Record<string, number>;
    keywords: Array<{ name: string; value: number }>;
    sentiment: { positive: number; neutral: number; negative: number };
    daily: Array<{ name: string; value: number }>;
    actions: Array<{ en: string; bn: string }>;
  };
  items: LiveIntelItem[];
};

function mapSentiment(cat: IngestionSentiment | null | undefined): LiveIntelItem["sentiment"] {
  if (cat === IngestionSentiment.Grievance) return "NEGATIVE";
  if (cat === IngestionSentiment.Demand) return "NEUTRAL";
  return "NEUTRAL";
}

function dayKey(iso: string): string {
  return iso.slice(5, 10);
}

function clip(s: string | null | undefined, n: number): string | null {
  if (!s) return null;
  const t = s.replace(/\s+/g, " ").trim();
  if (!t) return null;
  return t.length <= n ? t : `${t.slice(0, n - 1)}…`;
}

export class LocalDeskIntelService {
  async getFeed(
    user: { role: UserRole; adminUnitId: string | null },
    opts: { entityId?: string; topic?: DeskTopic; limit?: number } = {},
  ): Promise<LiveIntelFeed> {
    const entityId = await resolveLocalEntityId(user, opts.entityId);
    const entity = await prismaRead.adminUnit.findUnique({
      where: { id: entityId },
      select: { id: true, code: true, name: true, nameBn: true },
    });
    const topic = opts.topic ?? "ALL";
    const limit = Math.min(opts.limit ?? 40, 80);
    const empty = (code: string, name: string): LiveIntelFeed => ({
      entityId,
      entityCode: code,
      entityName: name,
      topic,
      generatedAt: new Date().toISOString(),
      sourceNote: "Live news, signals, and desk records filtered to this MP/Mayor seat.",
      summary: {
        total: 0,
        last24h: 0,
        last7d: 0,
        localHits: 0,
        related: 0,
        ops: 0,
        news: 0,
        negative: 0,
        byTopic: {},
        bySource: {},
        keywords: [],
        sentiment: { positive: 0, neutral: 0, negative: 0 },
        daily: [],
        actions: [],
      },
      items: [],
    });

    if (!entity) return empty("unknown", "Unknown");

    const since = new Date(Date.now() - 21 * 24 * 60 * 60 * 1000);
    const [articles, signals, ops] = await Promise.all([
      prismaRead.externalArticle.findMany({
        where: { fetchedAt: { gte: since } },
        orderBy: { fetchedAt: "desc" },
        take: 480,
        select: {
          id: true,
          title: true,
          summary: true,
          url: true,
          sourceName: true,
          district: true,
          division: true,
          sentimentCategory: true,
          publishedAt: true,
          fetchedAt: true,
        },
      }),
      prismaRead.liveSignal.findMany({
        where: { createdAt: { gte: since }, resolvedAt: null },
        orderBy: { createdAt: "desc" },
        take: 240,
        select: {
          id: true,
          title: true,
          body: true,
          url: true,
          sourceName: true,
          district: true,
          division: true,
          sentimentCategory: true,
          publishedAt: true,
          createdAt: true,
        },
      }),
      this.opsItems(entityId, topic),
    ]);

    const primary: LiveIntelItem[] = [];
    const related: LiveIntelItem[] = [];
    const seen = new Set<string>();

    const consider = (
      id: string,
      title: string,
      summary: string | null,
      sourceName: string,
      url: string | null,
      district: string | null,
      division: string | null,
      sentiment: IngestionSentiment | null,
      publishedAt: Date,
    ) => {
      const key = url || id;
      if (seen.has(key)) return;
      const blob = `${title} ${summary ?? ""}`;
      const match = matchEntity(entity.code, district, division, blob);
      if (!match.hit) return;
      const hits: TopicHit[] = classifyTopics(blob);
      const onTopic = topicMatches(topic, hits) || topic === "ALL" || topic === "OSINT";
      seen.add(key);
      const topics = hits.map((h) => h.topic);
      if (!topics.includes("OSINT")) topics.push("OSINT");
      const row: LiveIntelItem = {
        id,
        title,
        summary: clip(summary, 360),
        sourceName,
        url,
        publishedAt: publishedAt.toISOString(),
        topic: primaryTopic(hits),
        topics,
        local: match.local,
        related: !onTopic,
        origin: onTopic ? "news" : "related",
        sentiment: mapSentiment(sentiment),
        keyword: hits[0]?.keyword ?? match.keyword,
        matchScore: match.score + (hits[0]?.score ?? 0),
        actionEn: null,
        actionBn: null,
      };
      if (onTopic) primary.push(row);
      else related.push(row);
    };

    for (const a of articles) {
      consider(
        `art:${a.id}`,
        a.title,
        a.summary,
        a.sourceName,
        a.url,
        a.district,
        a.division,
        a.sentimentCategory,
        a.publishedAt ?? a.fetchedAt,
      );
    }
    for (const s of signals) {
      consider(
        `sig:${s.id}`,
        s.title,
        s.body,
        s.sourceName,
        s.url,
        s.district,
        s.division,
        s.sentimentCategory,
        s.publishedAt ?? s.createdAt,
      );
    }

    const sortItems = (rows: LiveIntelItem[]) =>
      rows.sort((a, b) => {
        if (b.local !== a.local) return Number(b.local) - Number(a.local);
        if (Math.abs(b.matchScore - a.matchScore) > 4) return b.matchScore - a.matchScore;
        return Date.parse(b.publishedAt) - Date.parse(a.publishedAt);
      });

    sortItems(primary);
    sortItems(related);

    const relatedNeed = Math.max(0, Math.min(12, 18 - primary.length));
    const merged = [...ops, ...primary, ...related.slice(0, relatedNeed)];
    merged.sort((a, b) => {
      if (a.origin === "ops" && b.origin !== "ops") return -1;
      if (b.origin === "ops" && a.origin !== "ops") return 1;
      return Date.parse(b.publishedAt) - Date.parse(a.publishedAt);
    });
    const items = merged.slice(0, limit);

    const now = Date.now();
    const byTopic: Record<string, number> = {};
    const bySource: Record<string, number> = {};
    const kwMap = new Map<string, number>();
    const dailyMap = new Map<string, number>();
    let last24h = 0;
    let last7d = 0;
    let localHits = 0;
    let relatedCount = 0;
    let opsCount = 0;
    let newsCount = 0;
    let negative = 0;
    const sentiment = { positive: 0, neutral: 0, negative: 0 };
    const actions: Array<{ en: string; bn: string }> = [];
    const actionSeen = new Set<string>();

    for (const row of items) {
      byTopic[row.topic] = (byTopic[row.topic] ?? 0) + 1;
      bySource[row.sourceName] = (bySource[row.sourceName] ?? 0) + 1;
      const day = dayKey(row.publishedAt);
      dailyMap.set(day, (dailyMap.get(day) ?? 0) + 1);
      const age = now - Date.parse(row.publishedAt);
      if (age <= 24 * 60 * 60 * 1000) last24h += 1;
      if (age <= 7 * 24 * 60 * 60 * 1000) last7d += 1;
      if (row.local) localHits += 1;
      if (row.related) relatedCount += 1;
      if (row.origin === "ops") opsCount += 1;
      else newsCount += 1;
      if (row.keyword) kwMap.set(row.keyword, (kwMap.get(row.keyword) ?? 0) + 1);
      if (row.sentiment === "NEGATIVE") {
        negative += 1;
        sentiment.negative += 1;
      } else if (row.sentiment === "POSITIVE") sentiment.positive += 1;
      else sentiment.neutral += 1;
      if (row.actionEn && row.actionBn && !actionSeen.has(row.actionEn) && actions.length < 5) {
        actionSeen.add(row.actionEn);
        actions.push({ en: row.actionEn, bn: row.actionBn });
      }
    }

    const daily = [...dailyMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-10)
      .map(([name, value]) => ({ name, value }));
    const keywords = [...kwMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, value]) => ({ name, value }));

    return {
      entityId,
      entityCode: entity.code,
      entityName: entity.name,
      topic,
      generatedAt: new Date().toISOString(),
      sourceNote: "Live news + desk records filtered to this MP/Mayor seat and sidebar desk.",
      summary: {
        total: items.length,
        last24h,
        last7d,
        localHits,
        related: relatedCount,
        ops: opsCount,
        news: newsCount,
        negative,
        byTopic,
        bySource,
        keywords,
        sentiment,
        daily,
        actions,
      },
      items,
    };
  }

  private async opsItems(entityId: string, topic: DeskTopic): Promise<LiveIntelItem[]> {
    const want = (t: DeskTopic) => topic === "ALL" || topic === t || (topic === "CIVIC" && t === "OUTAGE");
    const cap = (n: number) => (topic === "ALL" ? Math.min(6, n) : n);
    const out: LiveIntelItem[] = [];

    const push = (row: LiveIntelItem) => {
      out.push(row);
    };

    if (want("EDUCATION") || want("HEALTH") || want("EMPLOYMENT") || topic === "ALL") {
      const sectors: LocalSector[] = [];
      if (topic === "ALL") sectors.push(LocalSector.EDUCATION, LocalSector.HEALTH, LocalSector.EMPLOYMENT);
      else if (topic === "EDUCATION") sectors.push(LocalSector.EDUCATION);
      else if (topic === "HEALTH") sectors.push(LocalSector.HEALTH);
      else if (topic === "EMPLOYMENT") sectors.push(LocalSector.EMPLOYMENT);
      if (sectors.length) {
        const rows = await prismaRead.localSectorSite.findMany({
          where: { entityId, sector: { in: sectors } },
          orderBy: [{ severity: "desc" }, { observedAt: "desc" }],
          take: cap(18),
        });
        for (const r of rows) {
          const hint = sectorOpsHint(r.sector, r.kind);
          const desk: Exclude<DeskTopic, "ALL"> =
            r.sector === LocalSector.HEALTH
              ? "HEALTH"
              : r.sector === LocalSector.EMPLOYMENT
                ? "EMPLOYMENT"
                : "EDUCATION";
          push({
            id: `ops:sector:${r.id}`,
            title: r.title,
            summary: clip(r.detail, 360),
            sourceName: r.source,
            url: null,
            publishedAt: r.observedAt.toISOString(),
            topic: desk,
            topics: [desk],
            local: true,
            related: false,
            origin: "ops",
            sentiment: r.status === LocalSiteStatus.ALERT ? "NEGATIVE" : "NEUTRAL",
            keyword: r.kind,
            matchScore: 50 + r.severity,
            actionEn: hint.en,
            actionBn: hint.bn,
          });
        }
      }
    }

    if (want("CRIME") || want("CORRUPTION") || topic === "ALL") {
      const domains: LocalIntegrityDomain[] = [];
      if (topic === "ALL") domains.push(LocalIntegrityDomain.CRIME, LocalIntegrityDomain.CORRUPTION);
      else if (topic === "CRIME") domains.push(LocalIntegrityDomain.CRIME);
      else if (topic === "CORRUPTION") domains.push(LocalIntegrityDomain.CORRUPTION);
      if (domains.length) {
        const rows = await prismaRead.localIntegrityIncident.findMany({
          where: { entityId, domain: { in: domains } },
          orderBy: [{ severity: "desc" }, { occurredAt: "desc" }],
          take: cap(18),
        });
        for (const r of rows) {
          const hint = integrityOpsHint(r.domain, r.kind);
          const desk: Exclude<DeskTopic, "ALL"> = r.domain === LocalIntegrityDomain.CRIME ? "CRIME" : "CORRUPTION";
          push({
            id: `ops:integrity:${r.id}`,
            title: r.title,
            summary: clip(r.detail, 360),
            sourceName: r.source,
            url: null,
            publishedAt: r.occurredAt.toISOString(),
            topic: desk,
            topics: [desk],
            local: true,
            related: false,
            origin: "ops",
            sentiment: "NEGATIVE",
            keyword: r.kind,
            matchScore: 48 + r.severity,
            actionEn: hint.en,
            actionBn: hint.bn,
          });
        }
      }
    }

    if (want("OUTAGE") || want("CIVIC") || topic === "ALL") {
      const rows = await prismaRead.localServiceOutage.findMany({
        where: {
          entityId,
          status: { in: [ServiceOutageStatus.ACTIVE, ServiceOutageStatus.WATCH] },
        },
        orderBy: [{ severity: "desc" }, { startedAt: "desc" }],
        take: cap(14),
      });
      for (const r of rows) {
        const hint = outageOpsHint(r.kind);
        push({
          id: `ops:outage:${r.id}`,
          title: r.title,
          summary: clip(r.detail, 360),
          sourceName: r.source,
          url: null,
          publishedAt: r.startedAt.toISOString(),
          topic: "OUTAGE",
          topics: ["OUTAGE", "CIVIC"],
          local: true,
          related: false,
          origin: "ops",
          sentiment: "NEGATIVE",
          keyword: r.kind,
          matchScore: 46 + r.severity,
          actionEn: hint.en,
          actionBn: hint.bn,
        });
      }
    }

    if (want("CIVIC") || topic === "ALL") {
      const rows = await prismaRead.citizenComplaint.findMany({
        where: { entityId, status: { not: ComplaintStatus.RESOLVED } },
        orderBy: [{ isRedAlert: "desc" }, { createdAt: "desc" }],
        take: cap(16),
        select: {
          id: true,
          title: true,
          description: true,
          category: true,
          source: true,
          isRedAlert: true,
          createdAt: true,
        },
      });
      for (const r of rows) {
        push({
          id: `ops:complaint:${r.id}`,
          title: r.title,
          summary: clip(r.description, 360),
          sourceName: r.source,
          url: null,
          publishedAt: r.createdAt.toISOString(),
          topic: "CIVIC",
          topics: ["CIVIC"],
          local: true,
          related: false,
          origin: "ops",
          sentiment: r.isRedAlert ? "NEGATIVE" : "NEUTRAL",
          keyword: r.category,
          matchScore: r.isRedAlert ? 60 : 42,
          actionEn: "Assign within 24h SLA; photo proof before close.",
          actionBn: "২৪ ঘণ্টার এসএলএতে অ্যাসাইন করুন; বন্ধের আগে ছবির প্রমাণ।",
        });
      }
    }

    if (want("SPECIALTY") || topic === "ALL") {
      const rows = await prismaRead.localSpecialtySignal.findMany({
        where: { entityId },
        orderBy: { recordedAt: "desc" },
        take: cap(12),
      });
      for (const r of rows) {
        push({
          id: `ops:spec:${r.id}`,
          title: r.title,
          summary: clip(r.detail, 360),
          sourceName: "SPECIALTY",
          url: null,
          publishedAt: r.recordedAt.toISOString(),
          topic: "SPECIALTY",
          topics: ["SPECIALTY"],
          local: true,
          related: false,
          origin: "ops",
          sentiment: r.status === SpecialtySignalStatus.ALERT ? "NEGATIVE" : "NEUTRAL",
          keyword: r.moduleId,
          matchScore: 44,
          actionEn: "Verify in the field and update the specialty pack today.",
          actionBn: "ফিল্ডে যাচাই করে আজই স্পেশালিটি প্যাক আপডেট করুন।",
        });
      }
    }

    if (want("PULSE") || topic === "ALL") {
      const rows = await prismaRead.localPulseEvent.findMany({
        where: { entityId, done: false },
        orderBy: { startsAt: "desc" },
        take: cap(10),
      });
      for (const r of rows) {
        push({
          id: `ops:pulse:${r.id}`,
          title: r.title,
          summary: clip(r.detail ?? r.locationLabel, 360),
          sourceName: "PULSE",
          url: null,
          publishedAt: r.startsAt.toISOString(),
          topic: "PULSE",
          topics: ["PULSE"],
          local: true,
          related: false,
          origin: "ops",
          sentiment: "NEUTRAL",
          keyword: r.kind,
          matchScore: 40,
          actionEn: "Confirm attendance and brief the influencer before the event.",
          actionBn: "ইভেন্টের আগে উপস্থিতি নিশ্চিত করুন এবং ইনফ্লুয়েন্সারকে ব্রিফ করুন।",
        });
      }
    }

    if (want("BUDGET") || topic === "ALL") {
      const rows = await prismaRead.project.findMany({
        where: {
          adminUnitId: entityId,
          status: { in: [ProjectStatus.ONGOING, ProjectStatus.STALLED, ProjectStatus.PLANNED] },
        },
        orderBy: { updatedAt: "desc" },
        take: cap(10),
        select: {
          id: true,
          title: true,
          status: true,
          budgetAllocated: true,
          budgetSpent: true,
          updatedAt: true,
        },
      });
      for (const r of rows) {
        const allocated = Number(r.budgetAllocated);
        const spent = Number(r.budgetSpent);
        push({
          id: `ops:budget:${r.id}`,
          title: r.title,
          summary: `${r.status} · allocated ${allocated.toFixed(1)} · spent ${spent.toFixed(1)}`,
          sourceName: "ADP",
          url: null,
          publishedAt: r.updatedAt.toISOString(),
          topic: "BUDGET",
          topics: ["BUDGET"],
          local: true,
          related: false,
          origin: "ops",
          sentiment: r.status === ProjectStatus.STALLED ? "NEGATIVE" : "NEUTRAL",
          keyword: r.status,
          matchScore: r.status === ProjectStatus.STALLED ? 55 : 38,
          actionEn: "Review burn-rate and flag stalled packages to the engineer today.",
          actionBn: "খরচের হার দেখুন এবং স্থবির প্যাকেজ আজই ইঞ্জিনিয়ারকে ফ্ল্যাগ করুন।",
        });
      }
    }

    if (want("OSINT") || topic === "ALL") {
      const rows = await prismaRead.localOsintHit.findMany({
        where: { entityId },
        orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
        take: cap(12),
      });
      for (const r of rows) {
        push({
          id: `ops:osint:${r.id}`,
          title: r.title,
          summary: clip(r.summary, 360),
          sourceName: r.sourceName,
          url: r.sourceUrl,
          publishedAt: (r.publishedAt ?? r.createdAt).toISOString(),
          topic: "OSINT",
          topics: ["OSINT"],
          local: true,
          related: false,
          origin: "ops",
          sentiment: r.sentiment === "NEGATIVE" ? "NEGATIVE" : r.sentiment === "POSITIVE" ? "POSITIVE" : "NEUTRAL",
          keyword: r.matchedKeyword,
          matchScore: r.propagandaFlag ? 58 : 36,
          actionEn: r.propagandaFlag
            ? "Issue a same-day rebuttal and keep the official channel pinned."
            : "Track the thread and brief the morning desk.",
          actionBn: r.propagandaFlag
            ? "আজই খণ্ডন দিন এবং অফিসিয়াল চ্যানেল পিন করে রাখুন।"
            : "থ্রেড নজরে রাখুন এবং মর্নিং ডেস্ককে ব্রিফ করুন।",
        });
      }
    }

    return out;
  }
}

export const localDeskIntelService = new LocalDeskIntelService();
