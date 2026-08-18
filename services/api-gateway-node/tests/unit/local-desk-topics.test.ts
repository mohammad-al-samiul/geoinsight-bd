import { matchEntity } from "../../src/modules/local-entity/local-desk-topics";

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
