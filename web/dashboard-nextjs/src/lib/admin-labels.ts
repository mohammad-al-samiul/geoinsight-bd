import type { AdminUnit } from "@/types";

/** Fallback Bengali labels when DB encoding returns corrupted name_bn. */
const BN_BY_NAME: Record<string, string> = {
  Dhaka: "ঢাকা",
  Chattogram: "চট্টগ্রাম",
  Khulna: "খুলনা",
  Rajshahi: "রাজশাহী",
  Sylhet: "সিলেট",
  Rangpur: "রংপুর",
  Barishal: "বরিশাল",
  Mymensingh: "ময়মনসিংহ",
  Gazipur: "গাজীপুর",
  Faridpur: "ফরিদপুর",
  Cumilla: "কুমিল্লা",
};

function isReadableBn(text: string | null | undefined): text is string {
  if (!text?.trim()) return false;
  if (/^[\s?.\uFFFD]+$/.test(text)) return false;
  if (text.includes("?") && !/[\u0980-\u09FF]/.test(text)) return false;
  return /[\u0980-\u09FF]/.test(text);
}

export function resolveBnLabel(name: string, nameBn?: string | null): string | undefined {
  if (isReadableBn(nameBn)) return nameBn;
  return BN_BY_NAME[name];
}

export function formatUnitOptionLabel(unit: Pick<AdminUnit, "name" | "nameBn">): {
  primary: string;
  secondary?: string;
} {
  const bn = resolveBnLabel(unit.name, unit.nameBn);
  if (!bn || bn === unit.name) {
    return { primary: unit.name };
  }
  return { primary: unit.name, secondary: bn };
}

export function formatUnitInline(unit: Pick<AdminUnit, "name" | "nameBn">): string {
  const { primary, secondary } = formatUnitOptionLabel(unit);
  return secondary ? `${primary} · ${secondary}` : primary;
}
