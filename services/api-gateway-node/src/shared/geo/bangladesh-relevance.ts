/**
 * Keep unrest / protest intelligence Bangladesh-scoped.
 * Foreign wire copy (Middle East, etc.) often matches protest keywords
 * without being about BD.
 */

const BD_ANCHOR_KW = [
  "বাংলাদেশ",
  "bangladesh",
  "ঢাকা",
  "dhaka",
  "চট্টগ্রাম",
  "চট্টগ্রামের",
  "chattogram",
  "chittagong",
  "খুলনা",
  "khulna",
  "রাজশাহী",
  "rajshahi",
  "সিলেট",
  "sylhet",
  "বরিশাল",
  "barishal",
  "barisal",
  "রংপুর",
  "rangpur",
  "ময়মনসিংহ",
  "mymensingh",
  "গাজীপুর",
  "gazipur",
  "নারায়ণগঞ্জ",
  "narayanganj",
  "কক্সবাজার",
  "cox's bazar",
  "coxs bazar",
  "বিএনপি",
  "bnp",
  "আওয়ামী",
  "awami",
  "জামায়াত",
  "jamaat",
  "হেফাজত",
  "hefazat",
  "ইউনূস",
  "yunus",
  "শেখ হাসিনা",
  "hasina",
  "অন্তর্বর্তী সরকার",
  "interim government",
];

const FOREIGN_UNREST_KW = [
  "gaza",
  "গাজা",
  "israel",
  "ইসরায়েল",
  "ইসরাইল",
  "palestine",
  "ফিলিস্তিন",
  "west bank",
  "iran",
  "ইরান",
  "tehran",
  "তেহরান",
  "iraq",
  "ইরাক",
  "baghdad",
  "lebanon",
  "লেবানন",
  "beirut",
  "syria",
  "সিরিয়া",
  "damascus",
  "yemen",
  "ইয়েমেন",
  "saudi arabia",
  "সৌদি আরব",
  "hezbollah",
  "হেজবুল্লাহ",
  "hamas",
  "হামাস",
  "netanyahu",
  "tel aviv",
  "telaviv",
  "idf",
  "middle east",
  "মধ্যপ্রাচ্য",
  "মধ্য প্রাচ্য",
  "ukraine",
  "ukrainian",
  "ukrainians",
  "odesa",
  "odessa",
  "russia",
  "russian",
  "moscow",
  "kremlin",
  "indian activist",
  "new delhi",
  "pakistan",
  "islamabad",
  "afghanistan",
  "kabul",
];

const BD_PUBLISHER_MARKERS = [
  "prothomalo",
  "thedailystar",
  "bdnews24",
  "jagonews24",
  "risingbd",
  "channelionline",
  "jugantor",
  "samakal",
  "ittefaq",
  "kalerkantho",
  "banglatribune",
  "dhakatribune",
  "newagebd",
  "bssnews",
  "bss",
  "unb",
  "daily-sun",
  "observerbd",
  "businessinsiderbd",
  "tbsnews",
  "bonikbarta",
  "bangla.bdnews24",
];

function includesAny(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some((k) => lower.includes(k.toLowerCase()));
}

/** Drop agency bylines so "… — Bangladesh Sangbad Sangstha" does not count as BD news. */
function contentWithoutByline(title: string, summary?: string | null): string {
  const raw = `${title} ${summary ?? ""}`;
  return raw
    .replace(
      /\s*[-–|]\s*(The Daily Star|Prothom Alo|Bangladesh Sangbad Sangstha(?:\s*\(BSS\))?|BSS|BDNews24|Al Jazeera|Reuters|AFP|AP News).*$/gi,
      " ",
    )
    .replace(/\bBangladesh Sangbad Sangstha(?:\s*\(BSS\))?\b/gi, " ")
    .replace(/\bBSS\b/g, " ");
}

export function isBangladeshRelevantArticle(input: {
  title: string;
  summary?: string | null;
  district?: string | null;
  division?: string | null;
  sourceName?: string | null;
  url?: string | null;
}): boolean {
  const text = contentWithoutByline(input.title, input.summary);
  const meta = `${input.sourceName ?? ""} ${input.url ?? ""}`.toLowerCase();
  const hasBdAnchor = includesAny(text, BD_ANCHOR_KW);
  const hasForeign = includesAny(text, FOREIGN_UNREST_KW);
  const hasBdPublisher = BD_PUBLISHER_MARKERS.some((m) => meta.includes(m));

  const district = (input.district ?? "").trim();
  const hasRealDistrict =
    Boolean(district) &&
    district !== "National" &&
    !/^জাতীয়$/i.test(district);

  // Foreign crisis / war copy without a clear BD angle — drop.
  if (hasForeign && !hasBdAnchor) return false;

  // Military "strike" is not civil unrest even if BSS syndicated it.
  if (
    /\b(air\s*strike|airstrike|missile strike|drone strike|russian strike|israeli strike)\b/i.test(
      text,
    ) &&
    !includesAny(text, ["আন্দোলন", "বিক্ষোভ", "হরতাল", "protest", "demonstration", "hartal"])
  ) {
    return false;
  }

  if (hasBdAnchor || hasRealDistrict) return true;

  // BD outlet world desk (e.g. BBC Bangla ME) still needs a BD anchor.
  // English wire via BSS/Star can still be India/world — require BD angle.
  if (hasBdPublisher && !hasForeign) {
    const isBbc = /bbc/i.test(meta);
    if (isBbc) return false;
    const hasBengali = /[\u0980-\u09FF]/.test(text);
    if (hasBengali) return true;
    return false;
  }

  return false;
}
