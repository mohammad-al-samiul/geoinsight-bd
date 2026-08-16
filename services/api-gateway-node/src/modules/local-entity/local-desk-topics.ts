import { catalogByUnitCode, type LocalEntityDefinition } from "./local-entity.catalog";

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
  | "UNREST";

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
];

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
    "বিক্ষোভ",
    "সংঘর্ষ",
    "অবরোধ",
    "ধর্মঘট",
    "অসন্তোষ",
  ],
};

const CTG_DISTRICTS = ["chattogram", "chittagong", "চট্টগ্রাম"];
const COCC_DISTRICTS = ["cumilla", "comilla", "কুমিল্লা"];

export function norm(s: string | null | undefined): string {
  return (s ?? "").toLowerCase().trim();
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
  return extra.map((x) => norm(x)).filter((x) => x.length >= 3);
}

export function matchEntity(
  code: string,
  district: string | null | undefined,
  division: string | null | undefined,
  text: string,
): { hit: boolean; local: boolean; score: number; keyword: string | null } {
  const aliases = districtAliases(code);
  const keys = entityKeywords(code);
  const d = norm(district);
  const div = norm(division);
  const blob = norm(text);
  const districtHit =
    aliases.some((a) => (d && (d.includes(a) || a.includes(d))) || (div && div.includes(a))) ||
    aliases.some((a) => blob.includes(a));

  let localKw: string | null = null;
  let localScore = 0;
  for (const k of keys) {
    if (blob.includes(k)) {
      const add = Math.min(14, Math.max(4, k.length));
      localScore += add;
      if (!localKw) localKw = k;
    }
  }

  if (localScore > 0) {
    return { hit: true, local: true, score: 28 + localScore + (districtHit ? 8 : 0), keyword: localKw };
  }
  if (districtHit) {
    return { hit: true, local: false, score: 14, keyword: aliases[0] ?? null };
  }
  return { hit: false, local: false, score: 0, keyword: null };
}

export type TopicHit = { topic: Exclude<DeskTopic, "ALL">; score: number; keyword: string };

export function classifyTopics(text: string): TopicHit[] {
  const blob = norm(text);
  const hits: TopicHit[] = [];
  for (const topic of Object.keys(TOPIC_KEYWORDS) as Array<keyof typeof TOPIC_KEYWORDS>) {
    let score = 0;
    let keyword = "";
    for (const kw of TOPIC_KEYWORDS[topic]) {
      if (blob.includes(kw.toLowerCase())) {
        score += Math.min(10, Math.max(3, kw.length));
        if (!keyword) keyword = kw;
      }
    }
    if (score > 0) hits.push({ topic, score, keyword });
  }
  hits.sort((a, b) => b.score - a.score);
  return hits;
}

export function primaryTopic(hits: TopicHit[]): Exclude<DeskTopic, "ALL"> {
  return hits[0]?.topic ?? "OSINT";
}

export function topicMatches(filter: DeskTopic, hits: TopicHit[]): boolean {
  if (filter === "ALL" || filter === "OSINT") return true;
  if (filter === "PULSE") {
    return hits.some((h) => h.topic === "PULSE" || h.topic === "UNREST");
  }
  if (filter === "CIVIC") {
    return hits.some((h) => h.topic === "CIVIC" || h.topic === "OUTAGE");
  }
  if (filter === "SPECIALTY") {
    return hits.some((h) => h.topic === "SPECIALTY" || h.topic === "CIVIC" || h.topic === "OUTAGE");
  }
  return hits.some((h) => h.topic === filter);
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
