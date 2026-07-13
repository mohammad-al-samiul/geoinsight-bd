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

export interface NewsImpactExtract {
  deaths: number;
  civilian_deaths: number;
  injuries: number;
  homes_damaged: number;
  livestock_lost: number;
  damage_mentions: number;
  evidence: string[];
}

function normalizeDigits(text: string): string {
  return text.replace(/[০-৯]/g, (d) => BN_DIGITS[d] ?? d);
}

function parseNum(raw: string): number {
  const n = Number(String(raw).replace(/,/g, ""));
  if (!Number.isFinite(n) || n < 0) return 0;
  // Guard absurd headlines / years
  if (n > 5_000_000) return 0;
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
