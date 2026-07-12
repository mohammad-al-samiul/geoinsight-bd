"use client";

import { useLocale, useTranslations } from "next-intl";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Landmark,
  Megaphone,
  Radio,
  Scale,
  Share2,
  TrendingUp,
} from "lucide-react";
import { ModuleShell, StatCard, StatGrid } from "@/components/modules/module-shell";
import { Badge } from "@/components/ui/badge";
import { useAdminFilter } from "@/hooks/use-admin-filter";
import { useRealtimeRefresh } from "@/hooks/use-realtime-refresh";
import { useUnrestPulse, type UnrestCategory } from "@/hooks/use-unrest-pulse";
import { cn } from "@/lib/utils";

const CATEGORY_STYLE: Record<UnrestCategory, string> = {
  protest: "border-red-500/40 bg-red-500/10 text-red-300",
  govt_discontent: "border-orange-500/40 bg-orange-500/10 text-orange-300",
  law_reaction: "border-violet-500/40 bg-violet-500/10 text-violet-300",
  social_viral: "border-sky-500/40 bg-sky-500/10 text-sky-300",
  general_grievance: "border-amber-500/40 bg-amber-500/10 text-amber-300",
};

function riskBar(score: number) {
  if (score >= 70) return "bg-red-500";
  if (score >= 50) return "bg-orange-500";
  if (score >= 30) return "bg-amber-500";
  return "bg-emerald-500";
}

export function UnrestPulsePanel() {
  const t = useTranslations("modules.unrest");
  const locale = useLocale();
  const { isFiltered } = useAdminFilter();
  const { data, loading, error, reload } = useUnrestPulse();
  useRealtimeRefresh(reload);

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
            <StatCard
              label={t("districtsAtRisk")}
              value={data.summary.districts_at_risk}
              accent="danger"
            />
            <StatCard label={t("activeProtests")} value={data.summary.active_protests} accent="danger" />
            <StatCard label={t("lawHotspots")} value={data.summary.law_hotspots} />
            <StatCard label={t("socialViral")} value={data.summary.social_viral} />
          </StatGrid>
        )
      }
    >
      {data && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Radio className="h-3.5 w-3.5 text-emerald-400" />
            <span>{t("liveSources")}</span>
            {data.summary.sources.map((s) => (
              <Badge key={s} variant="outline" className="text-[10px]">
                {s}
              </Badge>
            ))}
            {data.summary.top_district && (
              <span className="ml-auto inline-flex items-center gap-1 text-red-300">
                <TrendingUp className="h-3.5 w-3.5" />
                {t("hottest")}: {data.summary.top_district}
              </span>
            )}
          </div>

          {isFiltered && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs text-primary">
              {t("scopeFilterActive")}:{" "}
              {data.scope?.districtName ?? data.scope?.divisionName ?? t("scopedArea")}
            </div>
          )}

          <p className="text-xs leading-relaxed text-muted-foreground">
            {locale === "bn" ? data.summary.note_bn : data.summary.note_en}
          </p>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <LegendCard
              icon={<Megaphone className="h-4 w-4 text-red-400" />}
              title={t("catProtest")}
              body={t("catProtestHint")}
            />
            <LegendCard
              icon={<Landmark className="h-4 w-4 text-orange-400" />}
              title={t("catGovt")}
              body={t("catGovtHint")}
            />
            <LegendCard
              icon={<Scale className="h-4 w-4 text-violet-400" />}
              title={t("catLaw")}
              body={t("catLawHint")}
            />
            <LegendCard
              icon={<Share2 className="h-4 w-4 text-sky-400" />}
              title={t("catSocial")}
              body={t("catSocialHint")}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="glass-panel rounded-xl p-4 shadow-panel">
              <h3 className="mb-3 text-sm font-semibold">{t("districtRanking")}</h3>
              {data.districts.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("noDistricts")}</p>
              ) : (
                <ul className="max-h-[520px] space-y-2 overflow-y-auto">
                  {data.districts.map((d) => (
                    <li
                      key={d.district}
                      className={cn(
                        "rounded-lg border px-3 py-2.5",
                        d.risk_level >= 4
                          ? "border-red-500/40 bg-red-500/5"
                          : d.risk_level >= 3
                            ? "border-amber-500/40 bg-amber-500/5"
                            : "border-border/50",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium">{d.district}</p>
                          {d.division && (
                            <p className="text-xs text-muted-foreground">{d.division}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <TrendIcon trend={d.trend} />
                          <Badge variant="outline">L{d.risk_level}</Badge>
                        </div>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted/40">
                        <div
                          className={cn("h-full rounded-full transition-all", riskBar(d.unrest_score))}
                          style={{ width: `${d.unrest_score}%` }}
                        />
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
                        <span>
                          {t("score")}: {d.unrest_score}
                        </span>
                        {d.protest_count > 0 && (
                          <span>
                            {t("protest")}: {d.protest_count}
                          </span>
                        )}
                        {d.law_reaction_count > 0 && (
                          <span>
                            {t("law")}: {d.law_reaction_count}
                          </span>
                        )}
                        {d.govt_discontent_count > 0 && (
                          <span>
                            {t("govt")}: {d.govt_discontent_count}
                          </span>
                        )}
                        {d.social_viral_count > 0 && (
                          <span>
                            {t("social")}: {d.social_viral_count}
                          </span>
                        )}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {d.top_categories.map((c) => (
                          <span
                            key={c}
                            className={cn(
                              "rounded border px-1.5 py-0.5 text-[10px]",
                              CATEGORY_STYLE[c],
                            )}
                          >
                            {t(`category.${c}`)}
                          </span>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="glass-panel rounded-xl p-4 shadow-panel">
              <h3 className="mb-3 text-sm font-semibold">{t("recentSignals")}</h3>
              {data.signals.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("noSignals")}</p>
              ) : (
                <ul className="max-h-[520px] space-y-2 overflow-y-auto">
                  {data.signals.map((s) => (
                    <li
                      key={s.id}
                      className={cn(
                        "rounded-lg border px-3 py-2.5",
                        s.severity >= 4
                          ? "border-red-500/30 bg-red-500/5"
                          : "border-border/50",
                      )}
                    >
                      <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                        <Badge variant="outline">L{s.severity}</Badge>
                        <span
                          className={cn(
                            "rounded border px-1.5 py-0.5 text-[10px]",
                            CATEGORY_STYLE[s.category],
                          )}
                        >
                          {s.category_bn}
                        </span>
                        {s.district && (
                          <span className="text-[11px] text-muted-foreground">{s.district}</span>
                        )}
                      </div>
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium hover:text-primary hover:underline"
                      >
                        {s.title}
                      </a>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {s.source_name}
                        {s.published_at
                          ? ` · ${new Date(s.published_at).toLocaleString()}`
                          : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </ModuleShell>
  );
}

function LegendCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-lg border border-border/50 bg-background/40 px-3 py-2.5">
      <div className="mb-1 flex items-center gap-1.5 text-sm font-medium">
        {icon}
        {title}
      </div>
      <p className="text-[11px] leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}

function TrendIcon({ trend }: { trend: "rising" | "stable" | "falling" }) {
  if (trend === "rising") return <ArrowUpRight className="h-3.5 w-3.5 text-red-400" />;
  if (trend === "falling") return <ArrowDownRight className="h-3.5 w-3.5 text-emerald-400" />;
  return <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />;
}
