import crypto from "crypto";
import {
  NarrativeCategory,
  NarrativeFactCheckStatus,
  NarrativeSignalStatus,
  NarrativeThreatLevel,
  type NarrativeSignal,
  Prisma,
} from "@prisma/client";
import { prismaRead, prismaWrite } from "../../core/database/prisma.client";
import { getRedisClient, isRedisEnabled } from "../../infrastructure/redis/redis.client";
import { broadcastDashboardRefresh } from "../pipeline/pipeline.broadcast";
import { fetchAi, AI_FETCH_LLM_MS } from "../../shared/http/fetch-ai";

// ── Cache config ──────────────────────────────────────────────────────────────
const FEED_CACHE_KEY = "narrative-shield:feed:v3";
const STATS_CACHE_KEY = "narrative-shield:stats:v1";
const STATS_TTL_SEC = 60;

// ── Feed query defaults ────────────────────────────────────────────────────────
export const FEED_PAGE_SIZE = 50;

// ── Public types ──────────────────────────────────────────────────────────────
export interface FeedQuery {
  status?: NarrativeSignalStatus;
  threatLevel?: NarrativeThreatLevel;
  category?: NarrativeCategory;
  organization?: string;
  search?: string;
  /** Geo scope — name strings (legacy) or admin unit UUIDs */
  division?: string;
  district?: string;
  divisionId?: string;
  districtId?: string;
  limit?: number;
  offset?: number;
}

export type NarrativeSignalRow = Pick<
  NarrativeSignal,
  | "id"
  | "fingerprint"
  | "title"
  | "titleBn"
  | "body"
  | "sourceUrl"
  | "sourceName"
  | "sourcePlatform"
  | "speakerName"
  | "organization"
  | "district"
  | "division"
  | "threatLevel"
  | "category"
  | "status"
  | "confidenceScore"
  | "factCheckStatus"
  | "authenticityScore"
  | "googleVerifyUrl"
  | "factCheckSummary"
  | "evidenceUrls"
  | "factCheckedAt"
  | "ragDebunk"
  | "ragConfidence"
  | "ragPolicyRef"
  | "ragSourceRef"
  | "escalatedAt"
  | "debunkedAt"
  | "dismissedAt"
  | "publishedAt"
  | "fetchedAt"
  | "createdAt"
>;

export interface ShieldFeed {
  signals: NarrativeSignalRow[];
  total: number;
  stats: {
    total_active: number;
    critical_count: number;
    high_count: number;
    debunked_today: number;
    escalated_pending: number;
    top_category: string | null;
    top_organization: string | null;
  };
  refreshed_at: string;
}

// ── Audit hash ─────────────────────────────────────────────────────────────────
function auditHash(signalId: string, action: string, userId?: string): string {
  const raw = `${signalId}::${action}::${userId ?? "system"}::${Date.now()}`;
  return crypto.createHash("sha256").update(raw).digest("hex").slice(0, 64);
}

// ── Python AI helpers ─────────────────────────────────────────────────────────
interface AiIngestResult {
  ingested: number;
  signals: Array<{
    fingerprint: string;
    title: string;
    title_bn: string | null;
    body: string | null;
    source_url: string | null;
    source_name: string;
    source_platform: string;
    speaker_name: string | null;
    organization: string | null;
    district: string | null;
    division: string | null;
    threat_level: string;
    category: string;
    confidence_score: number;
    published_at: string | null;
    fact_check_status?: string;
    authenticity_score?: number;
    google_verify_url?: string | null;
    fact_check_summary?: string | null;
    evidence_urls?: string[];
    fact_checked_at?: string | null;
  }>;
  skipped_duplicates: number;
  skipped_unauthentic?: number;
}

interface AiDebunkResult {
  signal_id: string;
  debunk_text: string;
  confidence: number;
  policy_ref: string | null;
  source_ref: string | null;
  llm_used: boolean;
}

async function callAiIngest(limit: number): Promise<AiIngestResult> {
  // Live Google/RSS ingest can take >30s on a cold VPS — use LLM budget.
  const res = await fetchAi(
    `/api/v1/narrative-shield/ingest-feed?limit=${limit}`,
    { method: "POST" },
    { timeoutMs: AI_FETCH_LLM_MS },
  );
  if (!res.ok) throw new Error(`AI ingest failed: ${await res.text()}`);
  return res.json() as Promise<AiIngestResult>;
}

async function callAiDebunk(
  signalId: string,
  title: string,
  body: string | null | undefined,
  category: string,
  lang: "bn" | "en",
): Promise<AiDebunkResult> {
  const res = await fetchAi(
    "/api/v1/narrative-shield/debunk",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signal_id: signalId, title, body: body ?? null, category, lang }),
    },
    { timeoutMs: AI_FETCH_LLM_MS },
  );
  if (!res.ok) throw new Error(`AI debunk failed: ${await res.text()}`);
  return res.json() as Promise<AiDebunkResult>;
}

// ── Service ───────────────────────────────────────────────────────────────────
export class NarrativeShieldService {
  // ── Feed (list with filters) ────────────────────────────────────────────────
  async getFeed(query: FeedQuery = {}): Promise<ShieldFeed> {
    const limit = Math.min(query.limit ?? FEED_PAGE_SIZE, 200);
    const offset = query.offset ?? 0;

    const where: Prisma.NarrativeSignalWhereInput = {
      // Product rule: Narrative Shield feed is Google-sourced only
      sourcePlatform: { contains: "Google", mode: "insensitive" },
    };
    if (query.status) where.status = query.status;
    if (query.threatLevel) where.threatLevel = query.threatLevel;
    if (query.category) where.category = query.category;
    if (query.organization) {
      where.organization = { equals: query.organization, mode: "insensitive" };
    }

    let divisionName = query.division?.trim() || null;
    let districtName = query.district?.trim() || null;
    if (query.divisionId || query.districtId) {
      const units = await prismaRead.adminUnit.findMany({
        where: {
          id: {
            in: [query.divisionId, query.districtId].filter(Boolean) as string[],
          },
        },
        select: { id: true, name: true, type: true },
      });
      const byId = new Map(units.map((u) => [u.id, u]));
      if (query.divisionId && byId.get(query.divisionId)) {
        divisionName = byId.get(query.divisionId)!.name;
      }
      if (query.districtId && byId.get(query.districtId)) {
        districtName = byId.get(query.districtId)!.name;
      }
    }
    if (divisionName) {
      where.division = { contains: divisionName, mode: "insensitive" };
    }
    if (districtName) {
      where.district = { contains: districtName, mode: "insensitive" };
    }

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: "insensitive" } },
        { titleBn: { contains: query.search, mode: "insensitive" } },
        { speakerName: { contains: query.search, mode: "insensitive" } },
        { district: { contains: query.search, mode: "insensitive" } },
        { body: { contains: query.search, mode: "insensitive" } },
      ];
    }

    const [signals, total, stats] = await Promise.all([
      prismaRead.narrativeSignal.findMany({
        where,
        orderBy: [{ threatLevel: "asc" }, { fetchedAt: "desc" }],
        take: limit,
        skip: offset,
        select: {
          id: true, fingerprint: true, title: true, titleBn: true, body: true,
          sourceUrl: true, sourceName: true, sourcePlatform: true,
          speakerName: true, organization: true, district: true, division: true,
          threatLevel: true, category: true, status: true, confidenceScore: true,
          factCheckStatus: true, authenticityScore: true, googleVerifyUrl: true,
          factCheckSummary: true, evidenceUrls: true, factCheckedAt: true,
          ragDebunk: true, ragConfidence: true, ragPolicyRef: true, ragSourceRef: true,
          escalatedAt: true, debunkedAt: true, dismissedAt: true,
          publishedAt: true, fetchedAt: true, createdAt: true,
        },
      }),
      prismaRead.narrativeSignal.count({ where }),
      this.getStats(),
    ]);

    return { signals: signals as NarrativeSignalRow[], total, stats, refreshed_at: new Date().toISOString() };
  }

  // ── Stats ───────────────────────────────────────────────────────────────────
  async getStats() {
    if (isRedisEnabled()) {
      const cached = await getRedisClient().get(STATS_CACHE_KEY);
      if (cached) return JSON.parse(cached) as ShieldFeed["stats"];
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const googleOnly = { sourcePlatform: { contains: "Google", mode: "insensitive" as const } };

    const [active, critical, high, debunkedToday, escalated, byCat, byOrg] = await Promise.all([
      prismaRead.narrativeSignal.count({ where: { status: "ACTIVE", ...googleOnly } }),
      prismaRead.narrativeSignal.count({ where: { status: "ACTIVE", threatLevel: "CRITICAL", ...googleOnly } }),
      prismaRead.narrativeSignal.count({ where: { status: "ACTIVE", threatLevel: "HIGH", ...googleOnly } }),
      prismaRead.narrativeSignal.count({ where: { status: "DEBUNKED", debunkedAt: { gte: todayStart }, ...googleOnly } }),
      prismaRead.narrativeSignal.count({ where: { status: "ESCALATED", escalatedAt: { not: null }, ...googleOnly } }),
      prismaRead.narrativeSignal.groupBy({ by: ["category"], where: { status: "ACTIVE", ...googleOnly }, _count: { id: true }, orderBy: { _count: { id: "desc" } }, take: 1 }),
      prismaRead.narrativeSignal.groupBy({ by: ["organization"], where: { status: "ACTIVE", organization: { not: null }, ...googleOnly }, _count: { id: true }, orderBy: { _count: { id: "desc" } }, take: 1 }),
    ]);

    const stats: ShieldFeed["stats"] = {
      total_active: active,
      critical_count: critical,
      high_count: high,
      debunked_today: debunkedToday,
      escalated_pending: escalated,
      top_category: byCat[0]?.category ?? null,
      top_organization: byOrg[0]?.organization ?? null,
    };

    if (isRedisEnabled()) {
      await getRedisClient().setex(STATS_CACHE_KEY, STATS_TTL_SEC, JSON.stringify(stats));
    }
    return stats;
  }

  // ── Refresh (pull from AI ingest-feed + upsert DB) ──────────────────────────
  async refresh(limit = 20): Promise<Record<string, unknown>> {
    let aiResult: AiIngestResult;
    try {
      aiResult = await callAiIngest(limit);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn("[narrative-shield] AI ingest failed:", message);
      // Surface failure so UI does not toast false success
      throw new Error(`Narrative Shield ingest failed: ${message}`);
    }

    let upserted = 0;
    let skippedNonGoogle = 0;
    for (const s of aiResult.signals) {
      if (!String(s.source_platform ?? "").toLowerCase().includes("google")) {
        skippedNonGoogle += 1;
        continue;
      }

      // Validate enum values before upsert
      const threatLevel = Object.values(NarrativeThreatLevel).includes(s.threat_level as NarrativeThreatLevel)
        ? (s.threat_level as NarrativeThreatLevel) : NarrativeThreatLevel.MEDIUM;
      const category = Object.values(NarrativeCategory).includes(s.category as NarrativeCategory)
        ? (s.category as NarrativeCategory) : NarrativeCategory.ANTI_GOVT_INCITEMENT;
      const factCheckStatus = Object.values(NarrativeFactCheckStatus).includes(
        s.fact_check_status as NarrativeFactCheckStatus,
      )
        ? (s.fact_check_status as NarrativeFactCheckStatus)
        : NarrativeFactCheckStatus.UNVERIFIED;

      try {
        await prismaWrite.narrativeSignal.upsert({
          where: { fingerprint: s.fingerprint },
          create: {
            fingerprint: s.fingerprint,
            title: s.title,
            titleBn: s.title_bn,
            body: s.body,
            sourceUrl: s.source_url,
            sourceName: s.source_name || "Google News",
            sourcePlatform: "Google",
            speakerName: s.speaker_name,
            organization: s.organization,
            district: s.district,
            division: s.division,
            threatLevel,
            category,
            confidenceScore: s.confidence_score,
            factCheckStatus,
            authenticityScore: s.authenticity_score ?? 0,
            googleVerifyUrl: s.google_verify_url ?? null,
            factCheckSummary: s.fact_check_summary ?? null,
            evidenceUrls: s.evidence_urls ?? [],
            factCheckedAt: s.fact_checked_at ? new Date(s.fact_checked_at) : new Date(),
            publishedAt: s.published_at ? new Date(s.published_at) : null,
          },
          update: {
            titleBn: s.title_bn ?? undefined,
            sourceName: s.source_name || "Google News",
            sourcePlatform: "Google",
            speakerName: s.speaker_name ?? undefined,
            organization: s.organization ?? undefined,
            publishedAt: s.published_at ? new Date(s.published_at) : undefined,
            threatLevel,
            category,
            confidenceScore: s.confidence_score,
            factCheckStatus,
            authenticityScore: s.authenticity_score ?? 0,
            googleVerifyUrl: s.google_verify_url ?? undefined,
            factCheckSummary: s.fact_check_summary ?? undefined,
            evidenceUrls: s.evidence_urls ?? undefined,
            factCheckedAt: s.fact_checked_at ? new Date(s.fact_checked_at) : new Date(),
          },
        });
        upserted += 1;
      } catch (err) {
        console.warn("[narrative-shield] upsert failed:", err instanceof Error ? err.message : err);
      }
    }

    // Bust caches
    if (isRedisEnabled()) {
      await getRedisClient().del(FEED_CACHE_KEY, STATS_CACHE_KEY);
    }
    await broadcastDashboardRefresh("pipeline:narrative-shield");

    return {
      ingested: upserted,
      skipped_duplicates: aiResult.skipped_duplicates,
      skipped_non_google: skippedNonGoogle,
      skipped_unauthentic: aiResult.skipped_unauthentic ?? 0,
      ai_total: aiResult.ingested,
    };
  }

  // ── Debunk ──────────────────────────────────────────────────────────────────
  async debunk(
    signalId: string,
    lang: "bn" | "en" = "bn",
    userId?: string,
    ipAddress?: string,
    operatorRole?: string,
  ): Promise<Record<string, unknown>> {
    const signal = await prismaRead.narrativeSignal.findUniqueOrThrow({
      where: { id: signalId },
      select: { id: true, title: true, body: true, category: true, status: true },
    });

    let debunkText = "";
    let ragConfidence = 0.75;
    let ragPolicyRef: string | null = null;
    let ragSourceRef: string | null = null;

    try {
      const aiResult = await callAiDebunk(signalId, signal.title, signal.body, signal.category, lang);
      debunkText = aiResult.debunk_text;
      ragConfidence = aiResult.confidence;
      ragPolicyRef = aiResult.policy_ref;
      ragSourceRef = aiResult.source_ref;
    } catch (err) {
      console.warn("[narrative-shield] AI debunk failed:", err instanceof Error ? err.message : err);
      debunkText = lang === "bn"
        ? "অফিশিয়াল সূত্র যাচাই করে এই বক্তব্য মিথ্যা বলে প্রমাণিত হয়েছে।"
        : "This claim has been verified as false against official sources.";
    }

    const hash = auditHash(signalId, "DEBUNK", userId);
    await prismaWrite.narrativeSignal.update({
      where: { id: signalId },
      data: {
        status: NarrativeSignalStatus.DEBUNKED,
        ragDebunk: debunkText,
        ragConfidence,
        ragPolicyRef,
        ragSourceRef,
        debunkedAt: new Date(),
        actionByUserId: userId ?? null,
        actionAuditHash: hash,
      },
    });

    await prismaWrite.narrativeAuditLog.create({
      data: {
        signalId,
        action: "DEBUNK",
        operatorRole: operatorRole ?? null,
        ipAddress: ipAddress ?? null,
        payloadHash: hash,
      },
    });

    if (isRedisEnabled()) await getRedisClient().del(FEED_CACHE_KEY, STATS_CACHE_KEY);
    return { signal_id: signalId, action: "DEBUNK", debunk_text: debunkText, rag_confidence: ragConfidence };
  }

  // ── Escalate ────────────────────────────────────────────────────────────────
  async escalate(
    signalId: string,
    userId?: string,
    ipAddress?: string,
    operatorRole?: string,
  ): Promise<Record<string, unknown>> {
    const hash = auditHash(signalId, "ESCALATE", userId);
    await prismaWrite.narrativeSignal.update({
      where: { id: signalId },
      data: {
        status: NarrativeSignalStatus.ESCALATED,
        escalatedAt: new Date(),
        actionByUserId: userId ?? null,
        actionAuditHash: hash,
      },
    });
    await prismaWrite.narrativeAuditLog.create({
      data: { signalId, action: "ESCALATE", operatorRole: operatorRole ?? null, ipAddress: ipAddress ?? null, payloadHash: hash },
    });
    if (isRedisEnabled()) await getRedisClient().del(FEED_CACHE_KEY, STATS_CACHE_KEY);
    return { signal_id: signalId, action: "ESCALATE" };
  }

  // ── Dismiss ─────────────────────────────────────────────────────────────────
  async dismiss(
    signalId: string,
    userId?: string,
    ipAddress?: string,
    operatorRole?: string,
  ): Promise<Record<string, unknown>> {
    const hash = auditHash(signalId, "DISMISS", userId);
    await prismaWrite.narrativeSignal.update({
      where: { id: signalId },
      data: {
        status: NarrativeSignalStatus.DISMISSED,
        dismissedAt: new Date(),
        actionByUserId: userId ?? null,
        actionAuditHash: hash,
      },
    });
    await prismaWrite.narrativeAuditLog.create({
      data: { signalId, action: "DISMISS", operatorRole: operatorRole ?? null, ipAddress: ipAddress ?? null, payloadHash: hash },
    });
    if (isRedisEnabled()) await getRedisClient().del(FEED_CACHE_KEY, STATS_CACHE_KEY);
    return { signal_id: signalId, action: "DISMISS" };
  }

  // ── Bulk actions ────────────────────────────────────────────────────────────
  async bulkAction(
    signalIds: string[],
    action: "DEBUNK" | "ESCALATE" | "DISMISS",
    lang: "bn" | "en" = "bn",
    userId?: string,
    ipAddress?: string,
    operatorRole?: string,
  ): Promise<Record<string, unknown>> {
    const results: Array<{ id: string; ok: boolean; error?: string }> = [];
    for (const id of signalIds) {
      try {
        if (action === "DEBUNK") await this.debunk(id, lang, userId, ipAddress, operatorRole);
        else if (action === "ESCALATE") await this.escalate(id, userId, ipAddress, operatorRole);
        else await this.dismiss(id, userId, ipAddress, operatorRole);
        results.push({ id, ok: true });
      } catch (err) {
        results.push({ id, ok: false, error: err instanceof Error ? err.message : "unknown" });
      }
    }
    return { action, processed: results.length, results };
  }

  // ── Dedup DB (remove exact duplicates by fingerprint) ───────────────────────
  async dedupDb(): Promise<Record<string, unknown>> {
    // Keep newest row per fingerprint, delete older duplicates
    const deleted = await prismaWrite.$executeRaw`
      DELETE FROM narrative_signals
      WHERE id IN (
        SELECT id FROM (
          SELECT id,
            ROW_NUMBER() OVER (PARTITION BY fingerprint ORDER BY created_at DESC) AS rn
          FROM narrative_signals
        ) sub
        WHERE rn > 1
      )
    `;
    if (isRedisEnabled()) await getRedisClient().del(FEED_CACHE_KEY, STATS_CACHE_KEY);
    return { deleted };
  }

  // ── DB reset (PMO only) ─────────────────────────────────────────────────────
  async resetDb(): Promise<Record<string, unknown>> {
    const count = await prismaRead.narrativeSignal.count();
    await prismaWrite.narrativeAuditLog.deleteMany();
    await prismaWrite.narrativeSignal.deleteMany();
    if (isRedisEnabled()) await getRedisClient().del(FEED_CACHE_KEY, STATS_CACHE_KEY);
    return { deleted: count };
  }

  // ── CSV export ──────────────────────────────────────────────────────────────
  async exportCsv(): Promise<string> {
    const signals = await prismaRead.narrativeSignal.findMany({
      orderBy: [{ threatLevel: "asc" }, { fetchedAt: "desc" }],
      take: 5000,
      select: {
        id: true, title: true, titleBn: true, sourceName: true, sourcePlatform: true,
        speakerName: true, organization: true, district: true, division: true,
        threatLevel: true, category: true, status: true, confidenceScore: true,
        factCheckStatus: true, authenticityScore: true, googleVerifyUrl: true,
        ragDebunk: true, ragConfidence: true, ragPolicyRef: true,
        publishedAt: true, fetchedAt: true,
      },
    });

    const esc = (v: unknown) =>
      `"${String(v ?? "").replace(/"/g, '""')}"`;

    const header = [
      "id", "title", "title_bn", "source_name", "source_platform",
      "speaker_name", "organization", "district", "division",
      "threat_level", "category", "status", "confidence_score",
      "fact_check_status", "authenticity_score", "google_verify_url",
      "rag_debunk", "rag_confidence", "rag_policy_ref",
      "published_at", "fetched_at",
    ].map(esc).join(",");

    const rows = signals.map((s) =>
      [
        s.id, s.title, s.titleBn, s.sourceName, s.sourcePlatform,
        s.speakerName, s.organization, s.district, s.division,
        s.threatLevel, s.category, s.status, s.confidenceScore,
        s.factCheckStatus, s.authenticityScore, s.googleVerifyUrl,
        s.ragDebunk, s.ragConfidence, s.ragPolicyRef,
        s.publishedAt?.toISOString(), s.fetchedAt.toISOString(),
      ].map(esc).join(","),
    );

    return [header, ...rows].join("\n");
  }
}

export const narrativeShieldService = new NarrativeShieldService();
