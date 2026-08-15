"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/hooks/use-auth";
import { useRealtimeRefresh } from "@/hooks/use-realtime-refresh";

export type NationalSiteStatus = "OK" | "WATCH" | "ALERT";

export type NationalOpsHint = { horizon: string; en: string; bn: string };

export type NationalDistrictSlice = {
  id: string;
  code: string;
  name: string;
  nameBn: string | null;
  divisionId: string;
  divisionName: string;
  divisionNameBn: string | null;
  status: NationalSiteStatus;
  severity: number;
  pressure: number;
  metrics: Record<string, unknown>;
  opsHint: NationalOpsHint;
};

export type NationalDivisionSlice = {
  id: string;
  code: string;
  name: string;
  nameBn: string | null;
  districts: number;
  alert: number;
  watch: number;
  ok: number;
  pressureAvg: number;
  attendanceAvg: number;
  dropoutAvg: number;
  teacherGap: number;
  dengue7d: number;
  occupancyAvg: number;
  stockouts: number;
  unemploymentAvg: number;
  youthUnempAvg: number;
  vacancies: number;
  trainingSeats: number;
  jobFairGaps: number;
  hotDistricts: Array<{ name: string; nameBn: string | null; pressure: number }>;
  opsHint: NationalOpsHint;
};

export type NationalJobAction = {
  id: "JOB_FAIR" | "SKILL_TRAINING" | "VACANCY_DRIVE" | "RURAL_WORKS" | "INDUSTRY_LINK";
  title: string;
  titleBn: string;
  detail: string;
  detailBn: string;
  targetDivisions: string[];
  affectedDistricts: number;
};

export type NationalSectorEvidence = {
  id: string;
  title: string;
  titleBn: string | null;
  abstract: string;
  abstractBn: string | null;
  sourceName: string;
  url: string;
  year: number;
  topics: string[];
  doNow: { en: string; bn: string };
};

export type NationalSectorBoard = {
  generatedAt: string;
  sourceNote: string;
  summary: {
    districts: number;
    divisions: number;
    educationAlerts: number;
    healthAlerts: number;
    jobsAlerts: number;
    attendanceAvg: number;
    teacherGap: number;
    dengue7d: number;
    stockouts: number;
    unemploymentAvg: number;
    jobFairGaps: number;
    vacancies: number;
    trainingSeats: number;
  };
  divisions: Array<{
    id: string;
    code: string;
    name: string;
    nameBn: string | null;
    education: NationalDivisionSlice;
    health: NationalDivisionSlice;
    jobs: NationalDivisionSlice;
  }>;
  districts: {
    education: NationalDistrictSlice[];
    health: NationalDistrictSlice[];
    jobs: NationalDistrictSlice[];
  };
  jobActions: NationalJobAction[];
  evidence: NationalSectorEvidence[];
};

interface ApiOk<T> {
  success: boolean;
  data: T;
}

export function useNationalSectors() {
  const user = useAuth();
  const allowed = user.role === "PMO" || user.role === "MINISTER";
  const [data, setData] = useState<NationalSectorBoard | null>(null);
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
      const json = await apiClient<ApiOk<NationalSectorBoard>>("national-sector/board");
      setData(json.data);
      hasDataRef.current = true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load national sectors");
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

export function sectorHot(slice: NationalDivisionSlice) {
  return slice.alert > 0;
}
