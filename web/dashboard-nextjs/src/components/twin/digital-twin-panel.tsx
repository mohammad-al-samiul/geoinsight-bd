"use client";

import { useEffect } from "react";
import { useDigitalTwin } from "@/hooks/use-digital-twin";
import { ModuleShell, StatCard, StatGrid } from "@/components/modules/module-shell";
import { Button } from "@/components/ui/button";
import { useAppLang } from "@/hooks/use-app-lang";
import { useTranslations } from "next-intl";
import { Cpu, Play } from "lucide-react";

export function DigitalTwinPanel() {
  const lang = useAppLang();
  const t = useTranslations("modules.digitalTwin");
  const tc = useTranslations("common");
  const {
    divisions,
    targetId,
    setTargetId,
    shift,
    setShift,
    setLang,
    result,
    loading,
    error,
    simulate,
  } = useDigitalTwin();

  useEffect(() => {
    setLang(lang);
  }, [lang, setLang]);

  return (
    <ModuleShell
      title={t("title")}
      description={t("description")}
      loading={loading && !result}
      error={error}
      onRetry={simulate}
      stats={
        result && (
          <StatGrid>
            <StatCard label={t("nationalBefore")} value={`${result.national_completion_before}%`} />
            <StatCard
              label={t("nationalAfter")}
              value={`${result.national_completion_after}%`}
              accent="success"
            />
            <StatCard
              label={t("budgetShift")}
              value={`${result.budget_shift_pct > 0 ? "+" : ""}${result.budget_shift_pct}%`}
            />
            <StatCard label={t("divisions")} value={result.projections.length} />
          </StatGrid>
        )
      }
    >
      <div className="glass-panel flex flex-wrap items-end gap-4 rounded-xl p-4 shadow-panel">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-muted-foreground">{t("targetDivision")}</label>
          <select
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
            className="h-10 min-w-[180px] rounded-md border border-border bg-card px-3 text-sm"
          >
            {divisions.map((d) => (
              <option key={d.id} value={d.id}>
                {lang === "bn" && d.nameBn ? d.nameBn : d.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-muted-foreground">{t("budgetShiftPct")}</label>
          <input
            type="range"
            min={-20}
            max={20}
            value={shift}
            onChange={(e) => setShift(Number(e.target.value))}
            className="w-48 accent-primary"
          />
          <span className="text-xs tabular-nums">
            {shift > 0 ? "+" : ""}
            {shift}%
          </span>
        </div>
        <Button onClick={() => void simulate()} disabled={loading} className="gap-2">
          <Play className="h-4 w-4" />
          {tc("run")}
        </Button>
      </div>

      {result && (
        <div className="mt-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            <Cpu className="mr-1 inline h-4 w-4" />
            {lang === "bn" ? result.narrative_bn : result.narrative}
          </p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {result.projections.map((p) => (
              <div key={p.unit_id} className="rounded-lg border border-border/50 bg-secondary/20 p-3 text-sm">
                <p className="font-medium">{lang === "bn" && p.name_bn ? p.name_bn : p.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {p.before_completion}% → {p.after_completion}%
                  <span className={p.delta_pct >= 0 ? " text-emerald-400" : " text-red-400"}>
                    {" "}
                    ({p.delta_pct > 0 ? "+" : ""}
                    {p.delta_pct}%)
                  </span>
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </ModuleShell>
  );
}
