"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/hooks/use-auth";
import { useRealtimeRefresh } from "@/hooks/use-realtime-refresh";
import { isLocalEntityRole } from "@/types";

export interface LocalSpecialtyModule {
  id: string;
  titleEn: string;
  titleBn: string;
  status: "planned" | "active";
}

export interface LocalEntityDefinition {
  code: string;
  unitCode: string;
  role: "MP" | "MAYOR";
  nameEn: string;
  nameBn: string;
  subtitleEn: string;
  subtitleBn: string;
  focusAreasEn: string[];
  focusAreasBn: string[];
  specialtyModules: LocalSpecialtyModule[];
}

export interface LocalEntityOverview {
  entity: {
    id: string;
    code: string;
    name: string;
    nameBn: string | null;
    type: string;
    parentId: string | null;
    divisionId: string | null;
    districtId: string | null;
  };
  catalog: LocalEntityDefinition | null;
  wardCount: number;
  wards: Array<{
    id: string;
    code: string;
    name: string;
    nameBn: string | null;
  }>;
  coreModules: LocalSpecialtyModule[];
  phase: "P0" | "P1" | "P2" | "P3" | "P4";
  lastUpdatedAt?: string | null;
  dataFreshness?: "live" | "stale" | "unknown";
}

export interface LocalEntityCatalogRow {
  code: string;
  definition: LocalEntityDefinition;
  unit: {
    id: string;
    code: string;
    name: string;
    nameBn: string | null;
    type: string;
  } | null;
}

interface ApiOk<T> {
  success: boolean;
  data: T;
}

export function useLocalEntityOverview(entityId?: string | null) {
  const user = useAuth();
  const [data, setData] = useState<LocalEntityOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const hasDataRef = useRef(false);

  const reload = useCallback(async () => {
    if (!isLocalEntityRole(user.role) && user.role !== "PMO") {
      setLoading(false);
      setError("Local entity dashboards require MP, Mayor, or PMO");
      return;
    }
    if (!hasDataRef.current) setLoading(true);
    setError(null);
    try {
      const qs = entityId ? `?entityId=${encodeURIComponent(entityId)}` : "";
      const json = await apiClient<ApiOk<LocalEntityOverview>>(
        `local-entity/overview${qs}`,
      );
      setData(json.data);
      hasDataRef.current = true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load local entity");
      if (!hasDataRef.current) setData(null);
    } finally {
      setLoading(false);
    }
  }, [entityId, user.role]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useRealtimeRefresh(reload, true, true);

  return { data, error, loading, reload };
}

export function useLocalEntityCatalog() {
  const user = useAuth();
  const [rows, setRows] = useState<LocalEntityCatalogRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const hasDataRef = useRef(false);

  const reload = useCallback(async () => {
    if (!isLocalEntityRole(user.role) && user.role !== "PMO") {
      setLoading(false);
      return;
    }
    if (!hasDataRef.current) setLoading(true);
    setError(null);
    try {
      const json = await apiClient<ApiOk<LocalEntityCatalogRow[]>>(
        "local-entity/catalog",
      );
      setRows(json.data);
      hasDataRef.current = true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load catalog");
      if (!hasDataRef.current) setRows([]);
    } finally {
      setLoading(false);
    }
  }, [user.role]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useRealtimeRefresh(reload, true, true);

  return { rows, error, loading, reload };
}
