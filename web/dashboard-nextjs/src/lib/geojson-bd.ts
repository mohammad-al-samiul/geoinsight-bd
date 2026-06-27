import type { Feature, FeatureCollection, Polygon } from "geojson";
import type { AdminFilterState } from "@/types";
import { getDrillChildType, getDrillParentId } from "@/lib/filter-utils";
import type { GeoFeatureProperties } from "@/types/dashboard";

type Ring = [number, number][];

function box(
  west: number,
  south: number,
  east: number,
  north: number,
): Ring {
  return [
    [west, south],
    [east, south],
    [east, north],
    [west, north],
    [west, south],
  ];
}

interface UnitGeo {
  id: string;
  name: string;
  nameBn: string;
  type: GeoFeatureProperties["type"];
  parentId: string | null;
  ring: Ring;
  performanceScore: number;
  riskScore: number;
}

/** Simplified administrative polygons for choropleth demo (production: API geoJson). */
const UNIT_GEO: UnitGeo[] = [
  {
    id: "div-dhaka",
    name: "Dhaka",
    nameBn: "ঢাকা",
    type: "DIVISION",
    parentId: null,
    ring: box(89.5, 23.2, 91.2, 24.8),
    performanceScore: 78,
    riskScore: 32,
  },
  {
    id: "div-chattogram",
    name: "Chattogram",
    nameBn: "চট্টগ্রাম",
    type: "DIVISION",
    parentId: null,
    ring: box(91.0, 20.8, 92.7, 23.5),
    performanceScore: 71,
    riskScore: 41,
  },
  {
    id: "div-rajshahi",
    name: "Rajshahi",
    nameBn: "রাজশাহী",
    type: "DIVISION",
    parentId: null,
    ring: box(88.0, 24.0, 89.8, 26.0),
    performanceScore: 82,
    riskScore: 24,
  },
  {
    id: "dist-dhaka",
    name: "Dhaka",
    nameBn: "ঢাকা",
    type: "DISTRICT",
    parentId: "div-dhaka",
    ring: box(90.2, 23.6, 90.55, 24.0),
    performanceScore: 74,
    riskScore: 38,
  },
  {
    id: "dist-gazipur",
    name: "Gazipur",
    nameBn: "গাজীপুর",
    type: "DISTRICT",
    parentId: "div-dhaka",
    ring: box(90.2, 23.9, 90.7, 24.3),
    performanceScore: 69,
    riskScore: 45,
  },
  {
    id: "dist-cumilla",
    name: "Cumilla",
    nameBn: "কুমিল্লা",
    type: "DISTRICT",
    parentId: "div-chattogram",
    ring: box(91.0, 22.8, 91.5, 23.3),
    performanceScore: 76,
    riskScore: 35,
  },
  {
    id: "upa-savar",
    name: "Savar",
    nameBn: "সাভার",
    type: "UPAZILA",
    parentId: "dist-dhaka",
    ring: box(90.22, 23.75, 90.42, 23.92),
    performanceScore: 81,
    riskScore: 28,
  },
  {
    id: "upa-keraniganj",
    name: "Keraniganj",
    nameBn: "কেরানীগঞ্জ",
    type: "UPAZILA",
    parentId: "dist-dhaka",
    ring: box(90.32, 23.62, 90.52, 23.78),
    performanceScore: 65,
    riskScore: 52,
  },
  {
    id: "upa-tongi",
    name: "Tongi",
    nameBn: "টঙ্গী",
    type: "UPAZILA",
    parentId: "dist-gazipur",
    ring: box(90.38, 23.88, 90.52, 24.02),
    performanceScore: 72,
    riskScore: 40,
  },
  {
    id: "uni-ashulia",
    name: "Ashulia",
    nameBn: "আশুলিয়া",
    type: "UNION",
    parentId: "upa-savar",
    ring: box(90.28, 23.82, 90.36, 23.9),
    performanceScore: 84,
    riskScore: 22,
  },
  {
    id: "uni-birulia",
    name: "Birulia",
    nameBn: "বিরুলিয়া",
    type: "UNION",
    parentId: "upa-savar",
    ring: box(90.36, 23.84, 90.42, 23.9),
    performanceScore: 77,
    riskScore: 30,
  },
  {
    id: "uni-keraniganj-s",
    name: "South Keraniganj",
    nameBn: "দক্ষিণ কেরানীগঞ্জ",
    type: "UNION",
    parentId: "upa-keraniganj",
    ring: box(90.38, 23.64, 90.48, 23.72),
    performanceScore: 58,
    riskScore: 61,
  },
];

function toFeature(unit: UnitGeo): Feature<Polygon, GeoFeatureProperties> {
  return {
    type: "Feature",
    properties: {
      id: unit.id,
      name: unit.name,
      nameBn: unit.nameBn,
      type: unit.type,
      parentId: unit.parentId,
      performanceScore: unit.performanceScore,
      riskScore: unit.riskScore,
    },
    geometry: { type: "Polygon", coordinates: [unit.ring] },
  };
}

export function getVisibleGeoJson(
  filter: AdminFilterState,
): FeatureCollection<Polygon, GeoFeatureProperties> {
  const childType = getDrillChildType(filter);
  const parentId = getDrillParentId(filter);

  const features = UNIT_GEO.filter(
    (u) => u.type === childType && u.parentId === parentId,
  ).map(toFeature);

  return { type: "FeatureCollection", features };
}

export function getUnitCentroid(unitId: string): [number, number] | null {
  const unit = UNIT_GEO.find((u) => u.id === unitId);
  if (!unit) return null;
  const lngs = unit.ring.map((c) => c[0]);
  const lats = unit.ring.map((c) => c[1]);
  return [
    (Math.min(...lngs) + Math.max(...lngs)) / 2,
    (Math.min(...lats) + Math.max(...lats)) / 2,
  ];
}

export function scoreToChoroplethColor(performanceScore: number): string {
  if (performanceScore >= 75) return "#10b981";
  if (performanceScore >= 60) return "#34d399";
  if (performanceScore >= 45) return "#fbbf24";
  if (performanceScore >= 30) return "#f97316";
  return "#ef4444";
}

export const BD_MAP_CENTER: [number, number] = [23.685, 90.3563];
export const BD_MAP_ZOOM = 7;

export function getMapBoundsForFilter(
  filter: AdminFilterState,
): [[number, number], [number, number]] | null {
  const fc = getVisibleGeoJson(filter);
  if (!fc.features.length) return null;

  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;

  for (const f of fc.features) {
    for (const [lng, lat] of f.geometry.coordinates[0]) {
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
      minLng = Math.min(minLng, lng);
      maxLng = Math.max(maxLng, lng);
    }
  }

  return [
    [minLat, minLng],
    [maxLat, maxLng],
  ];
}
