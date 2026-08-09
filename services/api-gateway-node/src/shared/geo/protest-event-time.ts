/**
 * Infer when a protest actually happened from news text.
 * Today's article about July 2024 deaths ≠ an active protest today.
 */

export type TemporalClass = "live" | "historical" | "commemoration";

export interface ProtestEventTime {
  temporal_class: TemporalClass;
  /** Bucket key segment — live vs named historical era */
  era_id: string;
  /** Best guess of when the protest occurred (not publish time) */
  event_at: Date;
  period_en: string;
  period_bn: string;
  reason: string;
}

const BN_YEAR: Record<string, string> = {
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

function toAsciiDigits(text: string): string {
  return text.replace(/[০-৯]/g, (d) => BN_YEAR[d] ?? d);
}

/** Known historical protest eras — still mentioned in fresh news/commemorations */
const KNOWN_ERAS: Array<{
  id: string;
  eventAt: Date;
  period_en: string;
  period_bn: string;
  patterns: RegExp[];
}> = [
  {
    id: "july_uprising_2024",
    eventAt: new Date("2024-07-16T00:00:00+06:00"),
    period_en: "July–August 2024 uprising",
    period_bn: "জুলাই–আগস্ট ২০২৪ অভ্যুত্থান",
    patterns: [
      /জুলাই\s*(?:মাসের?\s*)?(?:আন্দোলন|অভ্যুত্থান|বিপ্লব|গণঅভ্যুত্থান)/,
      /জুলাই.?আগস্ট/,
      /আগস্ট\s*অভ্যুত্থান/,
      /july\s*(?:uprising|revolution|movement|massacre|protest)/i,
      /anti-?discrimination\s*student\s*movement/i,
      /student.?led\s*(?:july|uprising)/i,
      /৫\s*আগস্ট/,
      /5(?:th)?\s*august\s*2024/i,
      /august\s*5,?\s*2024/i,
      /কোটা\s*(?:আন্দোলন|সংস্কার).{0,48}(২০২৪|2024)/,
      /(২০২৪|2024).{0,48}কোটা\s*(?:আন্দোলন|সংস্কার)/,
      /quota\s*(?:reform\s*)?(?:protest|movement).{0,40}2024/i,
    ],
  },
  {
    id: "shapla_2013",
    eventAt: new Date("2013-05-05T00:00:00+06:00"),
    period_en: "Shapla / Hefazat 2013",
    period_bn: "শাপলা চত্বর / হেফাজত ২০১৩",
    patterns: [/শাপলা\s*চত্বর/, /shapla\s*chattar/i, /হেফাজতে ইসলাম.{0,20}২০১৩/, /hefazat.{0,20}2013/i],
  },
];

const RETRO_MARKERS = [
  /স্মরণ/,
  /শ্রদ্ধা/,
  /মৃত্যুবার্ষিকী/,
  /বার্ষিকী/,
  /শহীদ/,
  /নিহতদের?\s*(?:তালিকা|সংখ্যা|স্মরণ)/,
  /commemorat/i,
  /anniversary/i,
  /martyrs?\s+of/i,
  /remembering/i,
  /হয়েছিল/,
  /ঘটেছিল/,
  /ছিল\b/,
  /last year/i,
  /a year ago/i,
  /two years ago/i,
  /death toll/i,
];

/** Days after event_at before a matched era is forced historical */
const ERA_LIVE_WINDOW_DAYS = 45;

function formatPeriod(d: Date, lang: "en" | "bn"): string {
  const y = d.getFullYear();
  const monthsEn = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const monthsBn = [
    "জানুয়ারি",
    "ফেব্রুয়ারি",
    "মার্চ",
    "এপ্রিল",
    "মে",
    "জুন",
    "জুলাই",
    "আগস্ট",
    "সেপ্টেম্বর",
    "অক্টোবর",
    "নভেম্বর",
    "ডিসেম্বর",
  ];
  const m = d.getMonth();
  return lang === "bn" ? `${monthsBn[m]} ${y}` : `${monthsEn[m]} ${y}`;
}

function ageDays(from: Date, to: Date): number {
  return (to.getTime() - from.getTime()) / 86_400_000;
}

function parseExplicitPastDate(text: string, publishedAt: Date, now: Date): Date | null {
  const normalized = toAsciiDigits(text);

  // "July 2024", "জুলাই 2024", "জুলাই, ২০২৪"
  const monthYear =
    /(?:january|february|march|april|may|june|july|august|september|october|november|december|জানুয়ারি|ফেব্রুয়ারি|মার্চ|এপ্রিল|মে|জুন|জুলাই|আগস্ট|সেপ্টেম্বর|অক্টোবর|নভেম্বর|ডিসেম্বর)\s*,?\s*(20[0-2]\d)/i.exec(
      normalized,
    );
  if (monthYear) {
    const year = Number(monthYear[1]);
    const monthToken = monthYear[0].toLowerCase();
    const monthMap: Record<string, number> = {
      january: 0,
      february: 1,
      march: 2,
      april: 3,
      may: 4,
      june: 5,
      july: 6,
      august: 7,
      september: 8,
      october: 9,
      november: 10,
      december: 11,
      জানুয়ারি: 0,
      ফেব্রুয়ারি: 1,
      মার্চ: 2,
      এপ্রিল: 3,
      মে: 4,
      জুন: 5,
      জুলাই: 6,
      আগস্ট: 7,
      সেপ্টেম্বর: 8,
      অক্টোবর: 9,
      নভেম্বর: 10,
      ডিসেম্বর: 11,
    };
    let month = 6;
    for (const [k, v] of Object.entries(monthMap)) {
      if (monthToken.includes(k)) {
        month = v;
        break;
      }
    }
    const guessed = new Date(year, month, 15);
    if (ageDays(guessed, now) > ERA_LIVE_WINDOW_DAYS) return guessed;
  }

  // Bare year older than current publish year (e.g. "... in 2024")
  const years = [...normalized.matchAll(/\b(20[0-2]\d)\b/g)].map((m) => Number(m[1]));
  const pubYear = publishedAt.getFullYear();
  const pastYears = years.filter((y) => y < pubYear && y >= 2000);
  if (pastYears.length > 0) {
    const y = Math.min(...pastYears);
    const guessed = new Date(y, 6, 1);
    if (ageDays(guessed, now) > ERA_LIVE_WINDOW_DAYS) return guessed;
  }

  return null;
}

/**
 * Read the article body and decide if the protest is live now or a past event
 * being reported / commemorated.
 */
export function inferProtestEventTime(
  title: string,
  summary: string | null | undefined,
  publishedAt: Date,
  now = new Date(),
): ProtestEventTime {
  const text = `${title} ${summary ?? ""}`;
  const retro = RETRO_MARKERS.some((p) => p.test(text));

  for (const era of KNOWN_ERAS) {
    if (!era.patterns.some((p) => p.test(text))) continue;
    const eraAge = ageDays(era.eventAt, now);
    if (eraAge > ERA_LIVE_WINDOW_DAYS || retro) {
      return {
        temporal_class: retro ? "commemoration" : "historical",
        era_id: era.id,
        event_at: era.eventAt,
        period_en: era.period_en,
        period_bn: era.period_bn,
        reason: retro
          ? `commemoration_of_${era.id}`
          : `named_era_${era.id}`,
      };
    }
  }

  const explicit = parseExplicitPastDate(text, publishedAt, now);
  if (explicit) {
    return {
      temporal_class: retro ? "commemoration" : "historical",
      era_id: `year_${explicit.getFullYear()}`,
      event_at: explicit,
      period_en: formatPeriod(explicit, "en"),
      period_bn: formatPeriod(explicit, "bn"),
      reason: retro ? "retrospective_year" : "explicit_past_date",
    };
  }

  // Fresh news about a current protest — event ≈ publish time
  return {
    temporal_class: "live",
    era_id: "live",
    event_at: publishedAt,
    period_en: formatPeriod(publishedAt, "en"),
    period_bn: formatPeriod(publishedAt, "bn"),
    reason: "publish_as_event",
  };
}

export function isHistoricalTemporal(cls: TemporalClass): boolean {
  return cls === "historical" || cls === "commemoration";
}
