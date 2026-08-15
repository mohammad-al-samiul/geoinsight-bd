"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { useRealtimeRefresh } from "@/hooks/use-realtime-refresh";

export type ComplaintStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED";
export type ComplaintOperationalStatus = ComplaintStatus | "OVERDUE";
export type ComplaintSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
export type ComplaintCategory =
  | "INFRASTRUCTURE"
  | "DRAINAGE"
  | "WASTE"
  | "SAFETY"
  | "TRAFFIC"
  | "HILL_CUTTING"
  | "HERITAGE"
  | "UTILITIES"
  | "CRIME"
  | "CORRUPTION"
  | "EDUCATION"
  | "HEALTH"
  | "UNEMPLOYMENT"
  | "OTHER";
export type SignalSource = "OFFICIAL" | "CITIZEN" | "NEWS" | "ACADEMIC";

export interface CitizenComplaint {
  id: string;
  title: string;
  titleBn: string | null;
  description: string | null;
  category: ComplaintCategory;
  source?: SignalSource;
  severity: ComplaintSeverity;
  status: ComplaintStatus;
  operationalStatus: ComplaintOperationalStatus;
  slaBreached: boolean;
  citizenName: string | null;
  citizenPhone: string | null;
  locationLabel: string | null;
  lat: number | null;
  lng: number | null;
  beforePhotoUrl: string | null;
  afterPhotoUrl: string | null;
  photoQaStatus?: string | null;
  photoQaScore?: number | null;
  photoQaNote?: string | null;
  resolutionNote: string | null;
  slaDeadline: string;
  isRedAlert: boolean;
  resolvedAt: string | null;
  wardId: string;
  entityId: string;
  createdAt: string;
  assigneeId?: string | null;
  assignee?: { id: string; email: string; role: string; phone: string | null } | null;
  resolvedBy?: { id: string; email: string; role: string; phone: string | null } | null;
  ward: { id: string; code: string; name: string; nameBn: string | null };
}

export interface WpiWhyReason {
  code: string;
  en: string;
  bn: string;
  weight: number;
}

export interface WpiItem {
  id: string;
  periodKey: string;
  score: number;
  serviceScore: number;
  infraScore: number;
  resolutionScore: number;
  openComplaints: number;
  resolvedWithinSla: number;
  totalResolved: number;
  wardId: string;
  entityId: string;
  ward: { id: string; code: string; name: string; nameBn: string | null };
  why?: WpiWhyReason[];
}

export interface MorningBriefResponse {
  generatedAt: string;
  entity: { id: string; code: string; name: string; nameBn: string | null };
  summary: {
    open: number;
    overdue: number;
    redAlerts: number;
    unassigned: number;
    wpiAverage: number;
    bottomWard: { id: string; name: string; score: number } | null;
    activeOutages?: number;
    activeUnrest?: number;
    unrestTrend?: "rising" | "stable" | "falling";
    evidenceHits?: number;
  };
  bullets: Array<{ en: string; bn: string; tone: "danger" | "warn" | "ok" | "info" }>;
  actionQueue: Array<{
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
  }>;
  llmUsed?: boolean;
  narrativeEn?: string | null;
  narrativeBn?: string | null;
}

export interface ComplaintTriageSuggestion {
  category: ComplaintCategory;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  slaHours: number;
  isRedAlert: boolean;
  rationaleEn: string;
  rationaleBn: string;
  confidence: number;
  llmUsed: boolean;
}

export interface WpiExplainResponse {
  entityId: string;
  periodKey: string;
  item: WpiItem & {
    aiNarrative?: { en: string; bn: string; llmUsed: boolean } | null;
  };
}

export interface ComplaintTimelineEvent {
  id: string;
  kind: "CREATED" | "ASSIGNED" | "STARTED" | "NOTE" | "RESOLVED";
  fromStatus: ComplaintStatus | null;
  toStatus: ComplaintStatus | null;
  note: string | null;
  createdAt: string;
  actor: { id: string; email: string; role: string; phone: string | null } | null;
}

export interface WpiHistoryResponse {
  entityId: string;
  series: Array<{
    seriesKey: string;
    periodKey: string;
    label: string | null;
    value: number;
    recordedAt: string;
  }>;
  monthly: Array<{
    periodKey: string;
    wardId: string;
    wardName: string;
    wardNameBn: string | null;
    score: number;
    serviceScore: number;
    infraScore: number;
    resolutionScore: number;
    openComplaints: number;
    computedAt: string;
  }>;
}

export interface WpiListResponse {
  entityId: string;
  periodKey: string;
  summary: {
    wardCount: number;
    averageScore: number;
    topWard: { id: string; name: string; score: number } | null;
    bottomWard: { id: string; name: string; score: number } | null;
  };
  items: WpiItem[];
}

export interface ComplaintListResponse {
  entityId: string;
  summary: {
    open: number;
    inProgress: number;
    resolved: number;
    overdue: number;
    redAlerts: number;
  };
  items: CitizenComplaint[];
}

interface ApiOk<T> {
  success: boolean;
  data: T;
}

function entityQs(
  entityId?: string | null,
  extra?: Record<string, string | boolean | number | undefined | null>,
) {
  const parts: string[] = [];
  if (entityId) parts.push(`entityId=${encodeURIComponent(entityId)}`);
  if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      if (value === undefined || value === null || value === "") continue;
      parts.push(`${key}=${encodeURIComponent(String(value))}`);
    }
  }
  return parts.length ? `?${parts.join("&")}` : "";
}

export type ComplaintListFilter = {
  status?: ComplaintStatus | "OVERDUE" | "ALL";
  redAlertOnly?: boolean;
  limit?: number;
};

export function useLocalComplaints(
  entityId?: string | null,
  listFilter: ComplaintListFilter = {},
) {
  const [data, setData] = useState<ComplaintListResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const hasDataRef = useRef(false);

  const reload = useCallback(async () => {
    if (!hasDataRef.current) setLoading(true);
    setError(null);
    try {
      const qs = entityQs(entityId, {
        status: listFilter.status && listFilter.status !== "ALL" ? listFilter.status : undefined,
        redAlertOnly: listFilter.redAlertOnly ? true : undefined,
        limit: listFilter.limit ?? 80,
      });
      const json = await apiClient<ApiOk<ComplaintListResponse>>(
        `local-entity/complaints${qs}`,
        { cache: "no-store" },
      );
      setData(json.data);
      hasDataRef.current = true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load complaints");
      if (!hasDataRef.current) setData(null);
    } finally {
      setLoading(false);
    }
  }, [entityId, listFilter.status, listFilter.redAlertOnly, listFilter.limit]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useRealtimeRefresh(reload, true, true);

  const start = useCallback(
    async (complaintId: string) => {
      setBusyId(complaintId);
      try {
        await apiClient(`local-entity/complaints/${complaintId}/start`, {
          method: "PATCH",
          body: JSON.stringify({}),
        });
        await reload();
      } finally {
        setBusyId(null);
      }
    },
    [reload],
  );

  const resolve = useCallback(
    async (complaintId: string, afterPhotoUrl: string, resolutionNote?: string) => {
      setBusyId(complaintId);
      try {
        await apiClient(`local-entity/complaints/${complaintId}/resolve`, {
          method: "PATCH",
          body: JSON.stringify({ afterPhotoUrl, resolutionNote }),
        });
        await reload();
      } finally {
        setBusyId(null);
      }
    },
    [reload],
  );

  const assign = useCallback(
    async (complaintId: string, assigneeId: string | null, note?: string) => {
      setBusyId(complaintId);
      try {
        await apiClient(`local-entity/complaints/${complaintId}/assign`, {
          method: "PATCH",
          body: JSON.stringify({ assigneeId, note }),
        });
        await reload();
      } finally {
        setBusyId(null);
      }
    },
    [reload],
  );

  const addNote = useCallback(
    async (complaintId: string, note: string) => {
      setBusyId(complaintId);
      try {
        await apiClient(`local-entity/complaints/${complaintId}/notes`, {
          method: "POST",
          body: JSON.stringify({ note }),
        });
        await reload();
      } finally {
        setBusyId(null);
      }
    },
    [reload],
  );

  const create = useCallback(
    async (payload: {
      wardId: string;
      title: string;
      titleBn?: string;
      description?: string;
      category?: ComplaintCategory;
      source?: SignalSource;
      severity?: ComplaintSeverity;
      citizenName?: string;
      citizenPhone?: string;
      locationLabel?: string;
      lat?: number;
      lng?: number;
      beforePhotoUrl?: string;
      isRedAlert?: boolean;
      entityId?: string;
      slaHours?: number;
    }) => {
      setBusyId("create");
      try {
        await apiClient("local-entity/complaints", {
          method: "POST",
          body: JSON.stringify({
            ...payload,
            entityId: payload.entityId ?? entityId ?? undefined,
          }),
        });
        await reload();
      } finally {
        setBusyId(null);
      }
    },
    [entityId, reload],
  );

  const triage = useCallback(
    async (payload: { title: string; description?: string; lang?: "bn" | "en" }) => {
      const json = await apiClient<ApiOk<ComplaintTriageSuggestion>>(
        "local-entity/complaints/triage",
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
      );
      return json.data;
    },
    [],
  );

  return { data, error, loading, reload, start, resolve, assign, addNote, create, triage, busyId };
}

export function useLocalWpi(entityId?: string | null) {
  const [data, setData] = useState<WpiListResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [recomputing, setRecomputing] = useState(false);
  const hasDataRef = useRef(false);

  const reload = useCallback(async () => {
    if (!hasDataRef.current) setLoading(true);
    setError(null);
    try {
      const qs = entityQs(entityId);
      const json = await apiClient<ApiOk<WpiListResponse>>(
        `local-entity/wpi${qs}`,
        { cache: "no-store" },
      );
      setData(json.data);
      hasDataRef.current = true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load WPI");
      if (!hasDataRef.current) setData(null);
    } finally {
      setLoading(false);
    }
  }, [entityId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useRealtimeRefresh(reload, true, true);

  const recompute = useCallback(async () => {
    setRecomputing(true);
    setError(null);
    try {
      const qs = entityQs(entityId);
      const json = await apiClient<ApiOk<WpiListResponse>>(
        `local-entity/wpi/recompute${qs}`,
        { method: "POST" },
      );
      setData({
        entityId: json.data.entityId,
        periodKey: json.data.periodKey,
        summary: {
          wardCount: json.data.items.length,
          averageScore:
            json.data.items.length > 0
              ? Math.round(
                  json.data.items.reduce((s, r) => s + r.score, 0) /
                    json.data.items.length,
                )
              : 0,
          topWard: json.data.items[0]
            ? {
                id: json.data.items[0].wardId,
                name: json.data.items[0].ward.name,
                score: json.data.items[0].score,
              }
            : null,
          bottomWard: json.data.items.length
            ? {
                id: json.data.items[json.data.items.length - 1]!.wardId,
                name: json.data.items[json.data.items.length - 1]!.ward.name,
                score: json.data.items[json.data.items.length - 1]!.score,
              }
            : null,
        },
        items: json.data.items,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Recompute failed");
    } finally {
      setRecomputing(false);
    }
  }, [entityId]);

  return { data, error, loading, reload, recompute, recomputing };
}

export function useLocalMorningBrief(
  entityId?: string | null,
  opts?: { scope?: "entity" | "all" },
) {
  const [data, setData] = useState<MorningBriefResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const hasDataRef = useRef(false);
  const scope = opts?.scope ?? "entity";

  const reload = useCallback(async () => {
    if (!hasDataRef.current) setLoading(true);
    setError(null);
    try {
      const qs = entityQs(entityId, scope === "all" ? { scope: "all" } : undefined);
      const json = await apiClient<ApiOk<MorningBriefResponse>>(
        `local-entity/morning-brief${qs}`,
        { cache: "no-store" },
      );
      setData(json.data);
      hasDataRef.current = true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load morning brief");
      if (!hasDataRef.current) setData(null);
    } finally {
      setLoading(false);
    }
  }, [entityId, scope]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useRealtimeRefresh(reload, true, true);

  return { data, error, loading, reload };
}

export function useComplaintAssignees(entityId?: string | null) {
  const [items, setItems] = useState<
    Array<{ id: string; email: string; role: string; phone: string | null }>
  >([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const qs = entityQs(entityId);
        const json = await apiClient<
          ApiOk<{ items: Array<{ id: string; email: string; role: string; phone: string | null }> }>
        >(`local-entity/complaint-assignees${qs}`, { cache: "no-store" });
        if (!cancelled) setItems(json.data.items);
      } catch {
        if (!cancelled) setItems([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [entityId]);

  return items;
}

export function useComplaintTimeline(complaintId: string | null) {
  const [events, setEvents] = useState<ComplaintTimelineEvent[]>([]);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!complaintId) {
      setEvents([]);
      return;
    }
    setLoading(true);
    try {
      const json = await apiClient<
        ApiOk<{ events: ComplaintTimelineEvent[] }>
      >(`local-entity/complaints/${complaintId}/timeline`, { cache: "no-store" });
      setEvents(json.data.events);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [complaintId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { events, loading, reload };
}

export function useLocalWpiHistory(entityId?: string | null, wardId?: string | null) {
  const [data, setData] = useState<WpiHistoryResponse | null>(null);

  const reload = useCallback(async () => {
    try {
      const qs = entityQs(entityId, { wardId: wardId ?? undefined });
      const json = await apiClient<ApiOk<WpiHistoryResponse>>(
        `local-entity/wpi/history${qs}`,
        { cache: "no-store" },
      );
      setData(json.data);
    } catch {
      setData(null);
    }
  }, [entityId, wardId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useRealtimeRefresh(reload, true, true);

  return { data, reload };
}

export function useLocalWpiExplain(
  entityId: string | null | undefined,
  wardId: string | null | undefined,
) {
  const [data, setData] = useState<WpiExplainResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!wardId) {
      setData(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const qs = entityQs(entityId);
        const json = await apiClient<ApiOk<WpiExplainResponse>>(
          `local-entity/wpi/wards/${wardId}/explain${qs}`,
          { cache: "no-store" },
        );
        if (!cancelled) setData(json.data);
      } catch {
        if (!cancelled) setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [entityId, wardId]);

  return { data, loading };
}
