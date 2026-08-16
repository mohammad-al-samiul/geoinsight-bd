"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { apiClient, warmApiGets } from "@/lib/api-client";
import { useAuth, useAuthContext } from "@/hooks/use-auth";
import { useRealtimeRefresh } from "@/hooks/use-realtime-refresh";
import { isLocalEntityRole } from "@/types";
import type { UserRole } from "@/types";

export type NavPulseStatus = "OK" | "WATCH" | "ALERT";

export type NavPulseItem = {
  key: string;
  href: string;
  status: NavPulseStatus;
  count: number;
  headline: string;
  headlineBn: string;
};

export type DeskDueAction = {
  id: string;
  en: string;
  bn: string;
};

export type NavPulse = {
  generatedAt: string;
  role: UserRole;
  pipelineAt: string | null;
  pipelineOk: boolean;
  dueActions: DeskDueAction[];
  items: NavPulseItem[];
};

interface ApiOk<T> {
  success: boolean;
  data: T;
}

interface NavPulseContextValue {
  pulse: NavPulse | null;
  byKey: Record<string, NavPulseItem>;
  loading: boolean;
  error: string | null;
}

const NavPulseContext = createContext<NavPulseContextValue | null>(null);

function nationalWarmPaths(): string[] {
  return [
    "dashboard/national",
    "briefing/morning?lang=en",
    "narrative-shield/feed?limit=20",
    "outlook/strategic?lang=en",
    "unrest/pulse",
    "divisional-crisis/pulse",
    "national-sector/board",
    "intelligence/hazards/overlay?season=monsoon&lookbackDays=14",
    "agro-markets",
    "kpis/definitions",
    "projects",
    "alerts?unresolvedOnly=true&limit=50",
    "audit-trail?limit=40",
    "representatives",
    "local-entity/national-board",
    "weather/live",
    "intelligence/phishing/official-domains",
    "intelligence/face-intel/gallery",
  ];
}

function localWarmPaths(entityId: string | null): string[] {
  const q = entityId ? `?entityId=${encodeURIComponent(entityId)}` : "";
  const amp = entityId ? `&entityId=${encodeURIComponent(entityId)}` : "";
  return [
    `local-entity/overview${q}`,
    `local-entity/morning-brief${q}`,
    `local-entity/complaints${q}${entityId ? "&" : "?"}limit=80`,
    `local-entity/heatmap${q}`,
    `local-entity/visits${q}`,
    `local-entity/wpi${q}`,
    `local-entity/scorecard${q}`,
    `local-entity/budget${q}`,
    `local-entity/osint${q}`,
    `local-entity/unrest${q}`,
    `local-entity/pulse${q}`,
    `local-entity/pulse-events${q}`,
    `local-entity/evidence${q}`,
    `local-entity/sector?sector=EDUCATION${amp}`,
    `local-entity/sector?sector=HEALTH${amp}`,
    `local-entity/sector?sector=EMPLOYMENT${amp}`,
    `local-entity/integrity?domain=CRIME${amp}`,
    `local-entity/integrity?domain=CORRUPTION${amp}`,
    `local-entity/command${q}`,
    `local-entity/specialty${q}`,
    `local-entity/outages${q}`,
    `local-entity/alert-deliveries${q}`,
    `local-entity/field-summary${q}`,
    `local-entity/live-intel${q}${entityId ? "&" : "?"}topic=ALL&limit=16`,
  ];
}

function NavPulseHost({ children }: { children: ReactNode }) {
  const user = useAuth();
  const { isLoading: authLoading, isAuthenticated } = useAuthContext();
  const ready = !authLoading && isAuthenticated && user.id !== "loading";
  const localRole = ready && isLocalEntityRole(user.role);
  const [pulse, setPulse] = useState<NavPulse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(ready);
  const hasDataRef = useRef(false);
  const warmCursor = useRef(0);

  const reload = useCallback(async () => {
    if (!ready) {
      setLoading(false);
      return;
    }
    if (!hasDataRef.current) setLoading(true);
    setError(null);
    try {
      const json = await apiClient<ApiOk<NavPulse>>("desk/nav-pulse");
      setPulse(json.data);
      hasDataRef.current = true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nav pulse failed");
      if (!hasDataRef.current) setPulse(null);
    } finally {
      setLoading(false);
    }
  }, [ready]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useRealtimeRefresh(reload, ready, true);

  useEffect(() => {
    if (!ready || !pulse) return;
    const paths = localRole ? localWarmPaths(user.adminUnitId) : nationalWarmPaths();
    const start = warmCursor.current % paths.length;
    const batch = [
      ...paths.slice(start, start + 6),
      ...paths.slice(0, Math.max(0, start + 6 - paths.length)),
    ];
    warmCursor.current = start + 6;
    warmApiGets(batch);
  }, [pulse, ready, localRole, user.adminUnitId]);

  const byKey = useMemo(() => {
    const map: Record<string, NavPulseItem> = {};
    for (const row of pulse?.items ?? []) map[row.key] = row;
    return map;
  }, [pulse]);

  const value = useMemo(
    () => ({ pulse, byKey, loading, error }),
    [pulse, byKey, loading, error],
  );

  return <NavPulseContext.Provider value={value}>{children}</NavPulseContext.Provider>;
}

export function NavPulseProvider({ children }: { children: ReactNode }) {
  return <NavPulseHost>{children}</NavPulseHost>;
}

export function useNavPulse(): NavPulseContextValue {
  const ctx = useContext(NavPulseContext);
  if (!ctx) {
    return { pulse: null, byKey: {}, loading: false, error: null };
  }
  return ctx;
}
