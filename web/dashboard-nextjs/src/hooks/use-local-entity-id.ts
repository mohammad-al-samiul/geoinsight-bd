"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { isLocalEntityRole } from "@/types";

/**
 * Resolves which local entity (constituency / city corp) the current page
 * should load. MP/Mayor are locked to their admin unit; PMO may pick via URL.
 */
export function useLocalEntityId(explicitId?: string | null): string | null {
  const user = useAuth();
  const search = useSearchParams();
  const fromUrl = explicitId ?? search.get("entityId");

  return useMemo(() => {
    if (isLocalEntityRole(user.role)) {
      // Local roles always stay inside their own constituency / corporation.
      return user.adminUnitId ?? fromUrl;
    }
    return fromUrl;
  }, [user.role, user.adminUnitId, fromUrl]);
}

/** Append entityId to a local DSS path when known. */
export function withLocalEntityHref(href: string, entityId: string | null | undefined): string {
  if (!entityId || !href.startsWith("/local")) return href;
  const url = new URL(href, "http://local.invalid");
  if (!url.searchParams.has("entityId")) {
    url.searchParams.set("entityId", entityId);
  }
  return `${url.pathname}${url.search}`;
}
