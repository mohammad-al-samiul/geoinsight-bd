/**
 * Resolve Bangladesh places from news text for impact charts.
 * Prefer upazila / locality; fall back to district. Avoid bare "National".
 */

import districtsJson from "./data/bd-districts.json";
import upazilasJson from "./data/bd-upazilas.json";

export interface NewsPlaceHit {
  /** Chart label (BN name preferred when found via BN text, else EN) */
  label: string;
  label_en: string;
  label_bn: string;
  kind: "locality" | "upazila" | "district";
  district_en: string;
  division_en?: string;
}

interface PlaceEntry {
  labels: string[];
  label_en: string;
  label_bn: string;
  kind: NewsPlaceHit["kind"];
  district_en: string;
  division_en?: string;
  /** Longer labels first for matching priority within kind */
  rankLen: number;
}

const DIVISION_EN: Record<string, string> = {
  "1": "Barishal",
  "2": "Chattogram",
  "3": "Dhaka",
  "4": "Khulna",
  "5": "Rajshahi",
  "6": "Rangpur",
  "7": "Sylhet",
  "8": "Mymensingh",
};

/** Urban localities / aliases often in flood headlines but not upazila gazetteer */
const EXTRA_LOCALITIES: Array<{
  labels: string[];
  label_en: string;
  label_bn: string;
  district_en: string;
  division_en: string;
}> = [
  {
    labels: [
      "banshkhali",
      "banskhali",
      "bashkhali",
      "বাঁশখালী",
      "বাঁশখালি",
      "বাশখালী",
      "বাশখালি",
    ],
    label_en: "Banshkhali",
    label_bn: "বাঁশখালী",
    district_en: "Chattogram",
    division_en: "Chattogram",
  },
  {
    labels: ["satkania", "সাতকানিয়া", "সাতকানিয়া", "সাতকানীয়া"],
    label_en: "Satkania",
    label_bn: "সাতকানিয়া",
    district_en: "Chattogram",
    division_en: "Chattogram",
  },
  {
    labels: ["bahaddarhat", "bohoddarhat", "bohoddar hut", "বহদ্দারহাট", "বহদ্দরহাট"],
    label_en: "Bohoddarhat",
    label_bn: "বহদ্দারহাট",
    district_en: "Chattogram",
    division_en: "Chattogram",
  },
  {
    labels: ["agrabad", "আগ্রাবাদ"],
    label_en: "Agrabad",
    label_bn: "আগ্রাবাদ",
    district_en: "Chattogram",
    division_en: "Chattogram",
  },
  {
    labels: ["halishahar", "হালিশহর"],
    label_en: "Halishahar",
    label_bn: "হালিশহর",
    district_en: "Chattogram",
    division_en: "Chattogram",
  },
  {
    labels: ["chandgaon", "চান্দগাঁও", "চান্দগাও"],
    label_en: "Chandgaon",
    label_bn: "চান্দগাঁও",
    district_en: "Chattogram",
    division_en: "Chattogram",
  },
];

const DISTRICT_ALIASES: Record<string, string[]> = {
  Chattogram: ["chittagong", "ctg"],
  "Cox's Bazar": ["cox's bazar", "coxs bazar", "cox bazar", "কক্সবাজার", "কক্সবাজার"],
  Bogura: ["bogra"],
  Barishal: ["barisal"],
  Jashore: ["jessore"],
  Cumilla: ["comilla"],
};

let _entries: PlaceEntry[] | null = null;

function buildEntries(): PlaceEntry[] {
  const districts = (districtsJson as { districts: Array<{ id: string; name: string; bn_name: string; division_id: string }> })
    .districts;
  const byId = new Map(districts.map((d) => [d.id, d]));

  const entries: PlaceEntry[] = [];

  for (const loc of EXTRA_LOCALITIES) {
    entries.push({
      labels: loc.labels,
      label_en: loc.label_en,
      label_bn: loc.label_bn,
      kind: "locality",
      district_en: loc.district_en,
      division_en: loc.division_en,
      rankLen: Math.max(...loc.labels.map((l) => l.length)),
    });
  }

  for (const u of (upazilasJson as { upazilas: Array<{ name: string; bn_name: string; district_id: string }> }).upazilas) {
    const dist = byId.get(u.district_id);
    if (!dist || !u.name) continue;
    const labels = [u.name, u.bn_name].filter(Boolean);
    // Avoid ultra-short false positives ("Sadar" alone is rare; "X Sadar" is ok)
    if (u.name.length < 4 && (!u.bn_name || u.bn_name.length < 3)) continue;
    entries.push({
      labels,
      label_en: u.name,
      label_bn: u.bn_name || u.name,
      kind: "upazila",
      district_en: dist.name,
      division_en: DIVISION_EN[dist.division_id],
      rankLen: Math.max(...labels.map((l) => l.length)),
    });
  }

  for (const d of districts) {
    const aliases = DISTRICT_ALIASES[d.name] ?? [];
    const labels = [d.name, d.bn_name, ...aliases].filter(Boolean);
    entries.push({
      labels,
      label_en: d.name,
      label_bn: d.bn_name || d.name,
      kind: "district",
      district_en: d.name,
      division_en: DIVISION_EN[d.division_id],
      rankLen: Math.max(...labels.map((l) => l.length)),
    });
  }

  // Match longer labels first within scan order
  entries.sort((a, b) => b.rankLen - a.rankLen);
  return entries;
}

function getEntries(): PlaceEntry[] {
  if (!_entries) _entries = buildEntries();
  return _entries;
}

function normalizeForMatch(s: string): string {
  return s
    .normalize("NFC")
    .toLowerCase()
    // Bangla ya-phala / yya variants common in news vs gazetteer
    .replace(/\u09df/g, "\u09af") // য় → য
    .replace(/\u09c7\u09be/g, "\u09c7") // rare
    .replace(/ঁ/g, "")
    .replace(/্‌/g, "")
    .replace(/[\u200c\u200d]/g, "")
    .replace(/\s+/g, "");
}

function textIncludes(haystackLower: string, haystackRaw: string, needle: string): boolean {
  if (!needle) return false;
  if (/[\u0980-\u09FF]/.test(needle)) {
    const h = normalizeForMatch(haystackRaw);
    const n = normalizeForMatch(needle);
    return n.length > 0 && h.includes(n);
  }
  const n = needle.toLowerCase();
  if (n.length <= 3) {
    const re = new RegExp(`(?:^|[^a-z0-9])${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:[^a-z0-9]|$)`, "i");
    return re.test(haystackRaw);
  }
  return haystackLower.includes(n);
}

/**
 * Find all distinct places mentioned in text (locality/upazila preferred over district).
 */
export function extractNewsPlaces(text: string): NewsPlaceHit[] {
  if (!text?.trim()) return [];

  const raw = text;
  const lower = text.toLowerCase();
  const hits: NewsPlaceHit[] = [];
  const seen = new Set<string>();

  for (const e of getEntries()) {
    const matched = e.labels.some((lab) => textIncludes(lower, raw, lab));
    if (!matched) continue;

    const identity = e.label_en.toLowerCase();
    if (seen.has(identity)) continue;
    // Deduplicate: skip district-level hit if any finer place for same district already recorded.
    if (e.kind === "district") {
      const hasFiner = hits.some(
        (h) =>
          (h.kind === "upazila" || h.kind === "locality") &&
          h.district_en.toLowerCase() === e.district_en.toLowerCase(),
      );
      if (hasFiner) continue;
    }

    seen.add(identity);
    hits.push({
      label: e.label_bn || e.label_en,
      label_en: e.label_en,
      label_bn: e.label_bn,
      kind: e.kind,
      district_en: e.district_en,
      division_en: e.division_en,
    });
  }

  // Prefer finer places: drop districts that coincide with a mentioned locality name spam
  const finer = hits.filter((h) => h.kind === "locality" || h.kind === "upazila");
  if (finer.length > 0) {
    const finerDistricts = new Set(finer.map((h) => h.district_en.toLowerCase()));
    return [
      ...finer,
      ...hits.filter(
        (h) => h.kind === "district" && !finerDistricts.has(h.district_en.toLowerCase()),
      ),
    ];
  }

  return hits;
}

/**
 * Chart place labels for one article. Never returns ["National"] if text has a real place.
 */
export function resolveImpactPlaces(
  title: string,
  summary: string | null | undefined,
  storedDistrict: string | null | undefined,
): string[] {
  const text = `${title ?? ""} ${summary ?? ""}`;
  const hits = extractNewsPlaces(text);

  if (hits.length > 0) {
    // Labels for chart Y-axis: upazila/locality BN, or district
    return [...new Set(hits.map((h) => h.label))];
  }

  const stored = (storedDistrict ?? "").trim();
  if (stored && stored !== "National" && !/^জাতীয়$/i.test(stored)) {
    return [stored];
  }

  return [];
}
