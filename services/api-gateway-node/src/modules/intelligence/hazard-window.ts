/**
 * Time-window evidence for hazard map localities.
 * A place (e.g. Bohoddarhat) appears only when flood/water was observed
 * or reported in news during the selected lookback window.
 */

import { prismaRead } from "../../core/database/prisma.client";
import { extractNewsPlaces } from "../../shared/geo/news-place-matcher";

export const WATER_FLOOD_KEYWORDS = [
  "বন্যা",
  "flood",
  "inundat",
  "waterlog",
  "জলাবদ্ধ",
  "পানি বৃদ্ধি",
  "water level",
  "জলোচ্ছ্বাস",
  "storm surge",
  "submerged",
  "ভেসে",
  "heavy rain",
  "torrential",
  "বৃষ্টিপাত",
  "ঘূর্ণিঝড়",
  "cyclone",
];

export interface WindowWeatherPeak {
  division: string;
  district: string | null;
  name_bn: string;
  lat: number;
  lng: number;
  max_flood_risk: number;
  max_cyclone_risk: number;
  max_heat_stress: number;
  max_precipitation_mm: number;
  last_recorded_at: Date;
}

export interface WindowNewsLocalityHit {
  label_en: string;
  label_bn: string;
  district_en: string;
  division_en?: string;
  article_count: number;
  last_at: Date;
}

export function normKey(s: string | null | undefined): string {
  return String(s ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export async function fetchWeatherPeaksForWindow(
  lookbackDays: number,
): Promise<WindowWeatherPeak[]> {
  const since = new Date(Date.now() - lookbackDays * 86_400_000);
  return prismaRead.$queryRaw<WindowWeatherPeak[]>`
    SELECT
      division,
      district,
      name_bn,
      lat::float8 AS lat,
      lng::float8 AS lng,
      MAX(flood_risk)::int AS max_flood_risk,
      MAX(cyclone_risk)::int AS max_cyclone_risk,
      MAX(heat_stress)::int AS max_heat_stress,
      MAX(precipitation_mm::numeric)::float8 AS max_precipitation_mm,
      MAX(recorded_at) AS last_recorded_at
    FROM weather_observations
    WHERE recorded_at >= ${since}
    GROUP BY division, district, name_bn, lat, lng
  `;
}

export async function fetchNewsLocalitiesForWindow(
  lookbackDays: number,
): Promise<Map<string, WindowNewsLocalityHit>> {
  const since = new Date(Date.now() - lookbackDays * 86_400_000);
  const articles = await prismaRead.externalArticle.findMany({
    where: { fetchedAt: { gte: since } },
    select: { title: true, summary: true, publishedAt: true, fetchedAt: true },
    take: 1500,
    orderBy: { fetchedAt: "desc" },
  });

  const hits = new Map<string, WindowNewsLocalityHit>();

  for (const article of articles) {
    const blob = `${article.title} ${article.summary ?? ""}`;
    const text = blob.toLowerCase();
    if (!WATER_FLOOD_KEYWORDS.some((k) => text.includes(k.toLowerCase()))) continue;

    const places = extractNewsPlaces(blob);
    const at = article.publishedAt ?? article.fetchedAt;

    for (const place of places) {
      const key = normKey(place.label_en);
      const prev = hits.get(key);
      if (!prev) {
        hits.set(key, {
          label_en: place.label_en,
          label_bn: place.label_bn,
          district_en: place.district_en,
          division_en: place.division_en,
          article_count: 1,
          last_at: at,
        });
      } else {
        prev.article_count += 1;
        if (at > prev.last_at) prev.last_at = at;
      }
    }
  }

  return hits;
}

export function findWeatherPeakForZone(
  zone: {
    locality_bn?: string | null;
    locality?: string | null;
    district?: string | null;
    division: string;
    scale?: string;
  },
  peaks: WindowWeatherPeak[],
): WindowWeatherPeak | undefined {
  const localityBn = normKey(zone.locality_bn);
  const locality = normKey(zone.locality);
  const district = normKey(zone.district);

  for (const p of peaks) {
    const nameKey = normKey(p.name_bn);
    if (localityBn && (nameKey === localityBn || nameKey.includes(localityBn) || localityBn.includes(nameKey))) {
      return p;
    }
    if (locality && (nameKey.includes(locality) || locality.includes(nameKey))) {
      return p;
    }
  }

  if (zone.scale === "regional" && district) {
    const districtPeaks = peaks.filter((p) => normKey(p.district) === district);
    if (districtPeaks.length === 0) return undefined;
    return districtPeaks.reduce((best, p) =>
      p.max_flood_risk + p.max_cyclone_risk > best.max_flood_risk + best.max_cyclone_risk ? p : best,
    );
  }

  if (district) {
    return peaks.find((p) => normKey(p.district) === district);
  }

  return undefined;
}

export function findNewsHitForZone(
  zone: {
    locality_bn?: string | null;
    locality?: string | null;
    district?: string | null;
  },
  newsHits: Map<string, WindowNewsLocalityHit>,
): WindowNewsLocalityHit | undefined {
  const candidates = [
    normKey(zone.locality),
    normKey(zone.locality_bn),
  ].filter(Boolean);

  for (const k of candidates) {
    const hit = newsHits.get(k);
    if (hit) return hit;
  }

  for (const hit of newsHits.values()) {
    if (normKey(zone.locality) && normKey(hit.label_en) === normKey(zone.locality)) return hit;
    if (normKey(zone.locality_bn) && normKey(hit.label_bn) === normKey(zone.locality_bn)) return hit;
  }

  return undefined;
}

export function zoneHasWindowEvidence(
  zone: {
    hazard_type: string;
    scale?: string;
    locality_bn?: string | null;
    locality?: string | null;
    district?: string | null;
  },
  weatherPeak: WindowWeatherPeak | undefined,
  newsHit: WindowNewsLocalityHit | undefined,
  lookbackDays: number,
): boolean {
  if (newsHit && newsHit.article_count > 0) return true;
  if (!weatherPeak) return false;

  const isLocal = zone.scale === "local";

  if (zone.hazard_type === "flood") {
    const floodThreshold = lookbackDays === 1 ? (isLocal ? 3 : 3) : isLocal ? 3 : 2;
    const rainThreshold = lookbackDays === 1 ? 12 : 8;
    return (
      weatherPeak.max_flood_risk >= floodThreshold ||
      weatherPeak.max_precipitation_mm >= rainThreshold
    );
  }
  if (zone.hazard_type === "cyclone") {
    return weatherPeak.max_cyclone_risk >= (lookbackDays === 1 ? 3 : 2);
  }
  if (zone.hazard_type === "heat") {
    return weatherPeak.max_heat_stress >= 4;
  }
  return false;
}

export function weatherPeakToZone(
  peak: WindowWeatherPeak,
  lookbackDays: number,
): {
  zone_id: string;
  name: string;
  name_bn: string;
  hazard_type: string;
  risk_level: number;
  division: string;
  district?: string;
  lat: number;
  lng: number;
  radius_km: number;
  scale: "local" | "regional";
  source: string;
  precipitation_mm?: number;
  water_note_bn?: string;
  water_note_en?: string;
} | null {
  const isLocal = Boolean(peak.district);
  const floodThreshold = lookbackDays === 1 ? (isLocal ? 3 : 3) : isLocal ? 3 : 2;
  const rainThreshold = lookbackDays === 1 ? 12 : 8;

  if (peak.max_flood_risk >= floodThreshold || peak.max_precipitation_mm >= rainThreshold) {
    const slug = `${(peak.district ?? peak.division).toLowerCase().replace(/\s+/g, "-")}-${normKey(peak.name_bn).replace(/\s+/g, "-")}`;
    return {
      zone_id: `weather-window-flood-${slug}`,
      name: `Flood — ${peak.name_bn}`,
      name_bn: `বন্যা/পানি — ${peak.name_bn}`,
      hazard_type: "flood",
      risk_level: peak.max_flood_risk,
      division: peak.division,
      district: peak.district ?? undefined,
      lat: peak.lat,
      lng: peak.lng,
      radius_km: isLocal ? 8 + peak.max_flood_risk * 2 : 14 + peak.max_flood_risk * 3,
      scale: isLocal ? "local" : "regional",
      source: "open-meteo-window",
      precipitation_mm: peak.max_precipitation_mm,
      water_note_bn: `${lookbackDays} দিনে সর্বোচ্চ ~${Math.round(peak.max_precipitation_mm)} mm বৃষ্টি`,
      water_note_en: `Max ~${Math.round(peak.max_precipitation_mm)} mm rain in ${lookbackDays}d window`,
    };
  }

  if (peak.max_cyclone_risk >= (lookbackDays === 1 ? 3 : 2)) {
    const slug = peak.division.toLowerCase().replace(/\s+/g, "-");
    return {
      zone_id: `weather-window-cyclone-${slug}-${normKey(peak.name_bn)}`,
      name: `Cyclone risk — ${peak.name_bn}`,
      name_bn: `ঘূর্ণিঝড় ঝুঁকি — ${peak.name_bn}`,
      hazard_type: "cyclone",
      risk_level: peak.max_cyclone_risk,
      division: peak.division,
      district: peak.district ?? undefined,
      lat: peak.lat,
      lng: peak.lng,
      radius_km: 18 + peak.max_cyclone_risk * 5,
      scale: isLocal ? "local" : "regional",
      source: "open-meteo-window",
    };
  }

  if (peak.max_heat_stress >= 4) {
    const slug = peak.division.toLowerCase().replace(/\s+/g, "-");
    return {
      zone_id: `weather-window-heat-${slug}`,
      name: `Heat stress — ${peak.name_bn}`,
      name_bn: `তাপপ্রবাহ — ${peak.name_bn}`,
      hazard_type: "heat",
      risk_level: peak.max_heat_stress,
      division: peak.division,
      lat: peak.lat,
      lng: peak.lng,
      radius_km: 30,
      scale: "regional",
      source: "open-meteo-window",
    };
  }

  return null;
}
