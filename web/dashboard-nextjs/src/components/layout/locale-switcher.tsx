"use client";

import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { LOCALE_COOKIE, type AppLocale } from "@/i18n/config";
import { cn } from "@/lib/utils";
import { Languages } from "lucide-react";

function setLocaleCookie(locale: AppLocale) {
  document.cookie = `${LOCALE_COOKIE}=${locale};path=/;max-age=31536000;SameSite=Lax`;
}

export function LocaleSwitcher({ className }: { className?: string }) {
  const router = useRouter();
  const locale = useLocale() as AppLocale;
  const t = useTranslations("shell");

  const switchTo = (next: AppLocale) => {
    if (next === locale) return;
    setLocaleCookie(next);
    router.refresh();
  };

  return (
    <div
      className={cn("flex items-center gap-1 rounded-md border border-input bg-secondary/30 p-0.5", className)}
      role="group"
      aria-label={t("language")}
    >
      <Button
        type="button"
        size="sm"
        variant={locale === "bn" ? "secondary" : "ghost"}
        className="h-7 px-2.5 text-xs font-semibold"
        onClick={() => switchTo("bn")}
      >
        বাংলা
      </Button>
      <Button
        type="button"
        size="sm"
        variant={locale === "en" ? "secondary" : "ghost"}
        className="h-7 px-2.5 text-xs font-semibold"
        onClick={() => switchTo("en")}
      >
        EN
      </Button>
      <Languages className="mx-1 hidden h-3.5 w-3.5 text-muted-foreground sm:block" />
    </div>
  );
}
