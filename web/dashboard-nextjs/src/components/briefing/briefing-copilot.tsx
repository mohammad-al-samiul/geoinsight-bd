"use client";

import { useMorningBriefing } from "@/hooks/use-briefing";
import { VoiceBriefing } from "@/components/briefing/voice-briefing";
import { ModuleShell, StatCard, StatGrid } from "@/components/modules/module-shell";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AiStatusBadge } from "@/components/ai/ai-status-badge";
import { useAppLang } from "@/hooks/use-app-lang";
import { useTranslations } from "next-intl";
import { Sparkles, Sun } from "lucide-react";

const CATEGORY_STYLE: Record<string, string> = {
  completion: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  budget: "border-red-500/40 bg-red-500/10 text-red-300",
  alert: "border-orange-500/40 bg-orange-500/10 text-orange-300",
  arbitrage: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  summary: "border-primary/40 bg-primary/10 text-primary",
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
          <h2 className="text-lg font-semibold">{t("morningTitle")}</h2>
        </div>
        <Button size="sm" onClick={reload} className="gap-1.5">
          <Sparkles className="h-3.5 w-3.5" />
          {tc("regenerate")}
        </Button>
      </div>

      {briefing && (
        <div className="mt-6 grid gap-6 xl:grid-cols-5">
          <div className="space-y-4 xl:col-span-3">
            <div className="glass-panel rounded-xl p-5 shadow-panel">
              <div className="mb-4 flex items-center gap-2">
                <span className="text-sm font-semibold">{t("bullets")}</span>
                <AiStatusBadge className="ml-auto" />
              </div>
              <ul className="space-y-3">
                {briefing.bullets.map((bullet, i) => (
                  <li
                    key={i}
                    className={cn(
                      "rounded-lg border px-4 py-3 text-sm leading-relaxed",
                      CATEGORY_STYLE[bullet.category] ?? CATEGORY_STYLE.summary,
                    )}
                  >
                    <span className="mr-2 font-bold opacity-60">{i + 1}.</span>
                    {bullet.text}
                  </li>
                ))}
              </ul>
            </div>

            <div className="glass-panel rounded-xl p-5 text-sm leading-relaxed text-muted-foreground shadow-panel whitespace-pre-line">
              {briefing.narrative}
            </div>
          </div>

          <div className="xl:col-span-2">
            <VoiceBriefing text={briefing.voice_text} lang={lang} />
          </div>
        </div>
      )}
    </ModuleShell>
  );
}
