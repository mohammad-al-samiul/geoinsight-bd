import { catalogByUnitCode, LOCAL_ENTITY_CODES, type LocalEntityDefinition } from "./local-entity.catalog";

export type DeskTopic =
  | "ALL"
  | "EDUCATION"
  | "HEALTH"
  | "EMPLOYMENT"
  | "CRIME"
  | "CORRUPTION"
  | "OUTAGE"
  | "CIVIC"
  | "OSINT"
  | "PULSE"
  | "SPECIALTY"
  | "BUDGET"
  | "UNREST"
  | "PARTY"
  | "ISSUE";

export const DESK_TOPICS: DeskTopic[] = [
  "EDUCATION",
  "HEALTH",
  "EMPLOYMENT",
  "CRIME",
  "CORRUPTION",
  "OUTAGE",
  "CIVIC",
  "OSINT",
  "PULSE",
  "SPECIALTY",
  "BUDGET",
  "UNREST",
  "PARTY",
  "ISSUE",
];

export const CROSS_TOPICS = ["UNREST", "PARTY", "ISSUE"] as const;
export type CrossTopic = (typeof CROSS_TOPICS)[number];

const TOPIC_KEYWORDS: Record<Exclude<DeskTopic, "ALL" | "OSINT">, string[]> = {
  EDUCATION: [
    "school",
    "college",
    "university",
    "teacher",
    "student",
    "dropout",
    "ssc",
    "hsc",
    "madrasah",
    "education",
    "স্কুল",
    "কলেজ",
    "বিশ্ববিদ্যালয়",
    "শিক্ষক",
    "শিক্ষার্থী",
    "ঝরে পড়া",
    "শিক্ষা",
    "মাদ্রাসা",
    "প্রাথমিক",
  ],
  HEALTH: [
    "hospital",
    "clinic",
    "dengue",
    "doctor",
    "patient",
    "medicine",
    "ors",
    "covid",
    "health",
    "ambulance",
    "হাসপাতাল",
    "ক্লিনিক",
    "ডেঙ্গু",
    "চিকিৎসক",
    "রোগী",
    "ওষুধ",
    "স্বাস্থ্য",
    "অ্যাম্বুলেন্স",
    "cmch",
    "সিএমসিএইচ",
  ],
  EMPLOYMENT: [
    "unemployment",
    "job fair",
    "vacancy",
    "worker",
    "labour",
    "labor",
    "epz",
    "factory",
    "wage",
    "বেকার",
    "চাকরি",
    "শ্রমিক",
    "ইপিজেড",
    "কারখানা",
    "মজুরি",
    "নিয়োগ",
    "প্রশিক্ষণ",
  ],
  CRIME: [
    "theft",
    "snatch",
    "murder",
    "robbery",
    "narcotic",
    "drug",
    "eve teas",
    "assault",
    "arrest",
    "police",
    "চুরি",
    "ছিনতাই",
    "খুন",
    "ডাকাতি",
    "মাদক",
    "গ্রেফতার",
    "পুলিশ",
    "হত্যাকাণ্ড",
    "চাঁদাবাজি",
  ],
  CORRUPTION: [
    "bribe",
    "tender",
    "corruption",
    "ghost project",
    "holding tax",
    "licence",
    "license",
    "embezzl",
    "ঘুষ",
    "দুর্নীতি",
    "টেন্ডার",
    "হোল্ডিং ট্যাক্স",
    "লাইসেন্স",
    "আত্মসাৎ",
    "স্বজনপ্রীতি",
  ],
  OUTAGE: [
    "load shedding",
    "power cut",
    "blackout",
    "gas crisis",
    "water supply",
    "outage",
    "transformer",
    "pdb",
    "বিদ্যুৎ",
    "লোডশেডিং",
    "গ্যাস সংকট",
    "পানি সরবরাহ",
    "ট্রান্সফরমার",
    "বিদ্যুৎ বিভ্রাট",
  ],
  CIVIC: [
    "pothole",
    "drainage",
    "drain",
    "garbage",
    "waste",
    "canal",
    "waterlog",
    "streetlight",
    "road repair",
    "sewer",
    "পথহোল",
    "নালা",
    "ড্রেন",
    "আবর্জনা",
    "বর্জ্য",
    "খাল",
    "জলাবদ্ধতা",
    "রাস্তা",
    "স্ট্রিটলাইট",
    "ময়লা",
  ],
  PULSE: [
    "rally",
    "meeting",
    "hartal",
    "procession",
    "outreach",
    "campaign",
    "সমাবেশ",
    "মিছিল",
    "হরতাল",
    "সভা",
    "প্রচার",
    "গণসংযোগ",
  ],
  SPECIALTY: [
    "bridge",
    "hill cutting",
    "heritage",
    "dredging",
    "port",
    "market security",
    "সেতু",
    "পাহাড় কাটা",
    "হেরিটেজ",
    "ড্রেজিং",
    "বন্দর",
    "বাজার নিরাপত্তা",
  ],
  BUDGET: [
    "adp",
    "budget",
    "allocation",
    "project stall",
    "development project",
    "বাজেট",
    "বরাদ্দ",
    "এডিপি",
    "উন্নয়ন প্রকল্প",
    "প্রকল্প",
  ],
  UNREST: [
    "protest",
    "clash",
    "unrest",
    "blockade",
    "strike",
    "hartal",
    "procession",
    "rally",
    "sit-in",
    "demonstration",
    "বিক্ষোভ",
    "সংঘর্ষ",
    "অবরোধ",
    "ধর্মঘট",
    "অসন্তোষ",
    "হরতাল",
    "মিছিল",
    "সমাবেশ",
    "আন্দোলন",
    "সড়ক অবরোধ",
    "মানববন্ধন",
    "প্রতিবাদ",
  ],
  PARTY: [
    "bnp",
    "awami league",
    "awami",
    "jamaat",
    "jamaat-e-islami",
    "jatiya party",
    "ncp",
    "chatra dal",
    "chhatra dal",
    "chhatra league",
    "student league",
    "jubo league",
    "shibir",
    "বিএনপি",
    "আওয়ামী লীগ",
    "আওয়ামী লীগ",
    "জামায়াত",
    "জামায়াত",
    "এনসিপি",
    "ছাত্রদল",
    "ছাত্রলীগ",
    "যুবলীগ",
    "শিবির",
    "স্বেচ্ছাসেবক লীগ",
    "জাতীয় পার্টি",
    "সরকার বিরোধী",
    "দলীয় কর্মসূচি",
    "বিরোধী দল",
  ],
  ISSUE: [
    "waterlog",
    "waterlogging",
    "chronic",
    "recurring",
    "hill cutting",
    "drain collapse",
    "pothole",
    "traffic jam",
    "power crisis",
    "gas crisis",
    "hsc exam",
    "ssc exam",
    "postponed",
    "price hike",
    "tariff hike",
    "load shedding",
    "জলাবদ্ধ",
    "জলাবদ্ধতা",
    "পাহাড় কাটা",
    "দীর্ঘদিন",
    "পুরনো সমস্যা",
    "যানজট",
    "নালা ধস",
    "বিদ্যুৎ সংকট",
    "গ্যাস সংকট",
    "গ্যাস বিভ্রাট",
    "এইচএসসি পরীক্ষা",
    "এসএসসি পরীক্ষা",
    "পরীক্ষা স্থগিত",
    "পরীক্ষা বাতিল",
    "দ্রব্যমূল্য",
    "দাম বৃদ্ধি",
    "লোডশেডিং",
    "জনভোগান্তি",
  ],
};

const CTG_DISTRICTS = ["chattogram", "chittagong", "চট্টগ্রাম"];
const COCC_DISTRICTS = ["cumilla", "comilla", "কুমিল্লা"];

const FOREIGN_PLACES = [
  "dhaka",
  "ঢাকা",
  "gazipur",
  "গাজীপুর",
  "narayanganj",
  "নারায়ণগঞ্জ",
  "sylhet",
  "সিলেট",
  "khulna",
  "খুলনা",
  "rajshahi",
  "রাজশাহী",
  "rangpur",
  "রংপুর",
  "barishal",
  "বরিশাল",
  "barisal",
  "mymensingh",
  "ময়মনসিংহ",
  "cox's bazar",
  "coxs bazar",
  "কক্সবাজার",
  "noakhali",
  "নোয়াখালী",
];

/** Upazilas in Chattogram district that are outside CCC (city) limits. */
const OUTSIDE_CCC = [
  "patiya",
  "পটিয়া",
  "anowara",
  "anwara",
  "আনোয়ারা",
  "chandanaish",
  "চন্দনাইশ",
  "boalkhali",
  "বোয়ালখালী",
];

const WEAK_PLACE = new Set(["kotwali", "কোতোয়ালী", "town hall", "টাউন হল", "epz", "ইপিজেড"]);

const GENERIC_KEYWORD_STOP = new Set([
  "canal",
  "pothole",
  "dredging",
  "খাল",
  "ড্রেজিং",
  "পথহোল",
  "hill cutting",
  "পাহাড় কাটা",
  "41 ccc wards",
  "সিসিসি-এর ৪১টি ওয়ার্ড",
  "27 cocc wards",
  "কুমিল্লা সিটির ২৭টি ওয়ার্ড",
]);

export function norm(s: string | null | undefined): string {
  return (s ?? "").toLowerCase().trim();
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function textHasKeyword(blob: string, keyword: string): boolean {
  const k = norm(keyword);
  if (k.length < 3) return false;
  const latinShort = /^[a-z0-9][a-z0-9-]*$/.test(k) && k.length <= 5;
  if (latinShort) {
    return new RegExp(`(?:^|[^a-z0-9])${escapeRe(k)}(?:$|[^a-z0-9])`).test(blob);
  }
  return blob.includes(k);
}

export function districtAliases(code: string): string[] {
  if (code === "COCC") return COCC_DISTRICTS;
  return CTG_DISTRICTS;
}

export function entityKeywords(code: string): string[] {
  const cat = catalogByUnitCode(code);
  const extra = [
    cat?.nameEn,
    cat?.nameBn,
    ...(cat?.osintKeywords ?? []),
    ...(cat?.focusAreasEn ?? []),
    ...(cat?.focusAreasBn ?? []),
  ];
  return extra
    .map((x) => norm(x))
    .filter((x) => x.length >= 3 && !GENERIC_KEYWORD_STOP.has(x));
}

function rivalPlaceKeywords(code: string): string[] {
  const ours = new Set(entityKeywords(code));
  const rival: string[] = [];
  for (const other of LOCAL_ENTITY_CODES) {
    if (other === code) continue;
    for (const k of entityKeywords(other)) {
      if (!ours.has(k) && k.length >= 4) rival.push(k);
    }
  }
  return rival;
}

function isMayor(code: string): boolean {
  return catalogByUnitCode(code)?.role === "MAYOR";
}

function ownDistrictHit(
  code: string,
  district: string | null | undefined,
  division: string | null | undefined,
  blob: string,
): boolean {
  const aliases = districtAliases(code);
  const d = norm(district);
  const div = norm(division);
  return aliases.some(
    (a) =>
      (d && (d.includes(a) || a.includes(d))) ||
      (div && div.includes(a)) ||
      blob.includes(a),
  );
}

function isForeignGeo(
  code: string,
  district: string | null | undefined,
  division: string | null | undefined,
  blob: string,
  hasOwnPlace: boolean,
): boolean {
  if (hasOwnPlace) return false;
  const own = districtAliases(code);
  const d = norm(district);
  const div = norm(division);
  const hay = `${d} ${div} ${blob}`;
  if (d && own.some((a) => d.includes(a) || a.includes(d))) return false;
  if (d && FOREIGN_PLACES.some((f) => d.includes(f))) return true;
  const otherCity = code === "COCC" ? CTG_DISTRICTS : COCC_DISTRICTS;
  if (otherCity.some((a) => (d && d.includes(a)) || blob.includes(a))) return true;
  const blobOwnDistrict = own.some((a) => blob.includes(a));
  if (blobOwnDistrict) return false;
  return FOREIGN_PLACES.some((f) => hay.includes(f));
}

export function matchEntity(
  code: string,
  district: string | null | undefined,
  division: string | null | undefined,
  text: string,
): { hit: boolean; local: boolean; score: number; keyword: string | null } {
  const keys = entityKeywords(code);
  const blob = norm(text);
  const dHit = ownDistrictHit(code, district, division, blob);

  let localKw: string | null = null;
  let localScore = 0;
  for (const k of keys) {
    if (!textHasKeyword(blob, k)) continue;
    if (WEAK_PLACE.has(k) && !dHit) continue;
    localScore += Math.min(14, Math.max(4, k.length));
    if (!localKw) localKw = k;
  }
  const hasOwnPlace = localScore > 0;
  if (isForeignGeo(code, district, division, blob, hasOwnPlace)) {
    return { hit: false, local: false, score: 0, keyword: null };
  }

  const rivalHit = rivalPlaceKeywords(code).some((k) => textHasKeyword(blob, k));
  if (rivalHit && !hasOwnPlace) {
    return { hit: false, local: false, score: 0, keyword: null };
  }

  if (hasOwnPlace) {
    return { hit: true, local: true, score: 28 + localScore + (dHit ? 8 : 0), keyword: localKw };
  }

  if (isMayor(code) && dHit) {
    if (code === "CCC" && OUTSIDE_CCC.some((k) => textHasKeyword(blob, k))) {
      return { hit: false, local: false, score: 0, keyword: null };
    }
    return { hit: true, local: true, score: 18, keyword: districtAliases(code)[0] ?? null };
  }

  return { hit: false, local: false, score: 0, keyword: null };
}

export type TopicHit = { topic: Exclude<DeskTopic, "ALL">; score: number; keyword: string };

export function extractActors(text: string): string[] {
  const blob = norm(text);
  const actors: string[] = [];
  if (/(police|rab|bgb|law enforcement|পুলিশ|র‌্যাব|বিজিবি|আইনশৃঙ্খলা|থানা)/.test(blob)) actors.push("POLICE");
  if (/(student|university|college|school|chhatra|shibir|ছাত্র|শিক্ষার্থী|বিশ্ববিদ্যালয়|ছাত্রদল|ছাত্রলীগ)/.test(blob)) actors.push("STUDENT");
  if (/(worker|labour|labor|garment|epz|driver|transport|শ্রমিক|গার্মেন্টস|কারখানা|পরিবহন|চালক)/.test(blob)) actors.push("WORKER");
  if (/(trader|merchant|shopkeeper|market|hawker|ব্যবসায়ী|দোকানদার|হকার|বাজার)/.test(blob)) actors.push("BUSINESS");
  if (/(resident|villager|citizen|naagrik|নাগরিক|বাসিন্দা|এলাকাবাসী)/.test(blob)) actors.push("CITIZEN");
  return actors;
}

export function extractIntensity(text: string): "HIGH" | "MEDIUM" | "LOW" {
  const blob = norm(text);
  if (/(clash|fire|arson|blockade|violence|death|injured|murder|সংঘর্ষ|আগুন|অগ্নিকাণ্ড|অবরোধ|ভাঙচুর|হত্যাকাণ্ড|আহত|ধাওয়া-পাল্টা ধাওয়া)/.test(blob)) {
    return "HIGH";
  }
  if (/(protest|procession|rally|sit-in|demonstration|strike|hartal|বিক্ষোভ|মিছিল|সমাবেশ|হরতাল|মানববন্ধন|স্লোগান)/.test(blob)) {
    return "MEDIUM";
  }
  return "LOW";
}

const PROTEST_CONTEXT_RE =
  /(protest|unrest|blockade|strike|hartal|procession|rally|sit-in|demonstration|demand|memorandum|বিক্ষোভ|অবরোধ|ধর্মঘট|অসন্তোষ|হরতাল|মিছিল|সমাবেশ|আন্দোলন|স্মারকলিপি|দাবি|মানববন্ধন|ব্যানার)/;

const PARTY_ACTIVITY_RE =
  /(rally|meeting|procession|campaign|statement|leader|candidate|outreach|faction|clash|সমাবেশ|মিছিল|সভা|প্রচার|গণসংযোগ|বক্তব্য|সংবাদ সম্মেলন|নেতা|প্রার্থী|কোন্দল|সংঘর্ষ|মহড়া|পদযাত্রা)/;

const INAUGURATION_ROUTINE_RE =
  /(inaugurat|opening|launch|foundation|inspect|mayor|commissioner|project|উদ্বোধন|প্রকল্প|পরিদর্শন|মেয়র|ভিত্তিপত্র|ইনফ্রাস্ট্রাকচার|উন্নয়ন কাজ)/;

export function classifyTopics(text: string): TopicHit[] {
  const blob = norm(text);
  const rawHits: Record<string, { score: number; keyword: string }> = {};

  for (const topic of Object.keys(TOPIC_KEYWORDS) as Array<keyof typeof TOPIC_KEYWORDS>) {
    let score = 0;
    let keyword = "";
    for (const kw of TOPIC_KEYWORDS[topic]) {
      if (!textHasKeyword(blob, kw)) continue;
      score += Math.min(10, Math.max(3, kw.length));
      if (!keyword) keyword = kw;
    }
    if (score > 0) rawHits[topic] = { score, keyword };
  }

  // Precision Rule 1: "Clash/সংঘর্ষ" distinction
  const hasClash = textHasKeyword(blob, "clash") || textHasKeyword(blob, "সংঘর্ষ");
  const hasProtestContext = PROTEST_CONTEXT_RE.test(blob);
  if (hasClash) {
    if (hasProtestContext) {
      // Unrest clash: Boost UNREST, don't count purely as CRIME
      if (rawHits.UNREST) rawHits.UNREST.score += 8;
      else rawHits.UNREST = { score: 10, keyword: "clash" };
      if (rawHits.CRIME) {
        rawHits.CRIME.score = Math.max(0, rawHits.CRIME.score - 6);
        if (rawHits.CRIME.score === 0) delete rawHits.CRIME;
      }
    } else {
      // Non-protest clash: Keep under CRIME, prevent UNREST from triggering solely on "clash"
      if (!hasProtestContext && rawHits.UNREST) {
        const otherUnrestKw = TOPIC_KEYWORDS.UNREST.some(
          (k) => k !== "clash" && k !== "সংঘর্ষ" && textHasKeyword(blob, k),
        );
        if (!otherUnrestKw) delete rawHits.UNREST;
      }
    }
  }

  // Precision Rule 2: "Party/দল" distinction
  if (rawHits.PARTY) {
    const hasPartyActivity = PARTY_ACTIVITY_RE.test(blob);
    const isMayorInauguration = INAUGURATION_ROUTINE_RE.test(blob);
    if (isMayorInauguration && !hasPartyActivity) {
      delete rawHits.PARTY;
    }
  }

  const hits: TopicHit[] = Object.entries(rawHits).map(([topic, data]) => ({
    topic: topic as Exclude<DeskTopic, "ALL">,
    score: data.score,
    keyword: data.keyword,
  }));

  const hasCivic = hits.some((h) => h.topic === "CIVIC" || h.topic === "OUTAGE");
  if (hasCivic && !hits.some((h) => h.topic === "ISSUE")) {
    hits.push({ topic: "ISSUE", score: 8, keyword: "issue" });
  }

  hits.sort((a, b) => b.score - a.score);
  return hits;
}

const CROSS_SET = new Set<string>(CROSS_TOPICS);

export function primaryTopic(hits: TopicHit[]): Exclude<DeskTopic, "ALL"> {
  const desk = hits.find((h) => !CROSS_SET.has(h.topic));
  return desk?.topic ?? hits[0]?.topic ?? "OSINT";
}

export function topicMatches(filter: DeskTopic, hits: TopicHit[]): boolean {
  if (filter === "ALL" || filter === "OSINT") return true;
  if (filter === "PULSE") {
    return hits.some((h) => h.topic === "PULSE" || h.topic === "UNREST");
  }
  if (filter === "CIVIC") {
    return hits.some((h) => h.topic === "CIVIC" || h.topic === "OUTAGE" || h.topic === "ISSUE");
  }
  if (filter === "ISSUE") {
    return hits.some((h) => h.topic === "ISSUE" || h.topic === "CIVIC" || h.topic === "OUTAGE");
  }
  if (filter === "UNREST") {
    return hits.some((h) => h.topic === "UNREST" || h.topic === "PULSE");
  }
  if (filter === "PARTY") {
    return hits.some((h) => h.topic === "PARTY" || h.topic === "PULSE");
  }
  if (filter === "SPECIALTY") {
    return hits.some((h) => h.topic === "SPECIALTY" || h.topic === "CIVIC" || h.topic === "OUTAGE");
  }
  return hits.some((h) => h.topic === filter);
}

export function unionTopics(
  ...lists: Array<Array<Exclude<DeskTopic, "ALL">>>
): Array<Exclude<DeskTopic, "ALL">> {
  const seen = new Set<Exclude<DeskTopic, "ALL">>();
  const out: Array<Exclude<DeskTopic, "ALL">> = [];
  for (const list of lists) {
    for (const topic of list) {
      if (seen.has(topic)) continue;
      seen.add(topic);
      out.push(topic);
    }
  }
  return out;
}

export function placeHits(code: string, text: string): string[] {
  const blob = norm(text);
  const out: string[] = [];
  for (const k of entityKeywords(code)) {
    if (k.length < 4) continue;
    if (/^(ctg-|chattogram-|chittagong-|ccc mayor|cocc)/.test(k)) continue;
    if (k.includes("city corporation") || k.includes("সিটি কর্পোরেশন")) continue;
    if (k.includes(" wards") || k.includes("ওয়ার্ড")) continue;
    if (!textHasKeyword(blob, k)) continue;
    if (!out.includes(k)) out.push(k);
    if (out.length >= 3) break;
  }
  return out;
}

export function decorateTopics(
  entityCode: string,
  text: string,
  base: Array<Exclude<DeskTopic, "ALL">> = [],
): {
  topics: Array<Exclude<DeskTopic, "ALL">>;
  places: string[];
  keyword: string | null;
  primary: Exclude<DeskTopic, "ALL">;
  actors: string[];
  intensity: "HIGH" | "MEDIUM" | "LOW";
} {
  const hits = classifyTopics(text);
  const topics = unionTopics(base, hits.map((h) => h.topic));
  const places = placeHits(entityCode, text);
  const actors = extractActors(text);
  const intensity = extractIntensity(text);
  return {
    topics,
    places,
    keyword: hits[0]?.keyword ?? places[0] ?? null,
    primary: primaryTopic(hits) !== "OSINT" ? primaryTopic(hits) : (base[0] ?? "OSINT"),
    actors,
    intensity,
  };
}

export function specialtyModuleId(catalog: LocalEntityDefinition | null, text: string): string | null {
  if (!catalog) return null;
  const blob = norm(text);
  for (const mod of catalog.specialtyModules) {
    const needles = [mod.id, mod.titleEn, mod.titleBn].map(norm).filter((x) => x.length >= 4);
    if (needles.some((n) => blob.includes(n))) return mod.id;
  }
  const firstActive = catalog.specialtyModules.find((m) => m.status === "active");
  return firstActive?.id ?? catalog.specialtyModules[0]?.id ?? null;
}

export function civicCategory(text: string):
  | "INFRASTRUCTURE"
  | "DRAINAGE"
  | "WASTE"
  | "UTILITIES"
  | "TRAFFIC"
  | "HILL_CUTTING"
  | "OTHER" {
  const blob = norm(text);
  if (/(drain|নালা|ড্রেন|জলাবদ্ধ|canal|খাল)/.test(blob)) return "DRAINAGE";
  if (/(garbage|waste|আবর্জনা|বর্জ্য|ময়লা)/.test(blob)) return "WASTE";
  if (/(pothole|road|রাস্তা|পথহোল)/.test(blob)) return "INFRASTRUCTURE";
  if (/(power|gas|water supply|বিদ্যুৎ|গ্যাস|পানি)/.test(blob)) return "UTILITIES";
  if (/(traffic|যানজট|bridge|সেতু)/.test(blob)) return "TRAFFIC";
  if (/(hill cut|পাহাড় কাটা)/.test(blob)) return "HILL_CUTTING";
  return "OTHER";
}

export function outageKind(text: string): "POWER" | "GAS" | "WATER" | "DRAINAGE" | "ROAD" | "OTHER" {
  const blob = norm(text);
  if (/(power|load shed|blackout|বিদ্যুৎ|লোডশেড)/.test(blob)) return "POWER";
  if (/(gas|গ্যাস)/.test(blob)) return "GAS";
  if (/(drain|নালা|খাল|জলাবদ্ধ)/.test(blob)) return "DRAINAGE";
  if (/(water|পানি সরবরাহ)/.test(blob)) return "WATER";
  if (/(road|pothole|রাস্তা)/.test(blob)) return "ROAD";
  return "OTHER";
}

export function crimeKind(text: string): "THEFT" | "SNATCH" | "MURDER" | "NARCOTICS" | "STREET_VIOLENCE" | "FIRE" {
  const blob = norm(text);
  if (/(murder|খুন|হত্যা)/.test(blob)) return "MURDER";
  if (/(snatch|ছিনতাই)/.test(blob)) return "SNATCH";
  if (/(narcotic|drug|মাদক)/.test(blob)) return "NARCOTICS";
  if (/(fire|আগুন|অগ্নিকাণ্ড)/.test(blob)) return "FIRE";
  if (/(clash|assault|সংঘর্ষ)/.test(blob)) return "STREET_VIOLENCE";
  return "THEFT";
}

export function corruptionKind(text: string): "BRIBE" | "TENDER" | "HOLDING_TAX" | "PROJECT_GHOST" | "LICENSE_DESK" {
  const blob = norm(text);
  if (/(tender|টেন্ডার)/.test(blob)) return "TENDER";
  if (/(holding tax|হোল্ডিং)/.test(blob)) return "HOLDING_TAX";
  if (/(ghost|আত্মসাৎ)/.test(blob)) return "PROJECT_GHOST";
  if (/(licence|license|লাইসেন্স)/.test(blob)) return "LICENSE_DESK";
  return "BRIBE";
}

export function sectorKind(
  sector: "EDUCATION" | "HEALTH" | "EMPLOYMENT",
  text: string,
): "PRIMARY_SCHOOL" | "SECONDARY_SCHOOL" | "COLLEGE" | "HOSPITAL" | "CLINIC" | "TRAINING_CENTER" | "JOB_FAIR" | "EPZ_GATE" {
  const blob = norm(text);
  if (sector === "EDUCATION") {
    if (/(college|university|কলেজ|বিশ্ববিদ্যালয়)/.test(blob)) return "COLLEGE";
    if (/(secondary|ssc|hsc|মাধ্যমিক)/.test(blob)) return "SECONDARY_SCHOOL";
    return "PRIMARY_SCHOOL";
  }
  if (sector === "HEALTH") {
    if (/(clinic|ক্লিনিক)/.test(blob)) return "CLINIC";
    return "HOSPITAL";
  }
  if (/(epz|ইপিজেড)/.test(blob)) return "EPZ_GATE";
  if (/(job fair|চাকরি মেলা)/.test(blob)) return "JOB_FAIR";
  return "TRAINING_CENTER";
}

export function pulseKind(text: string): "RALLY" | "MEETING" | "OUTREACH" | "OTHER" {
  const blob = norm(text);
  if (/(rally|procession|মিছিল|সমাবেশ|hartal|হরতাল)/.test(blob)) return "RALLY";
  if (/(meeting|সভা)/.test(blob)) return "MEETING";
  if (/(outreach|campaign|গণসংযোগ|প্রচার)/.test(blob)) return "OUTREACH";
  return "OTHER";
}
