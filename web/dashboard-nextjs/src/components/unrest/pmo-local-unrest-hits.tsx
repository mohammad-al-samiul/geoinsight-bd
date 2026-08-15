"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Megaphone } from "lucide-react";
import { useNationalBoard, type UnrestTrend } from "@/hooks/use-national-board";
import { cn } from "@/lib/utils";

function trendKey(trend: UnrestTrend): "trendRising" | "trendStable" | "trendFalling" {
  if (trend === "rising") return "trendRising";
  if (trend === "falling") return "trendFalling";
  return "trendStable";
}

/** Compact Local DSS seat hits on the national unrest page — no extra map pins. */
export function PmoLocalUnrestHits() {
  const t = useTranslations("modules.pmoLocal");
  const isBn = useLocale().startsWith("bn");
  const { data, allowed } = useNationalBoard();

  if (!allowed || !data?.seats.length) return null;

  return (
    <div className="mb-4 glass-panel rounded-xl border border-border/50 p-3">
      <p className="mb-2 inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        <Megaphone className="h-3.5 w-3.5 text-orange-300" />
        {t("unrestHitsTitle")}
      </p>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
        {data.seats.map((seat) => {
          const label = isBn ? seat.nameBn || seat.name : seat.name;
          const rising = seat.unrest.trend === "rising";
          return (
            <Link
              key={seat.entityId}
              href={seat.hrefs.pulse}
              className={cn(
                "rounded-lg border px-3 py-2 text-sm transition hover:border-primary/40",
                rising
                  ? "border-orange-400/40 bg-orange-500/10"
                  : seat.unrest.active > 0
                    ? "border-amber-500/30 bg-amber-500/5"
                    : "border-border/50 bg-background/30",
              )}
            >
              <p className="truncate font-medium">{label}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {t(trendKey(seat.unrest.trend))} · {seat.unrest.active} {t("clusters")} ·{" "}
                {seat.unrest.last24h}/24h
              </p>
            </Link>
          );
        })}
      </div>
      <p className="mt-2 text-[10px] text-muted-foreground/80">{t("unrestHitsNote")}</p>
    </div>
  );
}
