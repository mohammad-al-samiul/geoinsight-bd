"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bar, BarChart, CartesianGrid, Cell, LabelList, PolarAngleAxis, PolarGrid,
  Radar, RadarChart, RadialBar, RadialBarChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";
import {
  Activity, AlertTriangle, Banknote, BookOpen, Briefcase, Building2,
  CheckCircle2, ChevronDown, Clock, ExternalLink, Factory, Fuel,
  Globe, Landmark, Minus, RefreshCw, Scale, ShieldAlert, Sparkles,
  TrendingDown, TrendingUp, Users, Zap,
} from "lucide-react";
import { ModuleShell, StatCard, StatGrid } from "@/components/modules/module-shell";
import { IntelCard } from "@/components/ui/intel-card";
import { FloatCard } from "@/components/ui/module-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRealtimeRefresh } from "@/hooks/use-realtime-refresh";
import { useStrategicOutlook } from "@/hooks/use-strategic-outlook";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import { chartTooltipProps } from "@/lib/chart-tooltip";
import { chartLayout, RadarAngleTick } from "@/lib/chart-theme";
import { cn } from "@/lib/utils";
import { DataTrustBanner } from "@/components/ui/data-trust-banner";

// ── Helpers ───────────────────────────────────────────────────────────────────
function trajIcon(traj: string) {
  if (traj === "improving")    return <TrendingUp  className="h-4 w-4 text-emerald-400" />;
  if (traj === "deteriorating") return <TrendingDown className="h-4 w-4 text-red-400" />;
  return <Minus className="h-4 w-4 text-amber-400" />;
}
function bandBorder(band: string) {
  if (band === "adverse") return "border-red-500/40 bg-red-500/5";
  if (band === "reform")  return "border-emerald-500/40 bg-emerald-500/5";
  return "border-sky-500/40 bg-sky-500/5";
}
function bandText(band: string) {
  if (band === "adverse") return "text-red-400";
  if (band === "reform")  return "text-emerald-400";
  return "text-sky-400";
}
function sevMeta(s: number, bn: boolean) {
  if (s >= 5) {
    return {
      level: bn ? "সংকট" : "CRITICAL",
      tone: "critical" as const,
      color: "#ef4444",
      ring: "ring-red-500/40",
      glow: "shadow-[0_0_28px_-10px_rgba(239,68,68,0.55)]",
      rail: "from-red-500 via-red-400 to-orange-500",
      badge: "border-red-500/45 bg-red-500/15 text-red-200",
      panel: "from-red-500/25 via-red-500/10 to-transparent",
    };
  }
  if (s >= 4) {
    return {
      level: bn ? "উচ্চ" : "HIGH",
      tone: "high" as const,
      color: "#f97316",
      ring: "ring-orange-500/35",
      glow: "shadow-[0_0_24px_-12px_rgba(249,115,22,0.45)]",
      rail: "from-orange-500 via-amber-400 to-yellow-500",
      badge: "border-orange-500/40 bg-orange-500/12 text-orange-200",
      panel: "from-orange-500/20 via-amber-500/8 to-transparent",
    };
  }
  if (s >= 3) {
    return {
      level: bn ? "মাঝারি" : "ELEVATED",
      tone: "elevated" as const,
      color: "#eab308",
      ring: "ring-amber-500/30",
      glow: "",
      rail: "from-amber-400 to-yellow-300",
      badge: "border-amber-500/35 bg-amber-500/10 text-amber-100",
      panel: "from-amber-500/15 to-transparent",
    };
  }
  return {
    level: bn ? "নিম্ন" : "WATCH",
    tone: "watch" as const,
    color: "#34d399",
    ring: "ring-emerald-500/25",
    glow: "",
    rail: "from-emerald-400 to-teal-300",
    badge: "border-emerald-500/35 bg-emerald-500/10 text-emerald-100",
    panel: "from-emerald-500/12 to-transparent",
  };
}

function challengeIcon(title: string, domain: "politics" | "economy"): ReactNode {
  const t = title.toLowerCase();
  if (domain === "politics") {
    if (/নিরাপত্তা|অসন্তোষ|security|unrest|protest/.test(t)) return <ShieldAlert className="h-5 w-5" />;
    if (/নির্বাচন|শাসন|elect|govern|legitim/.test(t)) return <Landmark className="h-5 w-5" />;
    if (/পররাষ্ট্র|ভূরাজনীতি|foreign|geopolit/.test(t)) return <Globe className="h-5 w-5" />;
    if (/সংস্কার|reform|institution|প্রাতিষ্ঠানিক/.test(t)) return <Scale className="h-5 w-5" />;
    return <Users className="h-5 w-5" />;
  }
  if (/রপ্তানি|কর্মসংস্থান|export|employ|rmg/.test(t)) return <Factory className="h-5 w-5" />;
  if (/ম্যাক্রো|মুদ্রা|inflation|reserve|macro|imf/.test(t)) return <TrendingDown className="h-5 w-5" />;
  if (/জ্বালানি|অবকাঠামো|energy|infra|fuel/.test(t)) return <Fuel className="h-5 w-5" />;
  if (/ব্যাংক|আর্থিক|bank|financ/.test(t)) return <Banknote className="h-5 w-5" />;
  return <Zap className="h-5 w-5" />;
}

/** Bold severity meter — glanceable in one look */
function SevMeter({ value, color, bn }: { value: number; color: string; bn: boolean }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/80">
        <span>1</span>
        <span>{bn ? "তীব্রতা স্কেল" : "Severity scale"}</span>
        <span>5</span>
      </div>
      <div className="relative h-3 overflow-hidden rounded-full bg-white/8 ring-1 ring-white/10">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            background: `linear-gradient(90deg, ${color}99, ${color})`,
            boxShadow: `0 0 18px ${color}66`,
          }}
          initial={{ width: 0 }}
          animate={{ width: `${(value / 5) * 100}%` }}
          transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
        />
        <div className="absolute inset-0 flex">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="flex-1 border-r border-background/40 last:border-0" />
          ))}
        </div>
      </div>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <motion.div
            key={n}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.08 * n, duration: 0.25 }}
            className={cn(
              "h-1.5 flex-1 rounded-full",
              n <= value ? "opacity-100" : "opacity-20 bg-white/20",
            )}
            style={n <= value ? { backgroundColor: color } : undefined}
          />
        ))}
      </div>
    </div>
  );
}

// ── Risk gauge (radial) ───────────────────────────────────────────────────────
function RiskGauge({ label, value, max, color }: {
  label: string; value: number; max: number; color: string;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  const data = [{ value: pct, fill: color }];
  return (
    <div className="flex flex-col items-center gap-1.5">
      <ResponsiveContainer width={120} height={90}>
        <RadialBarChart data={data} cx="50%" cy="88%"
          innerRadius="68%" outerRadius="98%"
          startAngle={180} endAngle={180 - (pct / 100) * 180}
          barSize={12}>
          <RadialBar dataKey="value"
            background={{ fill: "rgba(255,255,255,0.06)" }}
            cornerRadius={6} />
        </RadialBarChart>
      </ResponsiveContainer>
      <p className="text-2xl font-bold tabular-nums -mt-1" style={{ color }}>{value}</p>
      <p className="text-xs font-medium text-muted-foreground text-center leading-snug max-w-[90px]">{label}</p>
    </div>
  );
}

// ── Narrative parser ──────────────────────────────────────────────────────────
// The Python service produces structured text with section headers (e.g. "রাজনৈতিক চ্যালেঞ্জ:", "গতিপথ:")
// followed by bullet lines starting with "• ". We parse these into typed sections.

interface NarrativeSection {
  heading: string | null;
  bullets: string[];
}

function parseNarrative(raw: string): NarrativeSection[] {
  const lines = raw.split("\n").map(l => l.trim()).filter(l => l.length > 0);
  const sections: NarrativeSection[] = [];
  let current: NarrativeSection = { heading: null, bullets: [] };

  for (const line of lines) {
    if (line.endsWith(":") && !line.startsWith("•")) {
      // New section heading
      if (current.heading !== null || current.bullets.length > 0) {
        sections.push(current);
      }
      current = { heading: line.replace(/:$/, ""), bullets: [] };
    } else if (line.startsWith("•")) {
      current.bullets.push(line.replace(/^•\s*/, "").trim());
    } else if (current.bullets.length === 0 && !line.startsWith("•")) {
      // Introductory sentence before any bullets
      if (current.heading === null) {
        sections.push({ heading: null, bullets: [line] });
      } else {
        current.bullets.push(line);
      }
    }
  }
  if (current.heading !== null || current.bullets.length > 0) {
    sections.push(current);
  }
  return sections.filter(s => s.bullets.length > 0);
}

// Section accent colours
const SECTION_STYLE: Record<string, { border: string; dot: string; badge: string }> = {
  "রাজনৈতিক চ্যালেঞ্জ":   { border: "border-purple-500/30", dot: "bg-purple-400", badge: "bg-purple-500/10 text-purple-300" },
  "Political challenges":   { border: "border-purple-500/30", dot: "bg-purple-400", badge: "bg-purple-500/10 text-purple-300" },
  "অর্থনৈতিক চ্যালেঞ্জ":  { border: "border-amber-500/30",  dot: "bg-amber-400",  badge: "bg-amber-500/10 text-amber-300"  },
  "Economic challenges":    { border: "border-amber-500/30",  dot: "bg-amber-400",  badge: "bg-amber-500/10 text-amber-300"  },
  "গতিপথ":                 { border: "border-sky-500/30",    dot: "bg-sky-400",    badge: "bg-sky-500/10 text-sky-300"      },
  "Direction of travel":    { border: "border-sky-500/30",    dot: "bg-sky-400",    badge: "bg-sky-500/10 text-sky-300"      },
  "আগামী ৩–৫ বছরের সম্ভাব্য দৃশ্যপট": { border: "border-emerald-500/30", dot: "bg-emerald-400", badge: "bg-emerald-500/10 text-emerald-300" },
  "Probable scenarios over the next 3–5 years": { border: "border-emerald-500/30", dot: "bg-emerald-400", badge: "bg-emerald-500/10 text-emerald-300" },
};

const DEFAULT_STYLE = { border: "border-border/30", dot: "bg-primary/60", badge: "bg-primary/10 text-primary/80" };

// ── Executive narrative card (beautiful structured) ───────────────────────────
function ExecutiveNarrativeCard({ narrative, t }: {
  narrative: string;
  t: ReturnType<typeof useTranslations>;
}) {
  const sections = parseNarrative(narrative);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/40">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border/30 bg-gradient-to-r from-primary/8 via-primary/4 to-transparent px-5 py-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
          <BookOpen className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-foreground">{t("executiveNarrative")}</p>
          <p className="text-[11px] text-muted-foreground">{t("executiveNarrativeHint")}</p>
        </div>
      </div>

      {/* Sections */}
      <div className="divide-y divide-border/20 bg-secondary/5">
        {sections.map((sec, si) => {
          const style = (sec.heading && SECTION_STYLE[sec.heading]) || DEFAULT_STYLE;
          return (
            <div key={si} className="px-5 py-4 space-y-3">
              {/* Section heading */}
              {sec.heading && (
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${style.dot}`} />
                  <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${style.badge}`}>
                    {sec.heading}
                  </span>
                </div>
              )}
              {/* Bullet points */}
              <ul className="space-y-2.5">
                {sec.bullets.map((b, bi) => (
                  <li key={bi}
                    className={`flex items-start gap-3 rounded-xl border px-3.5 py-3 ${style.border} bg-secondary/20`}>
                    <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${style.dot} opacity-70`} />
                    <p className="text-sm leading-relaxed text-foreground/90">{b}</p>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}

        {/* Fallback for unparsed narrative */}
        {sections.length === 0 && (
          <div className="px-5 py-4">
            <p className="text-sm leading-relaxed text-foreground/85 whitespace-pre-line">{narrative}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Challenge card (glanceable command intel) ─────────────────────────────────
function ChallengeCard({
  c,
  t,
  bn,
  domain,
  index,
  rank,
}: {
  c: { title: string; severity: number; summary: string; evidence: string[] };
  t: ReturnType<typeof useTranslations>;
  bn: boolean;
  domain: "politics" | "economy";
  index: number;
  rank: number;
}) {
  const [open, setOpen] = useState(false);
  const meta = sevMeta(c.severity, bn);
  const icon = challengeIcon(c.title, domain);

  return (
    <FloatCard index={index} danger={meta.tone === "critical"} shimmer={meta.tone !== "watch"}>
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl border border-border/40 bg-secondary/15",
          meta.glow,
          meta.tone === "critical" && "border-red-500/40",
          meta.tone === "high" && "border-orange-500/35",
        )}
      >
        <div className={cn("pointer-events-none absolute inset-0 bg-gradient-to-br opacity-90", meta.panel)} />
        <div className={cn("absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b", meta.rail)} />

        <div className="relative grid gap-0 sm:grid-cols-[104px_1fr]">
          {/* Big severity score — readable at a glance */}
          <div className="flex flex-col items-center justify-center gap-2 border-b border-border/30 px-4 py-5 sm:border-b-0 sm:border-r sm:border-border/30">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              {bn ? "র‍্যাঙ্ক" : "Rank"} #{rank}
            </p>
            <motion.div
              className={cn(
                "relative flex h-20 w-20 flex-col items-center justify-center rounded-2xl border bg-background/40 ring-2",
                meta.ring,
              )}
              animate={
                meta.tone === "critical"
                  ? { scale: [1, 1.04, 1], boxShadow: ["0 0 0 rgba(239,68,68,0)", "0 0 22px rgba(239,68,68,0.35)", "0 0 0 rgba(239,68,68,0)"] }
                  : undefined
              }
              transition={meta.tone === "critical" ? { duration: 2.2, repeat: Infinity, ease: "easeInOut" } : undefined}
            >
              <span className="font-display text-4xl font-bold tabular-nums leading-none" style={{ color: meta.color }}>
                {c.severity}
              </span>
              <span className="mt-0.5 text-[10px] font-semibold text-muted-foreground">/ 5</span>
            </motion.div>
            <span className={cn("rounded-md border px-2 py-0.5 text-[10px] font-bold tracking-wide", meta.badge)}>
              {meta.level}
            </span>
          </div>

          {/* Content */}
          <div className="space-y-3.5 p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <div
                className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-background/35"
                style={{ color: meta.color }}
              >
                {icon}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-display text-base font-semibold leading-snug tracking-tight text-foreground sm:text-[17px]">
                    {c.title}
                  </h3>
                  <Badge
                    variant="outline"
                    className="shrink-0 text-[10px] font-bold tabular-nums"
                    style={{ color: meta.color, borderColor: `${meta.color}55` }}
                  >
                    {t("severity")} {c.severity}/5
                  </Badge>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-foreground/80">{c.summary}</p>
              </div>
            </div>

            <SevMeter value={c.severity} color={meta.color} bn={bn} />

            {c.evidence.length > 0 && (
              <div className="rounded-xl border border-border/35 bg-background/25">
                <button
                  type="button"
                  onClick={() => setOpen((v) => !v)}
                  className="flex w-full items-center justify-between gap-2 px-3.5 py-2.5 text-left transition-colors hover:bg-primary/5"
                >
                  <span className="flex items-center gap-2 text-[12px] font-semibold text-primary/90">
                    <BookOpen className="h-3.5 w-3.5" />
                    {c.evidence.length} {t("evidence")}
                    <span className="font-normal text-muted-foreground">
                      {bn ? "— খুলে দেখুন" : "— expand"}
                    </span>
                  </span>
                  <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {open && (
                    <motion.ul
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.28 }}
                      className="overflow-hidden border-t border-border/30"
                    >
                      <div className="space-y-2 px-3.5 py-3">
                        {c.evidence.slice(0, 5).map((e, i) => (
                          <li
                            key={i}
                            className="flex gap-2.5 rounded-lg bg-secondary/20 px-3 py-2 text-[12px] leading-relaxed text-muted-foreground"
                          >
                            <span
                              className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                              style={{ backgroundColor: meta.color }}
                            />
                            <span>{e}</span>
                          </li>
                        ))}
                      </div>
                    </motion.ul>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </div>
    </FloatCard>
  );
}

function ChallengeDomainView({
  domain,
  title,
  items,
  risk,
  bn,
  t,
  radarStroke,
}: {
  domain: "politics" | "economy";
  title: string;
  items: { title: string; severity: number; summary: string; evidence: string[] }[];
  risk: number;
  bn: boolean;
  t: ReturnType<typeof useTranslations>;
  radarStroke: string;
}) {
  const bp = useBreakpoint();
  const layout = chartLayout(bp);
  const sorted = useMemo(
    () => [...items].sort((a, b) => b.severity - a.severity),
    [items],
  );
  const critical = sorted.filter((c) => c.severity >= 5).length;
  const high = sorted.filter((c) => c.severity === 4).length;
  const avg = items.length ? (risk / items.length).toFixed(1) : "0";
  const maxPossible = items.length * 5 || 1;
  const heatPct = Math.min(100, Math.round((risk / maxPossible) * 100));
  const isPolitics = domain === "politics";

  return (
    <motion.div
      key={domain}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-5"
    >
      {/* Hero command strip */}
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl border px-5 py-5 sm:px-6",
          isPolitics
            ? "border-violet-500/30 bg-gradient-to-br from-violet-500/15 via-background/80 to-fuchsia-500/10"
            : "border-amber-500/30 bg-gradient-to-br from-amber-500/15 via-background/80 to-orange-500/10",
        )}
      >
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/5 blur-3xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3.5">
            <div
              className={cn(
                "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border",
                isPolitics
                  ? "border-violet-400/30 bg-violet-500/15 text-violet-300"
                  : "border-amber-400/30 bg-amber-500/15 text-amber-300",
              )}
            >
              {isPolitics ? <Building2 className="h-5 w-5" /> : <Briefcase className="h-5 w-5" />}
            </div>
            <div>
              <p className="font-display text-xl font-semibold tracking-tight sm:text-2xl">{title}</p>
              <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                {bn
                  ? "তীব্রতা অনুসারে সাজানো — বড় সংখ্যা দেখেই ঝুঁকি বুঝুন"
                  : "Sorted by severity — the big number tells you the risk instantly"}
              </p>
            </div>
          </div>

          <div className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-xl border border-white/10 bg-background/35 px-3 py-2.5 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t("riskScore")}
              </p>
              <p
                className={cn(
                  "mt-1 font-display text-2xl font-bold tabular-nums",
                  isPolitics ? "text-violet-300" : "text-amber-300",
                )}
              >
                {risk}
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-background/35 px-3 py-2.5 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {bn ? "গড় তীব্রতা" : "Avg severity"}
              </p>
              <p className="mt-1 font-display text-2xl font-bold tabular-nums text-foreground">{avg}</p>
            </div>
            <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2.5 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-red-300/80">
                {bn ? "সংকট" : "Critical"}
              </p>
              <p className="mt-1 font-display text-2xl font-bold tabular-nums text-red-300">{critical}</p>
            </div>
            <div className="rounded-xl border border-orange-500/25 bg-orange-500/10 px-3 py-2.5 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-orange-300/80">
                {bn ? "উচ্চ" : "High"}
              </p>
              <p className="mt-1 font-display text-2xl font-bold tabular-nums text-orange-300">{high}</p>
            </div>
          </div>
        </div>

        {/* Heat bar */}
        <div className="relative mt-5 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>{bn ? "মোট চাপের মাত্রা" : "Overall pressure heat"}</span>
            <span className="font-mono font-semibold text-foreground">{heatPct}%</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-white/8">
            <motion.div
              className={cn(
                "h-full rounded-full bg-gradient-to-r",
                isPolitics ? "from-violet-500 via-fuchsia-400 to-red-400" : "from-amber-400 via-orange-400 to-red-500",
              )}
              initial={{ width: 0 }}
              animate={{ width: `${heatPct}%` }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-border/40 bg-secondary/10 py-12 text-center">
          <CheckCircle2 className="h-8 w-8 text-emerald-400/40" />
          <p className="text-sm text-muted-foreground">{t("noChallenges")}</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {sorted.map((c, i) => (
            <ChallengeCard
              key={`${c.title}-${i}`}
              c={c}
              t={t}
              bn={bn}
              domain={domain}
              index={i}
              rank={i + 1}
            />
          ))}
        </div>
      )}

      {sorted.length >= 3 && (
        <FloatCard index={sorted.length} shimmer>
          <IntelCard padding="sm" float={false} shimmer={false}>
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                {t("pressureMap")}
              </p>
              <span className="text-[11px] text-muted-foreground">
                {bn ? "রাডারে তুলনামূলক চাপ" : "Comparative pressure radar"}
              </span>
            </div>
            <div className="w-full overflow-visible" style={{ height: layout.narrow ? 320 : 380 }}>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart
                  data={sorted.slice(0, 6).map((c) => ({
                    subject: c.title,
                    value: c.severity,
                  }))}
                  cx="50%"
                  cy="50%"
                  outerRadius={layout.narrow ? "38%" : "42%"}
                  margin={{ top: 28, right: 36, bottom: 28, left: 36 }}
                >
                  <PolarGrid stroke="rgba(148,163,184,0.12)" />
                  <PolarAngleAxis
                    dataKey="subject"
                    tick={(tickProps) => (
                      <RadarAngleTick
                        {...tickProps}
                        fill="#cbd5e1"
                        fontSize={layout.narrow ? 10 : 11}
                        maxCharsPerLine={layout.narrow ? 11 : 15}
                        maxLines={4}
                      />
                    )}
                  />
                  <Radar
                    name={t("severity")}
                    dataKey="value"
                    stroke={radarStroke}
                    fill={radarStroke}
                    fillOpacity={0.28}
                    strokeWidth={2.5}
                  />
                  <Tooltip {...chartTooltipProps} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </IntelCard>
        </FloatCard>
      )}
    </motion.div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────
export function StrategicOutlookPanel() {
  // ✅ FIX: "outlook" not "modules.outlook"
  const t = useTranslations("outlook");
  const locale = useLocale();
  const bn = locale === "bn";
  const bp = useBreakpoint();
  const layout = chartLayout(bp);
  const { data, loading, error, usingMock, reload, refresh, refreshing } = useStrategicOutlook();
  const [activeTab, setActiveTab] = useState<"overview"|"politics"|"economy"|"sources">("overview");
  useRealtimeRefresh(reload);

  const pol = data?.challenges.filter(c => c.domain === "politics") ?? [];
  const eco = data?.challenges.filter(c => c.domain === "economy") ?? [];
  const analystSources = data?.sources.filter(s => s.analyst_like).slice(0, 15) ?? [];
  const allSources = data?.sources.slice(0, 30) ?? [];

  const polRisk = pol.reduce((s, c) => s + c.severity, 0);
  const ecoRisk = eco.reduce((s, c) => s + c.severity, 0);

  /** Each bar = one challenge; severity 1–5 → intensity % */
  const challengeBarData = [
    ...pol.map((c, i) => ({
      id: `p${i + 1}`,
      label: c.title,
      shortLabel: c.title.length > 22 ? `${c.title.slice(0, 20)}…` : c.title,
      pct: Math.round((Math.min(5, Math.max(0, c.severity)) / 5) * 100),
      severity: c.severity,
      domain: "politics" as const,
    })),
    ...eco.map((c, i) => ({
      id: `e${i + 1}`,
      label: c.title,
      shortLabel: c.title.length > 22 ? `${c.title.slice(0, 20)}…` : c.title,
      pct: Math.round((Math.min(5, Math.max(0, c.severity)) / 5) * 100),
      severity: c.severity,
      domain: "economy" as const,
    })),
  ];

  const radarData = [
    ...pol.slice(0, 3).map((c) => ({
      subject: c.title,
      politics: Math.round((c.severity / 5) * 100),
      economy: 0,
    })),
    ...eco.slice(0, 3).map((c) => ({
      subject: c.title,
      politics: 0,
      economy: Math.round((c.severity / 5) * 100),
    })),
  ];

  const tabs = [
    { id: "overview",  label: t("tabOverview")  },
    { id: "politics",  label: t("tabPolitics")  },
    { id: "economy",   label: t("tabEconomy")   },
    { id: "sources",   label: t("tabSources")   },
  ] as const;

  return (
    <ModuleShell
      title={t("title")}
      description={t("description")}
      loading={loading} error={error} onRetry={reload}
      stats={data ? (
        <StatGrid>
          <StatCard label={t("sourcesUsed")} value={data.source_count ?? data.sources.length} />
          <StatCard label={t("politicalChallenges")} value={pol.length} accent="danger" />
          <StatCard label={t("economicChallenges")} value={eco.length} accent="warning" />
          <StatCard label={t("aiMode")} value={data.llm_used ? t("llmOn") : t("rulesEngine")} />
        </StatGrid>
      ) : null}
    >
      {usingMock ? <DataTrustBanner kind="mock" className="mb-4" /> : null}
      {data && (
        <div className="space-y-5">
          {/* ── Action bar ── */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="gap-1.5 text-xs">
                <Clock className="h-3 w-3 text-primary/70" />{t("horizon")}
              </Badge>
              <Badge variant="outline" className="gap-1.5 text-xs">
                <BookOpen className="h-3 w-3 text-primary/70" />{t("openSource")}
              </Badge>
              {data.llm_used && (
                <Badge className="gap-1.5 text-xs bg-purple-500/10 text-purple-300 border border-purple-500/30">
                  <Sparkles className="h-3 w-3" />AI-enhanced
                </Badge>
              )}
              {data.refreshed_at && (
                <Badge variant="outline" className="gap-1.5 text-xs text-muted-foreground/70">
                  <Activity className="h-3 w-3" />
                  {new Date(data.refreshed_at).toLocaleString()}
                </Badge>
              )}
            </div>
            <Button size="sm" variant="outline" disabled={refreshing}
              onClick={() => void refresh()} className="gap-2 text-xs h-8">
              <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
              {refreshing ? t("refreshing") : t("refresh")}
            </Button>
          </div>

          {/* ── Disclaimer ── */}
          <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs text-amber-200/90">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-amber-400" />
            <p className="leading-relaxed">{data.disclaimer}</p>
          </div>

          {/* ── Risk gauges + radar ── */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <IntelCard accent="danger" padding="md" className="flex items-center justify-center py-6">
              <RiskGauge label={bn ? "রাজনৈতিক ঝুঁকি" : "Political Risk"}
                value={polRisk} max={pol.length * 5 || 20} color="#ef4444" />
            </IntelCard>
            <IntelCard accent="warning" padding="md" className="flex items-center justify-center py-6">
              <RiskGauge label={bn ? "অর্থনৈতিক ঝুঁকি" : "Economic Risk"}
                value={ecoRisk} max={eco.length * 5 || 20} color="#f59e0b" />
            </IntelCard>
            {radarData.length >= 3 && (
              <IntelCard padding="sm" className="sm:col-span-2 !overflow-visible">
                <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                  {t("challengeIntensity")}
                </p>
                <div className="w-full overflow-visible" style={{ height: layout.narrow ? 300 : 360 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart
                      data={radarData}
                      cx="50%"
                      cy="50%"
                      outerRadius={layout.narrow ? "36%" : "40%"}
                      margin={{ top: 32, right: 48, bottom: 32, left: 48 }}
                    >
                      <PolarGrid stroke="rgba(148,163,184,0.12)" />
                      <PolarAngleAxis
                        dataKey="subject"
                        tick={(tickProps) => (
                          <RadarAngleTick
                            {...tickProps}
                            fill="#e2e8f0"
                            fontSize={layout.narrow ? 10 : 12}
                            maxCharsPerLine={layout.narrow ? 12 : 16}
                            maxLines={4}
                          />
                        )}
                      />
                      <Radar name={t("politics")} dataKey="politics"
                        stroke="#a855f7" fill="#a855f7" fillOpacity={0.25} strokeWidth={2} />
                      <Radar name={t("economy")} dataKey="economy"
                        stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.25} strokeWidth={2} />
                      <Tooltip {...chartTooltipProps} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </IntelCard>
            )}
          </div>

          {/* ── Tabs ── */}
          <div className="rounded-2xl border border-border/50 overflow-hidden">
            {/* Tab bar */}
            <div className="scroll-x-strip border-b border-border/50 bg-secondary/15 px-1 sm:gap-0">
              {tabs.map(tab => (
                <button key={tab.id} type="button"
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={cn(
                    "px-4 py-3 text-xs font-semibold tracking-wide transition-all sm:flex-1",
                    activeTab === tab.id
                      ? "bg-primary/10 text-primary border-b-2 border-primary"
                      : "text-muted-foreground/70 hover:text-foreground hover:bg-white/5",
                  )}>
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="p-5 space-y-5">

              {/* ── OVERVIEW ── */}
              {activeTab === "overview" && (
                <div className="space-y-5">
                  <ExecutiveNarrativeCard narrative={data.narrative} t={t} />

                  {/* Each bar = one named challenge; height = intensity % */}
                  {challengeBarData.length > 0 && (
                    <IntelCard padding="sm">
                      <div className="mb-3">
                        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                          {t("challengeIntensity")}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {t("challengeIntensityHint")}
                        </p>
                      </div>
                      <ResponsiveContainer
                        width="100%"
                        height={
                          layout.narrow
                            ? Math.max(layout.chartHeightMd, challengeBarData.length * 40)
                            : Math.max(layout.chartHeightMd, 280)
                        }
                      >
                        <BarChart
                          data={challengeBarData}
                          layout={layout.narrow ? "vertical" : "horizontal"}
                          margin={
                            layout.narrow
                              ? { top: 4, right: 48, left: 4, bottom: 4 }
                              : { top: 28, right: 12, left: 8, bottom: layout.tablet ? 64 : 96 }
                          }
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="rgba(148,163,184,0.08)"
                            vertical={false}
                            horizontal={layout.narrow ? false : undefined}
                          />
                          {layout.narrow ? (
                            <>
                              <XAxis
                                type="number"
                                domain={[0, 100]}
                                ticks={[0, 25, 50, 75, 100]}
                                tick={layout.tickMuted}
                                tickFormatter={(v) => `${v}%`}
                              />
                              <YAxis
                                type="category"
                                dataKey="shortLabel"
                                width={Math.max(layout.yAxisCategoryWidth, 120)}
                                tick={layout.tick}
                                interval={0}
                              />
                            </>
                          ) : (
                            <>
                              <XAxis
                                dataKey="shortLabel"
                                tick={layout.tick}
                                interval={0}
                                angle={layout.tablet ? -18 : -32}
                                textAnchor="end"
                                height={layout.tablet ? 64 : 96}
                              />
                              <YAxis
                                domain={[0, 100]}
                                ticks={[0, 25, 50, 75, 100]}
                                tick={layout.tickMuted}
                                width={layout.yAxisNumberWidth + 8}
                                tickFormatter={(v) => `${v}%`}
                              />
                            </>
                          )}
                          <Tooltip
                            {...chartTooltipProps}
                            labelFormatter={(_label, payload) => {
                              const row = payload?.[0]?.payload as
                                | { label?: string; domain?: string }
                                | undefined;
                              return row?.label ?? "";
                            }}
                            formatter={(v, _n, p) => {
                              const row = p.payload as
                                | { domain?: string; severity?: number }
                                | undefined;
                              const domainLabel =
                                row?.domain === "politics" ? t("politics") : t("economy");
                              return [`${String(v)}%`, domainLabel];
                            }}
                          />
                          <Bar
                            dataKey="pct"
                            name={t("severity")}
                            radius={layout.narrow ? [0, 5, 5, 0] : [5, 5, 0, 0]}
                            maxBarSize={layout.barMaxSize}
                          >
                            {challengeBarData.map((e, i) => (
                              <Cell
                                key={e.id}
                                fill={e.domain === "politics" ? "#a855f7" : "#f59e0b"}
                                fillOpacity={0.85}
                              />
                            ))}
                            <LabelList
                              dataKey="pct"
                              position={layout.narrow ? "right" : "top"}
                              formatter={(v: number) => `${v}%`}
                              style={{
                                fill: "#e2e8f0",
                                fontSize: 11,
                                fontWeight: 700,
                              }}
                            />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                      <div className="mt-3 flex flex-wrap gap-5 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-purple-500/80" />
                          {t("politics")}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-amber-500/80" />
                          {t("economy")}
                        </span>
                      </div>
                      {/* Explicit legend: which bar = which challenge */}
                      <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
                        {challengeBarData.map((row) => (
                          <li
                            key={row.id}
                            className="flex items-start gap-2 rounded-md border border-border/30 bg-background/40 px-2.5 py-1.5 text-[11px]"
                          >
                            <span
                              className={cn(
                                "mt-1 h-2 w-2 shrink-0 rounded-sm",
                                row.domain === "politics" ? "bg-purple-500" : "bg-amber-500",
                              )}
                            />
                            <span className="min-w-0 flex-1 leading-snug text-foreground/90">
                              {row.label}
                            </span>
                            <span className="shrink-0 font-semibold tabular-nums text-foreground">
                              {row.pct}%
                            </span>
                          </li>
                        ))}
                      </ul>
                    </IntelCard>
                  )}

                  {/* Direction */}
                  {data.direction.length > 0 && (
                    <div className="space-y-2">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{t("directionTitle")}</p>
                        <p className="text-[11px] text-muted-foreground/60">{t("directionHint")}</p>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {data.direction.map(d => (
                          <IntelCard key={d.domain} padding="sm"
                            accent={d.trajectory === "improving" ? "success" : d.trajectory === "deteriorating" ? "danger" : "default"}>
                            <div className="space-y-2.5">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  {d.domain === "politics"
                                    ? <Building2 className="h-4 w-4 text-purple-400" />
                                    : <Briefcase className="h-4 w-4 text-amber-400" />}
                                  <span className="text-sm font-bold capitalize">
                                    {d.domain === "politics" ? t("politics") : t("economy")}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  {trajIcon(d.trajectory)}
                                  <span className="text-[11px] text-muted-foreground capitalize">
                                    {d.trajectory === "improving" ? t("improving")
                                      : d.trajectory === "deteriorating" ? t("deteriorating")
                                      : t("stable")}
                                  </span>
                                </div>
                              </div>
                              <p className="text-xs leading-relaxed text-muted-foreground">{d.summary}</p>
                              {d.drivers.length > 0 && (
                                <div>
                                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                                    {t("drivers")}
                                  </p>
                                  <div className="flex flex-wrap gap-1">
                                    {d.drivers.map(dr => (
                                      <Badge key={dr} variant="outline" className="text-[10px] text-muted-foreground">{dr}</Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </IntelCard>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Scenarios */}
                  {data.scenarios.length > 0 && (
                    <div className="space-y-2">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{t("scenariosTitle")}</p>
                        <p className="text-[11px] text-muted-foreground/60">{t("scenariosHint")}</p>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-3">
                        {data.scenarios.map((s, i) => (
                          <FloatCard key={s.label} index={i} danger={s.probability_band === "adverse"}>
                          <div
                            className={cn("rounded-xl border p-4 space-y-3", bandBorder(s.probability_band))}>
                            <div className="flex items-start justify-between gap-2">
                              <p className={cn("text-sm font-bold leading-snug", bandText(s.probability_band))}>{s.label}</p>
                              <Badge variant="outline" className="shrink-0 text-[10px]">{s.horizon}</Badge>
                            </div>
                            <div className="space-y-1.5 text-xs">
                              <div className="flex gap-2">
                                <Building2 className="h-3.5 w-3.5 text-purple-400 shrink-0 mt-0.5" />
                                <span className="text-muted-foreground">{s.politics}</span>
                              </div>
                              <div className="flex gap-2">
                                <Briefcase className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
                                <span className="text-muted-foreground">{s.economy}</span>
                              </div>
                            </div>
                            {s.watchpoints.length > 0 && (
                              <div>
                                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                                  {t("watchpoints")}
                                </p>
                                <div className="flex flex-wrap gap-1">
                                  {s.watchpoints.slice(0, 3).map(w => (
                                    <Badge key={w} variant="outline" className="text-[10px]">{w}</Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                          </FloatCard>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── POLITICS ── */}
              {activeTab === "politics" && (
                <ChallengeDomainView
                  domain="politics"
                  title={t("politicsNow")}
                  items={pol}
                  risk={polRisk}
                  bn={bn}
                  t={t}
                  radarStroke="#a855f7"
                />
              )}

              {/* ── ECONOMY ── */}
              {activeTab === "economy" && (
                <ChallengeDomainView
                  domain="economy"
                  title={t("economyNow")}
                  items={eco}
                  risk={ecoRisk}
                  bn={bn}
                  t={t}
                  radarStroke="#f59e0b"
                />
              )}

              {/* ── SOURCES ── */}
              {activeTab === "sources" && (
                <div className="space-y-4">
                  {analystSources.length > 0 && (
                    <div className="space-y-2">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                          <Sparkles className="h-3.5 w-3.5 text-purple-400" />{t("analystSources")}
                        </p>
                        <p className="text-[11px] text-muted-foreground/60">{t("analystHint")}</p>
                      </div>
                      <div className="space-y-1.5">
                        {analystSources.map((s, i) => (
                          <a key={i} href={s.url} target="_blank" rel="noopener noreferrer"
                            className="group flex items-start gap-3 rounded-xl border border-border/30 bg-secondary/10 p-3 transition-all hover:border-purple-500/30 hover:bg-purple-500/5">
                            <Globe className="h-4 w-4 text-muted-foreground/50 shrink-0 mt-0.5 group-hover:text-purple-400 transition-colors" />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium leading-snug line-clamp-2 group-hover:text-purple-300 transition-colors">{s.title}</p>
                              <div className="mt-1 flex gap-2 text-[10px] text-muted-foreground/60">
                                <span>{s.source}</span>
                                {s.published_at && <span>{new Date(s.published_at).toLocaleDateString()}</span>}
                                <Badge variant="outline" className="text-[9px] py-0">{s.domain}</Badge>
                              </div>
                            </div>
                            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0 group-hover:text-purple-400 transition-colors" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                      <BookOpen className="h-3.5 w-3.5" />{t("allSources")} ({allSources.length})
                    </p>
                    <div className="divide-y divide-border/20 rounded-xl border border-border/30 overflow-hidden">
                      {allSources.map((s, i) => (
                        <a key={i} href={s.url} target="_blank" rel="noopener noreferrer"
                          className="group flex items-center gap-3 bg-secondary/10 px-4 py-2.5 transition-all hover:bg-primary/5">
                          <Globe className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0 group-hover:text-primary transition-colors" />
                          <span className="flex-1 truncate text-xs text-foreground/75 group-hover:text-foreground transition-colors">{s.title}</span>
                          <span className="text-[10px] text-muted-foreground/50 shrink-0">{s.source}</span>
                          <ExternalLink className="h-3 w-3 text-muted-foreground/25 shrink-0 group-hover:text-primary transition-colors" />
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </ModuleShell>
  );
}
