"use client";

import { useCallback, useMemo, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { AdminFilterState, AdminUnitType } from "@/types";
import { ADMIN_FILTER_PARAMS } from "@/types";

const EMPTY: AdminFilterState = {
  divisionId: null,
  districtId: null,
  upazilaId: null,
  unionId: null,
};

function readFilter(params: URLSearchParams): AdminFilterState {
  return {
    divisionId: params.get(ADMIN_FILTER_PARAMS.division),
    districtId: params.get(ADMIN_FILTER_PARAMS.district),
    upazilaId: params.get(ADMIN_FILTER_PARAMS.upazila),
    unionId: params.get(ADMIN_FILTER_PARAMS.union),
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
      switch (unit.type) {
        case "DIVISION":
          setFilter({
            divisionId: unit.id,
            districtId: null,
            upazilaId: null,
            unionId: null,
          });
          break;
        case "DISTRICT":
          setFilter({
            divisionId: unit.parentId,
            districtId: unit.id,
            upazilaId: null,
            unionId: null,
          });
          break;
        case "UPAZILA":
          setFilter({
            districtId: unit.parentId,
            upazilaId: unit.id,
            unionId: null,
          });
          break;
        case "UNION":
          setFilter({ upazilaId: unit.parentId, unionId: unit.id });
          break;
      }
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
