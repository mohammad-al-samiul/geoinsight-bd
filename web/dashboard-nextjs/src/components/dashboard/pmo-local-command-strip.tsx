"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Crosshair, Gauge } from "lucide-react";
import {
  commandDanger,
  useNationalBoard,
  type CommandScenarioId,
  type NationalBoard,
  type NationalBoardSeat,
} from "@/hooks/use-national-board";
import { cn } from "@/lib/utils";

const SCENARIO_ORDER: CommandScenarioId[] = [
  "NIGHT_PATROL",
  "FEVER_DESK",
  "DRAIN_CLEAR",
  "LIGHTING",
  "DIGITAL_COUNTER",
  "SMC_TODAY",
];

function scenarioKey(
  id: CommandScenarioId,
):
  | "scenarioNIGHT_PATROL"
  | "scenarioFEVER_DESK"
  | "scenarioDRAIN_CLEAR"
  | "scenarioLIGHTING"
  | "scenarioDIGITAL_COUNTER"
  | "scenarioSMC_TODAY" {
  if (id === "FEVER_DESK") return "scenarioFEVER_DESK";
  if (id === "DRAIN_CLEAR") return "scenarioDRAIN_CLEAR";
  if (id === "LIGHTING") return "scenarioLIGHTING";
  if (id === "DIGITAL_COUNTER") return "scenarioDIGITAL_COUNTER";
  if (id === "SMC_TODAY") return "scenarioSMC_TODAY";
  return "scenarioNIGHT_PATROL";
}

function CommandLeagueRow({ seat }: { seat: NationalBoardSeat }) {
  const t = useTranslations("modules.pmoLocal");
  const tc = useTranslations("modules.localCommand");
  const isBn = useLocale().startsWith("bn");
  const label = isBn ? seat.nameBn || seat.name : seat.name;
  const danger = commandDanger(seat);
  const cmd = seat.command;

  return (
    <div
      className={cn(
        "grid gap-1.5 rounded-md border px-2 py-1.5 sm:grid-cols-[minmax(0,1.1fr)_repeat(3,minmax(0,0.7fr))] sm:items-center",
        danger ? "border-destructive/40 bg-destructive/10" : "border-border/50 bg-background/30",
      )}
    >
      <Link href={seat.hrefs.command} className="min-w-0 hover:opacity-90">
        <p className="truncate text-sm font-medium">{label}</p>
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
          {seat.role} · {seat.code}
          {cmd.unrestTrend === "rising" ? ` · ${t("trendRising")}` : ""}
        </p>
      </Link>
      <p className="text-[11px] tabular-nums text-muted-foreground">
        {t("colWpi")} {cmd.wpiAverage}
      </p>
      <p
        className={cn(
          "text-[11px] font-medium tabular-nums",
          danger ? "text-destructive" : "text-foreground",
        )}
      >
        {t("colCommand")} {cmd.commandAverage}
      </p>
      <p className={cn("text-[11px] tabular-nums", danger ? "text-destructive" : "text-muted-foreground")}>
        {tc("kpiWarning")} {cmd.warningWards}
      </p>
    </div>
  );
}

function SeatWhatIf({ data }: { data: NationalBoard }) {
  const t = useTranslations("modules.pmoLocal");
  const tc = useTranslations("modules.localCommand");
  const isBn = useLocale().startsWith("bn");
  const defaultId =
    data.seats.find((s) => s.command.warningWards > 0)?.entityId ?? data.seats[0]?.entityId ?? "";
  const [seatId, setSeatId] = useState(defaultId);
  const [on, setOn] = useState<Partial<Record<CommandScenarioId, boolean>>>({});

  const seat = data.seats.find((s) => s.entityId === seatId) ?? data.seats[0];
  const lift = useMemo(() => {
    if (!seat) return 0;
    return seat.command.scenarios.reduce(
      (sum, sc) => (on[sc.id] ? sum + sc.avgCommandLift : sum),
      0,
    );
  }, [seat, on]);
  if (!seat) return null;

  const simulated = seat.command.commandAverage + lift;

  return (
    <div className="mt-3 rounded-lg border border-border/50 bg-secondary/20 px-3 py-2.5">
      <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {t("whatIfTitle")}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{t("whatIfNote")}</p>
        </div>
        <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
          {t("whatIfSeat")}
          <select
            className="rounded-md border border-border/60 bg-background px-2 py-1 text-xs text-foreground"
            value={seat.entityId}
            onChange={(e) => {
              setSeatId(e.target.value);
              setOn({});
            }}
          >
            {data.seats.map((s) => (
              <option key={s.entityId} value={s.entityId}>
                {isBn ? s.nameBn || s.name : s.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="mb-2 flex flex-wrap gap-3 text-sm">
        <span className="tabular-nums text-muted-foreground">
          {t("colCommand")} {seat.command.commandAverage}
        </span>
        <span className="tabular-nums text-emerald-300">
          {tc("lift")} {lift >= 0 ? "+" : ""}
          {lift}
        </span>
        <span className="font-medium tabular-nums text-foreground">
          {t("simulatedScore")} {simulated}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {SCENARIO_ORDER.map((id) => {
          const sc = seat.command.scenarios.find((s) => s.id === id);
          if (!sc) return null;
          const active = Boolean(on[id]);
          const featured = id === "NIGHT_PATROL" || id === "FEVER_DESK";
          return (
            <button
              key={id}
              type="button"
              onClick={() => setOn((prev) => ({ ...prev, [id]: !prev[id] }))}
              className={cn(
                "rounded-md border px-2 py-1 text-left text-[11px] transition",
                active
                  ? "border-primary/50 bg-primary/15 text-primary"
                  : featured
                    ? "border-amber-400/35 bg-amber-500/10 text-amber-100"
                    : "border-border/50 bg-background/40 text-muted-foreground hover:border-primary/30",
              )}
            >
              <span className="block font-medium">{tc(scenarioKey(id))}</span>
              <span className="tabular-nums opacity-80">
                {sc.avgCommandLift >= 0 ? "+" : ""}
                {sc.avgCommandLift} · {sc.affectedWards} {tc("wards")}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function PmoLocalCommandStrip({
  data,
  framed = false,
}: {
  data: NationalBoard;
  framed?: boolean;
}) {
  const t = useTranslations("modules.pmoLocal");

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
        <Crosshair className="h-3.5 w-3.5 text-rose-300" />
        {t("commandLeagueTitle")}
        <span className="font-normal normal-case tracking-normal">
          · {t("warningSeats")} {data.summary.warningSeats}/{data.summary.seats} · {t("warningWards")}{" "}
          {data.summary.warningWards}
        </span>
      </p>
      <div className="space-y-1.5">
        {[...data.seats]
          .sort(
            (a, b) =>
              b.command.warningWards - a.command.warningWards ||
              a.command.commandAverage - b.command.commandAverage,
          )
          .map((seat) => (
            <CommandLeagueRow key={seat.entityId} seat={seat} />
          ))}
      </div>
      <SeatWhatIf data={data} />
      <p className="mt-2 text-[10px] text-muted-foreground/80">{t("commandLeagueNote")}</p>
    </div>
  );
}

export function PmoLocalCommandSnippets({ framed = true }: { framed?: boolean }) {
  const { data, allowed } = useNationalBoard();
  if (!allowed || !data) return null;
  return <PmoLocalCommandStrip data={data} framed={framed} />;
}

export const COMMAND_CHIP_ICON = Gauge;
