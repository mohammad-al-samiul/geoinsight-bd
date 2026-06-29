import { apiClient } from "@/lib/api-client";
import type { AdminUnit } from "@/types";

interface HierarchyNode {
  id: string;
  code?: string;
  name: string;
  nameBn?: string | null;
  type: AdminUnit["type"];
  parentId: string | null;
  geoJson?: { type: string; coordinates: [number, number] } | null;
  children?: HierarchyNode[];
}

let flatCache: AdminUnit[] | null = null;
let loadPromise: Promise<AdminUnit[]> | null = null;

function parseCoords(
  geoJson?: { type: string; coordinates: [number, number] } | null,
): { lng?: number; lat?: number } {
  const coords = geoJson?.coordinates;
  if (!coords || coords.length < 2) return {};
  return { lng: coords[0], lat: coords[1] };
}

function flatten(nodes: HierarchyNode[], acc: AdminUnit[] = []): AdminUnit[] {
  for (const node of nodes) {
    const { lng, lat } = parseCoords(node.geoJson);
    acc.push({
      id: node.id,
      code: node.code ?? node.id.slice(0, 8),
      name: node.name,
      nameBn: node.nameBn ?? undefined,
      type: node.type,
      parentId: node.parentId,
      lng,
      lat,
    });
    if (node.children?.length) flatten(node.children, acc);
  }
  return acc;
}

export async function loadAdminHierarchy(): Promise<AdminUnit[]> {
  if (flatCache) return flatCache;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    try {
      const json = await apiClient<{ success: boolean; data: HierarchyNode[] }>(
        "admin-units/hierarchy/full",
      );
      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        flatCache = flatten(json.data);
        return flatCache;
      }
    } catch {
      // fall through to empty
    }
    flatCache = [];
    return flatCache;
  })();

  return loadPromise;
}

export function getCachedAdminUnits(): AdminUnit[] {
  return flatCache ?? [];
}

export function clearAdminHierarchyCache(): void {
  flatCache = null;
  loadPromise = null;
}

export async function getUnitCoords(unitId: string): Promise<[number, number] | null> {
  const cached = getCachedAdminUnits().find((u) => u.id === unitId);
  if (cached?.lng != null && cached.lat != null) {
    return [cached.lng, cached.lat];
  }

  try {
    const json = await apiClient<{
      success: boolean;
      data: { geoJson?: { type: string; coordinates: [number, number] } };
    }>(`admin-units/${unitId}`);
    const coords = json.data?.geoJson?.coordinates;
    if (coords) return [coords[0], coords[1]];
  } catch {
    // ignore
  }
  return null;
}
