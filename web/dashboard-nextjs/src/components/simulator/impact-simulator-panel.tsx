"use client";

import { useState } from "react";
import { useImpactSimulator } from "@/hooks/use-impact-simulator";
import { ModuleShell, StatCard, StatGrid } from "@/components/modules/module-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAppLang } from "@/hooks/use-app-lang";
import { useTranslations } from "next-intl";
import { Globe2, Play, SlidersHorizontal } from "lucide-react";

const BAND_COLOR: Record<string, string> = {
  Low: "text-emerald-400",
  Moderate: "text-amber-400",
  High: "text-orange-400",
  Critical: "text-red-400",
};

export function ImpactSimulatorPanel() {
  const lang = useAppLang();
  const t = useTranslations("modules.simulator");
  const tc = useTranslations("common");
  const [conflict, setConflict] = useState(0.65);
  const [sanctions, setSanctions] = useState(0.4);
  const [trade, setTrade] = useState(0.5);
  const [migration, setMigration] = useState(0.55);
  const [oil, setOil] = useState(0.35);
  const [budgetShift, setBudgetShift] = useState(0);
  const { result, loading, error, run } = useImpactSimulator();

  const handleRun = () => {
    void run({
      conflict_intensity: conflict,
      sanctions_level: sanctions,
      trade_disruption: trade,
      migration_pressure: migration,
      oil_price_shock: oil,
      region: "Middle East",
      budget_reallocation_pct: budgetShift,
      agriculture_shock: trade * 0.8,
      energy_shock: oil,
      lang,
    });
  };

  const sliders = [
    { label: t("conflictIntensity"), value: conflict, set: setConflict },
    { label: t("sanctionsLevel"), value: sanctions, set: setSanctions },
    { label: t("tradeDisruption"), value: trade, set: setTrade },
    { label: t("migrationPressure"), value: migration, set: setMigration },
    { label: t("oilPriceShock"), value: oil, set: setOil },
  ];

  return (
    <ModuleShell
      title={t("title")}
      description={t("description")}
      loading={loading && !result}
      error={error}
      onRetry={handleRun}
      stats={
        result && (
          <StatGrid>
            <StatCard
              label={t("overallRisk")}
              value={`${result.overall_risk_score}/100`}
              accent="danger"
            />
            <StatCard label={t("riskBand")} value={result.risk_band} />
            <StatCard label={t("ministries")} value={result.ministry_impacts.length} />
            <StatCard
              label={t("scenario")}
              value={t("middleEast")}
              hint={new Date(result.computed_at).toLocaleString()}
            />
          </StatGrid>
        )
      }
    >
      <div className="glass-panel space-y-5 rounded-xl p-5 shadow-panel">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <SlidersHorizontal className="h-4 w-4 text-primary" />
            {t("scenarioSliders")}
          </h3>
          <Button size="sm" onClick={handleRun} disabled={loading} className="gap-2">
            <Play className="h-3.5 w-3.5" />
            {tc("run")}
          </Button>
        </div>

        {sliders.map((s) => (
          <div key={s.label}>
            <div className="mb-1 flex justify-between text-xs">
              <span className="text-muted-foreground">{s.label}</span>
              <span className="tabular-nums">{(s.value * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={s.value}
              onChange={(e) => s.set(Number(e.target.value))}
              className="w-full accent-primary"
            />
          </div>
        ))}

        <div>
          <div className="mb-1 flex justify-between text-xs">
            <span className="text-muted-foreground">{t("budgetReallocation")}</span>
            <span className="tabular-nums">
              {budgetShift > 0 ? "+" : ""}
              {budgetShift}%
            </span>
          </div>
          <input
            type="range"
            min={-20}
            max={20}
            step={1}
            value={budgetShift}
            onChange={(e) => setBudgetShift(Number(e.target.value))}
            className="w-full accent-primary"
          />
        </div>
      </div>

      {result && (
        <div className="mt-6 space-y-4">
          <p className={cn("text-sm font-medium", BAND_COLOR[result.risk_band] ?? "")}>
            <Globe2 className="mr-1 inline h-4 w-4" />
            {lang === "bn" ? result.narrative_bn : result.narrative}
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            {result.ministry_impacts.map((m) => (
              <div key={m.ministry} className="glass-panel rounded-lg border border-border/50 p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold">
                    {lang === "bn" ? m.ministry_bn : m.ministry}
                  </p>
                  <Badge variant="outline">{m.impact_score}/100</Badge>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {lang === "bn" ? m.narrative_bn : m.narrative}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </ModuleShell>
  );
}
