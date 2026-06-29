"use client";

import { useCallback, useMemo, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { AdminFilterState, AdminUnitType } from "@/types";
import { ADMIN_FILTER_PARAMS } from "@/types";
import { getAncestorFilter } from "@/lib/admin-units";

const EMPTY: AdminFilterState = {
  divisionId: null,
  districtId: null,
  upazilaId: null,
  unionId: null,
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function readId(params: URLSearchParams, key: string): string | null {
  const value = params.get(key);
  if (!value) return null;
  if (!UUID_RE.test(value)) return null;
  return value;
}

function readFilter(params: URLSearchParams): AdminFilterState {
  return {
    divisionId: readId(params, ADMIN_FILTER_PARAMS.division),
    districtId: readId(params, ADMIN_FILTER_PARAMS.district),
    upazilaId: readId(params, ADMIN_FILTER_PARAMS.upazila),
    unionId: readId(params, ADMIN_FILTER_PARAMS.union),
  };
}

export function useAdminFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const filter = useMemo(() => readFilter(searchParams), [searchParams]);

  const setFilter = useCallback(
    (patch: Partial<AdminFilterState>) => {
      const next = { ...filter, ...patch };
      const params = new URLSearchParams(searchParams.toString());

      const entries: [keyof AdminFilterState, string][] = [
        ["divisionId", ADMIN_FILTER_PARAMS.division],
        ["districtId", ADMIN_FILTER_PARAMS.district],
        ["upazilaId", ADMIN_FILTER_PARAMS.upazila],
        ["unionId", ADMIN_FILTER_PARAMS.union],
      ];

      for (const [stateKey, paramKey] of entries) {
        const value = next[stateKey];
        if (value) params.set(paramKey, value);
        else params.delete(paramKey);
      }

      // Preserve unrelated params (e.g. ?role=dc for mock auth)
      const qs = params.toString();
      startTransition(() => {
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      });
    },
    [filter, pathname, router, searchParams],
  );

  const setDivision = useCallback(
    (divisionId: string | null) =>
      setFilter({
        divisionId,
        districtId: null,
        upazilaId: null,
        unionId: null,
      }),
    [setFilter],
  );

  const setDistrict = useCallback(
    (districtId: string | null) =>
      setFilter({ districtId, upazilaId: null, unionId: null }),
    [setFilter],
  );

  const setUpazila = useCallback(
    (upazilaId: string | null) => setFilter({ upazilaId, unionId: null }),
    [setFilter],
  );

  const setUnion = useCallback(
    (unionId: string | null) => setFilter({ unionId }),
    [setFilter],
  );

  const drillToUnit = useCallback(
    (unit: { id: string; type: AdminUnitType; parentId: string | null }) => {
      setFilter(getAncestorFilter(unit.id));
    },
    [setFilter],
  );

  const clearFilter = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    Object.values(ADMIN_FILTER_PARAMS).forEach((k) => params.delete(k));
    const qs = params.toString();
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  }, [pathname, router, searchParams]);

  const isFiltered = Boolean(
    filter.divisionId || filter.districtId || filter.upazilaId || filter.unionId,
  );

  return {
    filter,
    isFiltered,
    isPending,
    setDivision,
    setDistrict,
    setUpazila,
    setUnion,
    drillToUnit,
    clearFilter,
    empty: EMPTY,
  };
}
