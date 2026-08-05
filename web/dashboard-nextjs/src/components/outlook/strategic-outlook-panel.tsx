"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  Bar, BarChart, CartesianGrid, Cell, PolarAngleAxis, PolarGrid,
  Radar, RadarChart, RadialBar, RadialBarChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";
import {
  Activity, AlertTriangle, BookOpen, Briefcase, Building2,
  CheckCircle2, Clock, ExternalLink, Globe, Minus, RefreshCw,
  Sparkles, TrendingDown, TrendingUp,
} from "lucide-react";
import { ModuleShell, StatCard, StatGrid } from "@/components/modules/module-shell";
import { IntelCard } from "@/components/ui/intel-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRealtimeRefresh } from "@/hooks/use-realtime-refresh";
import { useStrategicOutlook } from "@/hooks/use-strategic-outlook";
import { chartTooltipProps } from "@/lib/chart-tooltip";
import { cn } from "@/lib/utils";

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
function sevColor(s: number) {
  if (s >= 4) return "#ef4444";
  if (s >= 3) return "#f97316";
  return "#eab308";
}

// ── Severity bar ──────────────────────────────────────────────────────────────
function SevBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 rounded-full bg-white/10 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${(value / 5) * 100}%`, backgroundColor: sevColor(value) }} />
      </div>
      <span className="w-4 text-right font-mono text-[11px] font-bold tabular-nums"
        style={{ color: sevColor(value) }}>{value}</span>
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

// ── Challenge card ────────────────────────────────────────────────────────────
function ChallengeCard({ c, t }: {
  c: { title: string; severity: number; summary: string; evidence: string[] };
  t: ReturnType<typeof useTranslations>;
}) {
  const [open, setOpen] = useState(false);
  const accent = c.severity >= 4 ? "danger" : c.severity >= 3 ? "warning" : "default";
  return (
    <IntelCard accent={accent} hoverLift={false} padding="sm">
      <div className="space-y-2.5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-semibold leading-snug text-foreground/95 flex-1">{c.title}</p>
          <Badge variant="outline" className="shrink-0 text-[10px] font-bold tabular-nums"
            style={{ color: sevColor(c.severity), borderColor: `${sevColor(c.severity)}40` }}>
            {t("severity")} {c.severity}/5
          </Badge>
        </div>
        <SevBar value={c.severity} />
        <p className="text-xs leading-relaxed text-muted-foreground">{c.summary}</p>
        {c.evidence.length > 0 && (
          <div>
            <button type="button" onClick={() => setOpen(v => !v)}
              className="flex items-center gap-1.5 text-[11px] text-primary/70 hover:text-primary transition-colors">
              <span>{open ? "▲" : "▼"}</span>
              <span>{c.evidence.length} {t("evidence")}</span>
            </button>
            {open && (
              <ul className="mt-2 space-y-1 border-l-2 border-primary/20 pl-3">
                {c.evidence.slice(0, 4).map((e, i) => (
                  <li key={i} className="text-[11px] text-muted-foreground/70 leading-relaxed">{e}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </IntelCard>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────
export function StrategicOutlookPanel() {
  // ✅ FIX: "outlook" not "modules.outlook"
  const t = useTranslations("outlook");
  const locale = useLocale();
  const bn = locale === "bn";
  const { data, loading, error, reload, refresh, refreshing } = useStrategicOutlook();
  const [activeTab, setActiveTab] = useState<"overview"|"politics"|"economy"|"sources">("overview");
  useRealtimeRefresh(reload);

  const pol = data?.challenges.filter(c => c.domain === "politics") ?? [];
  const eco = data?.challenges.filter(c => c.domain === "economy") ?? [];
  const analystSources = data?.sources.filter(s => s.analyst_like).slice(0, 15) ?? [];
  const allSources = data?.sources.slice(0, 30) ?? [];

  const polRisk = pol.reduce((s, c) => s + c.severity, 0);
  const ecoRisk = eco.reduce((s, c) => s + c.severity, 0);

  const challengeBarData = [
    ...pol.map(c => ({ name: c.title, value: c.severity, domain: "politics" })),
    ...eco.map(c => ({ name: c.title, value: c.severity, domain: "economy" })),
  ];

  const radarData = [
    ...pol.slice(0, 3).map(c => ({ subject: c.title, politics: c.severity, economy: 0 })),
    ...eco.slice(0, 3).map(c => ({ subject: c.title, politics: 0, economy: c.severity })),
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
              <IntelCard padding="sm" className="sm:col-span-2">
                <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                  {t("challengeIntensity")}
                </p>
                <ResponsiveContainer width="100%" height={240}>
                  <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="52%">
                    <PolarGrid stroke="rgba(148,163,184,0.12)" />
                    <PolarAngleAxis dataKey="subject"
                      tick={{ fill: "#94a3b8", fontSize: 11 }} />
                    <Radar name={t("politics")} dataKey="politics"
                      stroke="#a855f7" fill="#a855f7" fillOpacity={0.25} strokeWidth={2} />
                    <Radar name={t("economy")} dataKey="economy"
                      stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.25} strokeWidth={2} />
                    <Tooltip {...chartTooltipProps} />
                  </RadarChart>
                </ResponsiveContainer>
              </IntelCard>
            )}
          </div>

          {/* ── Tabs ── */}
          <div className="rounded-2xl border border-border/50 overflow-hidden">
            {/* Tab bar */}
            <div className="flex border-b border-border/50 bg-secondary/15">
              {tabs.map(tab => (
                <button key={tab.id} type="button"
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={cn(
                    "flex-1 px-4 py-3 text-xs font-semibold tracking-wide transition-all",
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

                  {/* Challenge severity chart — vertical bars so full Bengali labels fit */}
                  {challengeBarData.length > 0 && (
                    <IntelCard padding="sm">
                      <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                        {t("challengeIntensity")}
                      </p>
                      <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={challengeBarData}
                          margin={{ top: 4, right: 12, left: 8, bottom: 90 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" vertical={false} />
                          <XAxis dataKey="name"
                            tick={{ fill: "#94a3b8", fontSize: 11 }}
                            interval={0}
                            angle={-38}
                            textAnchor="end"
                            height={90} />
                          <YAxis domain={[0, 5]} ticks={[1,2,3,4,5]}
                            tick={{ fill: "#475569", fontSize: 11 }} width={22} />
                          <Tooltip {...chartTooltipProps}
                            formatter={(v, _n, p) => [
                              `${String(v)}/5`,
                              (p.payload as { domain?: string } | undefined)?.domain === "politics" ? t("politics") : t("economy"),
                            ]} />
                          <Bar dataKey="value" radius={[5, 5, 0, 0]} maxBarSize={44}>
                            {challengeBarData.map((e, i) => (
                              <Cell key={i}
                                fill={e.domain === "politics" ? "#a855f7" : "#f59e0b"}
                                fillOpacity={0.82} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                      <div className="mt-2 flex gap-5 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <span className="h-2.5 w-2.5 rounded-sm bg-purple-500/80 inline-block" />{t("politics")}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="h-2.5 w-2.5 rounded-sm bg-amber-500/80 inline-block" />{t("economy")}
                        </span>
                      </div>
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
                        {data.scenarios.map(s => (
                          <div key={s.label}
                            className={cn("rounded-xl border p-4 space-y-3 transition-all hover:shadow-md hover:-translate-y-0.5", bandBorder(s.probability_band))}>
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
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── POLITICS ── */}
              {activeTab === "politics" && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10 border border-purple-500/20">
                      <Building2 className="h-4 w-4 text-purple-400" />
                    </div>
                    <div>
                      <p className="text-base font-bold">{t("politicsNow")}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {bn ? `${pol.length}টি সক্রিয় চ্যালেঞ্জ · মোট ঝুঁকি স্কোর ${polRisk}`
                          : `${pol.length} active challenges · Total risk score ${polRisk}`}
                      </p>
                    </div>
                    <Badge className="ml-auto bg-purple-500/10 text-purple-300 border-purple-500/30 text-xs">
                      {t("riskScore")}: {polRisk}
                    </Badge>
                  </div>
                  {pol.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 rounded-xl border border-border/40 bg-secondary/10 py-12 text-center">
                      <CheckCircle2 className="h-8 w-8 text-emerald-400/40" />
                      <p className="text-sm text-muted-foreground">{t("noChallenges")}</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {pol.map((c, i) => <ChallengeCard key={i} c={c} t={t} />)}
                    </div>
                  )}
                  {pol.length >= 3 && (
                    <IntelCard padding="sm">
                      <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                        {t("pressureMap")}
                      </p>
                      <ResponsiveContainer width="100%" height={360}>
                        <RadarChart data={pol.slice(0, 6).map(c => ({ subject: c.title, value: c.severity }))}
                          cx="50%" cy="50%" outerRadius="55%">
                          <PolarGrid stroke="rgba(148,163,184,0.12)" />
                          <PolarAngleAxis dataKey="subject"
                            tick={{ fill: "#94a3b8", fontSize: 12 }} />
                          <Radar name={t("severity")} dataKey="value"
                            stroke="#a855f7" fill="#a855f7" fillOpacity={0.3} strokeWidth={2.5} />
                          <Tooltip {...chartTooltipProps} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </IntelCard>
                  )}
                </div>
              )}

              {/* ── ECONOMY ── */}
              {activeTab === "economy" && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20">
                      <Briefcase className="h-4 w-4 text-amber-400" />
                    </div>
                    <div>
                      <p className="text-base font-bold">{t("economyNow")}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {bn ? `${eco.length}টি সক্রিয় চ্যালেঞ্জ · মোট ঝুঁকি স্কোর ${ecoRisk}`
                          : `${eco.length} active challenges · Total risk score ${ecoRisk}`}
                      </p>
                    </div>
                    <Badge className="ml-auto bg-amber-500/10 text-amber-300 border-amber-500/30 text-xs">
                      {t("riskScore")}: {ecoRisk}
                    </Badge>
                  </div>
                  {eco.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 rounded-xl border border-border/40 bg-secondary/10 py-12 text-center">
                      <CheckCircle2 className="h-8 w-8 text-emerald-400/40" />
                      <p className="text-sm text-muted-foreground">{t("noChallenges")}</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {eco.map((c, i) => <ChallengeCard key={i} c={c} t={t} />)}
                    </div>
                  )}
                  {eco.length >= 3 && (
                    <IntelCard padding="sm">
                      <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                        {t("pressureMap")}
                      </p>
                      <ResponsiveContainer width="100%" height={360}>
                        <RadarChart data={eco.slice(0, 6).map(c => ({ subject: c.title, value: c.severity }))}
                          cx="50%" cy="50%" outerRadius="55%">
                          <PolarGrid stroke="rgba(148,163,184,0.12)" />
                          <PolarAngleAxis dataKey="subject"
                            tick={{ fill: "#94a3b8", fontSize: 12 }} />
                          <Radar name={t("severity")} dataKey="value"
                            stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.3} strokeWidth={2.5} />
                          <Tooltip {...chartTooltipProps} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </IntelCard>
                  )}
                </div>
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
