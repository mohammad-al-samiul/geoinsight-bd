"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import {
  Bar, BarChart, CartesianGrid, Cell, LabelList, Legend, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  AlertTriangle, BadgeCheck, CheckCircle2, ChevronDown, Clock3, Database, Download,
  ExternalLink, Eye, EyeOff, Loader2, Mic2, Radio, RefreshCw, Search,
  Send, Shield, ShieldAlert, ShieldOff, Square, SquareCheck, Trash2, Users, X, Zap,
} from "lucide-react";
import { ModuleShell, StatCard } from "@/components/modules/module-shell";
import { IntelCard } from "@/components/ui/intel-card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { chartTooltipProps } from "@/lib/chart-tooltip";
import { chartLayout, piePercentLabel, truncateLabel } from "@/lib/chart-theme";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import {
  CATEGORY_LABELS_BN, CATEGORY_LABELS_EN, FACT_CHECK_LABELS_BN, FACT_CHECK_LABELS_EN,
  PARTY_LABELS_BN, PARTY_LABELS_EN, PARTY_ORDER, THREAT_LEVEL_ORDER,
  buildGoogleVerifyUrl, downloadNarrativeShieldCsv, normalizeParty,
  useNarrativeActions, useNarrativeShield,
  type NarrativeCategory, type NarrativeFactCheckStatus, type NarrativeParty,
  type NarrativeSignal, type NarrativeSignalStatus, type NarrativeThreatLevel,
} from "@/hooks/use-narrative-shield";

// ── Colour maps ───────────────────────────────────────────────────────────────
const THREAT_COLORS: Record<NarrativeThreatLevel, string> = {
  CRITICAL: "#ef4444", HIGH: "#f97316", MEDIUM: "#eab308", LOW: "#64748b",
};
const THREAT_BG: Record<NarrativeThreatLevel, string> = {
  CRITICAL: "bg-red-500/20 text-red-300 border-red-500/40",
  HIGH: "bg-orange-500/20 text-orange-300 border-orange-500/40",
  MEDIUM: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  LOW: "bg-slate-500/20 text-slate-300 border-slate-500/40",
};
const STATUS_BG: Record<NarrativeSignalStatus, string> = {
  ACTIVE: "bg-red-500/15 text-red-300 border-red-400/30",
  DEBUNKED: "bg-emerald-500/15 text-emerald-300 border-emerald-400/30",
  ESCALATED: "bg-violet-500/15 text-violet-300 border-violet-400/30",
  DISMISSED: "bg-slate-500/15 text-slate-400 border-slate-400/30",
};
const THREAT_ACCENT: Record<NarrativeThreatLevel, "danger"|"warning"|"default"> = {
  CRITICAL: "danger", HIGH: "warning", MEDIUM: "warning", LOW: "default",
};
const CAT_BG: Record<NarrativeCategory, string> = {
  ANTI_GOVT_INCITEMENT: "bg-red-500/15 text-red-300",
  SOVEREIGNTY_THREAT: "bg-sky-500/15 text-sky-300",
  ECONOMIC_DISINFO: "bg-amber-500/15 text-amber-300",
  SOCIAL_UNREST: "bg-orange-500/15 text-orange-300",
  RELIGIOUS_EXTREMISM: "bg-rose-500/15 text-rose-300",
  ELECTORAL_MANIPULATION: "bg-teal-500/15 text-teal-300",
};
const CAT_COLORS: Record<NarrativeCategory, string> = {
  ANTI_GOVT_INCITEMENT: "#ef4444", SOVEREIGNTY_THREAT: "#38bdf8",
  ECONOMIC_DISINFO: "#eab308", SOCIAL_UNREST: "#f97316",
  RELIGIOUS_EXTREMISM: "#f43f5e", ELECTORAL_MANIPULATION: "#2dd4bf",
};
const PARTY_COLORS: Record<NarrativeParty, string> = {
  BNP: "#f59e0b", JAMAAT: "#22c55e", NCP: "#38bdf8", OTHER: "#94a3b8",
};
const PARTY_BG: Record<NarrativeParty, string> = {
  BNP: "bg-amber-500/15 text-amber-300 border-amber-500/35",
  JAMAAT: "bg-emerald-500/15 text-emerald-300 border-emerald-500/35",
  NCP: "bg-sky-500/15 text-sky-300 border-sky-500/35",
  OTHER: "bg-slate-500/15 text-slate-300 border-slate-500/35",
};
const FACT_BG: Record<NarrativeFactCheckStatus, string> = {
  AUTHENTIC: "bg-emerald-500/20 text-emerald-200 border-emerald-400/40",
  NEEDS_REVIEW: "bg-amber-500/20 text-amber-200 border-amber-400/40",
  LIKELY_DISINFO: "bg-red-500/20 text-red-200 border-red-400/45",
  UNVERIFIED: "bg-slate-500/20 text-slate-200 border-slate-400/35",
};

function formatSaidAt(iso: string | null, locale: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(locale === "bn" ? "bn-BD" : undefined, {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ── Filter chip ───────────────────────────────────────────────────────────────
function Chip({ active, onClick, children, className }: {
  active: boolean; onClick: () => void;
  children: React.ReactNode; className?: string;
}) {
  return (
    <motion.button type="button" onClick={onClick}
      whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold tracking-wide transition-colors",
        active
          ? "border-primary/60 bg-primary/15 text-primary shadow-[0_0_20px_-8px] shadow-primary/50"
          : "border-border/50 bg-secondary/30 text-muted-foreground hover:border-border hover:text-foreground",
        className,
      )}
    >{children}</motion.button>
  );
}

function ThreatGauge({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-secondary/40">
      <motion.div
        className="h-full rounded-full"
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        style={{ backgroundColor: color }}
      />
    </div>
  );
}

function LiveScanBanner({ bn, active }: { bn: boolean; active: boolean }) {
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0, y: -8, height: 0 }}
          animate={{ opacity: 1, y: 0, height: "auto" }}
          exit={{ opacity: 0, y: -8, height: 0 }}
          className="relative overflow-hidden rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3"
        >
          <motion.div
            className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-amber-400/15 to-transparent"
            initial={{ x: "-100%" }}
            animate={{ x: "100%" }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
          />
          <div className="relative z-10 flex items-center gap-3">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-70" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-400" />
            </span>
            <p className="text-sm font-semibold text-amber-200">
              {bn ? "লাইভ স্ক্যান চলছে" : "Live scan in progress"}
            </p>
            <Loader2 className="ml-auto h-4 w-4 animate-spin text-amber-300" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ShieldCharts({ signals, bn }: { signals: NarrativeSignal[]; bn: boolean }) {
  const bp = useBreakpoint();
  const layout = chartLayout(bp);

  const catData = useMemo(() => {
    const counts: Partial<Record<NarrativeCategory, number>> = {};
    for (const s of signals) counts[s.category] = (counts[s.category] ?? 0) + 1;
    return Object.entries(counts)
      .map(([cat, count]) => ({
        name: bn
          ? CATEGORY_LABELS_BN[cat as NarrativeCategory]
          : CATEGORY_LABELS_EN[cat as NarrativeCategory],
        count,
        color: CAT_COLORS[cat as NarrativeCategory],
      }))
      .sort((a, b) => (b.count ?? 0) - (a.count ?? 0));
  }, [signals, bn]);

  const threatData = useMemo(() => {
    const counts: Partial<Record<NarrativeThreatLevel, number>> = {};
    for (const s of signals) {
      if (s.status === "ACTIVE") counts[s.threatLevel] = (counts[s.threatLevel] ?? 0) + 1;
    }
    return THREAT_LEVEL_ORDER
      .filter((lvl) => (counts[lvl] ?? 0) > 0)
      .map((lvl) => ({ name: lvl, value: counts[lvl] ?? 0, color: THREAT_COLORS[lvl] }));
  }, [signals]);

  const partyData = useMemo(() => {
    const counts: Record<NarrativeParty, number> = { BNP: 0, JAMAAT: 0, NCP: 0, OTHER: 0 };
    for (const s of signals) counts[normalizeParty(s.organization)] += 1;
    return PARTY_ORDER
      .filter((p) => counts[p] > 0)
      .map((p) => ({
        name: bn ? PARTY_LABELS_BN[p] : PARTY_LABELS_EN[p],
        count: counts[p],
        color: PARTY_COLORS[p],
      }));
  }, [signals, bn]);

  if (signals.length === 0) return null;

  return (
    <div className="grid min-w-0 gap-4 md:grid-cols-3">
      <motion.div
        className="shield-float-slow min-w-0"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.55 }}
        whileHover={{ scale: 1.02 }}
      >
        <IntelCard accent="danger" padding="sm" index={0} float={false} shimmer={false} className="h-full min-w-0 !overflow-visible">
          <p className="mb-3 text-sm font-bold uppercase tracking-widest text-muted-foreground">
            {bn ? "ঝুঁকির মাত্রা বিতরণ" : "Threat Level Distribution"}
          </p>
          <div className="w-full overflow-visible" style={{ height: layout.pieChartHeight }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={layout.pieMargin}>
                <Pie
                  data={threatData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="45%"
                  innerRadius={layout.pieInner}
                  outerRadius={layout.pieOuter}
                  paddingAngle={4}
                  label={(props) =>
                    piePercentLabel({
                      ...props,
                      showName: false,
                      fontSize: layout.pieFontSize,
                      offset: layout.pieLabelOffset,
                    })
                  }
                  labelLine={{ stroke: "#94a3b8", strokeWidth: 1.25 }}
                  isAnimationActive
                  animationDuration={1200}
                  animationBegin={200}
                >
                  {threatData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} opacity={0.9} />
                  ))}
                </Pie>
                <Tooltip
                  {...chartTooltipProps}
                  formatter={(v: number, n) => {
                    const total = threatData.reduce((s, d) => s + d.value, 0) || 1;
                    const pct = Math.round((v / total) * 100);
                    return [`${v} (${pct}%)`, n];
                  }}
                />
                <Legend
                  iconType="circle"
                  iconSize={layout.narrow ? 9 : 12}
                  verticalAlign="bottom"
                  wrapperStyle={{ ...layout.legend, width: "100%", paddingTop: 4 }}
                  formatter={(v) => (
                    <span className="text-xs font-semibold text-foreground/90 sm:text-sm">{v}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </IntelCard>
      </motion.div>

      <motion.div
        className="shield-float-slow shield-float-delay-1 shield-shimmer-wrap md:col-span-2"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.55 }}
        whileHover={{ scale: 1.015 }}
      >
        <IntelCard padding="sm" index={1} className="h-full">
          <p className="mb-3 text-sm font-bold uppercase tracking-widest text-muted-foreground">
            {bn ? "ক্যাটাগরি অনুযায়ী সংকেত" : "Signals by Category"}
          </p>
          <ResponsiveContainer width="100%" height={layout.chartHeightMd}>
            <BarChart
              data={catData.map((d) => ({
                ...d,
                name: truncateLabel(String(d.name ?? ""), layout.narrow ? 12 : 22),
              }))}
              layout="vertical"
              margin={{ top: 4, right: layout.narrow ? 28 : 48, left: 4, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" horizontal={false} />
              <XAxis type="number" allowDecimals={false} tick={layout.tick} />
              <YAxis type="category" dataKey="name" width={layout.yAxisCategoryWidth} tick={layout.tick} />
              <Tooltip {...chartTooltipProps} />
              <Bar dataKey="count" radius={[0, 6, 6, 0]} maxBarSize={layout.barMaxSize}
                isAnimationActive animationDuration={1100} animationBegin={280}>
                {catData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} fillOpacity={0.82} />
                ))}
                <LabelList dataKey="count" position="right" style={layout.labelList} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </IntelCard>
      </motion.div>

      <motion.div
        className="shield-float-slow shield-float-delay-2 shield-shimmer-wrap md:col-span-3"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.55 }}
        whileHover={{ scale: 1.01 }}
      >
        <IntelCard padding="sm" accent="info" index={2}>
          <p className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-muted-foreground">
            <Users className="h-4 w-4 text-sky-400" />
            {bn ? "দল অনুযায়ী সংকেত" : "Signals by Party"}
          </p>
          <ResponsiveContainer width="100%" height={layout.chartHeightSm}>
            <BarChart data={partyData} margin={{ top: 20, right: 12, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" vertical={false} />
              <XAxis dataKey="name" tick={layout.tick} />
              <YAxis allowDecimals={false} tick={layout.tick} width={layout.yAxisNumberWidth} />
              <Tooltip {...chartTooltipProps} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={layout.narrow ? 40 : 64}
                isAnimationActive animationDuration={1000} animationBegin={360}>
                {partyData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} fillOpacity={0.85} />
                ))}
                <LabelList dataKey="count" position="top" style={layout.labelList} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </IntelCard>
      </motion.div>
    </div>
  );
}

function ThreatSummaryRow({ signals }: { signals: NarrativeSignal[] }) {
  const counts = useMemo(() => {
    const c: Partial<Record<NarrativeThreatLevel, number>> = {};
    for (const s of signals.filter((x) => x.status === "ACTIVE")) {
      c[s.threatLevel] = (c[s.threatLevel] ?? 0) + 1;
    }
    return c;
  }, [signals]);
  const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {THREAT_LEVEL_ORDER.map((lvl, i) => (
        <motion.div
          key={lvl}
          initial={{ opacity: 0, y: 24, scale: 0.92 }}
          animate={{
            opacity: 1,
            scale: 1,
            y: [0, -6, 0],
          }}
          transition={{
            opacity: { delay: 0.08 + i * 0.1, duration: 0.55 },
            scale: { delay: 0.08 + i * 0.1, duration: 0.55 },
            y: {
              delay: 0.6 + i * 0.12,
              duration: 3.2 + i * 0.4,
              repeat: Infinity,
              ease: "easeInOut",
            },
          }}
          whileHover={{ scale: 1.05, y: -8, transition: { duration: 0.2 } }}
          className={cn(
            "shield-shimmer-wrap relative space-y-2 rounded-xl border border-border/40 bg-secondary/25 p-4",
            lvl === "CRITICAL" && "shield-glow-danger border-red-500/35",
            lvl === "HIGH" && "border-orange-500/30",
          )}
        >
          <div
            className="pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full opacity-40 blur-2xl"
            style={{ backgroundColor: THREAT_COLORS[lvl] }}
          />
          <div className="relative flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider"
              style={{ color: THREAT_COLORS[lvl] }}>{lvl}</span>
            <motion.span
              key={counts[lvl] ?? 0}
              initial={{ scale: 0.5, opacity: 0, rotate: -8 }}
              animate={{ scale: [1, 1.12, 1], opacity: 1, rotate: 0 }}
              transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
              className="text-2xl font-bold tabular-nums"
              style={{ color: THREAT_COLORS[lvl] }}
            >
              {counts[lvl] ?? 0}
            </motion.span>
          </div>
          <ThreatGauge value={counts[lvl] ?? 0} max={total} color={THREAT_COLORS[lvl]} />
          <p className="relative text-[10px] text-muted-foreground/60">
            {total > 1 ? `${Math.round(((counts[lvl] ?? 0) / total) * 100)}% of active` : "—"}
          </p>
        </motion.div>
      ))}
    </div>
  );
}

function SignalCard({
  signal, selected, onSelect, onDebunk, onEscalate, onDismiss, pending, bn, locale, t, index,
}: {
  signal: NarrativeSignal; selected: boolean; index: number;
  onSelect: (id: string) => void; onDebunk: (id: string) => void;
  onEscalate: (id: string) => void; onDismiss: (id: string) => void;
  pending: Record<string, boolean>; bn: boolean; locale: string;
  t: ReturnType<typeof useTranslations>;
}) {
  const [expanded, setExpanded] = useState(false);
  const isLoading = pending[signal.id] ?? false;
  const isDone = signal.status !== "ACTIVE";
  const catLabel = bn ? CATEGORY_LABELS_BN[signal.category] : CATEGORY_LABELS_EN[signal.category];
  const party = normalizeParty(signal.organization);
  const partyLabel = bn ? PARTY_LABELS_BN[party] : PARTY_LABELS_EN[party];
  const factStatus = (signal.factCheckStatus ?? "UNVERIFIED") as NarrativeFactCheckStatus;
  const factLabel = bn ? FACT_CHECK_LABELS_BN[factStatus] : FACT_CHECK_LABELS_EN[factStatus];
  const authPct = Math.round(Number(signal.authenticityScore ?? 0) * 100);
  const googleUrl =
    signal.googleVerifyUrl ||
    buildGoogleVerifyUrl(signal.title, signal.speakerName, signal.titleBn);
  const confidence = Math.round(Number(signal.confidenceScore) * 100);
  const title = bn && signal.titleBn ? signal.titleBn : signal.title;

  return (
    <motion.div
      initial={{ opacity: 0, y: 32, scale: 0.96 }}
      animate={{
        opacity: 1,
        y: [0, -5, 0],
        scale: 1,
      }}
      transition={{
        opacity: { delay: Math.min(index * 0.09, 0.8), duration: 0.5 },
        scale: { delay: Math.min(index * 0.09, 0.8), duration: 0.5 },
        y: {
          delay: Math.min(index * 0.09, 0.8) + 0.5,
          duration: 3.4 + (index % 3) * 0.35,
          repeat: Infinity,
          ease: "easeInOut",
        },
      }}
      whileHover={{ y: -8, scale: 1.015, transition: { duration: 0.22 } }}
      className={cn(
        "shield-shimmer-wrap",
        signal.threatLevel === "CRITICAL" && !isDone && "shield-glow-danger",
      )}
    >
    <IntelCard
      accent={THREAT_ACCENT[signal.threatLevel]}
      hoverLift={false}
      padding="sm"
      index={index}
      float={false}
      shimmer={false}
      className={cn(
        "relative overflow-hidden",
        selected && "ring-2 ring-primary/50 bg-primary/5 shadow-[0_0_32px_-12px] shadow-primary/40",
        isDone && "opacity-55",
        signal.threatLevel === "CRITICAL" && !isDone && "border-red-500/40",
        factStatus === "LIKELY_DISINFO" && "ring-1 ring-red-500/30",
      )}
    >
      <div className="flex items-start gap-3">
        <button type="button" onClick={() => onSelect(signal.id)}
          className="mt-0.5 shrink-0 text-muted-foreground transition-colors hover:text-primary"
          aria-label="Select">
          {selected
            ? <SquareCheck className="h-4 w-4 text-primary" />
            : <Square className="h-4 w-4" />}
        </button>

        <div className="min-w-0 flex-1 space-y-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={cn("inline-flex rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider", THREAT_BG[signal.threatLevel])}>
              {signal.threatLevel}
            </span>
            <span className={cn("inline-flex rounded border px-1.5 py-0.5 text-[10px] font-semibold", STATUS_BG[signal.status])}>
              {signal.status}
            </span>
            <span className={cn("rounded border px-1.5 py-0.5 text-[10px] font-bold", PARTY_BG[party])}>
              {partyLabel}
            </span>
            <span className={cn("inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-bold", FACT_BG[factStatus])}>
              {factStatus === "AUTHENTIC" ? <BadgeCheck className="h-3 w-3" /> : <ShieldAlert className="h-3 w-3" />}
              {factLabel}
              <span className="font-mono opacity-80">{authPct}%</span>
            </span>
            <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-medium", CAT_BG[signal.category])}>
              {catLabel}
            </span>
            <span className="ml-auto flex items-center gap-1 text-[10px] text-muted-foreground">
              <span className="font-mono">{confidence}%</span>
              <div className="h-1.5 w-12 overflow-hidden rounded-full bg-secondary/60">
                <motion.div
                  className="h-full rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${confidence}%` }}
                  transition={{ duration: 0.8, delay: 0.1 }}
                  style={{ backgroundColor: THREAT_COLORS[signal.threatLevel] }}
                />
              </div>
            </span>
          </div>

          <p className="text-sm font-semibold leading-snug text-foreground/95">{title}</p>

          {/* Speaker + time — primary intel row */}
          <div className="grid gap-2 rounded-lg border border-border/35 bg-secondary/15 p-2.5 sm:grid-cols-2">
            <div className="flex items-start gap-2">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/10">
                <Mic2 className="h-3.5 w-3.5 text-primary" />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {t("speaker")}
                </p>
                <p className="truncate text-sm font-semibold text-foreground/90">
                  {signal.speakerName || (bn ? "অজ্ঞাত বক্তা" : "Unknown speaker")}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {partyLabel}
                  {signal.district ? ` · ${signal.district}` : ""}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-amber-500/25 bg-amber-500/10">
                <Clock3 className="h-3.5 w-3.5 text-amber-300" />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {t("speakerSaidAt")}
                </p>
                <p className="text-sm font-semibold tabular-nums text-foreground/90">
                  {formatSaidAt(signal.publishedAt, locale)}
                </p>
                <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Radio className="h-3 w-3 text-emerald-400" />
                  Google News
                </p>
              </div>
            </div>
          </div>

          {signal.factCheckSummary && (
            <p className="rounded-lg border border-border/30 bg-secondary/10 px-2.5 py-2 text-[11px] leading-relaxed text-muted-foreground">
              <span className="font-semibold text-foreground/80">{t("factCheck")}: </span>
              {signal.factCheckSummary}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <a
              href={googleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-sky-500/35 bg-sky-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-sky-300 transition hover:bg-sky-500/20"
            >
              <Search className="h-3.5 w-3.5" />
              {t("googleVerify")}
            </a>
            {signal.sourceUrl && (
              <a
                href={signal.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-border/40 bg-secondary/20 px-2.5 py-1.5 text-[11px] font-semibold text-muted-foreground transition hover:text-foreground"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                {t("actionEvidence")}
              </a>
            )}
          </div>

          {signal.status === "DEBUNKED" && signal.ragDebunk && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="space-y-1 rounded-lg border border-emerald-500/25 bg-emerald-500/5 p-2.5"
            >
              <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                <CheckCircle2 className="h-3 w-3" />
                {t("ragDebunkTitle")}
                {signal.ragConfidence && (
                  <span className="ml-auto font-normal normal-case text-emerald-400/70">
                    {t("ragConfidence")}: {Math.round(Number(signal.ragConfidence) * 100)}%
                  </span>
                )}
              </div>
              <p className="text-xs leading-relaxed text-emerald-200">{signal.ragDebunk}</p>
            </motion.div>
          )}

          {signal.body && (
            <div>
              <button type="button" onClick={() => setExpanded((v) => !v)}
                className="flex items-center gap-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground">
                <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-180")} />
                {expanded ? (bn ? "বিস্তারিত লুকান" : "Hide body") : (bn ? "বিস্তারিত দেখুন" : "Show body")}
              </button>
              <AnimatePresence>
                {expanded && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-1.5 overflow-hidden rounded-lg border border-border/30 bg-secondary/20 p-2.5 text-xs leading-relaxed text-muted-foreground"
                  >
                    {signal.body}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {!isDone && (
          <div className="flex shrink-0 flex-col gap-1.5">
            <motion.button type="button" whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }}
              onClick={() => onDebunk(signal.id)} disabled={isLoading}
              title={t("actionDebunk")}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 transition-colors hover:bg-emerald-500/25 disabled:opacity-40">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
            </motion.button>
            <motion.button type="button" whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }}
              onClick={() => onEscalate(signal.id)} disabled={isLoading}
              title={t("actionEscalate")}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-violet-500/30 bg-violet-500/10 text-violet-400 transition-colors hover:bg-violet-500/25 disabled:opacity-40">
              <Send className="h-4 w-4" />
            </motion.button>
            {signal.sourceUrl && (
              <motion.a href={signal.sourceUrl} target="_blank" rel="noopener noreferrer"
                whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }}
                title={t("actionEvidence")}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-sky-500/30 bg-sky-500/10 text-sky-400 transition-colors hover:bg-sky-500/25">
                <ExternalLink className="h-4 w-4" />
              </motion.a>
            )}
            <motion.button type="button" whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }}
              onClick={() => onDismiss(signal.id)} disabled={isLoading}
              title={t("actionDismiss")}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/40 text-muted-foreground transition-colors hover:border-red-500/30 hover:text-red-400 disabled:opacity-40">
              <X className="h-4 w-4" />
            </motion.button>
          </div>
        )}
      </div>
    </IntelCard>
    </motion.div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────
export function NarrativeShieldPanel() {
  const t = useTranslations("modules.narrativeShield");
  const locale = useLocale();
  const bn = locale === "bn";

  const [threatFilter, setThreatFilter] = useState<NarrativeThreatLevel | undefined>(undefined);
  const [catFilter, setCatFilter] = useState<NarrativeCategory | undefined>(undefined);
  const [partyFilter, setPartyFilter] = useState<NarrativeParty | undefined>(undefined);
  const [search, setSearch] = useState("");
  const [showDebunked, setShowDebunked] = useState(false);
  const [showCharts, setShowCharts] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [actionMsg, setActionMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [csvLoading, setCsvLoading] = useState(false);

  const query = useMemo(() => ({
    threatLevel: threatFilter,
    category: catFilter,
    organization: partyFilter,
    search: search.length >= 2 ? search : undefined,
    limit: 100,
  }), [threatFilter, catFilter, partyFilter, search]);

  const { data, loading, refreshing, error, reload } = useNarrativeShield(query);
  const actions = useNarrativeActions();
  const ingesting = !!actions.pending["refresh"];

  useEffect(() => {
    if (!loading && !error && data && data.total === 0) {
      void actions.refresh(20).then(() => reload()).catch(() => null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, error, data?.total]);

  const signals = useMemo(() => {
    const all = data?.signals ?? [];
    if (showDebunked) return all;
    return all.filter((s) => s.status !== "DEBUNKED" && s.status !== "DISMISSED");
  }, [data?.signals, showDebunked]);

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => setSelected(new Set(signals.map((s) => s.id))), [signals]);
  const deselectAll = useCallback(() => setSelected(new Set()), []);
  const isAllSelected = signals.length > 0 && selected.size === signals.length;

  const act = useCallback(async (fn: () => Promise<unknown>, ok: string, fail?: string) => {
    try {
      await fn();
      setActionMsg({ text: ok, ok: true });
      setSelected(new Set());
      await reload();
    } catch {
      setActionMsg({ text: fail ?? (bn ? "অ্যাকশন ব্যর্থ" : "Action failed"), ok: false });
    } finally {
      setTimeout(() => setActionMsg(null), 2800);
    }
  }, [reload, bn]);

  const handleDebunk = (id: string) => act(() => actions.debunk(id, bn ? "bn" : "en"),
    bn ? "✓ খণ্ডন প্রকাশিত" : "✓ Rebuttal published");
  const handleEscalate = (id: string) => act(() => actions.escalate(id),
    bn ? "✓ PMO-তে পাঠানো হয়েছে" : "✓ Escalated to PMO");
  const handleDismiss = (id: string) => act(() => actions.dismiss(id),
    bn ? "✓ বাতিল হয়েছে" : "✓ Dismissed");
  const handleBulk = (action: "DEBUNK"|"ESCALATE"|"DISMISS") => act(
    () => actions.bulk(Array.from(selected), action, bn ? "bn" : "en"),
    bn ? `✓ ${selected.size}টি সম্পন্ন` : `✓ ${selected.size} processed`);
  const handleFetch = () => act(async () => {
    const res = await actions.refresh(20);
    const payload = res?.data ?? {};
    if (payload.error) throw new Error(String(payload.error));
    if (typeof payload.ingested === "number" && payload.ingested === 0) {
      throw new Error(bn ? "কোনো নতুন সিগন্যাল পাওয়া যায়নি" : "No new signals ingested");
    }
  }, bn ? "✓ Google ফিড আনা হয়েছে" : "✓ Google feed ingested",
    bn ? "রিয়েলটাইম ফিড আনা যায়নি" : "Live feed fetch failed");
  const handleDedup = () => act(() => actions.dedup(),
    bn ? "✓ ডুপ্লিকেট মুছে ফেলা হয়েছে" : "✓ Duplicates removed");
  const handleCsv = async () => {
    setCsvLoading(true);
    try { await downloadNarrativeShieldCsv(); } finally { setCsvLoading(false); }
  };

  const stats = data?.stats;
  const busy = ingesting || refreshing;
  const showBootLoader =
    (loading && !data) || (ingesting && signals.length === 0);

  return (
    <ModuleShell
      title={t("title")}
      description={t("description")}
      loading={showBootLoader}
      loadingLabel={ingesting ? t("fetching") : t("loadingSignals")}
      error={error}
      onRetry={reload}
      stats={stats && !showBootLoader ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: t("totalActive"), value: stats.total_active, accent: "danger" as const, delay: 0 },
            { label: t("criticalCount"), value: stats.critical_count, accent: "danger" as const, delay: 0.08 },
            { label: t("highCount"), value: stats.high_count, accent: "warning" as const, delay: 0.16 },
            { label: t("debunkedToday"), value: stats.debunked_today, accent: "success" as const, delay: 0.24 },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              className={cn(
                "shield-shimmer-wrap",
                s.accent === "danger" && "shield-glow",
              )}
              initial={{ opacity: 0, y: 22, scale: 0.94 }}
              animate={{
                opacity: 1,
                scale: 1,
                y: [0, -5, 0],
              }}
              transition={{
                opacity: { delay: s.delay, duration: 0.5 },
                scale: { delay: s.delay, duration: 0.5 },
                y: {
                  delay: s.delay + 0.45,
                  duration: 3.4 + i * 0.35,
                  repeat: Infinity,
                  ease: "easeInOut",
                },
              }}
              whileHover={{ scale: 1.05, y: -8, transition: { duration: 0.2 } }}
            >
              <StatCard label={s.label} value={s.value} accent={s.accent} />
            </motion.div>
          ))}
        </div>
      ) : null}
    >
      {/* Source badge + live pulse */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-center gap-2"
      >
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-300">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          {t("sourceGoogleOnly")}
        </span>
        {busy && (
          <span className="inline-flex items-center gap-1.5 text-[11px] text-amber-300/90">
            <Loader2 className="h-3 w-3 animate-spin" />
            {t("loadingSignals")}
          </span>
        )}
      </motion.div>

      <LiveScanBanner bn={bn} active={ingesting} />

      {signals.length > 0 && <ThreatSummaryRow signals={signals} />}

      {signals.length > 0 && (
        <div className="space-y-2">
          <button type="button" onClick={() => setShowCharts((v) => !v)}
            className="flex items-center gap-1.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground">
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", showCharts && "rotate-180")} />
            {showCharts ? (bn ? "চার্ট লুকান" : "Hide charts") : (bn ? "চার্ট দেখুন" : "Show charts")}
          </button>
          <AnimatePresence>
            {showCharts && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
              >
                <ShieldCharts signals={signals} bn={bn} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      <div className="space-y-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1 overflow-hidden rounded-lg">
            <input type="search" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="relative z-10 h-9 w-full rounded-lg border border-border/60 bg-secondary/30 px-3 text-sm outline-none transition-all placeholder:text-muted-foreground focus:border-primary/50 focus:ring-1 focus:ring-primary/20" />
            {busy && (
              <motion.div
                className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-r from-transparent via-primary/15 to-transparent"
                initial={{ x: "-100%" }}
                animate={{ x: "100%" }}
                transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
              />
            )}
          </div>
          <Button size="sm" variant="outline" onClick={handleFetch}
            disabled={ingesting} className="h-9 gap-1.5 text-xs">
            {ingesting
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <Zap className="h-3.5 w-3.5 text-amber-400" />}
            {ingesting ? t("fetching") : t("fetchNow")}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setShowDebunked((v) => !v)}
            className="h-9 gap-1.5 text-xs text-muted-foreground">
            {showDebunked ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {showDebunked ? t("hideDebunked") : t("showDebunked")}
          </Button>
          <Button size="sm" variant="ghost" onClick={handleDedup}
            className="h-9 gap-1.5 text-xs text-muted-foreground">
            <Database className="h-3.5 w-3.5" />
            {t("dedup")}
          </Button>
          <Button size="sm" variant="ghost" onClick={handleCsv} disabled={csvLoading}
            className="h-9 gap-1.5 text-xs text-muted-foreground">
            {csvLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            {t("exportCsv")}
          </Button>
          <Button size="sm" variant="ghost" onClick={reload}
            className="h-9 gap-1.5 px-2 text-xs text-muted-foreground">
            <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
          </Button>
        </div>

        {/* Party filters */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            {t("filterParty")}
          </span>
          <Chip active={!partyFilter} onClick={() => setPartyFilter(undefined)}>
            {t("filterAll")}
          </Chip>
          {PARTY_ORDER.map((party) => (
            <Chip key={party} active={partyFilter === party}
              onClick={() => setPartyFilter(partyFilter === party ? undefined : party)}>
              <span className="mr-1 inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: PARTY_COLORS[party] }} />
              {bn ? PARTY_LABELS_BN[party] : PARTY_LABELS_EN[party]}
            </Chip>
          ))}
        </div>

        <div className="flex flex-wrap gap-1.5">
          <Chip active={!threatFilter} onClick={() => setThreatFilter(undefined)}>
            {t("filterAll")}
          </Chip>
          {THREAT_LEVEL_ORDER.map((lvl) => (
            <Chip key={lvl} active={threatFilter === lvl}
              onClick={() => setThreatFilter(threatFilter === lvl ? undefined : lvl)}>
              <span className="mr-1 inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: THREAT_COLORS[lvl] }} />
              {lvl}
            </Chip>
          ))}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(CATEGORY_LABELS_EN) as NarrativeCategory[]).map((cat) => (
            <Chip key={cat} active={catFilter === cat}
              onClick={() => setCatFilter(catFilter === cat ? undefined : cat)}
              className={catFilter !== cat ? CAT_BG[cat] : undefined}>
              {bn ? CATEGORY_LABELS_BN[cat] : CATEGORY_LABELS_EN[cat]}
            </Chip>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {selected.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="flex flex-wrap items-center gap-2 rounded-xl border border-primary/30 bg-primary/8 px-4 py-2.5"
          >
            <span className="text-sm font-semibold text-primary">
              {t("selectedCount", { count: selected.size })}
            </span>
            <div className="ml-auto flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => void handleBulk("DEBUNK")}
                className="gap-1.5 border-emerald-500/40 text-xs text-emerald-400 hover:bg-emerald-500/10">
                <Shield className="h-3.5 w-3.5" />{t("bulkDebunk")}
              </Button>
              <Button size="sm" variant="outline" onClick={() => void handleBulk("ESCALATE")}
                className="gap-1.5 border-violet-500/40 text-xs text-violet-400 hover:bg-violet-500/10">
                <Send className="h-3.5 w-3.5" />{t("bulkEscalate")}
              </Button>
              <Button size="sm" variant="outline" onClick={() => void handleBulk("DISMISS")}
                className="gap-1.5 border-red-500/40 text-xs text-red-400 hover:bg-red-500/10">
                <Trash2 className="h-3.5 w-3.5" />{t("bulkDismiss")}
              </Button>
              <Button size="sm" variant="ghost" onClick={deselectAll} className="px-2 text-xs text-muted-foreground">
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {actionMsg && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={cn(
              "flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium",
              actionMsg.ok
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                : "border-red-500/30 bg-red-500/10 text-red-300",
            )}
          >
            {actionMsg.ok
              ? <CheckCircle2 className="h-4 w-4 shrink-0" />
              : <AlertTriangle className="h-4 w-4 shrink-0" />}
            {actionMsg.text}
          </motion.div>
        )}
      </AnimatePresence>

      {signals.length > 0 && (
        <div className="flex items-center gap-3 border-b border-border/30 pb-2 text-xs text-muted-foreground">
          <button type="button" onClick={isAllSelected ? deselectAll : selectAll}
            className="flex items-center gap-1.5 transition-colors hover:text-foreground">
            {isAllSelected
              ? <SquareCheck className="h-3.5 w-3.5 text-primary" />
              : <Square className="h-3.5 w-3.5" />}
            {isAllSelected ? t("deselectAll") : t("selectAll")}
          </button>
          <span className="ml-auto">{t("totalSignals", { total: data?.total ?? signals.length })}</span>
        </div>
      )}

      {signals.length === 0 && !loading ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4 rounded-2xl border border-border/40 bg-secondary/10 py-16 text-center"
        >
          <motion.div
            animate={{ rotate: [0, 4, -4, 0], scale: [1, 1.04, 1] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
            className="rounded-full border border-border/40 bg-secondary/30 p-4"
          >
            <ShieldOff className="h-10 w-10 text-muted-foreground/40" />
          </motion.div>
          <div className="space-y-1">
            <p className="font-semibold text-foreground/80">
              {search || threatFilter || catFilter || partyFilter ? t("noFilterResults") : t("noSignals")}
            </p>
            <p className="text-sm text-muted-foreground">
              {bn ? "Google News থেকে নতুন ফিড আনতে বাটন চাপুন" : "Click below to ingest Google News signals"}
            </p>
          </div>
          {!search && !threatFilter && !catFilter && !partyFilter && (
            <Button size="sm" variant="outline" onClick={handleFetch} className="gap-1.5 text-xs">
              <Zap className="h-3.5 w-3.5 text-amber-400" />{t("fetchNow")}
            </Button>
          )}
        </motion.div>
      ) : (
        <div className="space-y-2.5">
          {signals.map((signal, i) => (
            <SignalCard
              key={signal.id}
              signal={signal}
              index={i}
              selected={selected.has(signal.id)}
              onSelect={toggleSelect}
              onDebunk={handleDebunk}
              onEscalate={handleEscalate}
              onDismiss={handleDismiss}
              pending={actions.pending}
              bn={bn}
              locale={locale}
              t={t}
            />
          ))}
        </div>
      )}

      {signals.length > 0 && (
        <p className="flex items-center gap-1.5 border-t border-border/20 pt-3 text-[11px] text-muted-foreground/50">
          <AlertTriangle className="h-3 w-3 shrink-0" />
          {t("auditTrailHint")}
        </p>
      )}
    </ModuleShell>
  );
}
