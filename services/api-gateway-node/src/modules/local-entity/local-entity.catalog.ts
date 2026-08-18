/**
 * Static specialty catalog for Local DSS seats.
 * Admin units + users live in DB; niche modules are config-driven.
 */

export type LocalEntityCode = "CTG-8" | "CTG-9" | "CTG-10" | "CTG-11" | "CCC" | "COCC";

export interface LocalSpecialtyModule {
  id: string;
  titleEn: string;
  titleBn: string;
  status: "planned" | "active";
}

export interface LocalEntityDefinition {
  code: LocalEntityCode;
  unitCode: string;
  role: "MP" | "MAYOR";
  nameEn: string;
  nameBn: string;
  subtitleEn: string;
  subtitleBn: string;
  focusAreasEn: string[];
  focusAreasBn: string[];
  /** Keywords used to scope news / OSINT feeds to this entity */
  osintKeywords: string[];
  specialtyModules: LocalSpecialtyModule[];
}

export const LOCAL_ENTITY_CATALOG: Record<LocalEntityCode, LocalEntityDefinition> = {
  "CTG-8": {
    code: "CTG-8",
    unitCode: "CTG-8",
    role: "MP",
    nameEn: "Chattogram-8",
    nameBn: "চট্টগ্রাম-৮",
    subtitleEn: "Boalkhali · Chandgaon · Panchlaish",
    subtitleBn: "বোয়ালখালী · চান্দগাঁও · পঞ্চলাইশ",
    focusAreasEn: ["Boalkhali", "Chandgaon", "Panchlaish"],
    focusAreasBn: ["বোয়ালখালী", "চান্দগাঁও", "পঞ্চলাইশ"],
    osintKeywords: [
      "চট্টগ্রাম-৮",
      "চট্টগ্রাম ৮",
      "ctg-8",
      "chattogram-8",
      "chittagong-8",
      "কালুরঘাট",
      "kalurghat",
      "বোয়ালখালী",
      "boalkhali",
      "চান্দগাঁও",
      "chandgaon",
      "পঞ্চলাইশ",
      "panchlaish",
      "বিসিক",
      "bscic",
      "সাঙ্গু",
      "sangu",
    ],
    specialtyModules: [
      {
        id: "kalurghat-bridge",
        titleEn: "Kalurghat Bridge traffic & crossings",
        titleBn: "কালুরঘাট সেতু ট্রাফিক ও পারাপার",
        status: "active",
      },
      {
        id: "bscic-waste",
        titleEn: "Kalurghat BSCIC waste & labour unrest",
        titleBn: "কালুরঘাট বিসিক বর্জ্য ও শ্রমিক অসন্তোষ",
        status: "active",
      },
      {
        id: "river-erosion",
        titleEn: "Sangu & Karnaphuli river erosion map",
        titleBn: "সাঙ্গু ও কর্ণফুলী নদী ভাঙন ম্যাপ",
        status: "active",
      },
    ],
  },
  "CTG-9": {
    code: "CTG-9",
    unitCode: "CTG-9",
    role: "MP",
    nameEn: "Chattogram-9",
    nameBn: "চট্টগ্রাম-৯",
    subtitleEn: "Kotwali · Bakalia · Chawk Bazar",
    subtitleBn: "কোতোয়ালী · বাকলিয়া · চকবাজার",
    focusAreasEn: ["Kotwali", "Bakalia", "Chawk Bazar"],
    focusAreasBn: ["কোতোয়ালী", "বাকলিয়া", "চকবাজার"],
    osintKeywords: [
      "চট্টগ্রাম-৯",
      "চট্টগ্রাম ৯",
      "ctg-9",
      "chattogram-9",
      "chittagong-9",
      "খাতুনগঞ্জ",
      "khatunganj",
      "আছাদগঞ্জ",
      "asadganj",
      "কোতোয়ালী",
      "kotwali",
      "বাকলিয়া",
      "bakalia",
      "চকবাজার",
      "chawk bazar",
      "সিআরবি",
      "crb",
      "cmch",
    ],
    specialtyModules: [
      {
        id: "market-security",
        titleEn: "Khatunganj / Asadganj / Reazuddin markets",
        titleBn: "খাতুনগঞ্জ / আছাদগঞ্জ / রিয়াজুদ্দিন বাজার",
        status: "active",
      },
      {
        id: "health-tracker",
        titleEn: "CMCH & education campus monitor",
        titleBn: "সিএমসিএইচ ও শিক্ষা ক্যাম্পাস মনিটর",
        status: "active",
      },
      {
        id: "heritage-security",
        titleEn: "CRB / Fairy Hill heritage alerts",
        titleBn: "সিআরবি / পরীর পাহাড় হেরিটেজ অ্যালার্ট",
        status: "active",
      },
    ],
  },
  "CTG-10": {
    code: "CTG-10",
    unitCode: "CTG-10",
    role: "MP",
    nameEn: "Chattogram-10",
    nameBn: "চট্টগ্রাম-১০",
    subtitleEn: "Double Mooring · Pahartali · Halishahar",
    subtitleBn: "ডবলমুরিং · পাহাড়তলী · হালিশহর",
    focusAreasEn: ["Double Mooring", "Pahartali", "Halishahar"],
    focusAreasBn: ["ডবলমুরিং", "পাহাড়তলী", "হালিশহর"],
    osintKeywords: [
      "চট্টগ্রাম-১০",
      "চট্টগ্রাম ১০",
      "ctg-10",
      "chattogram-10",
      "chittagong-10",
      "পাহাড়তলী",
      "pahartali",
      "হালিশহর",
      "halishahar",
      "ডবলমুরিং",
      "double mooring",
      "ইপিজেড",
      "epz",
      "সাগরিকা",
      "sagorika",
    ],
    specialtyModules: [
      {
        id: "hill-cutting",
        titleEn: "Illegal hill-cutting detection",
        titleBn: "অবৈধ পাহাড় কাটা ডিটেকশন",
        status: "active",
      },
      {
        id: "port-logistics",
        titleEn: "Port / Sagorika / EPZ traffic flow",
        titleBn: "বন্দর / সাগরিকা / ইপিজেড ট্রাফিক",
        status: "active",
      },
      {
        id: "railway-colony",
        titleEn: "Railway colony & labour social services",
        titleBn: "রেলওয়ে কলোনি ও শ্রমিক সামাজিক সেবা",
        status: "active",
      },
    ],
  },
  "CTG-11": {
    code: "CTG-11",
    unitCode: "CTG-11",
    role: "MP",
    nameEn: "Chattogram-11",
    nameBn: "চট্টগ্রাম-১১",
    subtitleEn: "Patiya · Anowara · Chandanaish — empty desk",
    subtitleBn: "পটিয়া · আনোয়ারা · চন্দনাইশ — খালি ডেস্ক",
    focusAreasEn: ["Patiya", "Anowara", "Chandanaish"],
    focusAreasBn: ["পটিয়া", "আনোয়ারা", "চন্দনাইশ"],
    osintKeywords: [
      "চট্টগ্রাম-১১",
      "চট্টগ্রাম ১১",
      "ctg-11",
      "chattogram-11",
      "chittagong-11",
      "পটিয়া",
      "patiya",
      "আনোয়ারা",
      "anowara",
      "anwara",
      "চন্দনাইশ",
      "chandanaish",
    ],
    specialtyModules: [
      {
        id: "patiya-onboard",
        titleEn: "Seat onboarded — specialty pack not filled yet",
        titleBn: "আসন যুক্ত — স্পেশালিটি প্যাক এখনও খালি",
        status: "planned",
      },
    ],
  },
  CCC: {
    code: "CCC",
    unitCode: "CCC",
    role: "MAYOR",
    nameEn: "Chattogram City Corporation",
    nameBn: "চট্টগ্রাম সিটি কর্পোরেশন",
    subtitleEn: "41 wards · Digital twin city ops",
    subtitleBn: "৪১টি ওয়ার্ড · ডিজিটাল টুইন সিটি অপস",
    focusAreasEn: ["41 CCC wards"],
    focusAreasBn: ["সিসিসি-এর ৪১টি ওয়ার্ড"],
    osintKeywords: [
      "চট্টগ্রাম সিটি কর্পোরেশন",
      "চট্টগ্রাম সিটি",
      "chittagong city corporation",
      "chattogram city corporation",
      "chittagong city",
      "chattogram city",
      "ccc mayor",
      "আগ্রাবাদ",
      "agrabad",
      "গেস সার্কেল",
      "gec",
      "নাসিরাবাদ",
      "nasirabad",
      "লালখান বাজার",
      "lalkhan",
    ],
    specialtyModules: [
      {
        id: "canal-digital-twin",
        titleEn: "36 canals dredging & water-level twin",
        titleBn: "৩৬ খাল ড্রেজিং ও ওয়াটার-লেভেল টুইন",
        status: "active",
      },
      {
        id: "pothole-ai",
        titleEn: "AI pothole detection from cleansing fleet",
        titleBn: "পরিচ্ছন্নতা বহর থেকে এআই পথহোল ডিটেকশন",
        status: "active",
      },
      {
        id: "tax-automation",
        titleEn: "Holding tax & trade licence liquidity",
        titleBn: "হোল্ডিং ট্যাক্স ও ট্রেড লাইসেন্স লিকুইডিটি",
        status: "active",
      },
      {
        id: "smart-streetlight",
        titleEn: "Smart streetlight sensor status",
        titleBn: "স্মার্ট স্ট্রিটলাইট সেন্সর স্ট্যাটাস",
        status: "active",
      },
    ],
  },
  COCC: {
    code: "COCC",
    unitCode: "COCC",
    role: "MAYOR",
    nameEn: "Cumilla City Corporation",
    nameBn: "কুমিল্লা সিটি কর্পোরেশন",
    subtitleEn: "27 wards · Heritage & expansion",
    subtitleBn: "২৭টি ওয়ার্ড · ঐতিহ্য ও সম্প্রসারণ",
    focusAreasEn: ["27 COCC wards"],
    focusAreasBn: ["কুমিল্লা সিটির ২৭টি ওয়ার্ড"],
    osintKeywords: [
      "কুমিল্লা সিটি কর্পোরেশন",
      "কুমিল্লা সিটি",
      "cumilla city corporation",
      "comilla city corporation",
      "cumilla city",
      "comilla city",
      "কুমিল্লা",
      "cumilla",
      "comilla",
      "ধর্মসাগর",
      "dharmasagar",
      "রানিদীঘি",
      "ranidighi",
      "কান্দিরপাড়",
      "kandirpar",
      "টাউন হল",
      "town hall",
    ],
    specialtyModules: [
      {
        id: "dighi-preservation",
        titleEn: "Dharmasagar / Ranidighi preservation",
        titleBn: "ধর্মসাগর / রানিদীঘি সংরক্ষণ",
        status: "active",
      },
      {
        id: "traffic-hawkers",
        titleEn: "Kandirpar / Town Hall traffic & hawkers",
        titleBn: "কান্দিরপাড় / টাউন হল ট্রাফিক ও হকার",
        status: "active",
      },
      {
        id: "ward-expansion",
        titleEn: "Expanded ward infrastructure tracker",
        titleBn: "সংবর্ধিত ওয়ার্ড অবকাঠামো ট্র্যাকার",
        status: "active",
      },
    ],
  },
};

export const LOCAL_ENTITY_CODES = Object.keys(LOCAL_ENTITY_CATALOG) as LocalEntityCode[];

export function catalogByUnitCode(code: string): LocalEntityDefinition | null {
  const match = LOCAL_ENTITY_CODES.find((c) => LOCAL_ENTITY_CATALOG[c].unitCode === code);
  return match ? LOCAL_ENTITY_CATALOG[match] : null;
}
