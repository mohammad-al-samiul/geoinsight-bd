"use client";

import { useCallback, useEffect, useState } from "react";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { useAdminFilter } from "@/hooks/use-admin-filter";
import type { AdminFilterState } from "@/types";
import type {
  AgroMarketRow,
  KpiDefinition,
  KpiRecord,
  ProjectDetail,
  ProjectRow,
  RepresentativeRow,
} from "@/lib/module-types";

function activeUnitId(filter: AdminFilterState): string | undefined {
  return (
    filter.unionId ??
    filter.upazilaId ??
    filter.districtId ??
    filter.divisionId ??
    undefined
  );
}

function unitQuery(filter: AdminFilterState): string {
  const id = activeUnitId(filter);
  if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return "";
  }
  return `?unitId=${encodeURIComponent(id)}`;
}

function errorMessage(err: unknown): string {
  if (err instanceof ApiClientError) return err.message;
  if (err instanceof TypeError && err.message === "Failed to fetch") {
    return "Cannot reach the API. Ensure the API gateway is running on port 4000.";
  }
  if (err instanceof Error) return err.message;
  return "Request failed";
}

export function useProjectsList() {
  const { filter } = useAdminFilter();
  const [rows, setRows] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const json = await apiClient<{ success: boolean; data: ProjectRow[] }>(
        `projects${unitQuery(filter)}`,
      );
      setRows(json.data ?? []);
    } catch (err) {
      setRows([]);
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  return { rows, loading, error, reload: load };
}

export function useProjectDetail(projectId: string | null) {
  const [detail, setDetail] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!projectId) {
      setDetail(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const json = await apiClient<{ success: boolean; data: ProjectDetail }>(
        `projects/${projectId}`,
      );
      setDetail(json.data ?? null);
    } catch (err) {
      setDetail(null);
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  return { detail, loading, error, reload: load };
}

export function useRepresentativesList() {
  const { filter } = useAdminFilter();
  const [rows, setRows] = useState<RepresentativeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const json = await apiClient<{ success: boolean; data: RepresentativeRow[] }>(
        `representatives${unitQuery(filter)}`,
      );
      setRows(json.data ?? []);
    } catch (err) {
      setRows([]);
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  return { rows, loading, error, reload: load };
}

export function useAgroMarketsList() {
  const { filter } = useAdminFilter();
  const [rows, setRows] = useState<AgroMarketRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const json = await apiClient<{ success: boolean; data: AgroMarketRow[] }>(
        `agro-markets${unitQuery(filter)}`,
      );
      setRows(json.data ?? []);
    } catch (err) {
      setRows([]);
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  return { rows, loading, error, reload: load };
}

export function useKpiData() {
  const { filter } = useAdminFilter();
  const [definitions, setDefinitions] = useState<KpiDefinition[]>([]);
  const [records, setRecords] = useState<KpiRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const unit = activeUnitId(filter);
    const recordsPath = unit
      ? `kpis/records?limit=200&unitId=${unit}`
      : "kpis/records?limit=200";

    const errors: string[] = [];

    const [defsResult, recsResult] = await Promise.allSettled([
      apiClient<{ success: boolean; data: KpiDefinition[] }>("kpis/definitions"),
      apiClient<{ success: boolean; data: KpiRecord[] }>(recordsPath),
    ]);

    if (defsResult.status === "fulfilled") {
      setDefinitions(defsResult.value.data ?? []);
    } else {
      setDefinitions([]);
      errors.push(`Definitions: ${errorMessage(defsResult.reason)}`);
    }

    if (recsResult.status === "fulfilled") {
      setRecords(recsResult.value.data ?? []);
    } else {
      setRecords([]);
      errors.push(`Records: ${errorMessage(recsResult.reason)}`);
    }

    setError(errors.length > 0 ? errors.join(" · ") : null);
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  return { definitions, records, loading, error, reload: load };
}
