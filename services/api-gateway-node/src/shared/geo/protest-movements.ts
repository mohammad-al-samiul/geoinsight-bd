/**
 * Cluster unrest news into named protest movements by place + theme.
 * Example: "HSC exam postponement — Chattogram" with casualties & sources.
 */

import { extractNewsPlaces } from "./news-place-matcher";
import { extractNewsImpact, type NewsImpactExtract } from "../impact/news-impact";

export type MovementStatus = "active" | "recent" | "cooling";

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
  place: string;
  place_bn: string;
  district: string | null;
  division: string | null;
  status: MovementStatus;
  status_bn: string;
  status_en: string;
  first_seen_at: string;
  last_seen_at: string;
  article_count: number;
  severity: number;
  impact: NewsImpactExtract;
  summary_bn: string;
  summary_en: string;
  articles: ProtestMovementArticle[];
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
    label_en: "Load-shedding / power protest",
    label_bn: "লোডশেডিং/বিদ্যুৎ আন্দোলন",
    patterns: [/বিদ্যুৎ/, /লোডশেডিং/, /load.?shedding/i, /electricity/i, /blackout/i, /পাওয়ার কাট/],
  },
  {
    id: "gas_fuel",
    label_en: "Gas / fuel protest",
    label_bn: "গ্যাস/জ্বালানি আন্দোলন",
    patterns: [/গ্যাস/, /\bgas\b/i, /জ্বালানি/, /petrol/i, /octane/i, /সিএনজি/, /\bcng\b/i, /ডিজেল/, /diesel/i],
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

/** Stable display order for category sections */
export const THEME_DISPLAY_ORDER = [
  "hsc_exam",
  "ssc_exam",
  "student",
  "corruption",
  "road_transport",
  "power",
  "gas_fuel",
  "law_bill",
  "wage",
  "quota",
  "farmer",
  "land_eviction",
  "water_flood",
  "hartal_blockade",
  "minority",
  "general",
] as const;

const ACTIVE_DAYS = 5;
const RECENT_DAYS = 14;

function pickTheme(text: string): { id: string; label_en: string; label_bn: string } {
  for (const rule of THEME_RULES) {
    if (rule.patterns.some((p) => p.test(text))) {
      return { id: rule.id, label_en: rule.label_en, label_bn: rule.label_bn };
    }
  }
  return {
    id: "general",
    label_en: "Public protest",
    label_bn: "জন আন্দোলন / বিক্ষোভ",
  };
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

function statusFor(lastSeen: Date, now: Date): {
  status: MovementStatus;
  status_bn: string;
  status_en: string;
} {
  const ageDays = (now.getTime() - lastSeen.getTime()) / 86_400_000;
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
  };

  const buckets = new Map<string, Bucket>();

  for (const signal of eligible) {
    const text = `${signal.title} ${signal.summary ?? ""}`;
    const theme = pickTheme(text);
    const place = resolvePlace(signal);
    const key = `${theme.id}::${place.place.toLowerCase()}`;
    const at = new Date(signal.published_at!);
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
        place: place.place,
        placeBn: place.place_bn,
        district: place.district,
        division: place.division,
        severity: signal.severity,
        impact: { ...impact },
        articles: [article],
        first: at,
        last: at,
        bestTitle: cleanHeadline(signal.title),
      });
      continue;
    }

    prev.severity = Math.max(prev.severity, signal.severity);
    prev.impact = maxImpact(prev.impact, impact);
    prev.articles.push(article);
    if (at < prev.first) prev.first = at;
    if (at > prev.last) {
      prev.last = at;
      prev.bestTitle = cleanHeadline(signal.title);
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

    const st = statusFor(b.last, now);
    const deaths = b.impact.deaths;
    const injuries = b.impact.injuries;
    const damage = b.impact.homes_damaged + b.impact.damage_mentions;

    const summary_bn = [
      `${b.placeBn}-এ ${b.themeBn}`,
      `${b.articles.length}টি সংবাদ`,
      deaths > 0 ? `নিহত ${deaths}` : null,
      injuries > 0 ? `আহত ${injuries}` : null,
      damage > 0 ? `ক্ষতির উল্লেখ` : null,
    ]
      .filter(Boolean)
      .join(" · ");

    const summary_en = [
      `${b.themeEn} in ${b.place}`,
      `${b.articles.length} reports`,
      deaths > 0 ? `${deaths} dead` : null,
      injuries > 0 ? `${injuries} injured` : null,
      damage > 0 ? `damage reported` : null,
    ]
      .filter(Boolean)
      .join(" · ");

    const sortedArticles = [...b.articles].sort(
      (a, c) => new Date(c.published_at).getTime() - new Date(a.published_at).getTime(),
    );

    movements.push({
      id: `mv-${key.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`,
      title: `${b.themeEn} — ${b.place}`,
      title_bn: `${b.themeBn} — ${b.placeBn}`,
      theme_id: b.themeId,
      theme: b.themeEn,
      theme_bn: b.themeBn,
      place: b.place,
      place_bn: b.placeBn,
      district: b.district,
      division: b.division,
      status: st.status,
      status_bn: st.status_bn,
      status_en: st.status_en,
      first_seen_at: b.first.toISOString(),
      last_seen_at: b.last.toISOString(),
      article_count: b.articles.length,
      severity: b.severity,
      impact: b.impact,
      summary_bn,
      summary_en,
      articles: sortedArticles.slice(0, 6),
    });
  }

  // Prefer active, then higher severity / casualties / article count
  movements.sort((a, b) => {
    const statusRank = { active: 0, recent: 1, cooling: 2 } as const;
    const sr = statusRank[a.status] - statusRank[b.status];
    if (sr !== 0) return sr;
    const ca =
      a.impact.deaths * 100 + a.impact.injuries * 10 + a.article_count + a.severity;
    const cb =
      b.impact.deaths * 100 + b.impact.injuries * 10 + b.article_count + b.severity;
    return cb - ca;
  });

  return movements.slice(0, 40);
}
