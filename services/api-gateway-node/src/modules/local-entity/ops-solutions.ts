import { ServiceOutageKind } from "@prisma/client";

export type OpsHint = { en: string; bn: string; horizon: "0-24h" };

const OUTAGE_HINTS: Record<string, OpsHint> = {
  POWER: {
    horizon: "0-24h",
    en: "Dispatch feeder crew; post restore ETA at the ward office; generator cover for clinic/school.",
    bn: "ফিডার ক্রু পাঠান; ওয়ার্ড অফিসে পুনরুদ্ধার সময় টানুন; ক্লিনিক/স্কুলে জেনারেটর দিন।",
  },
  GAS: {
    horizon: "0-24h",
    en: "Isolate leak, notify Titas, restrict cooking hours, evacuate the lane if smell persists.",
    bn: "লিকেজ আলাদা করুন, তিতাসকে জানান, রান্নার সময় সীমিত করুন, গন্ধ থাকলে গলি খালি করুন।",
  },
  FUEL: {
    horizon: "0-24h",
    en: "Coordinate tanker ETA, queue control with police, publish official pump hours and price.",
    bn: "ট্যাংকার ETA সমন্বয়, পুলিশ দিয়ে লাইন নিয়ন্ত্রণ, পাম্প সময় ও দাম প্রকাশ করুন।",
  },
  WATER: {
    horizon: "0-24h",
    en: "WASA valve crew + tanker to affected lanes; boil-water notice if supply is intermittent.",
    bn: "ওয়াসা ভালভ ক্রু ও ক্ষতিগ্রস্ত গলিতে ট্যাংকার; সরবরাহ অনিয়মিত হলে পানি ফুটিয়ে পান করার নোটিশ।",
  },
  DRAINAGE: {
    horizon: "0-24h",
    en: "Standby pumps, clear outfall, divert traffic; inspect after the next rain band.",
    bn: "পাম্প স্ট্যান্ডবাই, আউটফল পরিষ্কার, ট্রাফিক সরান; পরের বৃষ্টিতে আবার দেখুন।",
  },
  ROAD: {
    horizon: "0-24h",
    en: "Emergency fill tonight, barricade the crater, post an alternate bus route.",
    bn: "আজ রাতে জরুরি ভরাট, গর্ত ব্যারিকেড, বিকল্প বাস রুট জানান।",
  },
  INTERNET: {
    horizon: "0-24h",
    en: "Open ISP ticket; temporary public Wi-Fi at the ward office for urgent filings.",
    bn: "আইএসপি টিকিট খুলুন; জরুরি দাখিলের জন্য ওয়ার্ড অফিসে সাময়িক পাবলিক ওয়াই-ফাই।",
  },
  OTHER: {
    horizon: "0-24h",
    en: "Assign a field inspector today and publish a citizen update within 6 hours.",
    bn: "আজই ফিল্ড ইন্সপেক্টর দিন এবং ৬ ঘণ্টার মধ্যে নাগরিক আপডেট দিন।",
  },
};

export function outageOpsHint(kind: ServiceOutageKind | string): OpsHint {
  return OUTAGE_HINTS[kind] ?? OUTAGE_HINTS.OTHER;
}

export function unrestOpsHint(themeId: string): OpsHint {
  const map: Record<string, OpsHint> = {
    power: OUTAGE_HINTS.POWER,
    gas: OUTAGE_HINTS.GAS,
    gas_fuel: OUTAGE_HINTS.FUEL,
    fuel: OUTAGE_HINTS.FUEL,
    road_transport: OUTAGE_HINTS.ROAD,
    water_flood: OUTAGE_HINTS.DRAINAGE,
    hartal_blockade: {
      horizon: "0-24h",
      en: "Keep hospital/school corridors open; post a same-day route map; liaison with police at two chokepoints.",
      bn: "হাসপাতাল/স্কুল করিডোর খোলা রাখুন; আজই রুট ম্যাপ দিন; দুই চোকপয়েন্টে পুলিশ যোগাযোগ রাখুন।",
    },
    student: {
      horizon: "0-24h",
      en: "Offer a campus meeting room, keep exam/clinic traffic clear, avoid overnight campus lock-in.",
      bn: "ক্যাম্পাস মিটিং রুম দিন, পরীক্ষা/ক্লিনিক ট্রাফিক খোলা রাখুন, রাতভর ক্যাম্পাস লক-ইন এড়ান।",
    },
    corruption: {
      horizon: "0-24h",
      en: "Open a named inquiry desk, freeze the disputed counter, publish a same-day citizen note.",
      bn: "নামসহ তদন্ত ডেস্ক খুলুন, বিতর্কিত কাউন্টার স্থগিত রাখুন, আজই নাগরিক নোট দিন।",
    },
    wage: {
      horizon: "0-24h",
      en: "Offer a ward meeting room, keep a labour liaison on site, avoid unannounced eviction.",
      bn: "ওয়ার্ড মিটিং রুম দিন, শ্রম যোগাযোগ কর্মী রাখুন, ঘোষণা ছাড়া উচ্ছেদ এড়ান।",
    },
  };
  return (
    map[themeId] ?? {
      horizon: "0-24h",
      en: "Send a councillor + police liaison; keep a calm route for school/hospital traffic.",
      bn: "কাউন্সিলর ও পুলিশ যোগাযোগ কর্মী পাঠান; স্কুল/হাসপাতালের শান্ত রুট খোলা রাখুন।",
    }
  );
}

export function sectorOpsHint(sector: string, kind: string): OpsHint {
  if (sector === "EDUCATION") {
    return {
      horizon: "0-24h",
      en: "Generator cover for evening classes; list teacher absences; call the SMC today.",
      bn: "সন্ধ্যার ক্লাসে জেনারেটর; শিক্ষক অনুপস্থিতির তালিকা; আজই এসএমসি কল করুন।",
    };
  }
  if (sector === "HEALTH") {
    if (kind === "PHARMACY") {
      return {
        horizon: "0-24h",
        en: "Move ORS/paracetamol from the buffer store; post a stockout notice at the ward clinic.",
        bn: "বাফার স্টোর থেকে ORS/প্যারাসিটামল আনুন; ওয়ার্ড ক্লিনিকে স্টকআউট নোটিশ দিন।",
      };
    }
    return {
      horizon: "0-24h",
      en: "Larvicide plus drain clear on the hot ward; open a fever desk; protect maternity beds.",
      bn: "হট ওয়ার্ডে লার্ভিসাইড ও ড্রেন পরিষ্কার; জ্বর ডেস্ক খুলুন; মাতৃত্ব বেড রক্ষা করুন।",
    };
  }
  return {
    horizon: "0-24h",
    en: "Post this week's EPZ/BSCIC vacancies at the ward office; one bus to the job fair.",
    bn: "ওয়ার্ড অফিসে এই সপ্তাহের ইপিজেড/বিসিক শূন্যপদ টানুন; জব ফেয়ারে একটি বাস।",
  };
}

export function integrityOpsHint(domain: string, kind: string): OpsHint {
  if (domain === "CORRUPTION") {
    if (kind === "TENDER" || kind === "PROJECT_GHOST") {
      return {
        horizon: "0-24h",
        en: "Freeze the disputed package, name an inquiry officer, publish a same-day citizen note.",
        bn: "বিতর্কিত প্যাকেজ স্থগিত রাখুন, তদন্ত কর্মকর্তা নাম করুন, আজই নাগরিক নোট দিন।",
      };
    }
    if (kind === "HOLDING_TAX" || kind === "LICENSE_DESK" || kind === "BRIBE") {
      return {
        horizon: "0-24h",
        en: "Open a named counter with digital receipt only; post the official fee chart at the desk.",
        bn: "ডিজিটাল রসিদ-only কাউন্টার খুলুন; ডেস্কে অফিসিয়াল ফি চার্ট টানুন।",
      };
    }
    return {
      horizon: "0-24h",
      en: "Log the allegation, freeze the disputed step, and keep a paper trail for audit.",
      bn: "অভিযোগ লগ করুন, বিতর্কিত ধাপ স্থগিত রাখুন, অডিটের জন্য কাগজ রাখুন।",
    };
  }
  if (kind === "SNATCH" || kind === "THEFT") {
    return {
      horizon: "0-24h",
      en: "Night lighting + one extra patrol loop; CCTV check on the pinch point; ward volunteer desk.",
      bn: "রাতের আলো + একটি অতিরিক্ত টহল; চোকপয়েন্টে সিসিটিভি; ওয়ার্ড স্বেচ্ছাসেবক ডেস্ক।",
    };
  }
  if (kind === "MURDER" || kind === "STREET_VIOLENCE") {
    return {
      horizon: "0-24h",
      en: "Police liaison on scene, keep hospital corridor open, no crowd-control overreach.",
      bn: "ঘটনাস্থলে পুলিশ যোগাযোগ, হাসপাতাল করিডোর খোলা রাখুন, অতিরিক্ত ক্রাউড কন্ট্রোল নয়।",
    };
  }
  if (kind === "EVE_TEASING") {
    return {
      horizon: "0-24h",
      en: "Women's safety desk at the ward office; extra lighting on the school/market walk.",
      bn: "ওয়ার্ড অফিসে নারী নিরাপত্তা ডেস্ক; স্কুল/বাজার হাঁটাপথে অতিরিক্ত আলো।",
    };
  }
  if (kind === "TRAFFIC_ACCIDENT") {
    return {
      horizon: "0-24h",
      en: "Barricade the black spot tonight; temporary speed breaker; lighting check.",
      bn: "আজ রাতে ব্ল্যাক স্পট ব্যারিকেড; সাময়িক স্পিড ব্রেকার; আলো পরীক্ষা।",
    };
  }
  if (kind === "FIRE") {
    return {
      horizon: "0-24h",
      en: "Hydrant access + lane clear for the engine; market shutter drill this evening.",
      bn: "হাইড্রেন্ট অ্যাক্সেস ও ইঞ্জিনের জন্য গলি খালি; আজ সন্ধ্যায় মার্কেট শাটার ড্রিল।",
    };
  }
  return {
    horizon: "0-24h",
    en: "Councillor + thana liaison; keep a calm school/hospital route; publish a same-day note.",
    bn: "কাউন্সিলর ও থানা যোগাযোগ; স্কুল/হাসপাতালের শান্ত রুট; আজই নোট দিন।",
  };
}

export function commandOpsHint(tags: string[]): OpsHint {
  const set = new Set(tags);
  if (set.has("CRIME") && set.has("OUTAGE")) {
    return {
      horizon: "0-24h",
      en: "Dark streets plus crime: lighting crew tonight and one extra patrol loop.",
      bn: "অন্ধকার রাস্তা ও অপরাধ: আজ রাতে আলো + একটি অতিরিক্ত টহল।",
    };
  }
  if (set.has("HEALTH") && set.has("OUTAGE")) {
    return {
      horizon: "0-24h",
      en: "Generator cover for the clinic; keep the fever desk open through the outage.",
      bn: "ক্লিনিকে জেনারেটর; আউটজ চলাকালীন জ্বর ডেস্ক খোলা রাখুন।",
    };
  }
  if (set.has("CORRUPTION")) {
    return {
      horizon: "0-24h",
      en: "Named inquiry desk + digital receipt only on the hot counter.",
      bn: "হট কাউন্টারে নামসহ তদন্ত ডেস্ক + শুধু ডিজিটাল রসিদ।",
    };
  }
  return {
    horizon: "0-24h",
    en: "Stack a councillor visit with the hottest layer first; publish a same-day ward note.",
    bn: "সবচেয়ে গরম লেয়ার দিয়ে কাউন্সিলর ভিজিট; আজই ওয়ার্ড নোট দিন।",
  };
}
