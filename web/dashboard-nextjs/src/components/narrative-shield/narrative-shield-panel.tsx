"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  AlertTriangle, CheckCircle2, ChevronDown, Database, Download,
  ExternalLink, Eye, EyeOff, Loader2, Radio, RefreshCw,
  Send, Shield, ShieldOff, Square, SquareCheck, Trash2, X, Zap,
} from "lucide-react";
import { ModuleShell, StatCard, StatGrid } from "@/components/modules/module-shell";
import { IntelCard } from "@/components/ui/intel-card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { chartTooltipProps } from "@/lib/chart-tooltip";
import {
  CATEGORY_LABELS_BN, CATEGORY_LABELS_EN, THREAT_LEVEL_ORDER,
  downloadNarrativeShieldCsv, useNarrativeActions, useNarrativeShield,
  type NarrativeCategory, type NarrativeSignal,
  type NarrativeSignalStatus, type NarrativeThreatLevel,
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
  SOVEREIGNTY_THREAT: "bg-purple-500/15 text-purple-300",
  ECONOMIC_DISINFO: "bg-amber-500/15 text-amber-300",
  SOCIAL_UNREST: "bg-orange-500/15 text-orange-300",
  RELIGIOUS_EXTREMISM: "bg-rose-500/15 text-rose-300",
  ELECTORAL_MANIPULATION: "bg-sky-500/15 text-sky-300",
};
const CAT_COLORS: Record<NarrativeCategory, string> = {
  ANTI_GOVT_INCITEMENT: "#ef4444", SOVEREIGNTY_THREAT: "#a855f7",
  ECONOMIC_DISINFO: "#eab308", SOCIAL_UNREST: "#f97316",
  RELIGIOUS_EXTREMISM: "#f43f5e", ELECTORAL_MANIPULATION: "#38bdf8",
};

// ── Filter chip ───────────────────────────────────────────────────────────────
function Chip({ active, onClick, children, className }: {
  active: boolean; onClick: () => void;
  children: React.ReactNode; className?: string;
}) {
  return (
    <button type="button" onClick={onClick}
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold tracking-wide transition-all",
        active
          ? "border-primary/60 bg-primary/15 text-primary"
          : "border-border/50 bg-secondary/30 text-muted-foreground hover:border-border hover:text-foreground",
        className,
      )}
    >{children}</button>
  );
}

// ── Threat gauge bar ──────────────────────────────────────────────────────────
function ThreatGauge({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="h-2 w-full rounded-full bg-secondary/40 overflow-hidden">
      <div className="h-full rounded-full transition-all duration-700"
        style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  );
}

// ── Charts section ────────────────────────────────────────────────────────────
function ShieldCharts({ signals, bn }: { signals: NarrativeSignal[]; bn: boolean }) {
  // Category bar chart data
  const catData = useMemo(() => {
    const counts: Partial<Record<NarrativeCategory, number>> = {};
    for (const s of signals) {
      counts[s.category] = (counts[s.category] ?? 0) + 1;
    }
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

  // Threat level donut data
  const threatData = useMemo(() => {
    const counts: Partial<Record<NarrativeThreatLevel, number>> = {};
    for (const s of signals) {
      if (s.status === "ACTIVE") counts[s.threatLevel] = (counts[s.threatLevel] ?? 0) + 1;
    }
    return THREAT_LEVEL_ORDER
      .filter(lvl => (counts[lvl] ?? 0) > 0)
      .map(lvl => ({ name: lvl, value: counts[lvl] ?? 0, color: THREAT_COLORS[lvl] }));
  }, [signals]);

  // Platform bar
  const platformData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of signals) {
      counts[s.sourcePlatform] = (counts[s.sourcePlatform] ?? 0) + 1;
    }
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [signals]);

  if (signals.length === 0) return null;

  return (
    <div className="grid gap-4 md:grid-cols-3">

      {/* Threat level donut */}
      <IntelCard accent="danger" padding="sm">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          {bn ? "ঝুঁকির মাত্রা বিতরণ" : "Threat Level Distribution"}
        </p>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie data={threatData} dataKey="value" cx="50%" cy="50%"
              innerRadius={55} outerRadius={82} paddingAngle={4}
              label={({ name, percent }) => `${name} ${Math.round((percent ?? 0) * 100)}%`}
              labelLine={false}>
              {threatData.map(entry => (
                <Cell key={entry.name} fill={entry.color} opacity={0.9} />
              ))}
            </Pie>
            <Tooltip {...chartTooltipProps}
              formatter={(v, n) => [v, n]} />
            <Legend iconType="circle" iconSize={9}
              formatter={(v) => <span className="text-[11px] text-muted-foreground">{v}</span>} />
          </PieChart>
        </ResponsiveContainer>
      </IntelCard>

      {/* Category bar chart */}
      <IntelCard padding="sm" className="md:col-span-2">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          {bn ? "ক্যাটাগরি অনুযায়ী সংকেত" : "Signals by Category"}
        </p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={catData} layout="vertical"
            margin={{ top: 0, right: 16, left: 4, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" horizontal={false} />
            <XAxis type="number" allowDecimals={false}
              tick={{ fill: "#64748b", fontSize: 11 }} />
            <YAxis type="category" dataKey="name" width={130}
              tick={{ fill: "#94a3b8", fontSize: 11 }} />
            <Tooltip {...chartTooltipProps} />
            <Bar dataKey="count" radius={[0, 5, 5, 0]} maxBarSize={36}>
              {catData.map((entry, i) => (
                <Cell key={i} fill={entry.color} fillOpacity={0.82} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </IntelCard>

      {/* Platform bar */}
      {platformData.length > 1 && (
        <IntelCard padding="sm" className="md:col-span-3">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            {bn ? "প্ল্যাটফর্ম অনুযায়ী সংকেত" : "Signals by Platform"}
          </p>
          <ResponsiveContainer width="100%" height={130}>
            <BarChart data={platformData}
              margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fill: "#64748b", fontSize: 11 }} width={26} />
              <Tooltip {...chartTooltipProps} />
              <Bar dataKey="count" fill="#7c3aed" fillOpacity={0.78} radius={[5, 5, 0, 0]} maxBarSize={52} />
            </BarChart>
          </ResponsiveContainer>
        </IntelCard>
      )}
    </div>
  );
}

// ── Threat summary row ────────────────────────────────────────────────────────
function ThreatSummaryRow({ signals }: { signals: NarrativeSignal[] }) {
  const counts = useMemo(() => {
    const c: Partial<Record<NarrativeThreatLevel, number>> = {};
    for (const s of signals.filter(s => s.status === "ACTIVE")) {
      c[s.threatLevel] = (c[s.threatLevel] ?? 0) + 1;
    }
    return c;
  }, [signals]);
  const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {THREAT_LEVEL_ORDER.map(lvl => (
        <div key={lvl}
          className="rounded-xl border border-border/40 bg-secondary/20 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider"
              style={{ color: THREAT_COLORS[lvl] }}>{lvl}</span>
            <span className="text-2xl font-bold tabular-nums" style={{ color: THREAT_COLORS[lvl] }}>
              {counts[lvl] ?? 0}
            </span>
          </div>
          <ThreatGauge value={counts[lvl] ?? 0} max={total} color={THREAT_COLORS[lvl]} />
          <p className="text-[10px] text-muted-foreground/60">
            {total > 1 ? `${Math.round(((counts[lvl] ?? 0) / total) * 100)}% of active` : "—"}
          </p>
        </div>
      ))}
    </div>
  );
}

// ── Signal card ───────────────────────────────────────────────────────────────
function SignalCard({
  signal, selected, onSelect, onDebunk, onEscalate, onDismiss, pending, bn, t,
}: {
  signal: NarrativeSignal; selected: boolean;
  onSelect: (id: string) => void; onDebunk: (id: string) => void;
  onEscalate: (id: string) => void; onDismiss: (id: string) => void;
  pending: Record<string, boolean>; bn: boolean;
  t: ReturnType<typeof useTranslations>;
}) {
  const [expanded, setExpanded] = useState(false);
  const isLoading = pending[signal.id] ?? false;
  const isDone = signal.status !== "ACTIVE";
  const catLabel = bn ? CATEGORY_LABELS_BN[signal.category] : CATEGORY_LABELS_EN[signal.category];
  const confidence = Math.round(Number(signal.confidenceScore) * 100);
  const title = bn && signal.titleBn ? signal.titleBn : signal.title;

  return (
    <IntelCard accent={THREAT_ACCENT[signal.threatLevel]} hoverLift={false} padding="sm"
      className={cn("transition-all duration-200",
        selected && "ring-2 ring-primary/50 bg-primary/5",
        isDone && "opacity-55")}>
      {/* Left accent strip */}
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <button type="button" onClick={() => onSelect(signal.id)}
          className="mt-0.5 shrink-0 text-muted-foreground hover:text-primary transition-colors"
          aria-label="Select">
          {selected
            ? <SquareCheck className="h-4 w-4 text-primary" />
            : <Square className="h-4 w-4" />}
        </button>

        {/* Content */}
        <div className="min-w-0 flex-1 space-y-2">
          {/* Badges row */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={cn("inline-flex rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider", THREAT_BG[signal.threatLevel])}>
              {signal.threatLevel}
            </span>
            <span className={cn("inline-flex rounded border px-1.5 py-0.5 text-[10px] font-semibold", STATUS_BG[signal.status])}>
              {signal.status}
            </span>
            <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-medium", CAT_BG[signal.category])}>
              {catLabel}
            </span>
            {/* Confidence bar */}
            <span className="ml-auto flex items-center gap-1 text-[10px] text-muted-foreground">
              <span className="font-mono">{confidence}%</span>
              <div className="h-1.5 w-12 rounded-full bg-secondary/60 overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${confidence}%`, backgroundColor: THREAT_COLORS[signal.threatLevel] }} />
              </div>
            </span>
          </div>

          {/* Title */}
          <p className="text-sm font-semibold leading-snug text-foreground/95">{title}</p>

          {/* Meta — who, when, where */}
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Radio className="h-3 w-3 text-emerald-400 animate-pulse" />
              <span className="font-medium text-foreground/70">{signal.sourceName}</span>
              <span className="text-muted-foreground/50">·</span>
              <span>{signal.sourcePlatform}</span>
            </span>
            {signal.speakerName && (
              <span className="flex items-center gap-1">
                <span className="text-primary/60">👤</span>
                <span className="font-medium text-foreground/80">{signal.speakerName}</span>
              </span>
            )}
            {signal.organization && (
              <span className="flex items-center gap-1">
                <span className="text-amber-400/70">🏢</span>
                <span className="italic text-muted-foreground/80">{signal.organization}</span>
              </span>
            )}
            {signal.district && (
              <span className="flex items-center gap-1">
                <span>📍</span>
                <span>{signal.district}{signal.division ? `, ${signal.division}` : ""}</span>
              </span>
            )}
            {signal.publishedAt && (
              <span className="flex items-center gap-1 ml-auto">
                <span>🕐</span>
                <span className="tabular-nums">
                  {new Date(signal.publishedAt).toLocaleString(undefined, {
                    year: "numeric", month: "short", day: "numeric",
                    hour: "2-digit", minute: "2-digit",
                  })}
                </span>
              </span>
            )}
          </div>

          {/* RAG debunk */}
          {signal.status === "DEBUNKED" && signal.ragDebunk && (
            <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/5 p-2.5 space-y-1">
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
              {signal.ragPolicyRef && (
                <p className="text-[11px] text-emerald-400/60">📋 {signal.ragPolicyRef}</p>
              )}
              {signal.ragSourceRef && (
                <p className="text-[11px] text-emerald-400/60">🔗 {signal.ragSourceRef}</p>
              )}
            </div>
          )}

          {/* Expand body */}
          {signal.body && (
            <div>
              <button type="button" onClick={() => setExpanded(v => !v)}
                className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors">
                <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-180")} />
                {expanded ? (bn ? "বিস্তারিত লুকান" : "Hide body") : (bn ? "বিস্তারিত দেখুন" : "Show body")}
              </button>
              {expanded && (
                <p className="mt-1.5 rounded-lg bg-secondary/20 p-2.5 text-xs leading-relaxed text-muted-foreground border border-border/30">
                  {signal.body}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Action buttons */}
        {!isDone && (
          <div className="flex shrink-0 flex-col gap-1.5">
            <button type="button" onClick={() => onDebunk(signal.id)} disabled={isLoading}
              title={t("actionDebunk")}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 transition-all hover:bg-emerald-500/25 hover:scale-105 disabled:opacity-40">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
            </button>
            <button type="button" onClick={() => onEscalate(signal.id)} disabled={isLoading}
              title={t("actionEscalate")}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-violet-500/30 bg-violet-500/10 text-violet-400 transition-all hover:bg-violet-500/25 hover:scale-105 disabled:opacity-40">
              <Send className="h-4 w-4" />
            </button>
            {signal.sourceUrl && (
              <a href={signal.sourceUrl} target="_blank" rel="noopener noreferrer"
                title={t("actionEvidence")}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-sky-500/30 bg-sky-500/10 text-sky-400 transition-all hover:bg-sky-500/25 hover:scale-105">
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
            <button type="button" onClick={() => onDismiss(signal.id)} disabled={isLoading}
              title={t("actionDismiss")}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/40 text-muted-foreground transition-all hover:border-red-500/30 hover:text-red-400 hover:scale-105 disabled:opacity-40">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </IntelCard>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────
export function NarrativeShieldPanel() {
  const t = useTranslations("modules.narrativeShield");
  const locale = useLocale();
  const bn = locale === "bn";

  const [threatFilter, setThreatFilter] = useState<NarrativeThreatLevel | undefined>(undefined);
  const [catFilter, setCatFilter] = useState<NarrativeCategory | undefined>(undefined);
  const [search, setSearch] = useState("");
  const [showDebunked, setShowDebunked] = useState(false);
  const [showCharts, setShowCharts] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [actionMsg, setActionMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [csvLoading, setCsvLoading] = useState(false);

  const query = useMemo(() => ({
    threatLevel: threatFilter, category: catFilter,
    search: search.length >= 2 ? search : undefined, limit: 100,
  }), [threatFilter, catFilter, search]);

  const { data, loading, error, reload } = useNarrativeShield(query);
  const actions = useNarrativeActions();

  // Auto-ingest on first mount if DB is empty — brings in demo signals
  useEffect(() => {
    if (!loading && !error && data && data.total === 0) {
      void actions.refresh(20).catch(() => null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, error, data?.total]);

  const signals = useMemo(() => {
    const all = data?.signals ?? [];
    if (showDebunked) return all;
    return all.filter(s => s.status !== "DEBUNKED" && s.status !== "DISMISSED");
  }, [data?.signals, showDebunked]);

  const toggleSelect = useCallback((id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => setSelected(new Set(signals.map(s => s.id))), [signals]);
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
  const handleFetch = () => act(() => actions.refresh(20),
    bn ? "✓ নতুন ফিড আনা হয়েছে" : "✓ Feed ingested");
  const handleDedup = () => act(() => actions.dedup(),
    bn ? "✓ ডুপ্লিকেট মুছে ফেলা হয়েছে" : "✓ Duplicates removed");
  const handleCsv = async () => {
    setCsvLoading(true);
    try { await downloadNarrativeShieldCsv(); } finally { setCsvLoading(false); }
  };

  const stats = data?.stats;

  return (
    <ModuleShell title={t("title")} description={t("description")}
      loading={loading} error={error} onRetry={reload}
      stats={stats ? (
        <StatGrid>
          <StatCard label={t("totalActive")} value={stats.total_active} accent="danger" />
          <StatCard label={t("criticalCount")} value={stats.critical_count} accent="danger" />
          <StatCard label={t("highCount")} value={stats.high_count} accent="warning" />
          <StatCard label={t("debunkedToday")} value={stats.debunked_today} accent="success" />
        </StatGrid>
      ) : null}>

      {/* ── Threat summary gauges ── */}
      {signals.length > 0 && <ThreatSummaryRow signals={signals} />}

      {/* ── Charts toggle + charts ── */}
      {signals.length > 0 && (
        <div className="space-y-2">
          <button type="button" onClick={() => setShowCharts(v => !v)}
            className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors">
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", showCharts && "rotate-180")} />
            {showCharts ? (bn ? "চার্ট লুকান" : "Hide charts") : (bn ? "চার্ট দেখুন" : "Show charts")}
          </button>
          {showCharts && <ShieldCharts signals={signals} bn={bn} />}
        </div>
      )}

      {/* ── Toolbar ── */}
      <div className="space-y-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <input type="search" value={search} onChange={e => setSearch(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="h-9 flex-1 min-w-[200px] rounded-lg border border-border/60 bg-secondary/30 px-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all" />
          <Button size="sm" variant="outline" onClick={handleFetch}
            disabled={!!actions.pending["refresh"]} className="gap-1.5 text-xs h-9">
            {actions.pending["refresh"]
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <Zap className="h-3.5 w-3.5 text-amber-400" />}
            {actions.pending["refresh"] ? t("fetching") : t("fetchNow")}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setShowDebunked(v => !v)}
            className="gap-1.5 text-xs text-muted-foreground h-9">
            {showDebunked ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {showDebunked ? t("hideDebunked") : t("showDebunked")}
          </Button>
          <Button size="sm" variant="ghost" onClick={handleDedup}
            className="gap-1.5 text-xs text-muted-foreground h-9">
            <Database className="h-3.5 w-3.5" />
            {t("dedup")}
          </Button>
          <Button size="sm" variant="ghost" onClick={handleCsv} disabled={csvLoading}
            className="gap-1.5 text-xs text-muted-foreground h-9">
            {csvLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            {t("exportCsv")}
          </Button>
          <Button size="sm" variant="ghost" onClick={reload}
            className="gap-1.5 text-xs text-muted-foreground h-9 px-2">
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Threat filters */}
        <div className="flex flex-wrap gap-1.5">
          <Chip active={!threatFilter} onClick={() => setThreatFilter(undefined)}>
            {t("filterAll")}
          </Chip>
          {THREAT_LEVEL_ORDER.map(lvl => (
            <Chip key={lvl} active={threatFilter === lvl}
              onClick={() => setThreatFilter(threatFilter === lvl ? undefined : lvl)}>
              <span className="mr-1 h-2 w-2 rounded-full inline-block"
                style={{ backgroundColor: THREAT_COLORS[lvl] }} />
              {lvl}
            </Chip>
          ))}
        </div>

        {/* Category filters */}
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(CATEGORY_LABELS_EN) as NarrativeCategory[]).map(cat => (
            <Chip key={cat} active={catFilter === cat}
              onClick={() => setCatFilter(catFilter === cat ? undefined : cat)}
              className={catFilter !== cat ? CAT_BG[cat] : undefined}>
              {bn ? CATEGORY_LABELS_BN[cat] : CATEGORY_LABELS_EN[cat]}
            </Chip>
          ))}
        </div>
      </div>

      {/* ── Bulk action bar ── */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-primary/30 bg-primary/8 px-4 py-2.5">
          <span className="text-sm font-semibold text-primary">
            {t("selectedCount", { count: selected.size })}
          </span>
          <div className="ml-auto flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => void handleBulk("DEBUNK")}
              className="gap-1.5 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 text-xs">
              <Shield className="h-3.5 w-3.5" />{t("bulkDebunk")}
            </Button>
            <Button size="sm" variant="outline" onClick={() => void handleBulk("ESCALATE")}
              className="gap-1.5 border-violet-500/40 text-violet-400 hover:bg-violet-500/10 text-xs">
              <Send className="h-3.5 w-3.5" />{t("bulkEscalate")}
            </Button>
            <Button size="sm" variant="outline" onClick={() => void handleBulk("DISMISS")}
              className="gap-1.5 border-red-500/40 text-red-400 hover:bg-red-500/10 text-xs">
              <Trash2 className="h-3.5 w-3.5" />{t("bulkDismiss")}
            </Button>
            <Button size="sm" variant="ghost" onClick={deselectAll} className="text-xs text-muted-foreground px-2">
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* ── Action toast ── */}
      {actionMsg && (
        <div className={cn("flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium animate-fade-in",
          actionMsg.ok
            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
            : "border-red-500/30 bg-red-500/10 text-red-300")}>
          {actionMsg.ok
            ? <CheckCircle2 className="h-4 w-4 shrink-0" />
            : <AlertTriangle className="h-4 w-4 shrink-0" />}
          {actionMsg.text}
        </div>
      )}

      {/* ── Select-all row ── */}
      {signals.length > 0 && (
        <div className="flex items-center gap-3 text-xs text-muted-foreground border-b border-border/30 pb-2">
          <button type="button" onClick={isAllSelected ? deselectAll : selectAll}
            className="flex items-center gap-1.5 hover:text-foreground transition-colors">
            {isAllSelected
              ? <SquareCheck className="h-3.5 w-3.5 text-primary" />
              : <Square className="h-3.5 w-3.5" />}
            {isAllSelected ? t("deselectAll") : t("selectAll")}
          </button>
          <span className="ml-auto">{t("totalSignals", { total: data?.total ?? signals.length })}</span>
        </div>
      )}

      {/* ── Signals list ── */}
      {signals.length === 0 && !loading ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-border/40 bg-secondary/10 py-16 text-center">
          <div className="rounded-full border border-border/40 bg-secondary/30 p-4">
            <ShieldOff className="h-10 w-10 text-muted-foreground/40" />
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-foreground/80">
              {search || threatFilter || catFilter ? t("noFilterResults") : t("noSignals")}
            </p>
            <p className="text-sm text-muted-foreground">
              {bn ? "নতুন ফিড আনতে নিচের বাটন চাপুন" : "Click below to ingest new signals"}
            </p>
          </div>
          {!search && !threatFilter && !catFilter && (
            <Button size="sm" variant="outline" onClick={handleFetch} className="gap-1.5 text-xs">
              <Zap className="h-3.5 w-3.5 text-amber-400" />{t("fetchNow")}
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {signals.map(signal => (
            <SignalCard key={signal.id} signal={signal}
              selected={selected.has(signal.id)} onSelect={toggleSelect}
              onDebunk={handleDebunk} onEscalate={handleEscalate}
              onDismiss={handleDismiss} pending={actions.pending} bn={bn} t={t} />
          ))}
        </div>
      )}

      {/* ── Audit trail hint ── */}
      {signals.length > 0 && (
        <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground/50 border-t border-border/20 pt-3">
          <AlertTriangle className="h-3 w-3 shrink-0" />
          {t("auditTrailHint")}
        </p>
      )}
    </ModuleShell>
  );
}
