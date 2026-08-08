"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { useRealtimeRefresh } from "@/hooks/use-realtime-refresh";

// ── Enums (mirror Prisma / Python enums) ─────────────────────────────────────
export type NarrativeThreatLevel = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
export type NarrativeCategory =
  | "ANTI_GOVT_INCITEMENT"
  | "SOVEREIGNTY_THREAT"
  | "ECONOMIC_DISINFO"
  | "SOCIAL_UNREST"
  | "RELIGIOUS_EXTREMISM"
  | "ELECTORAL_MANIPULATION";
export type NarrativeSignalStatus = "ACTIVE" | "DEBUNKED" | "ESCALATED" | "DISMISSED";
export type NarrativeFactCheckStatus =
  | "AUTHENTIC"
  | "NEEDS_REVIEW"
  | "LIKELY_DISINFO"
  | "UNVERIFIED";

/** Political party affiliation for the speaker / claim origin */
export type NarrativeParty = "BNP" | "JAMAAT" | "NCP" | "OTHER";

export const PARTY_ORDER: NarrativeParty[] = ["BNP", "JAMAAT", "NCP", "OTHER"];

export const PARTY_LABELS_BN: Record<NarrativeParty, string> = {
  BNP: "বিএনপি",
  JAMAAT: "জামায়াত",
  NCP: "এনসিপি",
  OTHER: "অন্যান্য",
};

export const PARTY_LABELS_EN: Record<NarrativeParty, string> = {
  BNP: "BNP",
  JAMAAT: "Jamaat",
  NCP: "NCP",
  OTHER: "Other",
};

export function normalizeParty(org: string | null | undefined): NarrativeParty {
  const v = (org ?? "").trim().toUpperCase();
  if (v === "BNP" || v.includes("বিএনপি")) return "BNP";
  if (v === "JAMAAT" || v.includes("জামা") || v.includes("JAMAAT")) return "JAMAAT";
  if (v === "NCP" || v.includes("এনসিপি")) return "NCP";
  return "OTHER";
}

// ── Data shapes ───────────────────────────────────────────────────────────────
export interface NarrativeSignal {
  id: string;
  fingerprint: string;
  title: string;
  titleBn: string | null;
  body: string | null;
  sourceUrl: string | null;
  sourceName: string;
  sourcePlatform: string;
  speakerName: string | null;
  organization: string | null;
  district: string | null;
  division: string | null;
  threatLevel: NarrativeThreatLevel;
  category: NarrativeCategory;
  status: NarrativeSignalStatus;
  confidenceScore: string;
  factCheckStatus?: NarrativeFactCheckStatus;
  authenticityScore?: string;
  googleVerifyUrl?: string | null;
  factCheckSummary?: string | null;
  evidenceUrls?: string[] | null;
  factCheckedAt?: string | null;
  ragDebunk: string | null;
  ragConfidence: string | null;
  ragPolicyRef: string | null;
  ragSourceRef: string | null;
  escalatedAt: string | null;
  debunkedAt: string | null;
  dismissedAt: string | null;
  publishedAt: string | null;
  fetchedAt: string;
  createdAt: string;
}

export interface ShieldStats {
  total_active: number;
  critical_count: number;
  high_count: number;
  debunked_today: number;
  escalated_pending: number;
  top_category: string | null;
  top_organization: string | null;
}

export interface ShieldFeed {
  signals: NarrativeSignal[];
  total: number;
  stats: ShieldStats;
  refreshed_at: string;
}

export interface FeedQuery {
  status?: NarrativeSignalStatus;
  threatLevel?: NarrativeThreatLevel;
  category?: NarrativeCategory;
  organization?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

// ── Build query string ────────────────────────────────────────────────────────
function buildQs(q: FeedQuery): string {
  const p = new URLSearchParams();
  if (q.status) p.set("status", q.status);
  if (q.threatLevel) p.set("threatLevel", q.threatLevel);
  if (q.category) p.set("category", q.category);
  if (q.organization) p.set("organization", q.organization);
  if (q.search) p.set("search", q.search);
  if (q.limit) p.set("limit", String(q.limit));
  if (q.offset) p.set("offset", String(q.offset));
  const s = p.toString();
  return s ? `?${s}` : "";
}

// ── Main feed hook ────────────────────────────────────────────────────────────
export function useNarrativeShield(query: FeedQuery = {}) {
  const [data, setData] = useState<ShieldFeed | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasDataRef = useRef(false);

  const load = useCallback(async () => {
    setError(null);
    if (hasDataRef.current) setRefreshing(true);
    else setLoading(true);
    try {
      const qs = buildQs(query);
      const json = await apiClient<{ success: boolean; data: ShieldFeed }>(
        `narrative-shield/feed${qs}`,
      );
      setData(json.data);
      hasDataRef.current = true;
    } catch (err) {
      setData(null);
      hasDataRef.current = false;
      setError(err instanceof Error ? err.message : "Narrative Shield feed unavailable");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    query.status,
    query.threatLevel,
    query.category,
    query.organization,
    query.search,
    query.limit,
    query.offset,
  ]);

  useEffect(() => {
    void load();
  }, [load]);

  useRealtimeRefresh(load);

  return { data, loading, refreshing, error, reload: load };
}

// ── Action hooks ──────────────────────────────────────────────────────────────
export function useNarrativeActions() {
  const [pending, setPending] = useState<Record<string, boolean>>({});

  const post = useCallback(
    async (path: string, body: Record<string, unknown>) => {
      const key = body.signalId as string ?? path;
      setPending((p) => ({ ...p, [key]: true }));
      try {
        return await apiClient<{ success: boolean; data: Record<string, unknown> }>(
          `narrative-shield/${path}`,
          { method: "POST", body: JSON.stringify(body) },
        );
      } finally {
        setPending((p) => ({ ...p, [key]: false }));
      }
    },
    [],
  );

  const debunk = useCallback(
    (signalId: string, lang: "bn" | "en" = "bn") =>
      post("debunk", { signalId, lang }),
    [post],
  );

  const escalate = useCallback(
    (signalId: string) => post("escalate", { signalId }),
    [post],
  );

  const dismiss = useCallback(
    (signalId: string) => post("dismiss", { signalId }),
    [post],
  );

  const bulk = useCallback(
    (
      signalIds: string[],
      action: "DEBUNK" | "ESCALATE" | "DISMISS",
      lang: "bn" | "en" = "bn",
    ) => post("bulk", { signalIds, action, lang }),
    [post],
  );

  const refresh = useCallback(
    (limit = 20) => post("refresh", { limit }),
    [post],
  );

  const dedup = useCallback(
    () =>
      apiClient<{ success: boolean; data: Record<string, unknown> }>(
        "narrative-shield/dedup",
        { method: "POST" },
      ),
    [],
  );

  const reset = useCallback(
    () =>
      apiClient<{ success: boolean; data: Record<string, unknown> }>(
        "narrative-shield/reset",
        { method: "POST" },
      ),
    [],
  );

  return { pending, debunk, escalate, dismiss, bulk, refresh, dedup, reset };
}

// ── CSV export (triggers browser download) ────────────────────────────────────
export async function downloadNarrativeShieldCsv(): Promise<void> {
  const res = await fetch("/api/proxy/narrative-shield/export", {
    credentials: "include",
  });
  if (!res.ok) throw new Error("CSV export failed");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `narrative-shield-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Label helpers ─────────────────────────────────────────────────────────────
export const THREAT_LEVEL_ORDER: NarrativeThreatLevel[] = [
  "CRITICAL",
  "HIGH",
  "MEDIUM",
  "LOW",
];

export const CATEGORY_LABELS_BN: Record<NarrativeCategory, string> = {
  ANTI_GOVT_INCITEMENT: "সরকার বিরোধী উসকানি",
  SOVEREIGNTY_THREAT: "সার্বভৌমত্বের হুমকি",
  ECONOMIC_DISINFO: "অর্থনৈতিক অপপ্রচার",
  SOCIAL_UNREST: "সামাজিক অস্থিরতা",
  RELIGIOUS_EXTREMISM: "ধর্মীয় উগ্রবাদ",
  ELECTORAL_MANIPULATION: "নির্বাচনী কারসাজি",
};

export const CATEGORY_LABELS_EN: Record<NarrativeCategory, string> = {
  ANTI_GOVT_INCITEMENT: "Anti-Govt Incitement",
  SOVEREIGNTY_THREAT: "Sovereignty Threat",
  ECONOMIC_DISINFO: "Economic Disinfo",
  SOCIAL_UNREST: "Social Unrest",
  RELIGIOUS_EXTREMISM: "Religious Extremism",
  ELECTORAL_MANIPULATION: "Electoral Manipulation",
};

export const FACT_CHECK_LABELS_BN: Record<NarrativeFactCheckStatus, string> = {
  AUTHENTIC: "যাচাইকৃত",
  NEEDS_REVIEW: "পর্যালোচনা প্রয়োজন",
  LIKELY_DISINFO: "সম্ভাব্য অপপ্রচার",
  UNVERIFIED: "অযাচাইকৃত",
};

export const FACT_CHECK_LABELS_EN: Record<NarrativeFactCheckStatus, string> = {
  AUTHENTIC: "Authentic",
  NEEDS_REVIEW: "Needs review",
  LIKELY_DISINFO: "Likely disinfo",
  UNVERIFIED: "Unverified",
};

/** Client-side Google News (Bangla) verify URL — prefers Bengali title. */
export function buildGoogleVerifyUrl(
  title: string,
  speakerName?: string | null,
  titleBn?: string | null,
): string {
  const claim = (titleBn?.trim() || title.trim());
  const parts = [claim];
  if (speakerName?.trim()) parts.push(speakerName.trim());
  const q = encodeURIComponent(parts.join(" "));
  return `https://news.google.com/search?q=${q}&hl=bn&gl=BD&ceid=BD:bn`;
}

export const PLATFORM_LABELS: Record<string, string> = {
  Facebook: "Facebook",
  Telegram: "Telegram",
  YouTube: "YouTube",
  Web: "ওয়েব",
  Twitter: "X / Twitter",
};
