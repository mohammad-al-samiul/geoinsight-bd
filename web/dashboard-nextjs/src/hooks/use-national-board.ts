"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/hooks/use-auth";
import { useRealtimeRefresh } from "@/hooks/use-realtime-refresh";

export type UnrestTrend = "rising" | "stable" | "falling";

export type CommandScenarioId =
  | "DRAIN_CLEAR"
  | "NIGHT_PATROL"
  | "LIGHTING"
  | "DIGITAL_COUNTER"
  | "FEVER_DESK"
  | "SMC_TODAY";

export type SeatCommandLeague = {
  wards: number;
  warningWards: number;
  wpiAverage: number;
  commandAverage: number;
  unrestTrend: UnrestTrend;
  unrestActive: number;
  warnings: Array<{
    name: string;
    nameBn: string | null;
    signals: number;
    hot: string[];
    commandScore: number;
    wpi: number;
    opsHint: { horizon: string; en: string; bn: string };
  }>;
  scenarios: Array<{
    id: CommandScenarioId;
    title: string;
    titleBn: string;
    layer: string;
    factor: number;
    avgCommandLift: number;
    affectedWards: number;
  }>;
};

export type NationalBoardSeat = {
  entityId: string;
  code: string;
  name: string;
  nameBn: string | null;
  role: "MP" | "MAYOR" | null;
  href: string;
  hrefs: {
    desk: string;
    outage: string;
    pulse: string;
    complaints: string;
    evidence: string;
    education: string;
    health: string;
    jobs: string;
    crime: string;
    corruption: string;
    command: string;
  };
  outages: {
    active: number;
    byKind: Record<string, number>;
    bySource: Record<string, number>;
    worstKind: string | null;
    gasFuel: number;
  };
  sla: {
    open: number;
    overdue: number;
    redAlerts: number;
  };
  unrest: {
    active: number;
    last24h: number;
    last7d: number;
    trend: UnrestTrend;
    localHits: number;
  };
  evidenceHits: number;
  sectors: {
    education: SectorLeagueSlice;
    health: SectorLeagueSlice;
    jobs: SectorLeagueSlice;
  };
  integrity: {
    crime: IntegrityLeagueSlice;
    corruption: IntegrityLeagueSlice;
  };
  command: SeatCommandLeague;
};

export type IntegrityLeagueSlice = {
  incidents: number;
  open: number;
  watch: number;
  closed: number;
  hotWards: number;
  snatch?: number;
  theft?: number;
  nightSharePct?: number;
  patrolGaps?: number;
  tenderFlags?: number;
  bribes?: number;
  holdingTaxAvgGap?: number;
};

export type SectorLeagueSlice = {
  sites: number;
  alert: number;
  watch: number;
  ok: number;
  attendanceAvg?: number;
  dropoutAvg?: number;
  teacherGap?: number;
  dengue7d?: number;
  occupancyAvg?: number;
  stockouts?: number;
  unemploymentAvg?: number;
  vacancies?: number;
  trainingSeats?: number;
  jobFairGaps?: number;
};

export type NationalEvidenceSnippet = {
  id: string;
  kind: "THESIS" | "EXPERT" | "POLICY_BRIEF";
  topics: string[];
  title: string;
  titleBn: string | null;
  abstract: string;
  abstractBn: string | null;
  author: string | null;
  institution: string | null;
  sourceName: string;
  url: string;
  year: number;
  strength: number;
  localCode: string | null;
  localEntityId: string | null;
  doNow: { en: string; bn: string };
};

export type NationalBoard = {
  generatedAt: string;
  sourceNote: string;
  summary: {
    seats: number;
    activeOutages: number;
    hotSeats: number;
    gasFuel: number;
    byKind: Record<string, number>;
    overdue: number;
    redAlerts: number;
    unrestActive: number;
    unrestRising: number;
    evidenceItems: number;
    hotTopics: string[];
    sectorAlerts: number;
    dengue7d: number;
    teacherGap: number;
    jobFairGaps: number;
    crimeOpen: number;
    corruptionOpen: number;
    tenderFlags: number;
    bribes: number;
    warningSeats: number;
    warningWards: number;
    commandAverage: number;
  };
  seats: NationalBoardSeat[];
  evidence: {
    topics: string[];
    sourceNote: string;
    items: NationalEvidenceSnippet[];
  };
};

interface ApiOk<T> {
  success: boolean;
  data: T;
}

export function useNationalBoard() {
  const user = useAuth();
  const allowed = user.role === "PMO" || user.role === "MINISTER";
  const [data, setData] = useState<NationalBoard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(allowed);
  const hasDataRef = useRef(false);

  const reload = useCallback(async () => {
    if (!allowed) {
      setLoading(false);
      return;
    }
    if (!hasDataRef.current) setLoading(true);
    setError(null);
    try {
      const json = await apiClient<ApiOk<NationalBoard>>("local-entity/national-board");
      setData(json.data);
      hasDataRef.current = true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load national board");
      if (!hasDataRef.current) setData(null);
    } finally {
      setLoading(false);
    }
  }, [allowed]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useRealtimeRefresh(reload, allowed, true);

  return { data, error, loading, reload, allowed };
}

export function integrityHot(seat: NationalBoardSeat) {
  return (
    seat.integrity.crime.open > 0 ||
    seat.integrity.corruption.open > 0 ||
    (seat.integrity.corruption.tenderFlags ?? 0) > 0 ||
    (seat.integrity.corruption.bribes ?? 0) > 0
  );
}

export function integrityDanger(seat: NationalBoardSeat) {
  return (
    (seat.integrity.crime.nightSharePct ?? 0) >= 60 ||
    (seat.integrity.corruption.tenderFlags ?? 0) > 0 ||
    (seat.integrity.corruption.bribes ?? 0) > 0
  );
}

export function commandHot(seat: NationalBoardSeat) {
  return (seat.command?.warningWards ?? 0) > 0;
}

export function commandDanger(seat: NationalBoardSeat) {
  return (seat.command?.warningWards ?? 0) >= 1;
}
