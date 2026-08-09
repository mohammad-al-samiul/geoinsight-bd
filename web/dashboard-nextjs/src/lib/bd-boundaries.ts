/**
 * Heavy boundary-geometry module (~1.7 MB of GeoJSON).
 *
 * Only import this from components that are already loaded via next/dynamic
 * (the Leaflet map inners). Light helpers (centroids, colors, overlays) live
 * in `geojson-bd.ts` so the boundary data never enters the main route bundles.
 */
import type { Feature, FeatureCollection, Geometry } from "geojson";
import type { AdminFilterState, AdminUnit } from "@/types";
import { getDrillChildType, getDrillParentId } from "@/lib/filter-utils";
import type { GeoFeatureProperties } from "@/types/dashboard";
import { allMapUnits, ringForUnit, toFeature } from "@/lib/geojson-bd";
import divisionBoundaries from "@/lib/bd-divisions.json";
import districtBoundaries from "@/lib/bd-districts.json";

type DivisionBoundaryFeature = {
  properties: { shapeName: string };
  geometry: Geometry;
};

const DIVISION_BOUNDARIES =
  (divisionBoundaries.features as unknown as DivisionBoundaryFeature[]).filter(
    (feature) =>
      feature.geometry.type === "Polygon" || feature.geometry.type === "MultiPolygon",
  );

const DISTRICT_BOUNDARIES =
  (districtBoundaries.features as unknown as DivisionBoundaryFeature[]).filter(
    (feature) =>
      feature.geometry.type === "Polygon" || feature.geometry.type === "MultiPolygon",
  );

function canonicalDivisionName(name: string): string {
  return name
    .toLowerCase()
    .replace("chittagong", "chattogram")
    .replace("rajshani", "rajshahi") // typo in source GeoJSON
    .replace("barisal", "barishal")
    .trim();
}

function realUnitGeometry(unit: AdminUnit): Geometry | null {
  const boundaries =
    unit.type === "DIVISION"
      ? DIVISION_BOUNDARIES
      : unit.type === "DISTRICT"
        ? DISTRICT_BOUNDARIES
        : null;
  if (!boundaries) return null;

  const canonical = canonicalDivisionName(unit.name);
  return (
    boundaries.find(
      (feature) => canonicalDivisionName(feature.properties.shapeName) === canonical,
    )?.geometry ?? null
  );
}

export function getVisibleGeoJson(
  filter: AdminFilterState,
): FeatureCollection<Geometry, GeoFeatureProperties> {
  const childType = getDrillChildType(filter);
  const parentId = getDrillParentId(filter);

  const features: Feature<Geometry, GeoFeatureProperties>[] = allMapUnits()
    .filter((u) => u.type === childType && u.parentId === parentId)
    .map((u) =>
      toFeature(
        u,
        realUnitGeometry(u) ?? { type: "Polygon", coordinates: [ringForUnit(u)] },
      ),
    );

  return { type: "FeatureCollection", features };
}

export function getMapBoundsForFilter(
  filter: AdminFilterState,
): [[number, number], [number, number]] | null {
  const fc = getVisibleGeoJson(filter);
  if (!fc.features.length) return null;

  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;

  const visitCoordinate = (value: unknown): void => {
    if (!Array.isArray(value)) return;
    if (typeof value[0] === "number" && typeof value[1] === "number") {
      const [lng, lat] = value;
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
      minLng = Math.min(minLng, lng);
      maxLng = Math.max(maxLng, lng);
      return;
    }
    for (const child of value) visitCoordinate(child);
  };

  for (const feature of fc.features) {
    if ("coordinates" in feature.geometry) {
      visitCoordinate(feature.geometry.coordinates);
    }
  }

  if (
    !Number.isFinite(minLat) ||
    !Number.isFinite(maxLat) ||
    !Number.isFinite(minLng) ||
    !Number.isFinite(maxLng)
  ) {
    return null;
  }
  if (minLat === maxLat && minLng === maxLng) {
    return null;
  }

  return [
    [minLat, minLng],
    [maxLat, maxLng],
  ];
}
