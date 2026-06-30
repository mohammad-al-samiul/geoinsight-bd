"use client";

import { useLocale } from "next-intl";
import type { AppLocale } from "@/i18n/config";

/** API `lang` param — same as UI locale. */
export function useAppLang(): AppLocale {
  return useLocale() as AppLocale;
}
