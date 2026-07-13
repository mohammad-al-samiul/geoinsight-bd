"use client";

import { motion } from "framer-motion";
import { useMorningBriefing } from "@/hooks/use-briefing";
import { VoiceBriefing } from "@/components/briefing/voice-briefing";
import { ModuleShell, StatCard, StatGrid } from "@/components/modules/module-shell";
import { Button } from "@/components/ui/button";
import { IntelCard, MotionList, fadeUp } from "@/components/ui/intel-card";
import { cn } from "@/lib/utils";
import { AiStatusBadge } from "@/components/ai/ai-status-badge";
import { useAppLang } from "@/hooks/use-app-lang";
import { useTranslations } from "next-intl";
import { Sparkles, Sun } from "lucide-react";

const CATEGORY_ACCENT: Record<string, "danger" | "warning" | "success" | "info" | "default"> = {
  completion: "warning",
  budget: "danger",
  alert: "warning",
  arbitrage: "success",
  summary: "info",
};

const CATEGORY_STYLE: Record<string, string> = {
  completion: "border-amber-500/35 bg-gradient-to-br from-amber-500/15 to-transparent",
  budget: "border-red-500/35 bg-gradient-to-br from-red-500/15 to-transparent",
  alert: "border-orange-500/35 bg-gradient-to-br from-orange-500/15 to-transparent",
  arbitrage: "border-emerald-500/35 bg-gradient-to-br from-emerald-500/15 to-transparent",
  summary: "border-primary/35 bg-gradient-to-br from-primary/15 to-transparent",
};

export function BriefingCopilot() {
  const lang = useAppLang();
  const t = useTranslations("modules.briefing");
  const tc = useTranslations("common");
  const { briefing, loading, error, reload } = useMorningBriefing(lang);

  return (
    <ModuleShell
      title={t("title")}
      description={t("description")}
      loading={loading}
      error={error}
      onRetry={reload}
      stats={
        briefing?.metrics_snapshot && (
          <StatGrid>
            <StatCard
              label={t("completionRate")}
              value={`${briefing.metrics_snapshot.completionRate}%`}
              accent="success"
            />
            <StatCard
              label={t("openRedFlags")}
              value={briefing.metrics_snapshot.openAlerts}
              accent={briefing.metrics_snapshot.openAlerts > 3 ? "danger" : "warning"}
            />
            <StatCard label={t("projectsInScope")} value={briefing.metrics_snapshot.projects} />
            <StatCard
              label={t("scope")}
              value={briefing.scope_label}
              hint={new Date(briefing.generated_at).toLocaleString()}
            />
          </StatGrid>
        )
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sun className="h-5 w-5 text-amber-400" />
          <h2 className="font-display text-lg font-semibold tracking-tight">{t("morningTitle")}</h2>
        </div>
        <Button size="sm" onClick={reload} className="gap-1.5">
          <Sparkles className="h-3.5 w-3.5" />
          {tc("regenerate")}
        </Button>
      </div>

      {briefing && (
        <div className="mt-6 grid gap-6 xl:grid-cols-5">
          <div className="space-y-4 xl:col-span-3">
            <IntelCard accent="info" padding="lg" hoverLift={false}>
              <div className="mb-5 flex items-center gap-2">
                <span className="font-display text-sm font-semibold tracking-tight">
                  {t("bullets")}
                </span>
                <AiStatusBadge className="ml-auto" />
              </div>
              <MotionList className="space-y-3">
                {briefing.bullets.map((bullet, i) => (
                  <motion.div key={i} variants={fadeUp} custom={i}>
                    <div
                      className={cn(
                        "rounded-xl border px-4 py-3.5 text-sm leading-relaxed shadow-soft",
                        CATEGORY_STYLE[bullet.category] ?? CATEGORY_STYLE.summary,
                      )}
                    >
                      <div className="flex gap-3">
                        <span
                          className={cn(
                            "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold",
                            bullet.category === "budget" && "bg-red-500/20 text-red-300",
                            bullet.category === "alert" && "bg-orange-500/20 text-orange-300",
                            bullet.category === "completion" && "bg-amber-500/20 text-amber-300",
                            bullet.category === "arbitrage" && "bg-emerald-500/20 text-emerald-300",
                            (!bullet.category || bullet.category === "summary") &&
                              "bg-primary/20 text-primary",
                          )}
                        >
                          {i + 1}
                        </span>
                        <p className="pt-0.5">{bullet.text}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </MotionList>
            </IntelCard>

            <IntelCard accent={CATEGORY_ACCENT.summary} padding="lg" index={1} hoverLift={false}>
              <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                {briefing.narrative}
              </p>
            </IntelCard>
          </div>

          <div className="xl:col-span-2">
            <VoiceBriefing text={briefing.voice_text} lang={lang} />
          </div>
        </div>
      )}
    </ModuleShell>
  );
}
