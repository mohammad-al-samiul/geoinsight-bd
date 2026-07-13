"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { useDigitalTwin } from "@/hooks/use-digital-twin";
import { ModuleShell, StatCard, StatGrid } from "@/components/modules/module-shell";
import { Button } from "@/components/ui/button";
import { IntelCard } from "@/components/ui/intel-card";
import { AnimatedSlider } from "@/components/ui/animated-slider";
import { ProgressMeter } from "@/components/ui/progress-meter";
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
      <IntelCard accent="info" padding="lg" hoverLift={false}>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end">
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {t("targetDivision")}
            </label>
            <select
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              className="h-11 w-full rounded-lg border border-border/70 bg-secondary/40 px-3 text-sm outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/15"
            >
              {divisions.map((d) => (
                <option key={d.id} value={d.id}>
                  {lang === "bn" && d.nameBn ? d.nameBn : d.name}
                </option>
              ))}
            </select>
          </div>

          <div className="min-w-0 flex-[1.4]">
            <AnimatedSlider
              label={t("budgetShiftPct")}
              value={shift}
              onChange={setShift}
              min={-20}
              max={20}
              step={1}
              format="signedPercent"
            />
          </div>

          <Button onClick={() => void simulate()} disabled={loading} className="gap-2 lg:mb-1" size="lg">
            <Play className="h-4 w-4" />
            {tc("run")}
          </Button>
        </div>
      </IntelCard>

      {result && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 space-y-4"
        >
          <IntelCard hoverLift={false} accent="success" padding="md">
            <p className="text-sm leading-relaxed text-muted-foreground">
              <Cpu className="mr-1.5 inline h-4 w-4 text-primary" />
              {lang === "bn" ? result.narrative_bn : result.narrative}
            </p>
          </IntelCard>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {result.projections.map((p, i) => (
              <IntelCard key={p.unit_id} index={i} className="h-full">
                <p className="font-display text-sm font-semibold tracking-tight">
                  {lang === "bn" && p.name_bn ? p.name_bn : p.name}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {p.before_completion}% → {p.after_completion}%
                  <span className={p.delta_pct >= 0 ? " text-emerald-400" : " text-red-400"}>
                    {" "}
                    ({p.delta_pct > 0 ? "+" : ""}
                    {p.delta_pct}%)
                  </span>
                </p>
                <div className="mt-3">
                  <ProgressMeter
                    value={p.after_completion}
                    tone={p.delta_pct >= 0 ? "good" : "warn"}
                    delay={0.06 + i * 0.03}
                  />
                </div>
              </IntelCard>
            ))}
          </div>
        </motion.div>
      )}
    </ModuleShell>
  );
}
