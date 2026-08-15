"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Briefcase, GraduationCap, HeartPulse } from "lucide-react";
import {
  useNationalBoard,
  type NationalBoard,
  type NationalBoardSeat,
} from "@/hooks/use-national-board";
import { cn } from "@/lib/utils";

function alertClass(alert: number) {
  return alert > 0
    ? "border-destructive/40 bg-destructive/10 text-destructive"
    : "border-border/50 bg-background/30 text-muted-foreground";
}

function EducationCell({ seat }: { seat: NationalBoardSeat }) {
  const t = useTranslations("modules.pmoLocal");
  const s = seat.sectors.education;
  return (
    <Link href={seat.hrefs.education} className={cn("block rounded-md border px-2 py-1.5 hover:border-primary/40", alertClass(s.alert))}>
      <p className="text-[10px] font-semibold uppercase tracking-wide">
        {t("colEducation")} · {s.alert} {t("alerts")}
      </p>
      <p className="mt-0.5 text-[11px]">
        {t("attendance")} {s.attendanceAvg ?? 0}% · {t("dropout")} {s.dropoutAvg ?? 0} · {t("teacherGap")}{" "}
        {s.teacherGap ?? 0}
      </p>
    </Link>
  );
}

function HealthCell({ seat }: { seat: NationalBoardSeat }) {
  const t = useTranslations("modules.pmoLocal");
  const s = seat.sectors.health;
  return (
    <Link href={seat.hrefs.health} className={cn("block rounded-md border px-2 py-1.5 hover:border-primary/40", alertClass(s.alert))}>
      <p className="text-[10px] font-semibold uppercase tracking-wide">
        {t("colHealth")} · {s.alert} {t("alerts")}
      </p>
      <p className="mt-0.5 text-[11px]">
        {t("dengue7d")} {s.dengue7d ?? 0} · {t("stockouts")} {s.stockouts ?? 0}
      </p>
    </Link>
  );
}

function JobsCell({ seat }: { seat: NationalBoardSeat }) {
  const t = useTranslations("modules.pmoLocal");
  const s = seat.sectors.jobs;
  return (
    <Link href={seat.hrefs.jobs} className={cn("block rounded-md border px-2 py-1.5 hover:border-primary/40", alertClass(s.alert))}>
      <p className="text-[10px] font-semibold uppercase tracking-wide">
        {t("colJobs")} · {s.alert} {t("alerts")}
      </p>
      <p className="mt-0.5 text-[11px]">
        {t("unemployment")} {s.unemploymentAvg ?? 0}% · {t("jobFairGaps")} {s.jobFairGaps ?? 0}
      </p>
    </Link>
  );
}

export function PmoLocalSectorLeague({
  data,
  framed = false,
}: {
  data: NationalBoard;
  framed?: boolean;
}) {
  const t = useTranslations("modules.pmoLocal");
  const isBn = useLocale().startsWith("bn");

  if (!data.seats.length) return null;

  return (
    <div
      className={
        framed
          ? "glass-panel rounded-xl border border-border/50 p-3"
          : "mt-3 border-t border-border/40 pt-3"
      }
    >
      <p className="mb-2 inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        <GraduationCap className="h-3.5 w-3.5 text-sky-300" />
        {t("sectorLeagueTitle")}
      </p>
      <div className="space-y-2">
        {data.seats.map((seat) => {
          const label = isBn ? seat.nameBn || seat.name : seat.name;
          return (
            <div
              key={seat.entityId}
              className="grid gap-1.5 sm:grid-cols-[minmax(0,0.7fr)_repeat(3,minmax(0,1fr))] sm:items-stretch"
            >
              <Link href={seat.hrefs.desk} className="flex min-w-0 flex-col justify-center px-1 py-1">
                <p className="truncate text-sm font-medium">{label}</p>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {seat.role} · {seat.code}
                </p>
              </Link>
              <EducationCell seat={seat} />
              <HealthCell seat={seat} />
              <JobsCell seat={seat} />
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-[10px] text-muted-foreground/80">{t("sectorLeagueNote")}</p>
    </div>
  );
}

export function PmoLocalSectorLeagueSnippets({ framed = true }: { framed?: boolean }) {
  const { data, allowed } = useNationalBoard();
  if (!allowed || !data) return null;
  return <PmoLocalSectorLeague data={data} framed={framed} />;
}

export function sectorAlertTotal(seat: NationalBoardSeat) {
  return seat.sectors.education.alert + seat.sectors.health.alert + seat.sectors.jobs.alert;
}

export const SECTOR_CHIP_ICONS = {
  education: GraduationCap,
  health: HeartPulse,
  jobs: Briefcase,
} as const;
