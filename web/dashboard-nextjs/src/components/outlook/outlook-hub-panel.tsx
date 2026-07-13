"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Landmark, LineChart, RefreshCw } from "lucide-react";
import { ModuleShell, StatCard, StatGrid } from "@/components/modules/module-shell";
import { Button } from "@/components/ui/button";
import { useRealtimeRefresh } from "@/hooks/use-realtime-refresh";
import { useStrategicOutlook } from "@/hooks/use-strategic-outlook";
import { cn } from "@/lib/utils";

export function OutlookHubPanel() {
  const t = useTranslations("modules.outlook");
  const { data, loading, error, reload, refresh, refreshing } = useStrategicOutlook();
  useRealtimeRefresh(reload);

  const pol = data?.politics_deep;
  const eco = data?.economy_deep;

  return (
    <ModuleShell
      title={t("title")}
      description={t("description")}
      loading={loading}
      error={error}
      onRetry={reload}
      stats={
        data && (
          <StatGrid>
            <StatCard label={t("sourcesUsed")} value={data.source_count ?? data.sources.length} />
            <StatCard
              label={t("politicalChallenges")}
              value={pol?.current_pressures.length ?? 0}
              accent="danger"
            />
            <StatCard
              label={t("economicChallenges")}
              value={eco?.current_pressures.length ?? 0}
              accent="warning"
            />
            <StatCard
              label={t("aiMode")}
              value={data.llm_used ? t("llmOn") : t("rulesEngine")}
            />
          </StatGrid>
        )
      }
    >
      {data && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <Button
              size="sm"
              variant="outline"
              className="gap-2"
              disabled={refreshing}
              onClick={() => void refresh()}
            >
              <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
              {refreshing ? t("refreshing") : t("refresh")}
            </Button>
          </div>

          <p className="text-xs leading-relaxed text-muted-foreground">{data.disclaimer}</p>

          <div className="grid gap-4 md:grid-cols-2">
            <Link
              href="/outlook/politics"
              className="group glass-panel rounded-2xl p-6 shadow-panel transition hover:border-red-500/40"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/15 text-red-300">
                <Landmark className="h-6 w-6" />
              </div>
              <h2 className="text-lg font-semibold group-hover:text-red-200">{t("hubPolitics")}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {t("hubPoliticsHint")}
              </p>
              <p className="mt-4 text-xs text-red-300/90">{t("hubOpen")} →</p>
            </Link>

            <Link
              href="/outlook/economy"
              className="group glass-panel rounded-2xl p-6 shadow-panel transition hover:border-sky-500/40"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-sky-500/15 text-sky-300">
                <LineChart className="h-6 w-6" />
              </div>
              <h2 className="text-lg font-semibold group-hover:text-sky-200">{t("hubEconomy")}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {t("hubEconomyHint")}
              </p>
              <p className="mt-4 text-xs text-sky-300/90">{t("hubOpen")} →</p>
            </Link>
          </div>

          {data.narrative && (
            <div className="glass-panel rounded-xl p-4 shadow-panel">
              <h3 className="mb-2 text-sm font-semibold">{t("executiveNarrative")}</h3>
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground/90">
                {data.narrative}
              </pre>
            </div>
          )}
        </div>
      )}
    </ModuleShell>
  );
}
