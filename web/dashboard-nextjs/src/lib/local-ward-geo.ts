/**
 * Local DSS ward geometry — organic polygons anchored to real Chattogram / Cumilla
 * geography (demo tessellation; not official survey boundaries).
 */

import type { Feature, FeatureCollection, Position } from "geojson";

export type LocalWardRef = {
  id: string;
  code: string;
  name: string;
  nameBn: string | null;
};

export type LocalWardScore = {
  wardId: string;
  score: number;
  openComplaints?: number;
  redAlerts?: number;
};

export type LocalWardFeatureProps = {
  id: string;
  code: string;
  name: string;
  nameBn: string | null;
  score: number;
  openComplaints: number;
  redAlerts: number;
  centroid: [number, number]; // [lat, lng]
  kind: "ward" | "outline";
};

type LngLat = { lng: number; lat: number };

type EntityLayout = {
  /** Soft city / constituency envelope (lng,lat rings) */
  hull: Position[];
  /** Default radius (degrees lat) for organic cells */
  radius: number;
  /** Named focus-area overrides (code fragment → point) */
  named?: Record<string, LngLat>;
  /** Place numbered wards (CCC-W01 / COCC-W03) inside the city */
  numbered?: (index1: number, total: number) => LngLat;
  /** Fallback scatter for unknown codes */
  anchor: LngLat;
  role: "MP" | "MAYOR";
  labelEn: string;
  labelBn: string;
  /** Matches bd-districts.json shapeName */
  districtName: "Chittagong" | "Comilla";
  accent: string;
};

/** Approximate CCC urban footprint (west coast → east hills, north → Patenga). */
const CCC_HULL: Position[] = [
  [91.762, 22.372],
  [91.778, 22.405],
  [91.812, 22.418],
  [91.858, 22.412],
  [91.892, 22.388],
  [91.905, 22.352],
  [91.898, 22.312],
  [91.872, 22.268],
  [91.828, 22.248],
  [91.786, 22.262],
  [91.758, 22.298],
  [91.752, 22.338],
  [91.762, 22.372],
];

const COCC_HULL: Position[] = [
  [91.145, 23.485],
  [91.168, 23.498],
  [91.198, 23.495],
  [91.218, 23.478],
  [91.222, 23.452],
  [91.210, 23.428],
  [91.185, 23.418],
  [91.158, 23.425],
  [91.142, 23.448],
  [91.145, 23.485],
];

const ENTITY_LAYOUTS: Record<string, EntityLayout> = {
  "CTG-8": {
    anchor: { lng: 91.86, lat: 22.38 },
    radius: 0.018,
    role: "MP",
    labelEn: "Chattogram-8 · MP",
    labelBn: "চট্টগ্রাম-৮ · এমপি",
    districtName: "Chittagong",
    accent: "#fbbf24",
    hull: [
      [91.82, 22.41],
      [91.88, 22.42],
      [91.91, 22.39],
      [91.9, 22.35],
      [91.86, 22.33],
      [91.81, 22.35],
      [91.82, 22.41],
    ],
    named: {
      "CTG-8-A1": { lng: 91.875, lat: 22.378 }, // Boalkhali
      "CTG-8-A2": { lng: 91.888, lat: 22.372 }, // Chandgaon
      "CTG-8-A3": { lng: 91.832, lat: 22.372 }, // Panchlaish
      Boalkhali: { lng: 91.875, lat: 22.378 },
      Chandgaon: { lng: 91.888, lat: 22.372 },
      Panchlaish: { lng: 91.832, lat: 22.372 },
    },
  },
  "CTG-9": {
    anchor: { lng: 91.84, lat: 22.335 },
    radius: 0.016,
    role: "MP",
    labelEn: "Chattogram-9 · MP",
    labelBn: "চট্টগ্রাম-৯ · এমপি",
    districtName: "Chittagong",
    accent: "#fbbf24",
    hull: [
      [91.81, 22.36],
      [91.86, 22.365],
      [91.89, 22.345],
      [91.875, 22.31],
      [91.825, 22.305],
      [91.8, 22.33],
      [91.81, 22.36],
    ],
    named: {
      "CTG-9-A1": { lng: 91.834, lat: 22.335 }, // Kotwali
      "CTG-9-A2": { lng: 91.862, lat: 22.342 }, // Bakalia
      "CTG-9-A3": { lng: 91.842, lat: 22.35 }, // Chawk Bazar
      Kotwali: { lng: 91.834, lat: 22.335 },
      Bakalia: { lng: 91.862, lat: 22.342 },
      "Chawk Bazar": { lng: 91.842, lat: 22.35 },
    },
  },
  "CTG-10": {
    anchor: { lng: 91.8, lat: 22.34 },
    radius: 0.017,
    role: "MP",
    labelEn: "Chattogram-10 · MP",
    labelBn: "চট্টগ্রাম-১০ · এমপি",
    districtName: "Chittagong",
    accent: "#fbbf24",
    hull: [
      [91.76, 22.37],
      [91.81, 22.385],
      [91.84, 22.36],
      [91.83, 22.31],
      [91.79, 22.3],
      [91.755, 22.325],
      [91.76, 22.37],
    ],
    named: {
      "CTG-10-A1": { lng: 91.805, lat: 22.322 }, // Double Mooring
      "CTG-10-A2": { lng: 91.792, lat: 22.368 }, // Pahartali
      "CTG-10-A3": { lng: 91.778, lat: 22.342 }, // Halishahar
      "Double Mooring": { lng: 91.805, lat: 22.322 },
      Pahartali: { lng: 91.792, lat: 22.368 },
      Halishahar: { lng: 91.778, lat: 22.342 },
    },
  },
  "CTG-11": {
    anchor: { lng: 91.81, lat: 22.29 },
    radius: 0.02,
    role: "MP",
    labelEn: "Chattogram-11 · MP",
    labelBn: "চট্টগ্রাম-১১ · এমপি",
    districtName: "Chittagong",
    accent: "#fbbf24",
    hull: [
      [91.74, 22.34],
      [91.88, 22.34],
      [92.06, 22.26],
      [92.04, 22.16],
      [91.78, 22.16],
      [91.72, 22.24],
      [91.74, 22.34],
    ],
    named: {
      "CTG-11-A1": { lng: 91.81, lat: 22.295 },
      "CTG-11-A2": { lng: 91.82, lat: 22.22 },
      "CTG-11-A3": { lng: 92.02, lat: 22.21 },
      Patiya: { lng: 91.81, lat: 22.295 },
      Anowara: { lng: 91.82, lat: 22.22 },
      Chandanaish: { lng: 92.02, lat: 22.21 },
    },
  },
  CCC: {
    anchor: { lng: 91.8317, lat: 22.3569 },
    radius: 0.0095,
    role: "MAYOR",
    labelEn: "Chattogram City · Mayor",
    labelBn: "চট্টগ্রাম সিটি · মেয়র",
    districtName: "Chittagong",
    accent: "#38bdf8",
    hull: CCC_HULL,
    numbered: (i, total) => placeInHull(CCC_HULL, i, total, 0.42),
  },
  COCC: {
    anchor: { lng: 91.1809, lat: 23.4607 },
    radius: 0.0085,
    role: "MAYOR",
    labelEn: "Cumilla City · Mayor",
    labelBn: "কুমিল্লা সিটি · মেয়র",
    districtName: "Comilla",
    accent: "#38bdf8",
    hull: COCC_HULL,
    numbered: (i, total) => placeInHull(COCC_HULL, i, total, 0.38),
  },
};

function hash01(seed: string, salt = 0): number {
  let h = salt * 374761393;
  for (let i = 0; i < seed.length; i += 1) {
    h = Math.imul(h ^ seed.charCodeAt(i), 1103515245);
  }
  return ((h >>> 0) % 10_000) / 10_000;
}

function placeInHull(
  hull: Position[],
  index1: number,
  total: number,
  inset = 0.4,
): LngLat {
  // Bounding box + jittered lattice clipped toward hull centroid (city-like mosaic)
  let minLng = Infinity;
  let maxLng = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;
  let cx = 0;
  let cy = 0;
  for (const [lng, lat] of hull) {
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
    cx += lng;
    cy += lat;
  }
  cx /= hull.length;
  cy /= hull.length;

  const cols = Math.max(3, Math.ceil(Math.sqrt(total * 1.15)));
  const rows = Math.max(3, Math.ceil(total / cols));
  const i = index1 - 1;
  const col = i % cols;
  const row = Math.floor(i / cols);
  const u = (col + 0.5) / cols;
  const v = (row + 0.5) / rows;
  const jx = (hash01(`c${index1}`, 1) - 0.5) * 0.018;
  const jy = (hash01(`r${index1}`, 2) - 0.5) * 0.014;

  // Pull toward coastal/center bias so tiles hug urban core
  const rawLng = minLng + (maxLng - minLng) * u + jx;
  const rawLat = maxLat - (maxLat - minLat) * v + jy;
  return {
    lng: rawLng * (1 - inset) + cx * inset,
    lat: rawLat * (1 - inset) + cy * inset,
  };
}

/** Irregular organic cell — looks like ward parcels, not Lego squares. */
function organicRing(
  lng: number,
  lat: number,
  avgR: number,
  seed: string,
  sides = 10,
): Position[] {
  const cosLat = Math.cos((lat * Math.PI) / 180) || 0.92;
  const ring: Position[] = [];
  for (let i = 0; i < sides; i += 1) {
    const base = (i / sides) * Math.PI * 2;
    const wobble = (hash01(seed, i + 3) - 0.5) * 0.55;
    const a = base + wobble;
    const r = avgR * (0.55 + hash01(seed, i + 20) * 0.7);
    // elongate slightly E–W for coastal cities
    const rx = (r * (0.9 + hash01(seed, i + 40) * 0.35)) / cosLat;
    const ry = r * (0.75 + hash01(seed, i + 50) * 0.4);
    ring.push([lng + Math.cos(a) * rx, lat + Math.sin(a) * ry]);
  }
  ring.push(ring[0]);
  return ring;
}

function resolveLayout(entityCode: string): EntityLayout {
  return (
    ENTITY_LAYOUTS[entityCode] ?? {
      anchor: { lng: 91.83, lat: 22.35 },
      radius: 0.015,
      role: "MP",
      labelEn: entityCode,
      labelBn: entityCode,
      districtName: "Chittagong",
      accent: "#fbbf24",
      hull: [
        [91.8, 22.38],
        [91.86, 22.38],
        [91.86, 22.32],
        [91.8, 22.32],
        [91.8, 22.38],
      ],
    }
  );
}

export function resolveEntityAnchor(entityCode: string): LngLat {
  return resolveLayout(entityCode).anchor;
}

export type LocalEntityMapMeta = {
  code: string;
  role: "MP" | "MAYOR";
  labelEn: string;
  labelBn: string;
  districtName: "Chittagong" | "Comilla";
  accent: string;
  anchor: LngLat;
};

export function resolveEntityMapMeta(entityCode: string): LocalEntityMapMeta {
  const layout = resolveLayout(entityCode);
  return {
    code: entityCode,
    role: layout.role,
    labelEn: layout.labelEn,
    labelBn: layout.labelBn,
    districtName: layout.districtName,
    accent: layout.accent,
    anchor: layout.anchor,
  };
}

function resolveWardPoint(
  layout: EntityLayout,
  ward: LocalWardRef,
  index: number,
  total: number,
): LngLat {
  if (layout.named) {
    if (layout.named[ward.code]) return layout.named[ward.code];
    if (layout.named[ward.name]) return layout.named[ward.name];
  }

  const numMatch = ward.code.match(/(\d+)\s*$/);
  if (layout.numbered && numMatch) {
    return layout.numbered(Number(numMatch[1]), Math.max(total, Number(numMatch[1])));
  }

  // soft fan around anchor
  const a = (index / Math.max(total, 1)) * Math.PI * 2;
  const r = layout.radius * (1.2 + hash01(ward.id, 7));
  const cosLat = Math.cos((layout.anchor.lat * Math.PI) / 180) || 0.92;
  return {
    lng: layout.anchor.lng + Math.cos(a) * (r / cosLat),
    lat: layout.anchor.lat + Math.sin(a) * r * 0.85,
  };
}

export function wpiFillColor(score: number): string {
  if (score >= 80) return "#34d399";
  if (score >= 65) return "#38bdf8";
  if (score >= 50) return "#fbbf24";
  if (score > 0) return "#f87171";
  return "#64748b";
}

export function buildLocalWardGeoJson(
  entityCode: string,
  wards: LocalWardRef[],
  scores: LocalWardScore[] = [],
): FeatureCollection {
  const layout = resolveLayout(entityCode);
  const scoreMap = new Map(scores.map((s) => [s.wardId, s]));

  const wardFeatures: Feature[] = wards.map((ward, index) => {
    const pt = resolveWardPoint(layout, ward, index, wards.length);
    const scoreRow = scoreMap.get(ward.id);
    const score = scoreRow?.score ?? 0;
    const openComplaints = scoreRow?.openComplaints ?? 0;
    const redAlerts = scoreRow?.redAlerts ?? 0;
    const radius =
      layout.radius *
      (wards.length <= 4 ? 1.35 : wards.length <= 12 ? 1.05 : 0.92);

    return {
      type: "Feature",
      properties: {
        id: ward.id,
        code: ward.code,
        name: ward.name,
        nameBn: ward.nameBn,
        score,
        openComplaints,
        redAlerts,
        centroid: [pt.lat, pt.lng] as [number, number],
        kind: "ward",
      } satisfies LocalWardFeatureProps,
      geometry: {
        type: "Polygon",
        coordinates: [organicRing(pt.lng, pt.lat, radius, ward.id || ward.code)],
      },
    };
  });

  const outline: Feature = {
    type: "Feature",
    properties: {
      id: `${entityCode}-outline`,
      code: entityCode,
      name: entityCode,
      nameBn: null,
      score: 0,
      openComplaints: 0,
      redAlerts: 0,
      centroid: [layout.anchor.lat, layout.anchor.lng] as [number, number],
      kind: "outline",
    } satisfies LocalWardFeatureProps,
    geometry: {
      type: "Polygon",
      coordinates: [layout.hull],
    },
  };

  return { type: "FeatureCollection", features: [outline, ...wardFeatures] };
}

export function wardCentroidIndex(
  collection: FeatureCollection,
): Map<string, { lat: number; lng: number }> {
  const map = new Map<string, { lat: number; lng: number }>();
  for (const f of collection.features) {
    const props = f.properties as LocalWardFeatureProps | null;
    if (!props || props.kind === "outline") continue;
    map.set(props.id, { lat: props.centroid[0], lng: props.centroid[1] });
  }
  return map;
}

export function localWardBounds(
  collection: FeatureCollection,
): [[number, number], [number, number]] | null {
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;

  for (const feature of collection.features) {
    if (!feature.geometry) continue;
    const rings =
      feature.geometry.type === "Polygon"
        ? feature.geometry.coordinates
        : feature.geometry.type === "MultiPolygon"
          ? feature.geometry.coordinates.flat()
          : [];
    for (const ring of rings) {
      for (const [lng, lat] of ring) {
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
        minLng = Math.min(minLng, lng);
        maxLng = Math.max(maxLng, lng);
      }
    }
  }

  if (!Number.isFinite(minLat)) return null;
  const padLat = Math.max(0.012, (maxLat - minLat) * 0.12);
  const padLng = Math.max(0.012, (maxLng - minLng) * 0.12);
  return [
    [minLat - padLat, minLng - padLng],
    [maxLat + padLat, maxLng + padLng],
  ];
}
