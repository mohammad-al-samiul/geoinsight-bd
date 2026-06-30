import type { AdminUnit } from "@/types";
import type { AppLocale } from "@/i18n/config";

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

export function formatUnitOptionLabel(
  unit: Pick<AdminUnit, "name" | "nameBn">,
  locale: AppLocale = "en",
): {
  primary: string;
  secondary?: string;
} {
  const bn = resolveBnLabel(unit.name, unit.nameBn);
  if (locale === "bn" && bn) {
    return bn === unit.name ? { primary: bn } : { primary: bn, secondary: unit.name };
  }
  if (!bn || bn === unit.name) {
    return { primary: unit.name };
  }
  return { primary: unit.name, secondary: bn };
}

export function formatUnitInline(
  unit: Pick<AdminUnit, "name" | "nameBn">,
  locale: AppLocale = "en",
): string {
  const { primary, secondary } = formatUnitOptionLabel(unit, locale);
  return secondary ? `${primary} · ${secondary}` : primary;
}
