export interface CrimeBreakdown {
  type: string;
  type_bn: string;
  count: number;
  percentage: number;
  trend: "rising" | "stable" | "declining";
}

export interface DistrictInfo {
  id: string;
  nameEn: string;
  nameBn: string;
  totalCrimeCasesMonthly: number;
  loadSheddingHours: number;
  gasDeficitPercentage: number;
  severityScore: number;
  topHotspot: string;
  topHotspot_bn: string;
}

export interface ForecastData {
  month: string;
  monthBn: string;
  projectedCases: number;
  projectedLoadShedding: number;
  projectedGasDeficit: number;
  seasonalWarning: string;
  seasonalWarning_bn: string;
}

export interface HistoricalYoY {
  year: number;
  totalCrimes: number;
  avgLoadShedding: number;
  avgGasDeficit: number;
}

/** Shortage pin kinds shown on the 8-division SVG map */
export type ShortageKind = "gas" | "fuel" | "power" | "water";

export interface LiveIncidentAlert {
  id: string;
  divisionId: string;
  divisionNameBn: string;
  divisionNameEn: string;
  timestamp: string;
  severity: "critical" | "warning" | "info";
  titleEn: string;
  titleBn: string;
  locationEn: string;
  locationBn: string;
  /** WGS84 pin on the Bangladesh Leaflet map */
  lat?: number;
  lng?: number;
  source?: "ops" | "citizen" | "pin-alert";
  kind?: ShortageKind | "other";
}

export interface HighwayCorridor {
  id: string;
  nameEn: string;
  nameBn: string;
  /** Leaflet lat/lng waypoints [lat, lng] */
  path: Array<[number, number]>;
  stressHintEn: string;
  stressHintBn: string;
}

/** Major transport corridors overlaid on the real Bangladesh map */
export const HIGHWAY_CORRIDORS: HighwayCorridor[] = [
  {
    id: "dhaka-chattogram",
    nameEn: "Dhaka–Chattogram Corridor",
    nameBn: "ঢাকা–চট্টগ্রাম করিডোর",
    path: [
      [23.81, 90.41],
      [23.46, 91.18],
      [22.9, 91.4],
      [22.34, 91.83],
    ],
    stressHintEn: "Port truck diesel & industrial gas pressure risk",
    stressHintBn: "বন্দর ট্রাক ডিজেল ও শিল্প গ্যাস চাপ ঝুঁকি",
  },
  {
    id: "dhaka-northwest",
    nameEn: "Dhaka–Rajshahi–Rangpur Axis",
    nameBn: "ঢাকা–রাজশাহী–রংপুর অক্ষ",
    path: [
      [23.81, 90.41],
      [24.37, 89.6],
      [24.37, 88.6],
      [25.75, 89.25],
    ],
    stressHintEn: "Highway pump queues & rural feeder outages",
    stressHintBn: "হাইওয়ে পাম্প সারি ও গ্রামীণ ফিডার বিভ্রাট",
  },
  {
    id: "southwest-coast",
    nameEn: "Khulna–Barishal Coastal Link",
    nameBn: "খুলনা–বরিশাল উপকূল লিংক",
    path: [
      [22.85, 89.55],
      [22.7, 90.37],
    ],
    stressHintEn: "Salinity / diesel for river transport",
    stressHintBn: "লবণাক্ততা ও নৌ-পরিবহন ডিজেল সংকট",
  },
  {
    id: "northeast",
    nameEn: "Dhaka–Sylhet Highway",
    nameBn: "ঢাকা–সিলেট হাইওয়ে",
    path: [
      [23.81, 90.41],
      [24.3, 91.1],
      [24.9, 91.87],
    ],
    stressHintEn: "CNG corridor & tea-estate power dips",
    stressHintBn: "সিএনজি করিডোর ও চা-বাগান বিদ্যুৎ ঘাটতি",
  },
];

/** Approximate map pin locations for each division (used for citizen alerts) */
export const DIVISION_MAP_CENTROIDS_LATLNG: Record<string, { lat: number; lng: number }> = {
  dhaka: { lat: 23.81, lng: 90.41 },
  chattogram: { lat: 22.34, lng: 91.83 },
  khulna: { lat: 22.85, lng: 89.55 },
  rajshahi: { lat: 24.37, lng: 88.6 },
  sylhet: { lat: 24.9, lng: 91.87 },
  barishal: { lat: 22.7, lng: 90.37 },
  rangpur: { lat: 25.75, lng: 89.25 },
  mymensingh: { lat: 24.75, lng: 90.4 },
};

export interface ShortageSite {
  id: string;
  divisionId: string;
  kind: ShortageKind;
  nameEn: string;
  nameBn: string;
  severity: "critical" | "high" | "moderate";
  detailEn: string;
  detailBn: string;
  /** WGS84 coordinates for Leaflet Bangladesh map */
  lat: number;
  lng: number;
}

export interface ResourceCrisisInfo {
  gas: {
    deficitPercentage: number;
    severity: "Critical" | "Severe" | "Moderate" | "Low";
    severity_bn: string;
    pressureDropBar: number; // 0-100 scale
    industrialImpact: string;
    industrialImpact_bn: string;
  };
  fuelOil: {
    stockDeficitPercentage: number;
    octaneAvailability: "Normal" | "Low" | "Critical";
    octaneAvailability_bn: string;
    dieselAvailability: "Normal" | "Low" | "Critical";
    dieselAvailability_bn: string;
    stationQueueIndex: "High" | "Medium" | "Low";
    stationQueueIndex_bn: string;
  };
  electricity: {
    avgLoadSheddingHours: number;
    peakDeficitMW: number;
    ruralStatus: string;
    ruralStatus_bn: string;
  };
  water: {
    scarcityIndex: number; // 0-100
    salinityOrDepletion: string;
    salinityOrDepletion_bn: string;
  };
  commodities: {
    inflationPercentage: number;
    scarcityItems: string[];
    scarcityItems_bn: string[];
  };
}

export interface DivisionCrisisData {
  id: string;
  nameEn: string;
  nameBn: string;
  headquarters: string;
  headquarters_bn: string;
  districtsCount: number;
  populationMillions: number;
  overallSeverityScore: number; // 0-100
  riskLevel: "Critical" | "High Risk" | "Moderate" | "Low Risk";
  riskLevel_bn: string;

  // District Breakdown
  districts: DistrictInfo[];

  // Crime Analytics
  crime: {
    totalCasesMonthly: number;
    crimeRatePer100k: number;
    trendChange: number; // e.g. +14% or -3%
    breakdown: CrimeBreakdown[];
    topHotspots: string[];
    topHotspots_bn: string[];
  };

  // Resource Crisis
  resources: ResourceCrisisInfo;

  // 30-Day Predictive Forecast
  forecast30Days: ForecastData[];

  // Historical YoY (2024 - 2026)
  historicalYoY: HistoricalYoY[];

  // Hotlines & Contact
  emergencyContacts: {
    policeHelpline: string;
    gasEmergency: string;
    powerHelpline: string;
    wasaHelpline: string;
    dcOfficeControl: string;
  };
}

export const LIVE_INCIDENT_ALERTS: LiveIncidentAlert[] = [
  {
    id: "alert-1",
    divisionId: "dhaka",
    divisionNameBn: "ঢাকা",
    divisionNameEn: "Dhaka",
    timestamp: "১০ মিনিট আগে",
    severity: "critical",
    titleEn: "Gazipur Industrial Gas Pressure Drop Alert",
    titleBn: "গাজীপুর শিল্পাঞ্চলে গ্যাসের চাপ মারাত্মক পতন",
    locationEn: "Gazipur Sadar & Tongi",
    locationBn: "গাজীপুর সদর ও টঙ্গী",
    lat: 23.92,
    lng: 90.4,
    source: "ops",
    kind: "gas",
  },
  {
    id: "alert-2",
    divisionId: "chattogram",
    divisionNameBn: "চট্টগ্রাম",
    divisionNameEn: "Chattogram",
    timestamp: "২৫ মিনিট আগে",
    severity: "critical",
    titleEn: "Teknaf Border Narcotics Smuggling Intercepted",
    titleBn: "টেকনাফ সীমান্তে বিপুল পরিমাণ মাদক চালান আটক",
    locationEn: "Teknaf Border",
    locationBn: "টেকনাফ সীমান্ত",
    lat: 20.86,
    lng: 92.3,
    source: "ops",
    kind: "other",
  },
  {
    id: "alert-3",
    divisionId: "khulna",
    divisionNameBn: "খুলনা",
    divisionNameEn: "Khulna",
    timestamp: "৪৩ মিনিট আগে",
    severity: "warning",
    titleEn: "Satkhira Coastal Salinity & Drinking Water Crisis",
    titleBn: "সাতক্ষীরা উপকূলীয় অঞ্চলে পানীয় জলের তীব্র সংকট",
    locationEn: "Satkhira Shyamnagar",
    locationBn: "সাতক্ষীরা শ্যামনগর",
    lat: 22.33,
    lng: 89.1,
    source: "ops",
    kind: "water",
  },
  {
    id: "alert-4",
    divisionId: "barishal",
    divisionNameBn: "বরিশাল",
    divisionNameEn: "Barishal",
    timestamp: "১ ঘণ্টা আগে",
    severity: "warning",
    titleEn: "Meghna River Channel Piracy Patrol Deployed",
    titleBn: "মেঘনা নদীতে নৌ-ডাকাতি রোধে র্যাব-কোস্টগার্ডের টহল",
    locationEn: "Meghna Estuary",
    locationBn: "মেঘনা মোহনা",
    lat: 22.55,
    lng: 90.7,
    source: "ops",
    kind: "other",
  },
  {
    id: "alert-5",
    divisionId: "rajshahi",
    divisionNameBn: "রাজশাহী",
    divisionNameEn: "Rajshahi",
    timestamp: "২ ঘণ্টা আগে",
    severity: "info",
    titleEn: "Barind Irrigation Power Supply Adjusted",
    titleBn: "বরেন্দ্র অঞ্চলে গভীর নলকূপে বিদ্যুৎ সরবরাহ সমন্বয়",
    locationEn: "Godagari & Natore",
    locationBn: "গোদাগাড়ী ও নাটোর",
    lat: 24.47,
    lng: 88.33,
    source: "ops",
    kind: "power",
  },
];

export const BANGLADESH_DIVISIONS_DATA: DivisionCrisisData[] = [
  {
    id: "dhaka",
    nameEn: "Dhaka",
    nameBn: "ঢাকা",
    headquarters: "Dhaka",
    headquarters_bn: "ঢাকা",
    districtsCount: 13,
    populationMillions: 21.7,
    overallSeverityScore: 88,
    riskLevel: "Critical",
    riskLevel_bn: "অতি ঝুঁকিপূর্ণ",
    districts: [
      { id: "dhaka-sadar", nameEn: "Dhaka City", nameBn: "ঢাকা সিটি", totalCrimeCasesMonthly: 5200, loadSheddingHours: 2.5, gasDeficitPercentage: 45, severityScore: 92, topHotspot: "Mirpur & Uttara", topHotspot_bn: "মিরপুর ও উত্তরা" },
      { id: "gazipur", nameEn: "Gazipur", nameBn: "গাজীপুর", totalCrimeCasesMonthly: 2100, loadSheddingHours: 4.5, gasDeficitPercentage: 55, severityScore: 89, topHotspot: "Tongi Industrial", topHotspot_bn: "টঙ্গী বিসিক" },
      { id: "narayanganj", nameEn: "Narayanganj", nameBn: "নারায়ণগঞ্জ", totalCrimeCasesMonthly: 1950, loadSheddingHours: 4.0, gasDeficitPercentage: 50, severityScore: 86, topHotspot: "Kanchpur", topHotspot_bn: "কাঁচপুর" },
      { id: "savar", nameEn: "Dhaka Rural (Savar)", nameBn: "ঢাকা পল্লী (সাভার)", totalCrimeCasesMonthly: 1200, loadSheddingHours: 5.0, gasDeficitPercentage: 35, severityScore: 82, topHotspot: "Ashulia", topHotspot_bn: "আশুলিয়া" },
      { id: "tangail", nameEn: "Tangail", nameBn: "টাঙ্গাইল", totalCrimeCasesMonthly: 850, loadSheddingHours: 6.0, gasDeficitPercentage: 25, severityScore: 74, topHotspot: "Tangail Sadar", topHotspot_bn: "টাঙ্গাইল সদর" },
      { id: "faridpur", nameEn: "Faridpur", nameBn: "ফরিদপুর", totalCrimeCasesMonthly: 650, loadSheddingHours: 5.5, gasDeficitPercentage: 20, severityScore: 70, topHotspot: "Bhanga", topHotspot_bn: "ভাঙ্গা" },
    ],
    crime: {
      totalCasesMonthly: 12450,
      crimeRatePer100k: 57.3,
      trendChange: 14.2,
      breakdown: [
        { type: "Theft & Burglary", type_bn: "চুরি ও ছিনতাই", count: 4108, percentage: 33, trend: "rising" },
        { type: "Extortion & Gangs", type_bn: "চাঁদাবাজি ও কিশোর গ্যাং", count: 2863, percentage: 23, trend: "rising" },
        { type: "Narcotics & Smuggling", type_bn: "মাদক চোরাচালান", count: 2241, percentage: 18, trend: "stable" },
        { type: "Cybercrime & Fraud", type_bn: "সাইবার অপরাধ ও আর্থিক প্রতারণা", count: 1867, percentage: 15, trend: "rising" },
        { type: "Violent & Land Disputes", type_bn: "সহিংসতা ও জমি সংঘাত", count: 1371, percentage: 11, trend: "declining" },
      ],
      topHotspots: ["Mirpur", "Uttara", "Savar", "Gazipur Sadar", "Narayanganj City"],
      topHotspots_bn: ["মিরপুর", "উত্তরা", "সাভার", "গাজীপুর সদর", "নারায়ণগঞ্জ সিটি"],
    },
    resources: {
      gas: {
        deficitPercentage: 42,
        severity: "Critical",
        severity_bn: "সংকটজনক",
        pressureDropBar: 85,
        industrialImpact: "Severe low pressure in Gazipur & Narayanganj textile hubs",
        industrialImpact_bn: "গাজীপুর ও নারায়ণগঞ্জের টেক্সটাইল মিলে তীব্র গ্যাস স্বল্পতা",
      },
      fuelOil: {
        stockDeficitPercentage: 28,
        octaneAvailability: "Low",
        octaneAvailability_bn: "কম",
        dieselAvailability: "Low",
        dieselAvailability_bn: "কম",
        stationQueueIndex: "High",
        stationQueueIndex_bn: "উচ্চ",
      },
      electricity: {
        avgLoadSheddingHours: 3.5,
        peakDeficitMW: 780,
        ruralStatus: "5-7 hours load shedding in rural Dhaka districts",
        ruralStatus_bn: "ঢাকা গ্রামাঞ্চলে দৈনিক ৫-৭ ঘণ্টা লোডশেডিং",
      },
      water: {
        scarcityIndex: 78,
        salinityOrDepletion: "Severe groundwater depletion (-3m annual drop)",
        salinityOrDepletion_bn: "ভূগর্ভস্থ পানির স্তর মারাত্মক হ্রাস (বছরে ৩ মিটার অবনতি)",
      },
      commodities: {
        inflationPercentage: 11.4,
        scarcityItems: ["LPG Cylinder", "Edible Oil", "Eggs"],
        scarcityItems_bn: ["এলপিজি সিলিন্ডার", "ভোজ্য তেল", "ডিম"],
      },
    },
    forecast30Days: [
      { month: "Current", monthBn: "বর্তমান", projectedCases: 12450, projectedLoadShedding: 3.5, projectedGasDeficit: 42, seasonalWarning: "Industrial gas strain", seasonalWarning_bn: "শিল্প এলাকায় গ্যাসের তীব্র চাহিদা" },
      { month: "Month +1", monthBn: "পরবর্তী মাস", projectedCases: 13100, projectedLoadShedding: 4.8, projectedGasDeficit: 48, seasonalWarning: "Summer peak load-shedding & burglary surge", seasonalWarning_bn: "গ্রীষ্মের পিক লোডশেডিং ও চুরি বৃদ্ধির ঝুঁকি" },
      { month: "Month +2", monthBn: "২ মাস পর", projectedCases: 12800, projectedLoadShedding: 4.2, projectedGasDeficit: 45, seasonalWarning: "Monsoon urban waterlogging", seasonalWarning_bn: "বর্ষায় জলাবদ্ধতা ও যানজটজনিত ছিনতাই" },
    ],
    historicalYoY: [
      { year: 2024, totalCrimes: 135000, avgLoadShedding: 2.8, avgGasDeficit: 35 },
      { year: 2025, totalCrimes: 142000, avgLoadShedding: 3.2, avgGasDeficit: 39 },
      { year: 2026, totalCrimes: 149400, avgLoadShedding: 3.5, avgGasDeficit: 42 },
    ],
    emergencyContacts: {
      policeHelpline: "999 / 02-223381000",
      gasEmergency: "16496 (Titas)",
      powerHelpline: "16999 (DPDC/DESCO)",
      wasaHelpline: "16162 (Dhaka WASA)",
      dcOfficeControl: "02-9556100",
    },
  },
  {
    id: "chattogram",
    nameEn: "Chattogram",
    nameBn: "চট্টগ্রাম",
    headquarters: "Chattogram",
    headquarters_bn: "চট্টগ্রাম",
    districtsCount: 11,
    populationMillions: 9.2,
    overallSeverityScore: 82,
    riskLevel: "High Risk",
    riskLevel_bn: "উচ্চ ঝুঁকিপূর্ণ",
    districts: [
      { id: "ctg-city", nameEn: "Chattogram City", nameBn: "চট্টগ্রাম সিটি", totalCrimeCasesMonthly: 3800, loadSheddingHours: 3.0, gasDeficitPercentage: 50, severityScore: 85, topHotspot: "Agrabad & Pahartali", topHotspot_bn: "আগ্রাবাদ ও পাহাড়তলী" },
      { id: "coxsbazar", nameEn: "Cox's Bazar", nameBn: "কক্সবাজার", totalCrimeCasesMonthly: 2100, loadSheddingHours: 5.5, gasDeficitPercentage: 30, severityScore: 88, topHotspot: "Teknaf Border", topHotspot_bn: "টেকনাফ সীমান্ত" },
      { id: "sitakunda", nameEn: "Sitakunda Industrial", nameBn: "সীতাকুণ্ড শিল্পাঞ্চল", totalCrimeCasesMonthly: 1200, loadSheddingHours: 4.5, gasDeficitPercentage: 55, severityScore: 83, topHotspot: "Ship Breaking Yard", topHotspot_bn: "শিপ ব্রেকিং ইয়ার্ড" },
      { id: "comilla", nameEn: "Cumilla", nameBn: "কুমিল্লা", totalCrimeCasesMonthly: 1100, loadSheddingHours: 4.0, gasDeficitPercentage: 40, severityScore: 76, topHotspot: "Bibir Bazar Border", topHotspot_bn: "বিবির বাজার সীমান্ত" },
    ],
    crime: {
      totalCasesMonthly: 8920,
      crimeRatePer100k: 49.5,
      trendChange: 8.7,
      breakdown: [
        { type: "Narcotics & Smuggling", type_bn: "মাদক ও ইয়াবা চোরাচালান", count: 3211, percentage: 36, trend: "rising" },
        { type: "Theft & Burglary", type_bn: "চুরি ও ডাকাতি", count: 2319, percentage: 26, trend: "stable" },
        { type: "Extortion & Gangs", type_bn: "বন্দর ও পরিবহন চাঁদাবাজি", count: 1695, percentage: 19, trend: "rising" },
        { type: "Violent & Land Disputes", type_bn: "পাহাড় দখল ও নদী এলাকা বিরোধ", count: 1070, percentage: 12, trend: "stable" },
        { type: "Cybercrime & Fraud", type_bn: "সাইবার অপরাধ", count: 625, percentage: 7, trend: "declining" },
      ],
      topHotspots: ["Agrabad", "Sitakunda", "Teknaf Border", "Patiya", "Cox's Bazar Sadar"],
      topHotspots_bn: ["আগ্রাবাদ", "সীতাকুণ্ড", "টেকনাফ সীমান্ত", "পটিয়া", "কক্সবাজার সদর"],
    },
    resources: {
      gas: {
        deficitPercentage: 48,
        severity: "Critical",
        severity_bn: "সংকটজনক",
        pressureDropBar: 90,
        industrialImpact: "Port city urea plants & steel mills operating at 50% capacity",
        industrialImpact_bn: "বন্দর নগরীর সার কারখানা ও স্টিল মিল ৫০% ক্ষমতায় চলছে",
      },
      fuelOil: {
        stockDeficitPercentage: 35,
        octaneAvailability: "Low",
        octaneAvailability_bn: "কম",
        dieselAvailability: "Critical",
        dieselAvailability_bn: "সংকটজনক",
        stationQueueIndex: "High",
        stationQueueIndex_bn: "উচ্চ",
      },
      electricity: {
        avgLoadSheddingHours: 4.2,
        peakDeficitMW: 520,
        ruralStatus: "Frequent outages in Cox's Bazar & hill tracts",
        ruralStatus_bn: "কক্সবাজার ও পার্বত্য এলাকায় ঘনঘন বিদ্যুৎ বিভ্রাট",
      },
      water: {
        scarcityIndex: 72,
        salinityOrDepletion: "Saline intrusion along Karnaphuli estuary & hilly water scarcity",
        salinityOrDepletion_bn: "কর্ণফুলী মোহনায় লবণাক্ততা বৃদ্ধি ও পাহাড়ি এলাকায় তীব্র বিশুদ্ধ পানির সংকট",
      },
      commodities: {
        inflationPercentage: 12.1,
        scarcityItems: ["Diesel Oil", "Onion", "Imported Pulses"],
        scarcityItems_bn: ["ডিজেল তেল", "পেঁয়াজ", "আমদানিকৃত ডাল"],
      },
    },
    forecast30Days: [
      { month: "Current", monthBn: "বর্তমান", projectedCases: 8920, projectedLoadShedding: 4.2, projectedGasDeficit: 48, seasonalWarning: "Drug smuggling surge", seasonalWarning_bn: "সীমান্তে ইয়াবা পাচার বৃদ্ধির ঝুঁকি" },
      { month: "Month +1", monthBn: "পরবর্তী মাস", projectedCases: 9400, projectedLoadShedding: 5.2, projectedGasDeficit: 52, seasonalWarning: "Port congestion & fuel deficit", seasonalWarning_bn: "বন্দরে কনটেইনার জট ও ডিজেল সংকট" },
      { month: "Month +2", monthBn: "২ মাস পর", projectedCases: 9100, projectedLoadShedding: 4.8, projectedGasDeficit: 50, seasonalWarning: "Hill tract landslide risk", seasonalWarning_bn: "পাহাড় ধস ও যোগাযোগ বিছিন্নতা" },
    ],
    historicalYoY: [
      { year: 2024, totalCrimes: 98000, avgLoadShedding: 3.5, avgGasDeficit: 40 },
      { year: 2025, totalCrimes: 102500, avgLoadShedding: 3.9, avgGasDeficit: 44 },
      { year: 2026, totalCrimes: 107040, avgLoadShedding: 4.2, avgGasDeficit: 48 },
    ],
    emergencyContacts: {
      policeHelpline: "999 / 031-617777",
      gasEmergency: "16496 (KGDCL)",
      powerHelpline: "16999 (PDB Chattogram)",
      wasaHelpline: "031-610190 (CWASA)",
      dcOfficeControl: "031-611000",
    },
  },
  {
    id: "khulna",
    nameEn: "Khulna",
    nameBn: "খুলনা",
    headquarters: "Khulna",
    headquarters_bn: "খুলনা",
    districtsCount: 10,
    populationMillions: 17.4,
    overallSeverityScore: 76,
    riskLevel: "High Risk",
    riskLevel_bn: "উচ্চ ঝুঁকিপূর্ণ",
    districts: [
      { id: "jessore", nameEn: "Jashore", nameBn: "যশোর", totalCrimeCasesMonthly: 1900, loadSheddingHours: 4.5, gasDeficitPercentage: 50, severityScore: 80, topHotspot: "Benapole Border", topHotspot_bn: "বেনাপোল সীমান্ত" },
      { id: "satkhira", nameEn: "Satkhira", nameBn: "সাতক্ষীরা", totalCrimeCasesMonthly: 1400, loadSheddingHours: 5.5, gasDeficitPercentage: 60, severityScore: 84, topHotspot: "Shyamnagar Coastal", topHotspot_bn: "শ্যামনগর উপকূল" },
      { id: "khulna-city", nameEn: "Khulna City", nameBn: "খুলনা সিটি", totalCrimeCasesMonthly: 1650, loadSheddingHours: 4.0, gasDeficitPercentage: 55, severityScore: 76, topHotspot: "Rupsha Ghat", topHotspot_bn: "রূপসা ঘাট" },
      { id: "kushtia", nameEn: "Kushtia", nameBn: "কুষ্টিয়া", totalCrimeCasesMonthly: 1200, loadSheddingHours: 5.0, gasDeficitPercentage: 45, severityScore: 72, topHotspot: "Islamic Univ Road", topHotspot_bn: "ইবি রোড" },
    ],
    crime: {
      totalCasesMonthly: 6150,
      crimeRatePer100k: 35.3,
      trendChange: 4.5,
      breakdown: [
        { type: "Narcotics & Border Smuggling", type_bn: "সীমান্ত মাদক ও স্বর্ণ চোরাচালান", count: 2029, percentage: 33, trend: "rising" },
        { type: "Violent & Land Disputes", type_bn: "চিংড়ি ঘের দখল ও জমি সংঘাত", count: 1476, percentage: 24, trend: "rising" },
        { type: "Theft & Burglary", type_bn: "চুরি ও ডাকাতি", count: 1353, percentage: 22, trend: "stable" },
        { type: "Extortion & Gangs", type_bn: "চাঁদাবাজি ও স্থানীয় আধিপত্য", count: 799, percentage: 13, trend: "declining" },
        { type: "Cybercrime & Fraud", type_bn: "অনলাইন বিকাশ/নগদ প্রতারণা", count: 493, percentage: 8, trend: "rising" },
      ],
      topHotspots: ["Benapole Border", "Jessore Sadar", "Rupsha", "Satkhira Sadar", "Kushtia"],
      topHotspots_bn: ["বেনাপোল সীমান্ত", "যশোর সদর", "রূপসা", "সাতক্ষীরা সদর", "কুষ্টিয়া"],
    },
    resources: {
      gas: {
        deficitPercentage: 55,
        severity: "Critical",
        severity_bn: "সংকটজনক",
        pressureDropBar: 92,
        industrialImpact: "Pipeline coverage limited; heavy reliance on LPG",
        industrialImpact_bn: "পাইপলাইন কভারেজ সীমিত; এলপিজির ওপর ব্যাপক নির্ভরতা",
      },
      fuelOil: {
        stockDeficitPercentage: 30,
        octaneAvailability: "Low",
        octaneAvailability_bn: "কম",
        dieselAvailability: "Low",
        dieselAvailability_bn: "কম",
        stationQueueIndex: "Medium",
        stationQueueIndex_bn: "মাঝারি",
      },
      electricity: {
        avgLoadSheddingHours: 4.8,
        peakDeficitMW: 410,
        ruralStatus: "High load shedding in coastal shrimp farming zones",
        ruralStatus_bn: "উপকূলীয় চিংড়ি চাষ এলাকায় ব্যাপক লোডশেডিং",
      },
      water: {
        scarcityIndex: 91,
        salinityOrDepletion: "Critical salinity intrusion in Satkhira, Bagerhat & Khulna",
        salinityOrDepletion_bn: "সাতক্ষীরা, বাগেরহাট ও খুলনায় ভয়াবহ লবণাক্ততার সংকট",
      },
      commodities: {
        inflationPercentage: 10.8,
        scarcityItems: ["LPG Cylinder", "Potable Water Jars", "Green Chili"],
        scarcityItems_bn: ["এলপিজি সিলিন্ডার", "খাবার পানির জার", "কাঁচা মরিচ"],
      },
    },
    forecast30Days: [
      { month: "Current", monthBn: "বর্তমান", projectedCases: 6150, projectedLoadShedding: 4.8, projectedGasDeficit: 55, seasonalWarning: "Coastal salinity rise", seasonalWarning_bn: "উপকূলীয় এলাকায় পানি ও লবণাক্ততার চাপ" },
      { month: "Month +1", monthBn: "পরবর্তী মাস", projectedCases: 6500, projectedLoadShedding: 5.8, projectedGasDeficit: 58, seasonalWarning: "Shrimp farm conflict risk", seasonalWarning_bn: "চিংড়ি ঘের দখল কেন্দ্রিক সংঘাত" },
      { month: "Month +2", monthBn: "২ মাস পর", projectedCases: 6300, projectedLoadShedding: 5.2, projectedGasDeficit: 56, seasonalWarning: "Border smuggling alerts", seasonalWarning_bn: "সীমান্তে হুন্ডি ও সোনা চোরাচালান" },
    ],
    historicalYoY: [
      { year: 2024, totalCrimes: 68000, avgLoadShedding: 4.0, avgGasDeficit: 48 },
      { year: 2025, totalCrimes: 71200, avgLoadShedding: 4.4, avgGasDeficit: 52 },
      { year: 2026, totalCrimes: 73800, avgLoadShedding: 4.8, avgGasDeficit: 55 },
    ],
    emergencyContacts: {
      policeHelpline: "999 / 041-721000",
      gasEmergency: "16496 (Sundarban Gas)",
      powerHelpline: "16999 (WZPDCL)",
      wasaHelpline: "041-762299 (KWASA)",
      dcOfficeControl: "041-720100",
    },
  },
  {
    id: "rajshahi",
    nameEn: "Rajshahi",
    nameBn: "রাজশাহী",
    headquarters: "Rajshahi",
    headquarters_bn: "রাজশাহী",
    districtsCount: 8,
    populationMillions: 20.3,
    overallSeverityScore: 71,
    riskLevel: "Moderate",
    riskLevel_bn: "মাঝারি ঝুঁকিপূর্ণ",
    districts: [
      { id: "bogra", nameEn: "Bogra", nameBn: "বগুড়া", totalCrimeCasesMonthly: 1850, loadSheddingHours: 5.0, gasDeficitPercentage: 40, severityScore: 76, topHotspot: "Bogra Town", topHotspot_bn: "বগুড়া শহর" },
      { id: "pabna", nameEn: "Pabna", nameBn: "পাবনা", totalCrimeCasesMonthly: 1400, loadSheddingHours: 5.5, gasDeficitPercentage: 42, severityScore: 74, topHotspot: "Ishwardi Junction", topHotspot_bn: "ঈশ্বরদী জংশন" },
      { id: "rajshahi-city", nameEn: "Rajshahi City", nameBn: "রাজশাহী সিটি", totalCrimeCasesMonthly: 1350, loadSheddingHours: 5.0, gasDeficitPercentage: 35, severityScore: 70, topHotspot: "Godagari Border", topHotspot_bn: "গোদাগাড়ী সীমান্ত" },
      { id: "chapai", nameEn: "Chapai Nawabganj", nameBn: "চাঁপাইনবাবগঞ্জ", totalCrimeCasesMonthly: 1240, loadSheddingHours: 6.5, gasDeficitPercentage: 35, severityScore: 72, topHotspot: "Sona Masjid Land Port", topHotspot_bn: "সোনা মসজিদ বন্দর" },
    ],
    crime: {
      totalCasesMonthly: 5840,
      crimeRatePer100k: 28.7,
      trendChange: -2.1,
      breakdown: [
        { type: "Narcotics & Smuggling", type_bn: "ফেনসিডিল ও হেরোইন চোরাচালান", count: 2452, percentage: 42, trend: "rising" },
        { type: "Violent & Land Disputes", type_bn: "চর দখল ও কৃষি জমি বিরোধ", count: 1401, percentage: 24, trend: "stable" },
        { type: "Theft & Burglary", type_bn: "চুরি ও সিধেল চুরি", count: 1109, percentage: 19, trend: "declining" },
        { type: "Extortion & Gangs", type_bn: "হাটবাজার চাঁদাবাজি", count: 526, percentage: 9, trend: "declining" },
        { type: "Cybercrime & Fraud", type_bn: "সাইবার প্রতারণা", count: 352, percentage: 6, trend: "stable" },
      ],
      topHotspots: ["Godagari Border", "Pabna Sadar", "Bogra Town", "Natore Sadar", "Chapai Border"],
      topHotspots_bn: ["গোডাগাড়ী সীমান্ত", "পাবনা সদর", "বগুড়া শহর", "নাটোর সদর", "চাঁপাইনবাবগঞ্জ সীমান্ত"],
    },
    resources: {
      gas: {
        deficitPercentage: 38,
        severity: "Severe",
        severity_bn: "গুরুতর",
        pressureDropBar: 75,
        industrialImpact: "Pabna & Bogra industrial units facing gas shortages",
        industrialImpact_bn: "পাবনা ও বগুড়ার শিল্প কারখানাগুলোতে গ্যাস সংকট",
      },
      fuelOil: {
        stockDeficitPercentage: 22,
        octaneAvailability: "Normal",
        octaneAvailability_bn: "স্বাভাবিক",
        dieselAvailability: "Low",
        dieselAvailability_bn: "কম",
        stationQueueIndex: "Medium",
        stationQueueIndex_bn: "মাঝারি",
      },
      electricity: {
        avgLoadSheddingHours: 5.5,
        peakDeficitMW: 480,
        ruralStatus: "Severe agricultural pump power load-shedding during irrigation season",
        ruralStatus_bn: "সেচ মৌসুমে কৃষি পাম্পে তীব্র বিদ্যুৎ সংকট ও লোডশেডিং",
      },
      water: {
        scarcityIndex: 85,
        salinityOrDepletion: "Barind tract extreme groundwater depletion",
        salinityOrDepletion_bn: "বরেন্দ্র অঞ্চলে তীব্র খরা ও ভূগর্ভস্থ পানির স্তর মারাত্মক পতন",
      },
      commodities: {
        inflationPercentage: 9.6,
        scarcityItems: ["Diesel Fuel", "Fertilizer (Urea)", "Rice"],
        scarcityItems_bn: ["ডিজেল জ্বালানি", "ইউরিয়া সার", "চাল"],
      },
    },
    forecast30Days: [
      { month: "Current", monthBn: "বর্তমান", projectedCases: 5840, projectedLoadShedding: 5.5, projectedGasDeficit: 38, seasonalWarning: "Barind irrigation pump strain", seasonalWarning_bn: "বরেন্দ্র অঞ্চলে সেচ পাম্পে বিদ্যুতের তীব্র চাহিদা" },
      { month: "Month +1", monthBn: "পরবর্তী মাস", projectedCases: 6100, projectedLoadShedding: 6.5, projectedGasDeficit: 40, seasonalWarning: "Dry season heatwave & crop risk", seasonalWarning_bn: "শুষ্ক মৌসুমে তীব্র খরা ও সেচ সংকট" },
      { month: "Month +2", monthBn: "২ মাস পর", projectedCases: 5900, projectedLoadShedding: 5.8, projectedGasDeficit: 39, seasonalWarning: "Border drug raid alerts", seasonalWarning_bn: "সীমান্তে ফেনসিডিল চোরাচালান প্রতিরোধ" },
    ],
    historicalYoY: [
      { year: 2024, totalCrimes: 67000, avgLoadShedding: 4.8, avgGasDeficit: 30 },
      { year: 2025, totalCrimes: 69200, avgLoadShedding: 5.1, avgGasDeficit: 34 },
      { year: 2026, totalCrimes: 70080, avgLoadShedding: 5.5, avgGasDeficit: 38 },
    ],
    emergencyContacts: {
      policeHelpline: "999 / 02588860000",
      gasEmergency: "16496 (PGCL)",
      powerHelpline: "16999 (NESCO)",
      wasaHelpline: "02588851000 (RWASA)",
      dcOfficeControl: "02588855000",
    },
  },
  {
    id: "sylhet",
    nameEn: "Sylhet",
    nameBn: "সিলেট",
    headquarters: "Sylhet",
    headquarters_bn: "সিলেট",
    districtsCount: 4,
    populationMillions: 11.0,
    overallSeverityScore: 68,
    riskLevel: "Moderate",
    riskLevel_bn: "মাঝারি ঝুঁকিপূর্ণ",
    districts: [
      { id: "sylhet-sadar", nameEn: "Sylhet Sadar", nameBn: "সিলেট সদর", totalCrimeCasesMonthly: 1500, loadSheddingHours: 3.5, gasDeficitPercentage: 15, severityScore: 68, topHotspot: "Zindabazar & Jaflong", topHotspot_bn: "জিন্দাবাজার ও জাফলং" },
      { id: "sunamganj", nameEn: "Sunamganj", nameBn: "সুনামগঞ্জ", totalCrimeCasesMonthly: 950, loadSheddingHours: 4.5, gasDeficitPercentage: 10, severityScore: 72, topHotspot: "Tanguar Haor", topHotspot_bn: "টাঙ্গুয়ার হাওর" },
      { id: "moulvibazar", nameEn: "Moulvibazar", nameBn: "মৌলভীবাজার", totalCrimeCasesMonthly: 800, loadSheddingHours: 3.8, gasDeficitPercentage: 15, severityScore: 65, topHotspot: "Sreemangal Tea Estate", topHotspot_bn: "শ্রীমঙ্গল চা বাগান" },
      { id: "habiganj", nameEn: "Habiganj", nameBn: "হবিগঞ্জ", totalCrimeCasesMonthly: 700, loadSheddingHours: 4.0, gasDeficitPercentage: 20, severityScore: 66, topHotspot: "Sherpur Bridge", topHotspot_bn: "শেরপুর সেতু" },
    ],
    crime: {
      totalCasesMonthly: 3950,
      crimeRatePer100k: 35.9,
      trendChange: 3.4,
      breakdown: [
        { type: "Narcotics & Border Smuggling", type_bn: "সীমান্ত ভারতীয় পণ্য ও মদ চোরাচালান", count: 1382, percentage: 35, trend: "rising" },
        { type: "Violent & Land Disputes", type_bn: "প্রবাসীদের জমি দখল ও পাথর কোয়ারি বিরোধ", count: 1027, percentage: 26, trend: "rising" },
        { type: "Theft & Burglary", type_bn: "চুরি ও ডাকাতি", count: 790, percentage: 20, trend: "stable" },
        { type: "Cybercrime & Fraud", type_bn: "রেমিট্যান্স ও ভিসা প্রতারণা", count: 474, percentage: 12, trend: "rising" },
        { type: "Extortion & Gangs", type_bn: "পরিবহন চাঁদাবাজি", count: 277, percentage: 7, trend: "declining" },
      ],
      topHotspots: ["Jaflong Stone Belt", "Sylhet Sadar", "Tamabil Border", "Sunamganj Haor Area", "Habiganj Sadar"],
      topHotspots_bn: ["জাফলং পাথর অঞ্চল", "সিলেট সদর", "তামাবিল সীমান্ত", "সুনামগঞ্জ হাওরাঞ্চল", "হবিগঞ্জ সদর"],
    },
    resources: {
      gas: {
        deficitPercentage: 15,
        severity: "Moderate",
        severity_bn: "সহনীয়",
        pressureDropBar: 30,
        industrialImpact: "Sufficient gas production locally; minor pressure drops in winter",
        industrialImpact_bn: "স্থানীয় গ্যাস উৎপাদন ভালো; শীতকালে সামান্য প্রেসার ড্রপ",
      },
      fuelOil: {
        stockDeficitPercentage: 18,
        octaneAvailability: "Normal",
        octaneAvailability_bn: "স্বাভাবিক",
        dieselAvailability: "Normal",
        dieselAvailability_bn: "স্বাভাবিক",
        stationQueueIndex: "Low",
        stationQueueIndex_bn: "নিম্ন",
      },
      electricity: {
        avgLoadSheddingHours: 3.8,
        peakDeficitMW: 260,
        ruralStatus: "Haor region flash flood power grid interruptions",
        ruralStatus_bn: "হাওর এলাকায় বন্যা ও ঝড়বৃষ্টিতে বিদ্যুৎ বিভ্রাট",
      },
      water: {
        scarcityIndex: 45,
        salinityOrDepletion: "Flash floods cause drinking water contamination",
        salinityOrDepletion_bn: "আকস্মিক বন্যায় খাওয়ার পানির নলকূপ নিমজ্জিত ও দূষণ",
      },
      commodities: {
        inflationPercentage: 10.2,
        scarcityItems: ["Sugar", "Imported Spices", "Kerosene"],
        scarcityItems_bn: ["চিনি", "আমদানিকৃত মশলা", "কেরোসিন"],
      },
    },
    forecast30Days: [
      { month: "Current", monthBn: "বর্তমান", projectedCases: 3950, projectedLoadShedding: 3.8, projectedGasDeficit: 15, seasonalWarning: "Stone quarry dispute alerts", seasonalWarning_bn: "পাথর কোয়ারিতে ইজারা ও সীমান্ত সংঘাত" },
      { month: "Month +1", monthBn: "পরবর্তী মাস", projectedCases: 4200, projectedLoadShedding: 4.5, projectedGasDeficit: 18, seasonalWarning: "Flash flood risk in Haor zones", seasonalWarning_bn: "হাওর অঞ্চলে আকস্মিক বন্যা ও নিরাপদ পানির অভাব" },
      { month: "Month +2", monthBn: "২ মাস পর", projectedCases: 4050, projectedLoadShedding: 4.0, projectedGasDeficit: 16, seasonalWarning: "Border smuggling vigil", seasonalWarning_bn: "সীমান্তে ভারতীয় পণ্য চোরাচালান প্রতিরোধ" },
    ],
    historicalYoY: [
      { year: 2024, totalCrimes: 43000, avgLoadShedding: 3.1, avgGasDeficit: 12 },
      { year: 2025, totalCrimes: 45600, avgLoadShedding: 3.5, avgGasDeficit: 14 },
      { year: 2026, totalCrimes: 47400, avgLoadShedding: 3.8, avgGasDeficit: 15 },
    ],
    emergencyContacts: {
      policeHelpline: "999 / 0821-716000",
      gasEmergency: "16496 (Jalalaabad Gas)",
      powerHelpline: "16999 (PDB Sylhet)",
      wasaHelpline: "0821-714000 (Sylhet City Corp)",
      dcOfficeControl: "0821-716200",
    },
  },
  {
    id: "barishal",
    nameEn: "Barishal",
    nameBn: "বরিশাল",
    headquarters: "Barishal",
    headquarters_bn: "বরিশাল",
    districtsCount: 6,
    populationMillions: 9.3,
    overallSeverityScore: 65,
    riskLevel: "Moderate",
    riskLevel_bn: "মাঝারি ঝুঁকিপূর্ণ",
    districts: [
      { id: "barishal-sadar", nameEn: "Barishal Sadar", nameBn: "বরিশাল সদর", totalCrimeCasesMonthly: 1200, loadSheddingHours: 4.5, gasDeficitPercentage: 60, severityScore: 68, topHotspot: "Barishal Launch Ghat", topHotspot_bn: "বরিশাল লঞ্চঘাট" },
      { id: "bhola", nameEn: "Bhola Island", nameBn: "ভোলা দ্বীপ", totalCrimeCasesMonthly: 750, loadSheddingHours: 5.5, gasDeficitPercentage: 55, severityScore: 70, topHotspot: "Meghna Estuary", topHotspot_bn: "মেঘনা মোহনা" },
      { id: "patuakhali", nameEn: "Patuakhali & Payra", nameBn: "পটুয়াখালী ও পায়রা", totalCrimeCasesMonthly: 650, loadSheddingHours: 5.0, gasDeficitPercentage: 65, severityScore: 65, topHotspot: "Payra Port", topHotspot_bn: "পায়রা বন্দর" },
      { id: "barguna", nameEn: "Barguna Coastal", nameBn: "বরগুনা উপকূল", totalCrimeCasesMonthly: 520, loadSheddingHours: 6.0, gasDeficitPercentage: 70, severityScore: 64, topHotspot: "Patharghata", topHotspot_bn: "পাথরঘাটা" },
    ],
    crime: {
      totalCasesMonthly: 3120,
      crimeRatePer100k: 33.5,
      trendChange: -1.5,
      breakdown: [
        { type: "Violent & River Piracy", type_bn: "নৌ-ডাকাতি ও ইলিশ নদী সংঘাত", count: 998, percentage: 32, trend: "rising" },
        { type: "Theft & Burglary", type_bn: "চুরি ও বসতবাড়ি ডাকাতি", count: 873, percentage: 28, trend: "stable" },
        { type: "Narcotics & Smuggling", type_bn: "গাঁজা ও কফ সিরাপ মাদক", count: 592, percentage: 19, trend: "declining" },
        { type: "Extortion & Gangs", type_bn: "লঞ্চঘাট ও বাসস্ট্যান্ড চাঁদাবাজি", count: 374, percentage: 12, trend: "stable" },
        { type: "Cybercrime & Fraud", type_bn: "মোবাইল ব্যালেন্স প্রতারণা", count: 283, percentage: 9, trend: "declining" },
      ],
      topHotspots: ["Meghna River Channel", "Barishal Sadar", "Bhola Coastal Zone", "Patuakhali Port", "Barguna"],
      topHotspots_bn: ["মেঘনা নদী চ্যানেল", "বরিশাল সদর", "ভোলা উপকূলীয় জোন", "পটুয়াখালী পোর্ট", "বরগুনা"],
    },
    resources: {
      gas: {
        deficitPercentage: 62,
        severity: "Critical",
        severity_bn: "সংকটজনক",
        pressureDropBar: 95,
        industrialImpact: "Bhola gas field exists but lack of mainland pipeline creates severe scarcity",
        industrialImpact_bn: "ভোলার গ্যাস ফিল্ড থাকা সত্ত্বেও পাইপলাইনের অভাবে মূলভূখণ্ডে ভয়াবহ সংকট",
      },
      fuelOil: {
        stockDeficitPercentage: 32,
        octaneAvailability: "Low",
        octaneAvailability_bn: "কম",
        dieselAvailability: "Low",
        dieselAvailability_bn: "কম",
        stationQueueIndex: "Medium",
        stationQueueIndex_bn: "মাঝারি",
      },
      electricity: {
        avgLoadSheddingHours: 5.0,
        peakDeficitMW: 290,
        ruralStatus: "Off-grid coastal islands suffer 6-8 hours outage",
        ruralStatus_bn: "বিচ্ছিন্ন চরাঞ্চল ও দ্বীপাঞ্চলে ৬-৮ ঘণ্টা বিদ্যুৎ থাকে না",
      },
      water: {
        scarcityIndex: 82,
        salinityOrDepletion: "High coastal salinity & arsenic in tube wells",
        salinityOrDepletion_bn: "উপকূলীয় এলাকায় নদীতে অতিরিক্ত লবণাক্ততা ও আর্সেনিক সমস্যা",
      },
      commodities: {
        inflationPercentage: 11.0,
        scarcityItems: ["LPG Cylinder", "Diesel for Trawler", "Fresh Water"],
        scarcityItems_bn: ["এলপিজি সিলিন্ডার", "ট্রলারের ডিজেল", "বিশুদ্ধ পানি"],
      },
    },
    forecast30Days: [
      { month: "Current", monthBn: "বর্তমান", projectedCases: 3120, projectedLoadShedding: 5.0, projectedGasDeficit: 62, seasonalWarning: "Hilsa fishing season river piracy", seasonalWarning_bn: "ইলিশ মৌসুমে মেঘনা চ্যানেলে জলদস্যুতার ঝুঁকি" },
      { month: "Month +1", monthBn: "পরবর্তী মাস", projectedCases: 3400, projectedLoadShedding: 6.2, projectedGasDeficit: 65, seasonalWarning: "Cyclone season coastal isolation", seasonalWarning_bn: "ঘূর্ণিঝড় মৌসুমে উপকূলীয় অঞ্চলে বিদ্যুৎ বিচ্ছিন্নতা" },
      { month: "Month +2", monthBn: "২ মাস পর", projectedCases: 3250, projectedLoadShedding: 5.5, projectedGasDeficit: 63, seasonalWarning: "Drinking water scarcity in islands", seasonalWarning_bn: "দ্বীপাঞ্চলে খাবার পানির তীব্র সংকট" },
    ],
    historicalYoY: [
      { year: 2024, totalCrimes: 35000, avgLoadShedding: 4.2, avgGasDeficit: 55 },
      { year: 2025, totalCrimes: 36800, avgLoadShedding: 4.6, avgGasDeficit: 59 },
      { year: 2026, totalCrimes: 37440, avgLoadShedding: 5.0, avgGasDeficit: 62 },
    ],
    emergencyContacts: {
      policeHelpline: "999 / 0431-2176000",
      gasEmergency: "16496 (Sundarban Gas)",
      powerHelpline: "16999 (WZPDCL Barishal)",
      wasaHelpline: "0431-61000 (Barishal City Corp)",
      dcOfficeControl: "0431-2173000",
    },
  },
  {
    id: "rangpur",
    nameEn: "Rangpur",
    nameBn: "রংপুর",
    headquarters: "Rangpur",
    headquarters_bn: "রংপুর",
    districtsCount: 8,
    populationMillions: 17.6,
    overallSeverityScore: 62,
    riskLevel: "Moderate",
    riskLevel_bn: "মাঝারি ঝুঁকিপূর্ণ",
    districts: [
      { id: "dinajpur", nameEn: "Dinajpur", nameBn: "দিনাজপুর", totalCrimeCasesMonthly: 1400, loadSheddingHours: 5.5, gasDeficitPercentage: 70, severityScore: 66, topHotspot: "Hili Land Port", topHotspot_bn: "হিলি স্থলবন্দর" },
      { id: "rangpur-city", nameEn: "Rangpur City", nameBn: "রংপুর সিটি", totalCrimeCasesMonthly: 1200, loadSheddingHours: 5.0, gasDeficitPercentage: 70, severityScore: 62, topHotspot: "Pairabandh", topHotspot_bn: "পায়রাবঙ্ক" },
      { id: "kurigram", nameEn: "Kurigram Char", nameBn: "কুড়িগ্রাম চরাঞ্চল", totalCrimeCasesMonthly: 980, loadSheddingHours: 6.8, gasDeficitPercentage: 75, severityScore: 65, topHotspot: "Dharla River Border", topHotspot_bn: "ধরলা নদী সীমান্ত" },
      { id: "gaibandha", nameEn: "Gaibandha", nameBn: "গাইবান্ধা", totalCrimeCasesMonthly: 840, loadSheddingHours: 6.0, gasDeficitPercentage: 70, severityScore: 60, topHotspot: "Fulchhari Ghat", topHotspot_bn: "ফুলছড়ি ঘাট" },
    ],
    crime: {
      totalCasesMonthly: 4420,
      crimeRatePer100k: 25.1,
      trendChange: -3.8,
      breakdown: [
        { type: "Theft & Burglary", type_bn: "চুরি ও গবাদিপশু চুরি", count: 1547, percentage: 35, trend: "rising" },
        { type: "Narcotics & Border Smuggling", type_bn: "সীমান্ত ইয়াবা ও মদ চোরাচালান", count: 1237, percentage: 28, trend: "stable" },
        { type: "Violent & Land Disputes", type_bn: "চর জমি বিরোধ ও পারিবারিক সহিংসতা", count: 884, percentage: 20, trend: "declining" },
        { type: "Extortion & Gangs", type_bn: "স্থানীয় বাজার চাঁদাবাজি", count: 442, percentage: 10, trend: "declining" },
        { type: "Cybercrime & Fraud", type_bn: "ভুল নম্বর রিচার্জ/লটারি প্রতারণা", count: 310, percentage: 7, trend: "stable" },
      ],
      topHotspots: ["Hili Land Port", "Dinajpur Sadar", "Rangpur City", "Kurigram Char Area", "Gaibandha Sadar"],
      topHotspots_bn: ["হিলি স্থলবন্দর", "দিনাজপুর সদর", "রংপুর সিটি", "কুড়িগ্রাম চরাঞ্চল", "গাইবান্ধা সদর"],
    },
    resources: {
      gas: {
        deficitPercentage: 70,
        severity: "Critical",
        severity_bn: "সংকটজনক",
        pressureDropBar: 98,
        industrialImpact: "Minimal pipeline gas; cold storage units depend entirely on electricity & diesel",
        industrialImpact_bn: "পাইপলাইন গ্যাস নেই বললেই চলে; হিমাগারগুলো বিদ্যুৎ ও ডিজেল নির্ভর",
      },
      fuelOil: {
        stockDeficitPercentage: 25,
        octaneAvailability: "Low",
        octaneAvailability_bn: "কম",
        dieselAvailability: "Low",
        dieselAvailability_bn: "কম",
        stationQueueIndex: "Medium",
        stationQueueIndex_bn: "মাঝারি",
      },
      electricity: {
        avgLoadSheddingHours: 5.8,
        peakDeficitMW: 430,
        ruralStatus: "Cold storages and agriculture hit by frequent 6+ hours load-shedding",
        ruralStatus_bn: "আলুর হিমাগার ও কৃষিতে দৈনিক ৬+ ঘণ্টার ক্ষতিকর লোডশেডিং",
      },
      water: {
        scarcityIndex: 75,
        salinityOrDepletion: "Teesta river basin severe water shortage in dry season",
        salinityOrDepletion_bn: "শুষ্ক মৌসুমে তিস্তা অববাহিকায় তীব্র পানি শূন্যতা ও নদী শুকানো",
      },
      commodities: {
        inflationPercentage: 9.2,
        scarcityItems: ["Diesel Fuel", "Potato Cold Storage Rent", "Fertilizer"],
        scarcityItems_bn: ["ডিজেল জ্বালানি", "হিমাগার আলু ভাড়া", "সার"],
      },
    },
    forecast30Days: [
      { month: "Current", monthBn: "বর্তমান", projectedCases: 4420, projectedLoadShedding: 5.8, projectedGasDeficit: 70, seasonalWarning: "Cold storage potato preservation power demand", seasonalWarning_bn: "হিমাগারে আলু সংরক্ষণে বিদ্যুৎ শক্তির ঘাটতি" },
      { month: "Month +1", monthBn: "পরবর্তী মাস", projectedCases: 4700, projectedLoadShedding: 6.8, projectedGasDeficit: 72, seasonalWarning: "Teesta basin dry drought spell", seasonalWarning_bn: "তিস্তা অববাহিকায় তীব্র খরার পূর্বাভাস" },
      { month: "Month +2", monthBn: "২ মাস পর", projectedCases: 4500, projectedLoadShedding: 6.0, projectedGasDeficit: 71, seasonalWarning: "Cattle theft & border smuggling surge", seasonalWarning_bn: "চরাঞ্চলে গবাদিপশু চুরি ও গরু পাচার" },
    ],
    historicalYoY: [
      { year: 2024, totalCrimes: 51000, avgLoadShedding: 4.9, avgGasDeficit: 62 },
      { year: 2025, totalCrimes: 52400, avgLoadShedding: 5.3, avgGasDeficit: 66 },
      { year: 2026, totalCrimes: 53040, avgLoadShedding: 5.8, avgGasDeficit: 70 },
    ],
    emergencyContacts: {
      policeHelpline: "999 / 02589960000",
      gasEmergency: "16496 (PGCL Rangpur)",
      powerHelpline: "16999 (NESCO Rangpur)",
      wasaHelpline: "02589961000 (Rangpur City Corp)",
      dcOfficeControl: "02589962000",
    },
  },
  {
    id: "mymensingh",
    nameEn: "Mymensingh",
    nameBn: "ময়মনসিংহ",
    headquarters: "Mymensingh",
    headquarters_bn: "ময়মনসিংহ",
    districtsCount: 4,
    populationMillions: 12.3,
    overallSeverityScore: 59,
    riskLevel: "Low Risk",
    riskLevel_bn: "নিম্ন ঝুঁকিপূর্ণ",
    districts: [
      { id: "mymensingh-sadar", nameEn: "Mymensingh Sadar", nameBn: "ময়মনসিংহ সদর", totalCrimeCasesMonthly: 1200, loadSheddingHours: 4.0, gasDeficitPercentage: 35, severityScore: 60, topHotspot: "Ganginarpar", topHotspot_bn: "গাঙ্গিনারপাড়" },
      { id: "jamalpur", nameEn: "Jamalpur", nameBn: "জামালপুর", totalCrimeCasesMonthly: 850, loadSheddingHours: 5.0, gasDeficitPercentage: 30, severityScore: 62, topHotspot: "Nandina", topHotspot_bn: "নান্দিনা" },
      { id: "sherpur", nameEn: "Sherpur Border", nameBn: "শেরপুর সীমান্ত", totalCrimeCasesMonthly: 680, loadSheddingHours: 4.8, gasDeficitPercentage: 40, severityScore: 58, topHotspot: "Nalitabari Border", topHotspot_bn: "নালিতাবাড়ী সীমান্ত" },
      { id: "netrokona", nameEn: "Netrokona Haor", nameBn: "নেত্রকোণা হাওর", totalCrimeCasesMonthly: 550, loadSheddingHours: 4.5, gasDeficitPercentage: 35, severityScore: 55, topHotspot: "Mohanganj", topHotspot_bn: "মোহনগঞ্জ" },
    ],
    crime: {
      totalCasesMonthly: 3280,
      crimeRatePer100k: 26.6,
      trendChange: -0.8,
      breakdown: [
        { type: "Theft & Burglary", type_bn: "চুরি ও মৎস্য খামার সাবোটাজ", count: 1082, percentage: 33, trend: "stable" },
        { type: "Violent & Land Disputes", type_bn: "কৃষি জমি ও পারিবারিক বিরোধ", count: 885, percentage: 27, trend: "declining" },
        { type: "Narcotics & Smuggling", type_bn: "গারো পাহাড় সীমান্ত মাদক", count: 656, percentage: 20, trend: "rising" },
        { type: "Extortion & Gangs", type_bn: "অটোরিকশা ও বালুমহাল চাঁদাবাজি", count: 393, percentage: 12, trend: "stable" },
        { type: "Cybercrime & Fraud", type_bn: "বিকাশ ও এনআইডি প্রতারণা", count: 264, percentage: 8, trend: "stable" },
      ],
      topHotspots: ["Mymensingh Sadar", "Jamalpur Town", "Sherpur Border", "Netrokona Haor Border", "Bhaluka"],
      topHotspots_bn: ["ময়মনসিংহ সদর", "জামালপুর শহর", "শেরপুর সীমান্ত", "নেত্রকোণা হাওর সীমান্ত", "ভালুকা"],
    },
    resources: {
      gas: {
        deficitPercentage: 35,
        severity: "Severe",
        severity_bn: "গুরুতর",
        pressureDropBar: 70,
        industrialImpact: "Bhaluka industrial cluster experiencing low gas pressure during day",
        industrialImpact_bn: "ভালুকা শিল্পাঞ্চলে দিনের বেলায় গ্যাসের স্বল্পচাপ",
      },
      fuelOil: {
        stockDeficitPercentage: 20,
        octaneAvailability: "Normal",
        octaneAvailability_bn: "স্বাভাবিক",
        dieselAvailability: "Low",
        dieselAvailability_bn: "কম",
        stationQueueIndex: "Low",
        stationQueueIndex_bn: "নিম্ন",
      },
      electricity: {
        avgLoadSheddingHours: 4.5,
        peakDeficitMW: 310,
        ruralStatus: "Poultry and fish hatcheries affected by power interruptions",
        ruralStatus_bn: "পোল্ট্রি ও মাছের হ্যাচারিতে বিদ্যুৎ বিভ্রাটে উৎপাদন ব্যাহত",
      },
      water: {
        scarcityIndex: 58,
        salinityOrDepletion: "Groundwater decline in industrial zones of Bhaluka",
        salinityOrDepletion_bn: "ভালুকা শিল্পাঞ্চলের কারণে ভূগর্ভস্থ পানির দ্রুত পতন",
      },
      commodities: {
        inflationPercentage: 9.8,
        scarcityItems: ["Poultry Feed", "LPG Gas", "Diesel"],
        scarcityItems_bn: ["পোল্ট্রি ফিড", "এলপিজি গ্যাস", "ডিজেল"],
      },
    },
    forecast30Days: [
      { month: "Current", monthBn: "বর্তমান", projectedCases: 3280, projectedLoadShedding: 4.5, projectedGasDeficit: 35, seasonalWarning: "Poultry farm power outages", seasonalWarning_bn: "পোল্ট্রি ফিড ও হ্যচারিতে বিদ্যুৎ বিভ্রাট" },
      { month: "Month +1", monthBn: "পরবর্তী মাস", projectedCases: 3500, projectedLoadShedding: 5.2, projectedGasDeficit: 38, seasonalWarning: "Bhaluka industrial gas drop", seasonalWarning_bn: "ভালুকা শিল্পাঞ্চলে গ্যাসের চাপ হ্রাস" },
      { month: "Month +2", monthBn: "২ মাস পর", projectedCases: 3350, projectedLoadShedding: 4.8, projectedGasDeficit: 36, seasonalWarning: "Border timber & drug smuggling", seasonalWarning_bn: "গারো পাহাড় সীমান্তে কাঠ ও মাদক পাচার" },
    ],
    historicalYoY: [
      { year: 2024, totalCrimes: 36000, avgLoadShedding: 3.8, avgGasDeficit: 28 },
      { year: 2025, totalCrimes: 38200, avgLoadShedding: 4.1, avgGasDeficit: 31 },
      { year: 2026, totalCrimes: 39360, avgLoadShedding: 4.5, avgGasDeficit: 35 },
    ],
    emergencyContacts: {
      policeHelpline: "999 / 091-66000",
      gasEmergency: "16496 (Titas Mymensingh)",
      powerHelpline: "16999 (PDB Mymensingh)",
      wasaHelpline: "091-67000 (Mymensingh City Corp)",
      dcOfficeControl: "091-66500",
    },
  },
];

/**
 * Named shortage points (CNG / fuel pumps, grid nodes, water stress)
 * plotted on the interactive division map. Values are operational estimates
 * that the live pulse layer can elevate when riskScore rises.
 */
export const DIVISION_SHORTAGE_SITES: ShortageSite[] = [
  // Dhaka
  { id: "dh-gas-tongi", divisionId: "dhaka", kind: "gas", nameEn: "Tongi CNG Hub", nameBn: "টঙ্গী সিএনজি হাব", severity: "critical", detailEn: "Industrial low pressure — 4–6 hr supply cuts", detailBn: "শিল্প গ্যাস চাপ সংকট — দৈনিক ৪–৬ ঘণ্টা সরবরাহ বন্ধ", lat: 23.9, lng: 90.41 },
  { id: "dh-fuel-mirpur", divisionId: "dhaka", kind: "fuel", nameEn: "Mirpur-10 Filling Station Cluster", nameBn: "মিরপুর-১০ পাম্প ক্লাস্টার", severity: "high", detailEn: "Octane queue & diesel shortage at pumps", detailBn: "পাম্পে অকটেন সারি ও ডিজেল ঘাটতি", lat: 23.81, lng: 90.37 },
  { id: "dh-power-uttara", divisionId: "dhaka", kind: "power", nameEn: "Uttara Grid Node", nameBn: "উত্তরা গ্রিড নোড", severity: "high", detailEn: "Peak evening load-shedding 3–5 hrs", detailBn: "সন্ধ্যার পিকে ৩–৫ ঘণ্টা লোডশেডিং", lat: 23.87, lng: 90.39 },
  { id: "dh-water-savar", divisionId: "dhaka", kind: "water", nameEn: "Savar Deep Tube-well Zone", nameBn: "সাভার গভীর নলকূপ জোন", severity: "critical", detailEn: "Groundwater drop affecting industries", detailBn: "শিল্প এলাকায় ভূগর্ভস্থ পানি স্তর পতন", lat: 23.86, lng: 90.26 },
  // Chattogram
  { id: "ctg-gas-sitakunda", divisionId: "chattogram", kind: "gas", nameEn: "Sitakunda Industrial Gas Line", nameBn: "সীতাকুণ্ড শিল্প গ্যাস লাইন", severity: "critical", detailEn: "Ship-breaking & mill pressure drop", detailBn: "শিপ ব্রেকিং ও মিলে গ্যাস চাপ হ্রাস", lat: 22.62, lng: 91.66 },
  { id: "ctg-fuel-agrabad", divisionId: "chattogram", kind: "fuel", nameEn: "Agrabad Depot Pumps", nameBn: "আগ্রাবাদ ডিপো পাম্প", severity: "high", detailEn: "Port truck diesel rationing", detailBn: "বন্দর ট্রাকে ডিজেল রেশনিং", lat: 22.32, lng: 91.81 },
  { id: "ctg-power-cox", divisionId: "chattogram", kind: "power", nameEn: "Cox's Bazar Feeder", nameBn: "কক্সবাজার ফিডার", severity: "moderate", detailEn: "Coastal feeder instability", detailBn: "উপকূলীয় ফিডারে অস্থিরতা", lat: 21.43, lng: 92.01 },
  // Khulna
  { id: "kh-gas-city", divisionId: "khulna", kind: "gas", nameEn: "Khulna City CNG Stations", nameBn: "খুলনা সিটি সিএনজি স্টেশন", severity: "high", detailEn: "CNG stations closed mid-day", detailBn: "দুপুরে সিএনজি স্টেশন বন্ধ", lat: 22.85, lng: 89.54 },
  { id: "kh-fuel-mongla", divisionId: "khulna", kind: "fuel", nameEn: "Mongla Port Fuel Yard", nameBn: "মোংলা বন্দর জ্বালানি ইয়ার্ড", severity: "critical", detailEn: "Diesel stock below 3-day buffer", detailBn: "ডিজেল মজুদ ৩ দিনের নিচে", lat: 22.47, lng: 89.6 },
  { id: "kh-water-satkhira", divisionId: "khulna", kind: "water", nameEn: "Satkhira Salinity Belt", nameBn: "সাতক্ষীরা লবণাক্ত বেল্ট", severity: "critical", detailEn: "Drinking water salinity spike", detailBn: "পানীয় জলে লবণাক্ততা বৃদ্ধি", lat: 22.33, lng: 89.1 },
  // Rajshahi
  { id: "rj-gas-city", divisionId: "rajshahi", kind: "gas", nameEn: "Rajshahi City Gas Loop", nameBn: "রাজশাহী সিটি গ্যাস লুপ", severity: "moderate", detailEn: "Evening residential pressure drop", detailBn: "সন্ধ্যায় আবাসিক গ্যাস চাপ কম", lat: 24.37, lng: 88.6 },
  { id: "rj-fuel-godagari", divisionId: "rajshahi", kind: "fuel", nameEn: "Godagari Border Pumps", nameBn: "গোদাগাড়ী সীমান্ত পাম্প", severity: "high", detailEn: "Octane shortage near border route", detailBn: "সীমান্ত রুটে অকটেন সংকট", lat: 24.47, lng: 88.33 },
  { id: "rj-power-nawabganj", divisionId: "rajshahi", kind: "power", nameEn: "Chapainawabganj Rural Grid", nameBn: "চাঁপাইনবাবগঞ্জ গ্রামীণ গ্রিড", severity: "high", detailEn: "5–7 hr rural load-shedding", detailBn: "গ্রামাঞ্চলে ৫–৭ ঘণ্টা লোডশেডিং", lat: 24.6, lng: 88.27 },
  // Sylhet
  { id: "sy-gas-city", divisionId: "sylhet", kind: "gas", nameEn: "Sylhet City CNG Corridor", nameBn: "সিলেট সিটি সিএনজি করিডোর", severity: "moderate", detailEn: "CNG pump queues at peak hours", detailBn: "পিক আওয়ারে সিএনজি সারি", lat: 24.9, lng: 91.87 },
  { id: "sy-fuel-beanibazar", divisionId: "sylhet", kind: "fuel", nameEn: "Beanibazar Filling Stations", nameBn: "বিয়ানীবাজার পাম্প", severity: "high", detailEn: "Diesel supply lag from depot", detailBn: "ডিপো থেকে ডিজেল সরবরাহ বিলম্ব", lat: 24.81, lng: 92.16 },
  { id: "sy-power-habiganj", divisionId: "sylhet", kind: "power", nameEn: "Habiganj Tea Estate Feeder", nameBn: "হবিগঞ্জ চা বাগান ফিডার", severity: "moderate", detailEn: "Estate power interruptions", detailBn: "বাগানে বিদ্যুৎ বিভ্রাট", lat: 24.38, lng: 91.41 },
  // Barishal
  { id: "br-fuel-city", divisionId: "barishal", kind: "fuel", nameEn: "Barishal Launch Terminal Pumps", nameBn: "বরিশাল লঞ্চ টার্মিনাল পাম্প", severity: "high", detailEn: "River transport diesel crunch", detailBn: "নৌ-পরিবহনে ডিজেল সংকট", lat: 22.7, lng: 90.37 },
  { id: "br-power-bhola", divisionId: "barishal", kind: "power", nameEn: "Bhola Island Feeder", nameBn: "ভোলা দ্বীপ ফিডার", severity: "critical", detailEn: "Long island outages overnight", detailBn: "রাতে দ্বীপে দীর্ঘ বিদ্যুৎ বিভ্রাট", lat: 22.69, lng: 90.65 },
  { id: "br-water-patuakhali", divisionId: "barishal", kind: "water", nameEn: "Patuakhali Coastal Belt", nameBn: "পটুয়াখালী উপকূল বেল্ট", severity: "high", detailEn: "Saline intrusion in tube-wells", detailBn: "নলকূপে লবণাক্ত পানি অনুপ্রবেশ", lat: 22.36, lng: 90.33 },
  // Rangpur
  { id: "rp-gas-city", divisionId: "rangpur", kind: "gas", nameEn: "Rangpur City CNG Points", nameBn: "রংপুর সিটি সিএনজি পয়েন্ট", severity: "moderate", detailEn: "Limited CNG hours", detailBn: "সিএনজি সরবরাহ সীমিত সময়", lat: 25.74, lng: 89.25 },
  { id: "rp-fuel-dinajpur", divisionId: "rangpur", kind: "fuel", nameEn: "Dinajpur Highway Pumps", nameBn: "দিনাজপুর হাইওয়ে পাম্প", severity: "high", detailEn: "Truck diesel queue on corridor", detailBn: "করিডোরে ট্রাক ডিজেল সারি", lat: 25.63, lng: 88.64 },
  { id: "rp-power-kurigram", divisionId: "rangpur", kind: "power", nameEn: "Kurigram Char Feeder", nameBn: "কুড়িগ্রাম চর ফিডার", severity: "critical", detailEn: "Char areas dark 6–8 hrs", detailBn: "চরাঞ্চলে ৬–৮ ঘণ্টা অন্ধকার", lat: 25.81, lng: 89.65 },
  // Mymensingh
  { id: "my-gas-bhaluka", divisionId: "mymensingh", kind: "gas", nameEn: "Bhaluka Industrial Gas Spur", nameBn: "ভালুকা শিল্প গ্যাস স্পার", severity: "critical", detailEn: "Daytime industrial pressure collapse", detailBn: "দিনের বেলা শিল্প গ্যাস চাপ পতন", lat: 24.38, lng: 90.38 },
  { id: "my-fuel-sadar", divisionId: "mymensingh", kind: "fuel", nameEn: "Mymensingh Sadar Pumps", nameBn: "ময়মনসিংহ সদর পাম্প", severity: "moderate", detailEn: "Octane intermittent at city pumps", detailBn: "শহরের পাম্পে অকটেন মাঝে মাঝে সংকট", lat: 24.75, lng: 90.4 },
  { id: "my-power-jamalpur", divisionId: "mymensingh", kind: "power", nameEn: "Jamalpur Poultry Grid", nameBn: "জামালপুর পোল্ট্রি গ্রিড", severity: "high", detailEn: "Hatchery outages overnight", detailBn: "রাতে হ্যাচারিতে বিদ্যুৎ বিভ্রাট", lat: 24.92, lng: 89.95 },
];
