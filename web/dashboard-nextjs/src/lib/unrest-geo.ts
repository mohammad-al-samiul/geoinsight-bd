import centroids from "@/lib/bd-district-centroids.json";

type Centroid = { lat: number; lng: number; bn?: string; name?: string };

const DIVISION_FALLBACK: Record<string, { lat: number; lng: number }> = {
  dhaka: { lat: 23.81, lng: 90.41 },
  chattogram: { lat: 22.34, lng: 91.83 },
  chittagong: { lat: 22.34, lng: 91.83 },
  khulna: { lat: 22.85, lng: 89.55 },
  rajshahi: { lat: 24.37, lng: 88.6 },
  sylhet: { lat: 24.9, lng: 91.87 },
  barishal: { lat: 22.7, lng: 90.37 },
  barisal: { lat: 22.7, lng: 90.37 },
  rangpur: { lat: 25.75, lng: 89.25 },
  mymensingh: { lat: 24.75, lng: 90.4 },
};

function canon(name: string): string {
  return name
    .toLowerCase()
    .replace("chittagong", "chattogram")
    .replace("barisal", "barishal")
    .trim();
}

export function resolveUnrestCoords(
  district?: string | null,
  division?: string | null,
  place?: string | null,
): { lat: number; lng: number } | null {
  const keys = [district, place, division].filter(Boolean).map((s) => canon(String(s)));
  const table = centroids as Record<string, Centroid>;
  for (const key of keys) {
    const hit = table[key];
    if (hit && Number.isFinite(hit.lat) && Number.isFinite(hit.lng)) {
      return { lat: hit.lat, lng: hit.lng };
    }
  }
  for (const key of keys) {
    const div = DIVISION_FALLBACK[key];
    if (div) return div;
  }
  if (place && canon(place).includes("national")) {
    return { lat: 23.685, lng: 90.3563 };
  }
  return null;
}

/** Short synthetic corridor near a pin for hartal/blockade themes */
export function blockadePath(lat: number, lng: number): Array<[number, number]> {
  return [
    [lat - 0.08, lng - 0.12],
    [lat - 0.02, lng - 0.04],
    [lat + 0.03, lng + 0.06],
    [lat + 0.09, lng + 0.14],
  ];
}

export function hoursAgoLabel(iso: string, bn: boolean): string {
  const ms = Date.now() - new Date(iso).getTime();
  const hours = Math.max(0, Math.round(ms / 3_600_000));
  if (hours < 1) return bn ? "এইমাত্র" : "Just now";
  if (hours < 24) return bn ? `${hours} ঘণ্টা আগে` : `${hours}h ago`;
  const days = Math.round(hours / 24);
  return bn ? `${days} দিন আগে` : `${days}d ago`;
}

export function confidenceLabel(score: number, bn: boolean): string {
  if (score >= 0.75) return bn ? "উচ্চ কনফিডেন্স" : "High confidence";
  if (score >= 0.45) return bn ? "মাঝারি কনফিডেন্স" : "Medium confidence";
  return bn ? "নিম্ন কনফিডেন্স" : "Low confidence";
}
