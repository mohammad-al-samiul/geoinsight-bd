/**
 * Extract casualty / damage figures from BN+EN news text.
 * Heuristic only — not an official tally.
 */

const BN_DIGITS: Record<string, string> = {
  "০": "0",
  "১": "1",
  "২": "2",
  "৩": "3",
  "৪": "4",
  "৫": "5",
  "৬": "6",
  "৭": "7",
  "৮": "8",
  "৯": "9",
};

/** Single-headline tallies at/above this are treated as historical/national totals. */
export const HISTORICAL_DEATH_THRESHOLD = 80;

export interface NewsImpactExtract {
  deaths: number;
  civilian_deaths: number;
  injuries: number;
  homes_damaged: number;
  livestock_lost: number;
  damage_mentions: number;
  evidence: string[];
}

export interface ImpactArticleInput {
  district: string | null;
  /**
   * All chart places (upazila/locality/district) extracted from the article.
   * When set, by_district / by_event fan out to each place; national totals still count once.
   */
  places?: string[];
  publishedAt: Date | string;
  impact: NewsImpactExtract;
  /** Headline used to label the incident in charts */
  title?: string | null;
  url?: string | null;
}

export interface DistrictImpactRow {
  district: string;
  deaths: number;
  civilian_deaths: number;
  injuries: number;
  homes_damaged: number;
  livestock_lost: number;
  damage_mentions: number;
  death_mentions: number;
  injury_mentions: number;
}

/** One district×day cluster treated as a single incident for charts */
export interface EventImpactRow {
  id: string;
  label: string;
  title: string;
  district: string;
  day: string;
  deaths: number;
  injuries: number;
  civilian_deaths: number;
  homes_damaged?: number;
  livestock_lost?: number;
  url?: string | null;
}

export interface SegmentedNewsImpact {
  window_days: number;
  method: "max_per_district_day";
  deaths: number;
  civilian_deaths: number;
  injuries: number;
  homes_damaged: number;
  livestock_lost: number;
  damage_mentions: number;
  death_mentions: number;
  injury_mentions: number;
  article_count: number;
  raw_sum_deaths: number;
  excluded_historical_articles: number;
  excluded_historical_peak: number;
  by_district: DistrictImpactRow[];
  by_event: EventImpactRow[];
  evidence: string[];
  tally_kind: "NEWS_DERIVED";
  disclaimer_bn: string;
  disclaimer_en: string;
}

function normalizeDigits(text: string): string {
  return text.replace(/[০-৯]/g, (d) => BN_DIGITS[d] ?? d);
}

function parseNum(raw: string): number {
  const n = Number(String(raw).replace(/,/g, ""));
  if (!Number.isFinite(n) || n < 0) return 0;
  // Guard absurd headlines / calendar years mistaken as counts
  if (n > 5_000_000) return 0;
  if (n >= 1900 && n <= 2100) return 0;
  return Math.floor(n);
}

function maxNear(
  text: string,
  patterns: RegExp[],
  evidence: string[],
  label: string,
): number {
  let max = 0;
  for (const re of patterns) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const n = parseNum(m[1] ?? m[2] ?? "0");
      if (n > max) {
        max = n;
        const snippet = m[0].replace(/\s+/g, " ").trim().slice(0, 80);
        if (snippet && evidence.length < 8) {
          evidence.push(`${label}: ${snippet}`);
        }
      }
    }
  }
  return max;
}

export function extractNewsImpact(title: string, summary?: string | null): NewsImpactExtract {
  const text = normalizeDigits(`${title} ${summary ?? ""}`);
  const evidence: string[] = [];

  const deaths = maxNear(
    text,
    [
      /(\d[\d,]*)\s*(?:জন\s*)?(?:নিহত|মৃত|মৃত্যু|killed|dead|deaths?)/gi,
      /(?:নিহত|মৃত|মৃত্যু|killed|dead|deaths?)[^\d]{0,24}(\d[\d,]*)/gi,
    ],
    evidence,
    "deaths",
  );

  const civilian_deaths = maxNear(
    text,
    [
      /(\d[\d,]*)\s*(?:জন\s*)?(?:সাধারণ\s*মানুষ|নাগরিক|ছাত্র|civil(?:ian)?s?|students?)\s*(?:নিহত|মৃত|killed|dead)/gi,
      /(?:সাধারণ\s*মানুষ|নাগরিক|ছাত্র|civil(?:ian)?s?|students?)[^\d]{0,20}(\d[\d,]*)\s*(?:জন\s*)?(?:নিহত|মৃত|killed|dead)/gi,
    ],
    evidence,
    "civilian",
  );

  const injuries = maxNear(
    text,
    [
      /(\d[\d,]*)\s*(?:জন\s*)?(?:আহত|injured|wounded)/gi,
      /(?:আহত|injured|wounded)[^\d]{0,24}(\d[\d,]*)/gi,
    ],
    evidence,
    "injured",
  );

  const homes_damaged = maxNear(
    text,
    [
      /(\d[\d,]*)\s*(?:টি\s*)?(?:বাড়ি|ঘর|গৃহ|বাসা|homes?|houses?|shelters?)\s*(?:ধ্বংস|বিধ্বস্ত|নষ্ট|ক্ষতিগ্রস্ত|destroyed|damaged|washed)/gi,
      /(?:বাড়ি|ঘর|homes?|houses?)[^\d]{0,24}(\d[\d,]*)/gi,
    ],
    evidence,
    "homes",
  );

  const livestock_lost = maxNear(
    text,
    [
      /(\d[\d,]*)\s*(?:টি\s*)?(?:গবাদি\s*পশু|পশু|গরু|ছাগল|মহিষ|হাঁস|মুরগি|livestock|cattle|poultry)\s*(?:মৃত|মারা|ডুবে|died|dead|lost)/gi,
      /(?:গবাদি\s*পশু|পশু|livestock|cattle|poultry)[^\d]{0,24}(\d[\d,]*)/gi,
    ],
    evidence,
    "livestock",
  );

  const damage_mentions =
    (text.match(/ক্ষতি|damage|loss of|washed away|ধ্বংস|বিধ্বস্ত|নষ্ট|vandal|ভাঙচুর/gi) ?? [])
      .length;

  return {
    deaths,
    civilian_deaths: Math.min(civilian_deaths || 0, deaths || civilian_deaths),
    injuries,
    homes_damaged,
    livestock_lost,
    damage_mentions,
    evidence: [...new Set(evidence)].slice(0, 6),
  };
}

export function mergeImpact(
  a: NewsImpactExtract,
  b: NewsImpactExtract,
): NewsImpactExtract {
  return {
    deaths: a.deaths + b.deaths,
    civilian_deaths: a.civilian_deaths + b.civilian_deaths,
    injuries: a.injuries + b.injuries,
    homes_damaged: a.homes_damaged + b.homes_damaged,
    livestock_lost: a.livestock_lost + b.livestock_lost,
    damage_mentions: a.damage_mentions + b.damage_mentions,
    evidence: [...a.evidence, ...b.evidence].slice(0, 10),
  };
}

export function emptyImpact(): NewsImpactExtract {
  return {
    deaths: 0,
    civilian_deaths: 0,
    injuries: 0,
    homes_damaged: 0,
    livestock_lost: 0,
    damage_mentions: 0,
    evidence: [],
  };
}

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function isHistoricalTally(impact: NewsImpactExtract): boolean {
  return impact.deaths >= HISTORICAL_DEATH_THRESHOLD || impact.injuries >= HISTORICAL_DEATH_THRESHOLD * 10;
}

function emptyDistrictRow(district: string): DistrictImpactRow {
  return {
    district,
    deaths: 0,
    civilian_deaths: 0,
    injuries: 0,
    homes_damaged: 0,
    livestock_lost: 0,
    damage_mentions: 0,
    death_mentions: 0,
    injury_mentions: 0,
  };
}

function shortEventLabel(title: string, district: string, day: string): string {
  const place = district === "National" ? "" : `${district} · `;
  const clean = title.replace(/\s+/g, " ").trim();
  const clipped = clean.length > 36 ? `${clean.slice(0, 34)}…` : clean;
  return `${place}${clipped || day}`;
}

/**
 * Conservative aggregation: within each district+day take MAX across headlines,
 * then sum across district-days. Avoids counting the same incident N times.
 */
export function aggregateSegmentedImpact(
  items: ImpactArticleInput[],
  windowDays: number,
  now = new Date(),
  disclaimers?: { bn?: string; en?: string },
): SegmentedNewsImpact {
  const since = new Date(now.getTime() - windowDays * 86400 * 1000);

  type Bucket = {
    deaths: number;
    civilian_deaths: number;
    injuries: number;
    homes_damaged: number;
    livestock_lost: number;
    damage_mentions: number;
    title: string;
    url: string | null;
    district: string;
    day: string;
  };

  const buckets = new Map<string, Bucket>();
  /** Totals use primary place only so multi-upazila fan-out does not inflate headline stats */
  const primaryBuckets = new Map<string, Bucket>();
  const districtMentions = new Map<
    string,
    { death_mentions: number; injury_mentions: number }
  >();

  let death_mentions = 0;
  let injury_mentions = 0;
  let article_count = 0;
  let raw_sum_deaths = 0;
  let excluded_historical_articles = 0;
  let excluded_historical_peak = 0;
  const evidence: string[] = [];

  for (const item of items) {
    const at = item.publishedAt instanceof Date ? item.publishedAt : new Date(item.publishedAt);
    if (Number.isNaN(at.getTime()) || at < since) continue;

    article_count += 1;
    const impact = item.impact;
    raw_sum_deaths += impact.deaths;

    if (impact.deaths > 0) death_mentions += 1;
    if (impact.injuries > 0) injury_mentions += 1;

    const placeList = (
      item.places?.length
        ? item.places
        : item.district && item.district !== "National"
          ? [item.district]
          : []
    )
      .map((p) => p.trim())
      .filter((p) => p.length > 0 && p !== "National" && p !== "জাতীয়");

    // No usable place → skip chart buckets (do not dump into জাতীয়)
    if (placeList.length === 0) {
      if (isHistoricalTally(impact)) {
        excluded_historical_articles += 1;
        excluded_historical_peak = Math.max(excluded_historical_peak, impact.deaths);
      }
      for (const e of impact.evidence) {
        if (evidence.length < 8 && !evidence.includes(e)) evidence.push(e);
      }
      continue;
    }

    if (isHistoricalTally(impact)) {
      excluded_historical_articles += 1;
      excluded_historical_peak = Math.max(excluded_historical_peak, impact.deaths);
      continue;
    }

    const day = dayKey(at);
    const title = (item.title ?? "").trim();
    const score =
      impact.deaths * 10 +
      impact.injuries * 3 +
      impact.homes_damaged +
      Math.min(impact.livestock_lost, 500);

    const upsert = (map: Map<string, Bucket>, district: string) => {
      const key = `${district}|${day}`;
      const prev = map.get(key);
      const prevScore = prev
        ? prev.deaths * 10 +
          prev.injuries * 3 +
          prev.homes_damaged +
          Math.min(prev.livestock_lost, 500)
        : -1;
      const bucketTitle = title || `${district} · ${day}`;
      const url = item.url ?? null;
      if (!prev) {
        map.set(key, {
          deaths: impact.deaths,
          civilian_deaths: impact.civilian_deaths,
          injuries: impact.injuries,
          homes_damaged: impact.homes_damaged,
          livestock_lost: impact.livestock_lost,
          damage_mentions: impact.damage_mentions,
          title: bucketTitle,
          url,
          district,
          day,
        });
      } else {
        map.set(key, {
          deaths: Math.max(prev.deaths, impact.deaths),
          civilian_deaths: Math.max(prev.civilian_deaths, impact.civilian_deaths),
          injuries: Math.max(prev.injuries, impact.injuries),
          homes_damaged: Math.max(prev.homes_damaged, impact.homes_damaged),
          livestock_lost: Math.max(prev.livestock_lost, impact.livestock_lost),
          damage_mentions: Math.max(prev.damage_mentions, impact.damage_mentions),
          title: score >= prevScore ? bucketTitle : prev.title,
          url: score >= prevScore ? url : prev.url,
          district,
          day,
        });
      }
    };

    upsert(primaryBuckets, placeList[0]!);

    for (const district of placeList) {
      const mention = districtMentions.get(district) ?? {
        death_mentions: 0,
        injury_mentions: 0,
      };
      if (impact.deaths > 0) mention.death_mentions += 1;
      if (impact.injuries > 0) mention.injury_mentions += 1;
      districtMentions.set(district, mention);
      upsert(buckets, district);
    }

    for (const e of impact.evidence) {
      if (evidence.length < 8 && !evidence.includes(e)) evidence.push(e);
    }
  }

  const byDistrictMap = new Map<string, DistrictImpactRow>();
  let deaths = 0;
  let civilian_deaths = 0;
  let injuries = 0;
  let homes_damaged = 0;
  let livestock_lost = 0;
  let damage_mentions = 0;

  for (const b of primaryBuckets.values()) {
    deaths += b.deaths;
    civilian_deaths += b.civilian_deaths;
    injuries += b.injuries;
    homes_damaged += b.homes_damaged;
    livestock_lost += b.livestock_lost;
    damage_mentions += b.damage_mentions;
  }

  const by_event: EventImpactRow[] = [];

  for (const [key, b] of buckets) {
    const row = byDistrictMap.get(b.district) ?? emptyDistrictRow(b.district);
    row.deaths += b.deaths;
    row.civilian_deaths += b.civilian_deaths;
    row.injuries += b.injuries;
    row.homes_damaged += b.homes_damaged;
    row.livestock_lost += b.livestock_lost;
    row.damage_mentions += b.damage_mentions;
    byDistrictMap.set(b.district, row);

    if (
      b.deaths > 0 ||
      b.injuries > 0 ||
      b.homes_damaged > 0 ||
      b.livestock_lost > 0
    ) {
      by_event.push({
        id: key,
        label: shortEventLabel(b.title, b.district, b.day),
        title: b.title,
        district: b.district,
        day: b.day,
        deaths: b.deaths,
        injuries: b.injuries,
        civilian_deaths: b.civilian_deaths,
        homes_damaged: b.homes_damaged,
        livestock_lost: b.livestock_lost,
        url: b.url,
      });
    }
  }

  for (const [district, m] of districtMentions) {
    const row = byDistrictMap.get(district) ?? emptyDistrictRow(district);
    row.death_mentions = m.death_mentions;
    row.injury_mentions = m.injury_mentions;
    byDistrictMap.set(district, row);
  }

  const severity = (r: {
    deaths: number;
    injuries: number;
    homes_damaged: number;
    livestock_lost: number;
  }) =>
    r.deaths * 1000 +
    r.injuries * 100 +
    r.homes_damaged * 10 +
    Math.min(r.livestock_lost, 200);

  const by_district = [...byDistrictMap.values()]
    .filter(
      (r) =>
        r.deaths > 0 ||
        r.injuries > 0 ||
        r.homes_damaged > 0 ||
        r.livestock_lost > 0 ||
        r.death_mentions > 0,
    )
    .sort((a, b) => severity(b) - severity(a) || a.district.localeCompare(b.district, "bn"))
    .slice(0, 48);

  by_event.sort(
    (a, b) =>
      severity({
        deaths: b.deaths,
        injuries: b.injuries,
        homes_damaged: b.homes_damaged ?? 0,
        livestock_lost: b.livestock_lost ?? 0,
      }) -
        severity({
          deaths: a.deaths,
          injuries: a.injuries,
          homes_damaged: a.homes_damaged ?? 0,
          livestock_lost: a.livestock_lost ?? 0,
        }) ||
      b.day.localeCompare(a.day),
  );

  return {
    window_days: windowDays,
    method: "max_per_district_day",
    deaths,
    civilian_deaths,
    injuries,
    homes_damaged,
    livestock_lost,
    damage_mentions,
    death_mentions,
    injury_mentions,
    article_count,
    raw_sum_deaths,
    excluded_historical_articles,
    excluded_historical_peak,
    by_district,
    by_event: by_event.slice(0, 48),
    evidence,
    tally_kind: "NEWS_DERIVED",
    disclaimer_bn:
      disclaimers?.bn ??
      "আনুমানিক = একই উপজেলা/জেলা × দিনে খবরের সর্বোচ্চ (যোগ নয়)। নিহত, আহত, ঘর, গবাদি পশু — খবরে যে স্থান নাম আছে সেখানেই। অফিসিয়াল হিসাব নয়।",
    disclaimer_en:
      disclaimers?.en ??
      "Estimate = max per upazila/district × day. Deaths, injuries, homes, livestock at each named place. Not an official tally.",
  };
}

export function buildImpactWindows(
  items: ImpactArticleInput[],
  windows: number[] = [1, 7, 30],
  now = new Date(),
  disclaimers?: { bn?: string; en?: string },
): Record<string, SegmentedNewsImpact> {
  const out: Record<string, SegmentedNewsImpact> = {};
  for (const days of windows) {
    out[String(days)] = aggregateSegmentedImpact(items, days, now, disclaimers);
  }
  return out;
}
