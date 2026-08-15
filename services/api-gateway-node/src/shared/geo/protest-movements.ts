/**
 * Cluster unrest news into named protest movements by place + theme.
 * Example: "HSC exam postponement — Chattogram" with casualties & sources.
 */

import { extractNewsPlaces } from "./news-place-matcher";
import { extractNewsImpact, type NewsImpactExtract } from "../impact/news-impact";
import {
  inferProtestEventTime,
  isHistoricalTemporal,
  type TemporalClass,
} from "./protest-event-time";
import bdDistricts from "./data/bd-districts.json";

export type MovementStatus = "active" | "recent" | "cooling" | "historical";

export interface ProtestMovementArticle {
  id: string;
  title: string;
  url: string;
  source_name: string;
  published_at: string;
}

export interface ProtestMovement {
  id: string;
  title: string;
  title_bn: string;
  theme_id: string;
  theme: string;
  theme_bn: string;
  /** Political actor / party organizing or leading the protest */
  party_id: string;
  party: string;
  party_bn: string;
  place: string;
  place_bn: string;
  district: string | null;
  division: string | null;
  status: MovementStatus;
  status_bn: string;
  status_en: string;
  /** When the protest itself happened (inferred) — not news publish time */
  event_at: string;
  event_period_en: string;
  event_period_bn: string;
  temporal_class: TemporalClass;
  first_seen_at: string;
  last_seen_at: string;
  article_count: number;
  severity: number;
  impact: NewsImpactExtract;
  summary_bn: string;
  summary_en: string;
  articles: ProtestMovementArticle[];
  /** Map pin (district centroid / national fallback) */
  lat: number | null;
  lng: number | null;
  /** 0–1 confidence from unique outlets × article volume */
  source_confidence: number;
  unique_sources: number;
  /** Chronological event trail for timeline UI */
  timeline: Array<{ at: string; title: string; source_name: string; url: string }>;
  /** Desk-submitted field pin — not a news cluster */
  source?: "news" | "citizen";
}

const DISTRICT_COORDS = new Map(
  (bdDistricts as { districts: Array<{ name: string; lat: string; long: string }> }).districts.map(
    (d) => [d.name.toLowerCase(), { lat: Number(d.lat), lng: Number(d.long) }] as const,
  ),
);

const DIVISION_COORDS: Record<string, { lat: number; lng: number }> = {
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

function coordsForPlace(district: string | null, division: string | null, place: string): {
  lat: number | null;
  lng: number | null;
} {
  const candidates = [district, place, division]
    .filter(Boolean)
    .map((s) =>
      String(s)
        .toLowerCase()
        .replace("chittagong", "chattogram")
        .replace("barisal", "barishal")
        .trim(),
    );

  for (const key of candidates) {
    const hit = DISTRICT_COORDS.get(key);
    if (hit && Number.isFinite(hit.lat) && Number.isFinite(hit.lng)) return hit;
  }
  for (const key of candidates) {
    const div = DIVISION_COORDS[key];
    if (div) return div;
  }
  if (place === "National") return { lat: 23.685, lng: 90.3563 };
  return { lat: null, lng: null };
}

function sourceConfidence(articles: ProtestMovementArticle[]): {
  source_confidence: number;
  unique_sources: number;
} {
  const unique = new Set(articles.map((a) => a.source_name.trim().toLowerCase()).filter(Boolean));
  const unique_sources = unique.size || 1;
  const volume = Math.min(1, articles.length / 6);
  const diversity = Math.min(1, unique_sources / 4);
  return {
    unique_sources,
    source_confidence: Number((0.35 * volume + 0.65 * diversity).toFixed(2)),
  };
}

export interface MovementSignalInput {
  id: string;
  title: string;
  summary?: string | null;
  category: string;
  severity: number;
  district: string | null;
  division: string | null;
  source_name: string;
  url: string;
  published_at: string | null;
  impact: NewsImpactExtract;
}

const THEME_RULES: Array<{
  id: string;
  label_en: string;
  label_bn: string;
  patterns: RegExp[];
}> = [
  {
    id: "july_uprising",
    label_en: "July 2024 uprising (historical)",
    label_bn: "জুলাই ২০২৪ অভ্যুত্থান (ঐতিহাসিক)",
    patterns: [
      /জুলাই\s*(?:মাসের?\s*)?(?:আন্দোলন|অভ্যুত্থান|বিপ্লব|গণঅভ্যুত্থান)/,
      /জুলাই.?আগস্ট/,
      /july\s*(?:uprising|revolution|movement|massacre)/i,
      /anti-?discrimination\s*student\s*movement/i,
      /৫\s*আগস্ট/,
      /5(?:th)?\s*august\s*2024/i,
    ],
  },
  {
    id: "hsc_exam",
    label_en: "HSC exam protest",
    label_bn: "এইচএসসি পরীক্ষা আন্দোলন",
    patterns: [
      /hsc/i,
      /এইচ\s*এস\s*সি/,
      /উচ্চ মাধ্যমিক/,
      /পরীক্ষা\s*স্থগিত/,
      /exam\s*postpon/i,
      /পরীক্ষা.*বাতিল/,
      /বাতিল.*পরীক্ষা/,
    ],
  },
  {
    id: "ssc_exam",
    label_en: "SSC exam protest",
    label_bn: "এসএসসি পরীক্ষা আন্দোলন",
    patterns: [/ssc/i, /এস\s*এস\s*সি/, /মাধ্যমিক পরীক্ষা/],
  },
  {
    id: "quota",
    label_en: "Quota reform protest",
    label_bn: "কোটা সংস্কার আন্দোলন",
    patterns: [/কোটা/, /quota/i],
  },
  {
    id: "corruption",
    label_en: "Anti-corruption protest",
    label_bn: "দুর্নীতি বিরোধী আন্দোলন",
    patterns: [/দুর্নীতি/, /corruption/i, /ঘুষ/, /bribe/i, /অনিয়ম/, /embezzle/i],
  },
  {
    id: "road_transport",
    label_en: "Transport / road protest",
    label_bn: "পরিবহন/সড়ক আন্দোলন",
    patterns: [
      /বাস/,
      /ট্রাক/,
      /rickshaw/i,
      /অটোরিকশা/,
      /পরিবহন/,
      /transport/i,
      /fare hike/i,
      /ভাড়া/,
      /সড়ক/,
      /মহাসড়ক/,
      /traffic jam/i,
      /যানজট/,
    ],
  },
  {
    id: "power",
    label_en: "Electricity tariff / load-shedding protest",
    label_bn: "বিদ্যুৎ দাম/লোডশেডিং আন্দোলন",
    patterns: [
      /বিদ্যুৎ/,
      /বিদ্যুত/,
      /লোডশেডিং/,
      /load.?shedding/i,
      /electricity/i,
      /power\s*(tariff|price|bill|hike)/i,
      /blackout/i,
      /পাওয়ার কাট/,
      /ডিইএসসিও/,
      /\bdesco\b/i,
      /\bpdb\b/i,
      /পাওয়ার ডেভেলপমেন্ট/,
      /বিদ্যুৎ\s*(দাম|বিল|মূল্য)/,
      /(দাম|মূল্য|বিল).{0,12}বিদ্যুৎ/,
      /বিদ্যুৎ.{0,12}(দাম|মূল্য|বিল|বৃদ্ধি)/,
      /electricity\s*(price|tariff|rate)/i,
    ],
  },
  {
    id: "gas_fuel",
    label_en: "Gas / fuel price protest",
    label_bn: "গ্যাস/জ্বালানি দাম আন্দোলন",
    patterns: [
      /গ্যাস/,
      /\bgas\b/i,
      /জ্বালানি/,
      /petrol/i,
      /octane/i,
      /সিএনজি/,
      /\bcng\b/i,
      /ডিজেল/,
      /diesel/i,
      /তিতাস/,
      /\btitas\b/i,
      /\blng\b/i,
      /এলএনজি/,
      /গ্যাস\s*(দাম|মূল্য|বিল)/,
      /(দাম|মূল্য|বিল).{0,12}গ্যাস/,
      /গ্যাস.{0,12}(দাম|মূল্য|বিল|বৃদ্ধি)/,
      /fuel\s*(price|tariff|hike)/i,
      /gas\s*(price|tariff|hike)/i,
    ],
  },
  {
    id: "political_opposition",
    label_en: "Opposition / political protest",
    label_bn: "বিরোধী দল/রাজনৈতিক আন্দোলন",
    patterns: [
      /বিরোধী\s*দল/,
      /বিরোধী\s*নেতা/,
      /সরকার\s*বিরোধী/,
      /বিএনপি/,
      /\bbnp\b/i,
      /জামায়াত/,
      /জাতীয়\s*পার্টি/,
      /opposition\s*(party|leader|rally|protest)/i,
      /anti-?government/i,
      /প্রতিবাদ\s*সভা/,
      /গণসমাবেশ/,
      /রাজনৈতিক\s*(সমাবেশ|মিছিল|আন্দোলন)/,
    ],
  },
  {
    id: "law_bill",
    label_en: "Law / bill protest",
    label_bn: "আইন/বিল বিরোধী আন্দোলন",
    patterns: [/আইন/, /বিল/, /\bbill\b/i, /ordinance/i, /অধ্যাদেশ/, /legislation/i],
  },
  {
    id: "wage",
    label_en: "Wage / RMG protest",
    label_bn: "মজুরি/পোশাক শ্রমিক আন্দোলন",
    patterns: [/মজুরি/, /বেতন/, /wage/i, /salary/i, /rmg/i, /গার্মেন্ট/, /শ্রমিক/],
  },
  {
    id: "student",
    label_en: "Student protest",
    label_bn: "ছাত্র আন্দোলন",
    patterns: [/ছাত্র/, /ছাত্রী/, /student/i, /campus/i, /বিশ্ববিদ্যালয়/, /university/i, /কলেজ/, /college/i],
  },
  {
    id: "land_eviction",
    label_en: "Land / eviction protest",
    label_bn: "ভূমি/উচ্ছেদ আন্দোলন",
    patterns: [/উচ্ছেদ/, /evict/i, /ভূমি/, /জমি অধিগ্রহণ/, /land grab/i],
  },
  {
    id: "farmer",
    label_en: "Farmer protest",
    label_bn: "কৃষক আন্দোলন",
    patterns: [/কৃষক/, /farmer/i, /কৃষি/, /সার/, /fertilizer/i, /ধান/, /paddy/i],
  },
  {
    id: "water_flood",
    label_en: "Waterlogging / flood protest",
    label_bn: "জলাবদ্ধতা/বন্যা আন্দোলন",
    patterns: [/জলাবদ্ধ/, /waterlog/i, /বন্যা/, /flood/i, /পানি নিষ্কাশন/, /ড্রেন/],
  },
  {
    id: "hartal_blockade",
    label_en: "Hartal / blockade",
    label_bn: "হরতাল/অবরোধ",
    patterns: [/হরতাল/, /hartal/i, /অবরোধ/, /blockade/i, /shutdown/i],
  },
  {
    id: "minority",
    label_en: "Minority / communal protest",
    label_bn: "সংখ্যালঘু/সাম্প্রদায়িক আন্দোলন",
    patterns: [/সংখ্যালঘু/, /minority/i, /hindu/i, /হিন্দু/, /মন্দির/, /temple/i, /সাম্প্রদায়িক/],
  },
];

const PARTY_RULES: Array<{
  id: string;
  label_en: string;
  label_bn: string;
  patterns: RegExp[];
}> = [
  {
    id: "bnp",
    label_en: "BNP",
    label_bn: "বিএনপি",
    patterns: [/বিএনপি/, /\bbnp\b/i, /bangladesh nationalist party/i, /ছাত্রদল/],
  },
  {
    id: "jamaat",
    label_en: "Jamaat-e-Islami",
    label_bn: "জামায়াতে ইসলামী",
    patterns: [/জামায়াত/, /জামায়াত/, /jamaat/i, /শিবির/, /islami chhatra shibir/i],
  },
  {
    id: "ncp",
    label_en: "NCP",
    label_bn: "এনসিপি",
    patterns: [
      /\bncp\b/i,
      /এনসিপি/,
      /জাতীয় নাগরিক পার্টি/,
      /জাতীয় নাগরিক পার্টি/,
      /national citizen(?:s)? party/i,
    ],
  },
  {
    id: "jatiya_party",
    label_en: "Jatiya Party",
    label_bn: "জাতীয় পার্টি",
    patterns: [/জাতীয় পার্টি/, /জাতীয় পার্টি/, /jatiya party/i],
  },
  {
    id: "awami_league",
    label_en: "Awami League",
    label_bn: "আওয়ামী লীগ",
    patterns: [/আওয়ামী লীগ/, /আওয়ামী লীগ/, /awami league/i, /ছাত্রলীগ/],
  },
  {
    id: "left_alliance",
    label_en: "Left / alliance",
    label_bn: "বাম/জোট",
    patterns: [/বামপন্থী/, /কমিউনিস্ট/, /\bcpb\b/i, /বাসদ/, /গণফোরাম/, /left alliance/i],
  },
  {
    id: "student_org",
    label_en: "Student organizations",
    label_bn: "ছাত্র সংগঠন",
    patterns: [/ছাত্র সংগঠন/, /ছাত্রসমাজ/, /student union/i, /সংশ্লিষ্ট ছাত্র/],
  },
  {
    id: "labour_union",
    label_en: "Labour / trade union",
    label_bn: "শ্রমিক সংগঠন",
    patterns: [/শ্রমিক সংঘ/, /ট্রেড ইউনিয়ন/, /trade union/i, /গার্মেন্ট শ্রমিক/, /শ্রমিক আন্দোলন/],
  },
  {
    id: "civil_society",
    label_en: "Civil society / citizens",
    label_bn: "নাগরিক সমাজ",
    patterns: [/নাগরিক সমাজ/, /civil society/i, /মানবাধিকার/, /সাংবাদিক/, /journalist/i],
  },
];

function pickParty(text: string): { id: string; label_en: string; label_bn: string } {
  for (const rule of PARTY_RULES) {
    if (rule.patterns.some((p) => p.test(text))) {
      return { id: rule.id, label_en: rule.label_en, label_bn: rule.label_bn };
    }
  }
  return {
    id: "unaffiliated",
    label_en: "Unaffiliated / public",
    label_bn: "অদলীয় / সাধারণ জনতা",
  };
}

/**
 * When multiple themes match one article, prefer issue/utility/politics over
 * broad student/exam tags so gas–power price protests are not buried.
 */
const THEME_MATCH_PRIORITY: Record<string, number> = {
  july_uprising: 1,
  power: 10,
  gas_fuel: 10,
  hartal_blockade: 20,
  political_opposition: 30,
  wage: 40,
  road_transport: 45,
  corruption: 50,
  law_bill: 55,
  quota: 60,
  farmer: 65,
  land_eviction: 70,
  water_flood: 75,
  minority: 80,
  hsc_exam: 90,
  ssc_exam: 91,
  student: 95,
  general: 100,
};

/** Stable display order for category sections — issue themes first */
export const THEME_DISPLAY_ORDER = [
  "power",
  "gas_fuel",
  "political_opposition",
  "hartal_blockade",
  "road_transport",
  "wage",
  "corruption",
  "law_bill",
  "quota",
  "july_uprising",
  "farmer",
  "land_eviction",
  "water_flood",
  "minority",
  "hsc_exam",
  "ssc_exam",
  "student",
  "general",
] as const;

const ACTIVE_DAYS = 5;
const RECENT_DAYS = 14;

function pickTheme(text: string): { id: string; label_en: string; label_bn: string } {
  const hits = THEME_RULES.filter((rule) => rule.patterns.some((p) => p.test(text)));
  if (hits.length === 0) {
    return {
      id: "general",
      label_en: "Public protest",
      label_bn: "জন আন্দোলন / বিক্ষোভ",
    };
  }
  hits.sort(
    (a, b) =>
      (THEME_MATCH_PRIORITY[a.id] ?? 99) - (THEME_MATCH_PRIORITY[b.id] ?? 99),
  );
  const best = hits[0]!;
  return { id: best.id, label_en: best.label_en, label_bn: best.label_bn };
}

function resolvePlace(input: MovementSignalInput): {
  place: string;
  place_bn: string;
  district: string | null;
  division: string | null;
} {
  const blob = `${input.title} ${input.summary ?? ""}`;
  const hits = extractNewsPlaces(blob);
  const fine = hits.find((h) => h.kind === "locality" || h.kind === "upazila");
  const hit = fine ?? hits[0];

  if (hit) {
    return {
      place: hit.label_en,
      place_bn: hit.label_bn || hit.label,
      district: hit.district_en || input.district,
      division: hit.division_en || input.division,
    };
  }

  if (input.district) {
    return {
      place: input.district,
      place_bn: input.district,
      district: input.district,
      division: input.division,
    };
  }

  return {
    place: "National",
    place_bn: "জাতীয় / একাধিক জেলা",
    district: null,
    division: input.division,
  };
}

function maxImpact(a: NewsImpactExtract, b: NewsImpactExtract): NewsImpactExtract {
  return {
    deaths: Math.max(a.deaths, b.deaths),
    civilian_deaths: Math.max(a.civilian_deaths, b.civilian_deaths),
    injuries: Math.max(a.injuries, b.injuries),
    homes_damaged: Math.max(a.homes_damaged, b.homes_damaged),
    livestock_lost: Math.max(a.livestock_lost, b.livestock_lost),
    damage_mentions: Math.max(a.damage_mentions, b.damage_mentions),
    evidence: [...a.evidence, ...b.evidence].slice(0, 8),
  };
}

function statusFor(
  eventAt: Date,
  now: Date,
  temporal: TemporalClass,
): {
  status: MovementStatus;
  status_bn: string;
  status_en: string;
} {
  if (isHistoricalTemporal(temporal)) {
    return {
      status: "historical",
      status_bn:
        temporal === "commemoration" ? "ঐতিহাসিক / স্মরণসূচক" : "ঐতিহাসিক আন্দোলন",
      status_en:
        temporal === "commemoration" ? "Historical / commemorative" : "Historical",
    };
  }
  // Live protests: age by when the event happened, not by fresh commentary alone
  const ageDays = (now.getTime() - eventAt.getTime()) / 86_400_000;
  if (ageDays <= ACTIVE_DAYS) {
    return { status: "active", status_bn: "চলমান / সক্রিয়", status_en: "Active now" };
  }
  if (ageDays <= RECENT_DAYS) {
    return { status: "recent", status_bn: "সাম্প্রতিক", status_en: "Recent" };
  }
  return { status: "cooling", status_bn: "ঠান্ডা পড়ছে", status_en: "Cooling" };
}

function cleanHeadline(title: string): string {
  return title
    .replace(/\s*[-–|]\s*(The Daily Star|Prothom Alo|BSS|BDNews24|Al Jazeera).*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Build protest movements from classified unrest signals.
 * Prefer protest / law_reaction; include govt_discontent when place+theme clear.
 */
export function clusterProtestMovements(
  signals: MovementSignalInput[],
  now = new Date(),
): ProtestMovement[] {
  const since = new Date(now.getTime() - RECENT_DAYS * 86_400_000);
  const eligible = signals.filter((s) => {
    if (!s.published_at) return false;
    const at = new Date(s.published_at);
    if (at < since) return false;
    return (
      s.category === "protest" ||
      s.category === "law_reaction" ||
      s.category === "govt_discontent"
    );
  });

  type Bucket = {
    themeId: string;
    themeEn: string;
    themeBn: string;
    partyId: string;
    partyEn: string;
    partyBn: string;
    partyVotes: Map<string, number>;
    place: string;
    placeBn: string;
    district: string | null;
    division: string | null;
    severity: number;
    impact: NewsImpactExtract;
    articles: ProtestMovementArticle[];
    first: Date;
    last: Date;
    bestTitle: string;
    eventAt: Date;
    temporalClass: TemporalClass;
    periodEn: string;
    periodBn: string;
    eraId: string;
  };

  const buckets = new Map<string, Bucket>();

  for (const signal of eligible) {
    const text = `${signal.title} ${signal.summary ?? ""}`;
    const publishedAt = new Date(signal.published_at!);
    const eventTime = inferProtestEventTime(signal.title, signal.summary, publishedAt, now);
    const theme = pickTheme(text);
    const party = pickParty(text);
    const place = resolvePlace(signal);
    // Issue + party + place + era — July 2024 news must not merge into today's protests
    const key = `${theme.id}::${party.id}::${place.place.toLowerCase()}::${eventTime.era_id}`;
    const impact =
      signal.impact.deaths + signal.impact.injuries > 0
        ? signal.impact
        : extractNewsImpact(signal.title, signal.summary);

    const prev = buckets.get(key);
    const article: ProtestMovementArticle = {
      id: signal.id,
      title: signal.title,
      url: signal.url,
      source_name: signal.source_name,
      published_at: signal.published_at!,
    };

    if (!prev) {
      buckets.set(key, {
        themeId: theme.id,
        themeEn: theme.label_en,
        themeBn: theme.label_bn,
        partyId: party.id,
        partyEn: party.label_en,
        partyBn: party.label_bn,
        partyVotes: new Map([[party.id, 1]]),
        place: place.place,
        placeBn: place.place_bn,
        district: place.district,
        division: place.division,
        severity: signal.severity,
        impact: { ...impact },
        articles: [article],
        first: publishedAt,
        last: publishedAt,
        bestTitle: cleanHeadline(signal.title),
        eventAt: eventTime.event_at,
        temporalClass: eventTime.temporal_class,
        periodEn: eventTime.period_en,
        periodBn: eventTime.period_bn,
        eraId: eventTime.era_id,
      });
      continue;
    }

    prev.severity = Math.max(prev.severity, signal.severity);
    prev.impact = maxImpact(prev.impact, impact);
    prev.articles.push(article);
    prev.partyVotes.set(party.id, (prev.partyVotes.get(party.id) ?? 0) + 1);
    if (publishedAt < prev.first) prev.first = publishedAt;
    if (publishedAt > prev.last) {
      prev.last = publishedAt;
      prev.bestTitle = cleanHeadline(signal.title);
    }
    // Prefer earliest event_at within the era; keep strongest historical class
    if (eventTime.event_at < prev.eventAt) prev.eventAt = eventTime.event_at;
    if (
      eventTime.temporal_class === "commemoration" ||
      (eventTime.temporal_class === "historical" && prev.temporalClass === "live")
    ) {
      prev.temporalClass = eventTime.temporal_class;
      prev.periodEn = eventTime.period_en;
      prev.periodBn = eventTime.period_bn;
    }
    if (!prev.district && place.district) prev.district = place.district;
    if (!prev.division && place.division) prev.division = place.division;
  }

  const movements: ProtestMovement[] = [];

  for (const [key, b] of buckets) {
    // Need at least one clear protest signal; drop lonely weak National+general
    if (b.articles.length === 1 && b.themeId === "general" && b.place === "National") {
      continue;
    }

    // july_uprising theme is always historical once past the live window
    let temporal = b.temporalClass;
    if (b.themeId === "july_uprising" || b.eraId !== "live") {
      if (!isHistoricalTemporal(temporal)) temporal = "historical";
    }

    const st = statusFor(b.eventAt, now, temporal);
    const deaths = b.impact.deaths;
    const injuries = b.impact.injuries;
    const damage = b.impact.homes_damaged + b.impact.damage_mentions;

    // Majority party vote across articles in this bucket
    let partyId = b.partyId;
    let partyEn = b.partyEn;
    let partyBn = b.partyBn;
    let bestVotes = 0;
    for (const [pid, votes] of b.partyVotes) {
      if (votes > bestVotes) {
        bestVotes = votes;
        const rule = PARTY_RULES.find((r) => r.id === pid);
        if (rule) {
          partyId = rule.id;
          partyEn = rule.label_en;
          partyBn = rule.label_bn;
        } else if (pid === "unaffiliated") {
          partyId = "unaffiliated";
          partyEn = "Unaffiliated / public";
          partyBn = "অদলীয় / সাধারণ জনতা";
        }
      }
    }

    const whenBn = `সময়: ${b.periodBn}`;
    const whenEn = `when: ${b.periodEn}`;
    const summary_bn = [
      `${b.placeBn}-এ ${b.themeBn}`,
      whenBn,
      `দল: ${partyBn}`,
      b.division ? `বিভাগ: ${b.division}` : null,
      `${b.articles.length}টি সংবাদ`,
      deaths > 0 ? `নিহত ${deaths}` : null,
      injuries > 0 ? `আহত ${injuries}` : null,
      damage > 0 ? `ক্ষতির উল্লেখ` : null,
      st.status === "historical" ? "আজকের চলমান আন্দোলন নয়" : null,
    ]
      .filter(Boolean)
      .join(" · ");

    const summary_en = [
      `${b.themeEn} in ${b.place}`,
      whenEn,
      `party: ${partyEn}`,
      b.division ? `division: ${b.division}` : null,
      `${b.articles.length} reports`,
      deaths > 0 ? `${deaths} dead` : null,
      injuries > 0 ? `${injuries} injured` : null,
      damage > 0 ? `damage reported` : null,
      st.status === "historical" ? "not an active protest today" : null,
    ]
      .filter(Boolean)
      .join(" · ");

    const sortedArticles = [...b.articles].sort(
      (a, c) => new Date(c.published_at).getTime() - new Date(a.published_at).getTime(),
    );
    const coords = coordsForPlace(b.district, b.division, b.place);
    const conf = sourceConfidence(b.articles);
    const timeline = [...sortedArticles]
      .reverse()
      .map((a) => ({
        at: a.published_at,
        title: a.title,
        source_name: a.source_name,
        url: a.url,
      }));

    movements.push({
      id: `mv-${key.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`,
      title: `${b.themeEn} — ${b.place} (${partyEn})`,
      title_bn: `${b.themeBn} — ${b.placeBn} (${partyBn})`,
      theme_id: b.themeId,
      theme: b.themeEn,
      theme_bn: b.themeBn,
      party_id: partyId,
      party: partyEn,
      party_bn: partyBn,
      place: b.place,
      place_bn: b.placeBn,
      district: b.district,
      division: b.division,
      status: st.status,
      status_bn: st.status_bn,
      status_en: st.status_en,
      event_at: b.eventAt.toISOString(),
      event_period_en: b.periodEn,
      event_period_bn: b.periodBn,
      temporal_class: temporal,
      first_seen_at: b.first.toISOString(),
      last_seen_at: b.last.toISOString(),
      article_count: b.articles.length,
      severity: b.severity,
      impact: b.impact,
      summary_bn,
      summary_en,
      articles: sortedArticles.slice(0, 6),
      lat: coords.lat,
      lng: coords.lng,
      source_confidence: conf.source_confidence,
      unique_sources: conf.unique_sources,
      timeline,
    });
  }

  // Live first, then recent; historical last (sorted by event time descending)
  movements.sort((a, b) => {
    const statusRank = { active: 0, recent: 1, cooling: 2, historical: 3 } as const;
    const sr = statusRank[a.status] - statusRank[b.status];
    if (sr !== 0) return sr;
    if (a.status === "historical" && b.status === "historical") {
      return new Date(b.event_at).getTime() - new Date(a.event_at).getTime();
    }
    const ca =
      a.impact.deaths * 100 + a.impact.injuries * 10 + a.article_count + a.severity;
    const cb =
      b.impact.deaths * 100 + b.impact.injuries * 10 + b.article_count + b.severity;
    return cb - ca;
  });

  return movements.slice(0, 48);
}
