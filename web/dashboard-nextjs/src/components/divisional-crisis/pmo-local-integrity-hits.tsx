"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { ShieldAlert } from "lucide-react";
import {
  useNationalBoard,
  integrityDanger,
  integrityHot,
} from "@/hooks/use-national-board";
import { cn } from "@/lib/utils";

/** Compact Local DSS crime/corruption seats on the 8-division page — not extra map pins. */
export function PmoLocalIntegrityHits() {
  const t = useTranslations("modules.pmoLocal");
  const isBn = useLocale().startsWith("bn");
  const { data, allowed } = useNationalBoard();

  if (!allowed || !data?.seats.length) return null;

  return (
    <div className="glass-panel rounded-xl border border-border/50 p-3">
      <p className="mb-2 inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        <ShieldAlert className="h-3.5 w-3.5 text-red-300" />
        {t("integrityHitsTitle")}
      </p>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
        {data.seats.map((seat) => {
          const label = isBn ? seat.nameBn || seat.name : seat.name;
          const danger = integrityDanger(seat);
          const hot = integrityHot(seat);
          return (
            <div
              key={seat.entityId}
              className={cn(
                "rounded-lg border px-3 py-2 text-sm",
                danger
                  ? "border-destructive/40 bg-destructive/10"
                  : hot
                    ? "border-amber-500/30 bg-amber-500/5"
                    : "border-border/50 bg-background/30",
              )}
            >
              <p className="truncate font-medium">{label}</p>
              <p className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                {seat.role} · {seat.code}
              </p>
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                {t("openCrime")} {seat.integrity.crime.open} · {t("nightShare")}{" "}
                {seat.integrity.crime.nightSharePct ?? 0}%
              </p>
              <p className="text-[11px] text-muted-foreground">
                {t("openCorruption")} {seat.integrity.corruption.open} · {t("tenderFlags")}{" "}
                {seat.integrity.corruption.tenderFlags ?? 0} · {t("bribes")}{" "}
                {seat.integrity.corruption.bribes ?? 0}
              </p>
              <div className="mt-1.5 flex flex-wrap gap-x-2 text-[10px] text-muted-foreground">
                <Link href={seat.hrefs.crime} className="hover:text-primary">
                  {t("openCrimeDesk")}
                </Link>
                <Link href={seat.hrefs.corruption} className="hover:text-primary">
                  {t("openCorruptionDesk")}
                </Link>
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-[10px] text-muted-foreground/80">{t("integrityHitsNote")}</p>
    </div>
  );
}
