"use client";

import { useMemo } from "react";
import {
  AlertTriangle,
  ArrowDownRight,
  BadgeAlert,
  Landmark,
  Newspaper,
  Sparkles,
  Sun,
  TrendingDown,
  Wallet,
} from "lucide-react";
import { useMorningBriefing, type BriefingBullet } from "@/hooks/use-briefing";
import { VoiceBriefing } from "@/components/briefing/voice-briefing";
import { PmoLocalEvidenceSnippets } from "@/components/dashboard/pmo-local-evidence";
import { ModuleShell, StatCard, StatGrid } from "@/components/modules/module-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { IntelCard } from "@/components/ui/intel-card";
import { FloatCard } from "@/components/ui/module-motion";
import { AiStatusBadge } from "@/components/ai/ai-status-badge";
import { useAppLang } from "@/hooks/use-app-lang";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

type CatKey = "completion" | "budget" | "alert" | "arbitrage" | "news" | "summary";

const CAT_META: Record<
  CatKey,
  {
    accent: "danger" | "warning" | "success" | "info" | "default";
    icon: typeof Wallet;
    bn: string;
    en: string;
    rail: string;
    badge: string;
    iconWrap: string;
    panel: string;
  }
> = {
  budget: {
    accent: "danger",
    icon: Wallet,
    bn: "বাজেট ওভাররান",
    en: "Budget overrun",
    rail: "from-red-500 to-orange-400",
    badge: "border-red-500/40 bg-red-500/15 text-red-200",
    iconWrap: "border-red-500/30 bg-red-500/15 text-red-300",
    panel: "from-red-500/18 via-red-500/5 to-transparent",
  },
  alert: {
    accent: "danger",
    icon: BadgeAlert,
    bn: "রেড ফ্ল্যাগ",
    en: "Red flag",
    rail: "from-orange-500 to-amber-400",
    badge: "border-orange-500/40 bg-orange-500/15 text-orange-200",
    iconWrap: "border-orange-500/30 bg-orange-500/15 text-orange-300",
    panel: "from-orange-500/16 via-amber-500/5 to-transparent",
  },
  completion: {
    accent: "warning",
    icon: TrendingDown,
    bn: "সমাপ্তির হার",
    en: "Completion drop",
    rail: "from-amber-400 to-yellow-300",
    badge: "border-amber-500/40 bg-amber-500/12 text-amber-100",
    iconWrap: "border-amber-500/30 bg-amber-500/15 text-amber-300",
    panel: "from-amber-500/14 via-amber-500/4 to-transparent",
  },
  arbitrage: {
    accent: "success",
    icon: ArrowDownRight,
    bn: "আরবিট্রেজ",
    en: "Arbitrage",
    rail: "from-emerald-400 to-teal-300",
    badge: "border-emerald-500/40 bg-emerald-500/12 text-emerald-100",
    iconWrap: "border-emerald-500/30 bg-emerald-500/15 text-emerald-300",
    panel: "from-emerald-500/14 to-transparent",
  },
  news: {
    accent: "info",
    icon: Newspaper,
    bn: "সংবাদ",
    en: "News",
    rail: "from-sky-400 to-cyan-300",
    badge: "border-sky-500/40 bg-sky-500/12 text-sky-100",
    iconWrap: "border-sky-500/30 bg-sky-500/15 text-sky-300",
    panel: "from-sky-500/12 to-transparent",
  },
  summary: {
    accent: "info",
    icon: Landmark,
    bn: "সারাংশ",
    en: "Summary",
    rail: "from-primary to-emerald-400",
    badge: "border-primary/35 bg-primary/10 text-primary",
    iconWrap: "border-primary/30 bg-primary/15 text-primary",
    panel: "from-primary/12 to-transparent",
  },
};

function resolveCat(category: string): CatKey {
  if (category in CAT_META) return category as CatKey;
  return "summary";
}

function parseBullet(text: string) {
  const quoted = text.match(/[«"]([^»"]+)[»"]/);
  const pct = text.match(/(\d+(?:\.\d+)?)\s*%/);
  const severity = text.match(/severity\s*(\d+)/i) ?? text.match(/তীব্রতা\s*(\d+)/i);
  const location = text.match(/^([A-Za-z\u0980-\u09FF\s]+?)\s+বিভাগে/);
  let headline = text
    .replace(/^নতুন red flag:\s*/i, "")
    .replace(/^New red flag on\s*/i, "")
    .replace(/^সংবাদ\s*\([^)]+\):\s*/i, "")
    .replace(/^News\s*\([^)]+\):\s*/i, "");
  if (quoted) {
    headline = quoted[1];
  }
  return {
    project: quoted?.[1] ?? null,
    pct: pct?.[1] ?? null,
    severity: severity?.[1] ?? null,
    location: location?.[1]?.trim() ?? null,
    body: text,
    short: headline.length > 110 ? `${headline.slice(0, 108)}…` : headline,
  };
}

function BriefingPointCard({
  bullet,
  index,
  bn,
}: {
  bullet: BriefingBullet;
  index: number;
  bn: boolean;
}) {
  const cat = resolveCat(bullet.category);
  const meta = CAT_META[cat];
  const Icon = meta.icon;
  const parsed = parseBullet(bullet.text);
  const urgent = cat === "budget" || cat === "alert" || bullet.priority <= 1;

  return (
    <FloatCard index={index} danger={urgent} shimmer={urgent}>
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl border border-border/40 bg-secondary/15",
          urgent && "border-red-500/30",
        )}
      >
        <div className={cn("pointer-events-none absolute inset-0 bg-gradient-to-br", meta.panel)} />
        <div className={cn("absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b", meta.rail)} />

        <div className="relative grid gap-0 sm:grid-cols-[88px_1fr]">
          {/* Rank / metric rail */}
          <div className="flex flex-col items-center justify-center gap-2 border-b border-border/25 px-3 py-4 sm:border-b-0 sm:border-r sm:border-border/25">
            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              #{index + 1}
            </span>
            <div
              className={cn(
                "flex h-14 w-14 flex-col items-center justify-center rounded-2xl border",
                meta.iconWrap,
              )}
            >
              {parsed.pct ? (
                <>
                  <span className="font-display text-lg font-bold tabular-nums leading-none">
                    {parsed.pct}
                  </span>
                  <span className="text-[10px] font-semibold opacity-80">%</span>
                </>
              ) : parsed.severity ? (
                <>
                  <span className="font-display text-xl font-bold tabular-nums leading-none">
                    {parsed.severity}
                  </span>
                  <span className="text-[9px] font-semibold opacity-80">/5</span>
                </>
              ) : (
                <Icon className="h-5 w-5" />
              )}
            </div>
            {urgent && (
              <span className="inline-flex items-center gap-1 rounded-md border border-red-500/35 bg-red-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-red-200">
                <AlertTriangle className="h-2.5 w-2.5" />
                {bn ? "জরুরি" : "Urgent"}
              </span>
            )}
          </div>

          {/* Content */}
          <div className="space-y-3 p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn("rounded-md border px-2 py-0.5 text-[10px] font-bold tracking-wide", meta.badge)}>
                {bn ? meta.bn : meta.en}
              </span>
              {parsed.location && (
                <Badge variant="outline" className="text-[10px] text-muted-foreground">
                  {parsed.location}
                </Badge>
              )}
              {parsed.severity && (
                <Badge
                  variant="outline"
                  className="text-[10px] font-bold tabular-nums text-orange-200 border-orange-500/35"
                >
                  {bn ? "তীব্রতা" : "Severity"} {parsed.severity}/5
                </Badge>
              )}
            </div>

            {parsed.project ? (
              <>
                <h3 className="font-display text-[15px] font-semibold leading-snug tracking-tight text-foreground sm:text-base">
                  {parsed.project}
                </h3>
                <p className="text-sm leading-relaxed text-foreground/80">{parsed.body}</p>
              </>
            ) : (
              <p className="text-sm leading-relaxed text-foreground/90 sm:text-[15px]">{parsed.body}</p>
            )}

            {(cat === "budget" || cat === "alert") && (
              <div className="flex items-center gap-2 rounded-xl border border-border/30 bg-background/30 px-3 py-2 text-[11px] text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5 shrink-0 text-primary/80" />
                {bn
                  ? "তাৎক্ষণিক পর্যবেক্ষণ ও ফলো-আপ সুপারিশ করা হচ্ছে"
                  : "Immediate monitoring and follow-up recommended"}
              </div>
            )}
          </div>
        </div>
      </div>
    </FloatCard>
  );
}

export function BriefingCopilot() {
  const lang = useAppLang();
  const bn = lang === "bn";
  const t = useTranslations("modules.briefing");
  const tc = useTranslations("common");
  const { briefing, loading, error, reload } = useMorningBriefing(lang);

  const sortedBullets = useMemo(() => {
    if (!briefing) return [];
    return [...briefing.bullets].sort((a, b) => a.priority - b.priority || 0);
  }, [briefing]);

  const urgentCount = sortedBullets.filter(
    (b) => b.category === "budget" || b.category === "alert" || b.priority <= 1,
  ).length;

  return (
    <ModuleShell
      title={t("title")}
      description={t("description")}
      loading={loading && !briefing}
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
      {briefing && (
        <div className="space-y-6">
          {/* Morning hero */}
          <div className="relative overflow-hidden rounded-2xl border border-amber-500/25 bg-gradient-to-br from-amber-500/12 via-background/80 to-emerald-500/10 px-5 py-5 sm:px-6">
            <div className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full bg-amber-400/10 blur-3xl" />
            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3.5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-amber-400/30 bg-amber-500/15 text-amber-300">
                  <Sun className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-display text-xl font-semibold tracking-tight sm:text-2xl">
                    {t("morningTitle")}
                    <span className="text-muted-foreground"> — {briefing.scope_label}</span>
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {bn
                      ? `${sortedBullets.length}টি পয়েন্ট · ${urgentCount}টি জরুরি মনোযোগ প্রয়োজন`
                      : `${sortedBullets.length} points · ${urgentCount} need urgent attention`}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <AiStatusBadge />
                <Button size="sm" onClick={reload} className="gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  {tc("regenerate")}
                </Button>
              </div>
            </div>
          </div>

          <PmoLocalEvidenceSnippets />

          <div className="grid gap-6 xl:grid-cols-5">
            <div className="space-y-4 xl:col-span-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                  {t("bullets")}
                </p>
                <span className="text-[11px] text-muted-foreground">
                  {bn ? "অগ্রাধিকার অনুসারে সাজানো" : "Sorted by priority"}
                </span>
              </div>

              <div className="space-y-3.5">
                {sortedBullets.map((bullet, i) => (
                  <BriefingPointCard
                    key={`${bullet.category}-${i}-${bullet.text.slice(0, 24)}`}
                    bullet={bullet}
                    index={i}
                    bn={bn}
                  />
                ))}
              </div>

              {/* Compact executive note — no duplicate bullet dump */}
              <IntelCard accent="info" padding="md" hoverLift={false} float={false} shimmer={false} index={1}>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  {t("narrative")}
                </p>
                <p className="text-sm leading-relaxed text-foreground/85">
                  {bn
                    ? `${briefing.scope_label} স্কোপে আজ ${sortedBullets.length}টি গুরুত্বপূর্ণ ইস্যু চিহ্নিত হয়েছে। উপরের কার্ডগুলোতে বাজেট, রেড ফ্ল্যাগ ও সমাপ্তির চাপ আলাদাভাবে দেখানো হয়েছে — জরুরি আইটেমগুলোতে তাৎক্ষণিক ফলো-আপ প্রয়োজন।`
                    : `${sortedBullets.length} priority issues identified for ${briefing.scope_label}. Budget, red-flag, and completion pressures are broken out above — urgent items need immediate follow-up.`}
                </p>
              </IntelCard>
            </div>

            <div className="xl:col-span-2">
              <VoiceBriefing text={briefing.voice_text} lang={lang} />
            </div>
          </div>
        </div>
      )}
    </ModuleShell>
  );
}
