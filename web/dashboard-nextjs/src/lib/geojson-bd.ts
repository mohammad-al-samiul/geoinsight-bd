/**
 * Light geo helpers (centroids, score overlays, colors, unit counts).
 *
 * The heavy boundary polygons (~1.7 MB of GeoJSON) live in `bd-boundaries.ts`
 * and must only be imported from dynamically-loaded map components, so this
 * module stays cheap to include in any route bundle.
 */
import type { Feature, Geometry } from "geojson";
import type { AdminFilterState, AdminUnit } from "@/types";
import { getDrillChildType, getDrillParentId } from "@/lib/filter-utils";
import { resolveBnLabel } from "@/lib/admin-labels";
import { getCachedAdminUnits } from "@/lib/admin-hierarchy";
import type { GeoFeatureProperties } from "@/types/dashboard";

type Ring = [number, number][];

function box(west: number, south: number, east: number, north: number): Ring {
  return [
    [west, south],
    [east, south],
    [east, north],
    [west, north],
    [west, south],
  ];
}

const BOX_DELTA: Record<AdminUnit["type"], number> = {
  DIVISION: 0.55,
  DISTRICT: 0.22,
  UPAZILA: 0.1,
  UNION: 0.05,
};

/** Fallback division/district polygons when hierarchy API has not loaded yet. */
const FALLBACK_GEO: Array<{
  id: string;
  name: string;
  nameBn: string;
  type: AdminUnit["type"];
  parentId: string | null;
  ring: Ring;
}> = [
  {
    id: "a1000001-0001-4001-8001-000000000001",
    name: "Dhaka",
    nameBn: "ঢাকা",
    type: "DIVISION",
    parentId: null,
    ring: box(89.5, 23.2, 91.2, 24.8),
  },
  {
    id: "a1000001-0001-4001-8001-000000000002",
    name: "Chattogram",
    nameBn: "চট্টগ্রাম",
    type: "DIVISION",
    parentId: null,
    ring: box(91.0, 20.8, 92.7, 23.5),
  },
  {
    id: "b2000001-0001-4001-8001-000000000001",
    name: "Dhaka",
    nameBn: "ঢাকা",
    type: "DISTRICT",
    parentId: "a1000001-0001-4001-8001-000000000001",
    ring: box(90.2, 23.6, 90.55, 24.0),
  },
  {
    id: "b2000001-0001-4001-8001-000000000002",
    name: "Gazipur",
    nameBn: "গাজীপুর",
    type: "DISTRICT",
    parentId: "a1000001-0001-4001-8001-000000000001",
    ring: box(90.2, 23.9, 90.7, 24.3),
  },
];

function pseudoScore(id: string, offset: number): number {
  let h = offset;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 100;
  return 42 + (h % 45);
}

const unitScoreOverlay = new Map<string, { performanceScore: number; riskScore: number }>();
let unitScoreOverlayVersion = 0;

/** Merge live dashboard unitScores into choropleth (Digital Twin / national KPI). */
export function applyUnitScoreOverlay(
  scores: Array<{ unitId: string; performanceScore: number; riskScore: number }>,
): void {
  unitScoreOverlay.clear();
  for (const s of scores) {
    unitScoreOverlay.set(s.unitId, {
      performanceScore: s.performanceScore,
      riskScore: s.riskScore,
    });
  }
  unitScoreOverlayVersion += 1;
}

export function getUnitScoreOverlayVersion(): number {
  return unitScoreOverlayVersion;
}

export function ringForUnit(unit: AdminUnit): Ring {
  if (unit.lng != null && unit.lat != null) {
    const d = BOX_DELTA[unit.type];
    return box(unit.lng - d, unit.lat - d, unit.lng + d, unit.lat + d);
  }
  const fallback = FALLBACK_GEO.find((f) => f.id === unit.id);
  if (fallback) return fallback.ring;

  // Deterministic placement inside Bangladesh when API units lack geo_json.
  let h = 0;
  for (let i = 0; i < unit.id.length; i++) h = (h * 31 + unit.id.charCodeAt(i)) >>> 0;
  const lng = 88.2 + (h % 480) / 100;
  const lat = 20.6 + ((h >> 8) % 580) / 100;
  const d = BOX_DELTA[unit.type];
  return box(lng - d, lat - d, lng + d, lat + d);
}

export function toFeature(
  unit: AdminUnit,
  geometry: Geometry,
): Feature<Geometry, GeoFeatureProperties> {
  const nameBn = resolveBnLabel(unit.name, unit.nameBn) ?? unit.name;
  const overlay = unitScoreOverlay.get(unit.id);
  return {
    type: "Feature",
    properties: {
      id: unit.id,
      name: unit.name,
      nameBn,
      type: unit.type,
      parentId: unit.parentId,
      performanceScore: overlay?.performanceScore ?? pseudoScore(unit.id, 1),
      riskScore: overlay?.riskScore ?? pseudoScore(unit.id, 2),
    },
    geometry,
  };
}

export function allMapUnits(): AdminUnit[] {
  const cached = getCachedAdminUnits();
  if (cached.length > 0) return cached;

  return FALLBACK_GEO.map((f) => ({
    id: f.id,
    code: f.id.slice(0, 8),
    name: f.name,
    nameBn: f.nameBn,
    type: f.type,
    parentId: f.parentId,
  }));
}

/** Number of units the choropleth will draw for a filter — no geometry needed. */
export function getVisibleUnitCount(filter: AdminFilterState): number {
  const childType = getDrillChildType(filter);
  const parentId = getDrillParentId(filter);
  return allMapUnits().filter((u) => u.type === childType && u.parentId === parentId)
    .length;
}

export function getUnitCentroid(unitId: string): [number, number] | null {
  const unit = allMapUnits().find((u) => u.id === unitId);
  if (!unit) return null;

  if (unit.lng != null && unit.lat != null) {
    return [unit.lng, unit.lat];
  }

  const ring = ringForUnit(unit);
  const lngs = ring.map((c) => c[0]);
  const lats = ring.map((c) => c[1]);
  return [
    (Math.min(...lngs) + Math.max(...lngs)) / 2,
    (Math.min(...lats) + Math.max(...lats)) / 2,
  ];
}

export function scoreToChoroplethColor(performanceScore: number): string {
  if (performanceScore >= 75) return "#10b981";
  if (performanceScore >= 60) return "#34d399";
  if (performanceScore >= 45) return "#fbbf24";
  return performanceScore >= 30 ? "#f97316" : "#ef4444";
}

export const BD_MAP_CENTER: [number, number] = [23.685, 90.3563];
export const BD_MAP_ZOOM = 7;
