import {
  classifyTopics,
  extractActors,
  extractIntensity,
  matchEntity,
  topicMatches,
} from "../../src/modules/local-entity/local-desk-topics";

function hit(code: string, text: string, district?: string) {
  return matchEntity(code, district ?? null, null, text).hit;
}

describe("matchEntity seat isolation", () => {
  it("CTG-8 keeps Boalkhali / Panchlaish / Chandgaon news", () => {
    expect(hit("CTG-8", "Panchlaish waterlogging after rain", "Chattogram")).toBe(true);
    expect(hit("CTG-8", "কালুরঘাট সেতুতে যানজট")).toBe(true);
    expect(hit("CTG-8", "বোয়ালখালীতে স্কুল বন্ধ")).toBe(true);
  });

  it("CTG-8 does not get other seats, Cumilla, or Dhaka", () => {
    expect(hit("CTG-8", "Kotwali clash near Khatunganj", "Chattogram")).toBe(false);
    expect(hit("CTG-8", "Patiya college closed after storm", "Chattogram")).toBe(false);
    expect(hit("CTG-8", "Dengue spreads across Chittagong city", "Chattogram")).toBe(false);
    expect(hit("CTG-8", "Cumilla city corporation budget passed", "Cumilla")).toBe(false);
    expect(hit("CTG-8", "Dhaka hospital bed crisis", "Dhaka")).toBe(false);
  });

  it("CTG-9 keeps Kotwali / Bakalia / CMCH, not CTG-8 areas", () => {
    expect(hit("CTG-9", "Khatunganj market fire", "Chattogram")).toBe(true);
    expect(hit("CTG-9", "CMCH outdoor overcrowded", "Chattogram")).toBe(true);
    expect(hit("CTG-9", "Panchlaish drain overflow", "Chattogram")).toBe(false);
    expect(hit("CTG-9", "Dhaka Kotwali thana raid", "Dhaka")).toBe(false);
  });

  it("CTG-10 and CTG-11 stay on their own upazila/thana names", () => {
    expect(hit("CTG-10", "Pahartali hill cutting drive", "Chattogram")).toBe(true);
    expect(hit("CTG-10", "Halishahar power cut overnight")).toBe(true);
    expect(hit("CTG-10", "Patiya road cave-in", "Chattogram")).toBe(false);
    expect(hit("CTG-11", "Anwara cyclone shelter ready")).toBe(true);
    expect(hit("CTG-11", "Agrabad canal dredging", "Chattogram")).toBe(false);
  });

  it("CCC mayor gets city-wide Chattogram, not Patiya / Cumilla / Dhaka", () => {
    expect(hit("CCC", "Chittagong dengue cases rise", "Chattogram")).toBe(true);
    expect(hit("CCC", "Agrabad parking gridlock")).toBe(true);
    expect(hit("CCC", "Patiya upazila school shut", "Chattogram")).toBe(false);
    expect(hit("CCC", "Boalkhali river erosion", "Chattogram")).toBe(false);
    expect(hit("CCC", "Kandirpar traffic jam", "Cumilla")).toBe(false);
    expect(hit("CCC", "Dhaka city corporation strike", "Dhaka")).toBe(false);
  });

  it("COCC mayor gets Cumilla city, not Chattogram or Dhaka", () => {
    expect(hit("COCC", "Kandirpar hawker eviction", "Cumilla")).toBe(true);
    expect(hit("COCC", "Cumilla city corporation tax drive")).toBe(true);
    expect(hit("COCC", "Chittagong port congestion", "Chattogram")).toBe(false);
    expect(hit("COCC", "Dhaka metro delay", "Dhaka")).toBe(false);
  });
});

describe("classifyTopics multi-label and Phase 4 precision rules", () => {
  const topicsOf = (text: string) => classifyTopics(text).map((h) => h.topic);

  it("tags movement, party, and civic issue together", () => {
    const tags = topicsOf("BNP rally and hartal in Panchlaish after drain waterlogging");
    expect(tags).toEqual(expect.arrayContaining(["UNREST", "PARTY", "CIVIC", "ISSUE"]));
  });

  it("does not tag a school closure as party politics", () => {
    const tags = topicsOf("Panchlaish primary school closed after rain");
    expect(tags).toContain("EDUCATION");
    expect(tags).not.toContain("PARTY");
  });

  it("distinguishes protest clash from criminal clash", () => {
    const unrestClash = topicsOf("পঞ্চলাইশে বিক্ষোভ মিছিল ও পুলিশের সঙ্গে সংঘর্ষ");
    expect(unrestClash).toContain("UNREST");

    const criminalClash = topicsOf("পঞ্চলাইশে ছিনতাই নিয়ে ২ দলের মধ্যে মারামারি ও সংঘর্ষ");
    expect(criminalClash).toContain("CRIME");
  });

  it("filters out party tag on mayor routine project inaugurations", () => {
    const tags = topicsOf("মেয়র উদ্বোধন করলেন পঞ্চলাইশের নতুন সড়ক উন্নয়ন প্রকল্প");
    expect(tags).not.toContain("PARTY");
  });

  it("extracts actor tags and intensity levels correctly", () => {
    const actors = extractActors("পঞ্চলাইশে ছাত্রলীগের মিছিলের সময় পুলিশের লাঠিচার্জ");
    expect(actors).toEqual(expect.arrayContaining(["POLICE", "STUDENT"]));

    const highIntensity = extractIntensity("অবরোধের সময় গাড়িতে আগুন ও সংঘর্ষ");
    expect(highIntensity).toBe("HIGH");

    const mediumIntensity = extractIntensity("পঞ্চলাইশ গোলচত্বরে শিক্ষার্থীদের বিক্ষোভ মিছিল");
    expect(mediumIntensity).toBe("MEDIUM");
  });

  it("tags gas/power crisis and exam postponement correctly as ISSUE and UNREST", () => {
    const powerIssue = topicsOf("পঞ্চলাইশে বিদ্যুৎ ও গ্যাস সংকট নিয়ে সড়ক অবরোধ ও আন্দোলন");
    expect(powerIssue).toEqual(expect.arrayContaining(["ISSUE", "UNREST"]));

    const examIssue = topicsOf("এইচএসসি পরীক্ষা স্থগিতের দাবিতে শিক্ষার্থীদের বিক্ষোভ মিছিল");
    expect(examIssue).toEqual(expect.arrayContaining(["ISSUE", "UNREST"]));
  });

  it("tags opposition party anti-gov programs as PARTY and UNREST", () => {
    const partyProgram = topicsOf("জামায়াত ও এনসিপির সরকার বিরোধী সমাবেশ ও বিক্ষোভ কর্মসূচি");
    expect(partyProgram).toEqual(expect.arrayContaining(["PARTY", "UNREST"]));
  });

  it("matches unrest and issue filters", () => {
    const hits = classifyTopics("হরতাল ও মিছিল পঞ্চলাইশে");
    expect(topicMatches("UNREST", hits)).toBe(true);
    const civic = classifyTopics("পঞ্চলাইশে জলাবদ্ধতা");
    expect(topicMatches("ISSUE", civic)).toBe(true);
  });
});
