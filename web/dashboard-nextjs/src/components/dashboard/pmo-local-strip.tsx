"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Bolt, BookOpen, Briefcase, Clock3, Crosshair, Droplets, Flame, Fuel, GraduationCap, HeartPulse, Megaphone, Scale, ShieldAlert, Siren, Zap } from "lucide-react";
import { MotionSection } from "@/components/ui/module-motion";
import { PmoLocalEvidenceCards } from "@/components/dashboard/pmo-local-evidence";
import { PmoLocalSectorLeague, sectorAlertTotal } from "@/components/dashboard/pmo-local-sector-league";
import { PmoLocalCommandStrip } from "@/components/dashboard/pmo-local-command-strip";
import { commandDanger, commandHot, integrityDanger, integrityHot, useNationalBoard, type UnrestTrend } from "@/hooks/use-national-board";
import { LAYER_COLORS, type MapLayerId } from "@/lib/local-map-layers";
import { cn } from "@/lib/utils";

const CIVIC: Array<{ id: MapLayerId; Icon: typeof Bolt }> = [
  { id: "POWER", Icon: Bolt },
  { id: "GAS", Icon: Flame },
  { id: "FUEL", Icon: Fuel },
  { id: "WATER", Icon: Droplets },
];

function trendKey(trend: UnrestTrend): "trendRising" | "trendStable" | "trendFalling" {
  if (trend === "rising") return "trendRising";
  if (trend === "falling") return "trendFalling";
  return "trendStable";
}

export function PmoLocalStrip() {
  const t = useTranslations("modules.pmoLocal");
  const tl = useTranslations("modules.localMapLayers");
  const isBn = useLocale().startsWith("bn");
  const { data, error, loading, allowed } = useNationalBoard();

  if (!allowed) return null;

  return (
    <MotionSection className="glass-panel rounded-xl p-4 shadow-panel">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            <Zap className="h-3.5 w-3.5 text-amber-300" />
            {t("title")}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{t("description")}</p>
        </div>
        {data ? (
          <p className="text-[11px] text-muted-foreground">
            {t("hotSeats")} {data.summary.hotSeats}/{data.summary.seats} · {t("active")}{" "}
            {data.summary.activeOutages} · {t("overdue")} {data.summary.overdue} · {t("unrest")}{" "}
            {data.summary.unrestRising}/{data.summary.seats} · {t("sectorAlerts")}{" "}
            {data.summary.sectorAlerts} · {t("crimeOpen")} {data.summary.crimeOpen} ·{" "}
            {t("warningWards")} {data.summary.warningWards} · {t("evidenceHits")}{" "}
            {data.summary.evidenceItems}
          </p>
        ) : null}
      </div>

      {loading && !data ? (
        <p className="text-sm text-muted-foreground">{t("loading")}</p>
      ) : error && !data ? (
        <p className="text-sm text-destructive">{t("loadFailed")}</p>
      ) : !data?.seats.length ? (
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
          {data.seats.map((seat) => {
            const hot =
              seat.outages.active > 0 ||
              seat.sla.overdue > 0 ||
              seat.unrest.active > 0 ||
              sectorAlertTotal(seat) > 0 ||
              integrityHot(seat) ||
              commandHot(seat);
            const danger =
              seat.outages.gasFuel > 0 ||
              seat.unrest.trend === "rising" ||
              seat.sla.redAlerts > 0 ||
              sectorAlertTotal(seat) > 0 ||
              integrityDanger(seat) ||
              commandDanger(seat);
            const label = isBn ? seat.nameBn || seat.name : seat.name;
            return (
              <div
                key={seat.entityId}
                className={cn(
                  "rounded-lg border px-3 py-2.5 text-sm",
                  danger
                    ? "border-destructive/40 bg-destructive/10"
                    : hot
                      ? "border-amber-500/35 bg-amber-500/10"
                      : "border-border/60 bg-secondary/30",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <Link href={seat.hrefs.desk} className="min-w-0 hover:opacity-90">
                    <p className="truncate font-medium text-foreground">{label}</p>
                    <p className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                      {seat.role} · {seat.code}
                    </p>
                  </Link>
                  <Link href={seat.hrefs.command} className="shrink-0 hover:opacity-90">
                    <span
                      className={cn(
                        "tabular-nums text-lg font-semibold",
                        danger ? "text-destructive" : hot ? "text-amber-200" : "text-muted-foreground",
                      )}
                    >
                      {seat.command.commandAverage}
                    </span>
                  </Link>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {CIVIC.map(({ id, Icon }) => {
                    const n = seat.outages.byKind[id] ?? 0;
                    if (!n) return null;
                    return (
                      <span
                        key={id}
                        className="inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px]"
                        style={{
                          borderColor: `${LAYER_COLORS[id]}66`,
                          color: LAYER_COLORS[id],
                        }}
                      >
                        <Icon className="h-3 w-3" />
                        {tl(`layer${id}` as "layerPOWER")} {n}
                      </span>
                    );
                  })}
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px]",
                      seat.unrest.trend === "rising"
                        ? "border-orange-400/40 text-orange-200"
                        : "border-border/50 text-muted-foreground",
                    )}
                  >
                    <Megaphone className="h-3 w-3" />
                    {t(trendKey(seat.unrest.trend))} · {seat.unrest.last24h}/24h
                  </span>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px]",
                      seat.sla.overdue > 0 || seat.sla.redAlerts > 0
                        ? "border-destructive/40 text-destructive"
                        : "border-border/50 text-muted-foreground",
                    )}
                  >
                    <Clock3 className="h-3 w-3" />
                    {t("overdue")} {seat.sla.overdue}
                    {seat.sla.redAlerts > 0 ? (
                      <>
                        <Siren className="h-3 w-3" />
                        {seat.sla.redAlerts}
                      </>
                    ) : null}
                  </span>
                  {seat.evidenceHits > 0 ? (
                    <span className="inline-flex items-center gap-1 rounded border border-violet-400/35 px-1.5 py-0.5 text-[10px] text-violet-200">
                      <BookOpen className="h-3 w-3" />
                      {seat.evidenceHits}
                    </span>
                  ) : null}
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px]",
                      seat.sectors.education.alert > 0
                        ? "border-destructive/40 text-destructive"
                        : "border-border/50 text-muted-foreground",
                    )}
                  >
                    <GraduationCap className="h-3 w-3" />
                    {seat.sectors.education.alert}
                  </span>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px]",
                      seat.sectors.health.alert > 0
                        ? "border-destructive/40 text-destructive"
                        : "border-border/50 text-muted-foreground",
                    )}
                  >
                    <HeartPulse className="h-3 w-3" />
                    {seat.sectors.health.alert}
                  </span>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px]",
                      seat.sectors.jobs.alert > 0
                        ? "border-destructive/40 text-destructive"
                        : "border-border/50 text-muted-foreground",
                    )}
                  >
                    <Briefcase className="h-3 w-3" />
                    {seat.sectors.jobs.alert}
                  </span>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px]",
                      seat.integrity.crime.open > 0
                        ? "border-destructive/40 text-destructive"
                        : "border-border/50 text-muted-foreground",
                    )}
                  >
                    <ShieldAlert className="h-3 w-3" />
                    {seat.integrity.crime.open}
                  </span>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px]",
                      seat.integrity.corruption.open > 0 ||
                        (seat.integrity.corruption.tenderFlags ?? 0) > 0 ||
                        (seat.integrity.corruption.bribes ?? 0) > 0
                        ? "border-destructive/40 text-destructive"
                        : "border-border/50 text-muted-foreground",
                    )}
                  >
                    <Scale className="h-3 w-3" />
                    {seat.integrity.corruption.open}
                  </span>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px]",
                      seat.command.warningWards > 0
                        ? "border-destructive/40 text-destructive"
                        : "border-border/50 text-muted-foreground",
                    )}
                  >
                    <Crosshair className="h-3 w-3" />
                    {t("warningWards")} {seat.command.warningWards}
                  </span>
                  {!hot ? (
                    <span className="text-[10px] text-muted-foreground">{t("quiet")}</span>
                  ) : null}
                </div>
                <div className="mt-2 flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground">
                  <Link href={seat.hrefs.outage} className="hover:text-primary">
                    {t("openOutage")}
                  </Link>
                  <Link href={seat.hrefs.pulse} className="hover:text-primary">
                    {t("openPulse")}
                  </Link>
                  <Link href={seat.hrefs.complaints} className="hover:text-primary">
                    {t("openSla")}
                  </Link>
                  <Link href={seat.hrefs.evidence} className="hover:text-primary">
                    {t("openEvidence")}
                  </Link>
                  <Link href={seat.hrefs.education} className="hover:text-primary">
                    {t("openEducation")}
                  </Link>
                  <Link href={seat.hrefs.health} className="hover:text-primary">
                    {t("openHealth")}
                  </Link>
                  <Link href={seat.hrefs.jobs} className="hover:text-primary">
                    {t("openJobs")}
                  </Link>
                  <Link href={seat.hrefs.crime} className="hover:text-primary">
                    {t("openCrimeDesk")}
                  </Link>
                  <Link href={seat.hrefs.corruption} className="hover:text-primary">
                    {t("openCorruptionDesk")}
                  </Link>
                  <Link href={seat.hrefs.command} className="hover:text-primary">
                    {t("openCommand")}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {data ? <PmoLocalSectorLeague data={data} /> : null}
      {data ? <PmoLocalCommandStrip data={data} /> : null}
      {data ? <PmoLocalEvidenceCards data={data} /> : null}
      <p className="mt-3 text-[10px] text-muted-foreground/80">{t("sourceNote")}</p>
    </MotionSection>
  );
}
