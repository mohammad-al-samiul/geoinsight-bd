export const locales = ["en", "bn"] as const;
export type AppLocale = (typeof locales)[number];

export const defaultLocale: AppLocale = "bn";
export const LOCALE_COOKIE = "geoinsight-locale";

export function isAppLocale(value: string | undefined | null): value is AppLocale {
  return value === "en" || value === "bn";
}
