"use client";

import { useLocale, useTranslations } from "next-intl";
import { Radio } from "lucide-react";
import { cn } from "@/lib/utils";

export function LocalFreshnessBadge({
  lastUpdatedAt,
  freshness,
  className,
}: {
  lastUpdatedAt?: string | null;
  freshness?: "live" | "stale" | "unknown" | null;
  className?: string;
}) {
  const t = useTranslations("modules.localFreshness");
  const locale = useLocale();
  if (!lastUpdatedAt && !freshness) return null;
  const when = lastUpdatedAt
    ? new Date(lastUpdatedAt).toLocaleString(locale, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;
  const tone =
    freshness === "live"
      ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-100"
      : freshness === "stale"
        ? "border-amber-500/35 bg-amber-500/10 text-amber-100"
        : "border-border/50 bg-secondary/40 text-muted-foreground";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px]",
        tone,
        className,
      )}
    >
      <Radio className="h-3 w-3" />
      {freshness === "live" ? t("live") : freshness === "stale" ? t("stale") : t("unknown")}
      {when ? ` · ${when}` : ""}
    </span>
  );
}
