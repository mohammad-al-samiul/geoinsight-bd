"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useImpactSimulator } from "@/hooks/use-impact-simulator";
import { ModuleShell, StatCard, StatGrid } from "@/components/modules/module-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { IntelCard } from "@/components/ui/intel-card";
import { AnimatedSlider } from "@/components/ui/animated-slider";
import { ProgressMeter } from "@/components/ui/progress-meter";
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
  const [conflict, setConflict] = useState(0.4);
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
      <IntelCard accent="info" padding="lg" hoverLift={false} className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 font-display text-sm font-semibold tracking-tight">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/25 bg-primary/10">
              <SlidersHorizontal className="h-4 w-4 text-primary" />
            </span>
            {t("scenarioSliders")}
          </h3>
          <Button size="sm" onClick={handleRun} disabled={loading} className="gap-2">
            <Play className="h-3.5 w-3.5" />
            {tc("run")}
          </Button>
        </div>

        <div className="space-y-5">
          {sliders.map((s, i) => (
            <AnimatedSlider
              key={s.label}
              index={i}
              label={s.label}
              value={s.value}
              onChange={s.set}
              min={0}
              max={1}
              step={0.05}
              format="percent"
            />
          ))}

          <AnimatedSlider
            index={sliders.length}
            label={t("budgetReallocation")}
            value={budgetShift}
            onChange={setBudgetShift}
            min={-20}
            max={20}
            step={1}
            format="signedPercent"
          />
        </div>
      </IntelCard>

      {result && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 space-y-4"
        >
          <IntelCard hoverLift={false} accent="warning" padding="md">
            <p className={cn("text-sm leading-relaxed font-medium", BAND_COLOR[result.risk_band] ?? "")}>
              <Globe2 className="mr-1.5 inline h-4 w-4" />
              {lang === "bn" ? result.narrative_bn : result.narrative}
            </p>
          </IntelCard>

          <div className="grid gap-3 md:grid-cols-2">
            {result.ministry_impacts.map((m, i) => (
              <IntelCard key={m.ministry} index={i} accent="default" className="h-full">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-display text-sm font-semibold tracking-tight">
                    {lang === "bn" ? m.ministry_bn : m.ministry}
                  </p>
                  <Badge
                    variant="outline"
                    className="border-primary/30 bg-primary/10 text-[10px] text-primary"
                  >
                    {m.impact_score}/100
                  </Badge>
                </div>
                <div className="mt-3">
                  <ProgressMeter value={m.impact_score} invert delay={0.08 + i * 0.04} />
                </div>
                <p className="mt-2.5 text-xs leading-relaxed text-muted-foreground">
                  {lang === "bn" ? m.narrative_bn : m.narrative}
                </p>
              </IntelCard>
            ))}
          </div>
        </motion.div>
      )}
    </ModuleShell>
  );
}
