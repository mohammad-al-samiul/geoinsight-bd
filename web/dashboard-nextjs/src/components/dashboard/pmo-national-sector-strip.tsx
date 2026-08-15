"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Briefcase, GraduationCap, HeartPulse } from "lucide-react";
import { MotionSection } from "@/components/ui/module-motion";
import { useNationalSectors } from "@/hooks/use-national-sectors";
import { cn } from "@/lib/utils";
import { DataTrustBadge } from "@/components/ui/data-trust-banner";

export function PmoNationalSectorStrip() {
  const t = useTranslations("modules.nationalSectors");
  const isBn = useLocale().startsWith("bn");
  const { data, error, loading, allowed } = useNationalSectors();

  if (!allowed) return null;

  return (
    <MotionSection className="glass-panel rounded-xl p-4 shadow-panel">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            <GraduationCap className="h-3.5 w-3.5 text-sky-300" />
            {t("countryWide")}
            <span className="text-border">·</span>
            {t("title")}
            <DataTrustBadge kind={(data?.csvDistricts ?? 0) > 0 ? "live" : "seed"} />
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{t("homeNote")}</p>
        </div>
        {data ? (
          <p className="text-[11px] text-muted-foreground">
            {t("colEducation")} {data.summary.educationAlerts} · {t("colHealth")}{" "}
            {data.summary.healthAlerts} · {t("colJobs")} {data.summary.jobsAlerts} ·{" "}
            {t("unemployment")} {data.summary.unemploymentAvg}%
          </p>
        ) : null}
      </div>

      {loading && !data ? (
        <p className="text-sm text-muted-foreground">{t("loading")}</p>
      ) : error && !data ? (
        <p className="text-sm text-destructive">{t("loadFailed")}</p>
      ) : !data?.divisions.length ? (
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {data.divisions.map((div) => {
            const label = isBn ? div.nameBn || div.name : div.name;
            const danger =
              div.education.alert >= 3 ||
              div.health.alert >= 3 ||
              div.jobs.alert >= 3 ||
              div.education.pressureAvg >= 48 ||
              div.health.pressureAvg >= 48 ||
              div.jobs.pressureAvg >= 48;
            return (
              <Link
                key={div.id}
                href={`/sectors?division=${div.id}`}
                className={cn(
                  "rounded-lg border px-3 py-2.5 text-sm hover:opacity-90",
                  danger
                    ? "border-destructive/40 bg-destructive/10"
                    : "border-border/60 bg-secondary/30",
                )}
              >
                <p className="truncate font-medium text-foreground">{label}</p>
                <p className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                  {div.education.districts} {t("districts")}
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px]",
                      div.education.alert > 0
                        ? "border-destructive/40 text-destructive"
                        : "border-border/50 text-muted-foreground",
                    )}
                  >
                    <GraduationCap className="h-3 w-3" />
                    {div.education.alert}
                  </span>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px]",
                      div.health.alert > 0
                        ? "border-destructive/40 text-destructive"
                        : "border-border/50 text-muted-foreground",
                    )}
                  >
                    <HeartPulse className="h-3 w-3" />
                    {div.health.alert}
                  </span>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px]",
                      div.jobs.alert > 0
                        ? "border-destructive/40 text-destructive"
                        : "border-border/50 text-muted-foreground",
                    )}
                  >
                    <Briefcase className="h-3 w-3" />
                    {div.jobs.alert}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
        <Link href="/sectors" className="hover:text-primary">
          {t("openBoard")}
        </Link>
        <Link href="/sectors?tab=jobs" className="hover:text-primary">
          {t("openJobs")}
        </Link>
      </div>
      <p className="mt-2 text-[10px] text-muted-foreground/80">{t("sourceNote")}</p>
    </MotionSection>
  );
}
