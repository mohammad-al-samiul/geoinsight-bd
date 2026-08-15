"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useRef, useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  AlertTriangle,
  BellRing,
  ExternalLink,
  Home,
  MapPin,
  Megaphone,
  PlusCircle,
  Radio,
  Route,
  Scale,
  Send,
  Siren,
  TrendingUp,
  Users,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ModuleShell, StatCard, StatGrid } from "@/components/modules/module-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AppSelect } from "@/components/ui/app-select";
import { useRealtimeRefresh } from "@/hooks/use-realtime-refresh";
import { useUnrestPulse, type ProtestMovement } from "@/hooks/use-unrest-pulse";
import { PmoLocalUnrestHits } from "@/components/unrest/pmo-local-unrest-hits";
import { IntelCard } from "@/components/ui/intel-card";
import { FloatCard } from "@/components/ui/module-motion";
import { SourceLink } from "@/components/ui/source-link";
import { MapSkeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { chartTooltipProps } from "@/lib/chart-tooltip";
import { chartLayout } from "@/lib/chart-theme";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import {
  confidenceLabel,
  hoursAgoLabel,
  resolveUnrestCoords,
} from "@/lib/unrest-geo";

const UnrestMapInner = dynamic(
  () => import("@/components/unrest/unrest-map-inner").then((m) => m.UnrestMapInner),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[320px] items-center justify-center">
        <MapSkeleton />
      </div>
    ),
  },
);

const THEME_ORDER = [
  "power",
  "gas_fuel",
  "political_opposition",
  "hartal_blockade",
  "road_transport",
  "wage",
  "corruption",
  "law_bill",
  "quota",
  "july_uprising",
  "farmer",
  "land_eviction",
  "water_flood",
  "minority",
  "hsc_exam",
  "ssc_exam",
  "student",
  "general",
] as const;

const CITIZEN_THEME_OPTIONS = [
  { id: "gas_fuel", bn: "গ্যাস/জ্বালানি দাম আন্দোলন", en: "Gas / fuel price protest" },
  { id: "power", bn: "বিদ্যুৎ দাম/লোডশেডিং আন্দোলন", en: "Electricity tariff / load-shedding" },
  { id: "political_opposition", bn: "বিরোধী দল/রাজনৈতিক আন্দোলন", en: "Opposition / political protest" },
  { id: "student", bn: "ছাত্র আন্দোলন", en: "Student protest" },
  { id: "hartal_blockade", bn: "হরতাল/অবরোধ", en: "Hartal / blockade" },
  { id: "wage", bn: "মজুরি/শ্রমিক আন্দোলন", en: "Wage / labour protest" },
  { id: "general", bn: "জন আন্দোলন / বিক্ষোভ", en: "Public protest" },
] as const;

const CITIZEN_PARTY_OPTIONS = [
  { id: "bnp", bn: "বিএনপি", en: "BNP" },
  { id: "jamaat", bn: "জামায়াতে ইসলামী", en: "Jamaat-e-Islami" },
  { id: "ncp", bn: "এনসিপি", en: "NCP" },
  { id: "jatiya_party", bn: "জাতীয় পার্টি", en: "Jatiya Party" },
  { id: "student_org", bn: "ছাত্র সংগঠন", en: "Student organizations" },
  { id: "labour_union", bn: "শ্রমিক সংগঠন", en: "Labour / trade union" },
  { id: "civil_society", bn: "নাগরিক সমাজ", en: "Civil society" },
  { id: "unaffiliated", bn: "অদলীয় / সাধারণ জনতা", en: "Unaffiliated / public" },
] as const;

function themeKey(m: ProtestMovement): string {
  return m.theme_id || "general";
}

function movementWeight(m: ProtestMovement): number {
  const statusBoost =
    m.status === "active"
      ? 1000
      : m.status === "recent"
        ? 400
        : m.status === "cooling"
          ? 100
          : -500; // historical last
  return (
    statusBoost +
    m.impact.deaths * 100 +
    m.impact.injuries * 10 +
    m.article_count * 3 +
    m.severity
  );
}

function isHistoricalMovement(m: ProtestMovement): boolean {
  return (
    m.status === "historical" ||
    m.temporal_class === "historical" ||
    m.temporal_class === "commemoration" ||
    m.theme_id === "july_uprising"
  );
}

function eventPeriodLabel(m: ProtestMovement, bn: boolean): string {
  if (bn) return m.event_period_bn || (m.event_at ? new Date(m.event_at).toLocaleDateString("bn-BD") : "—");
  return m.event_period_en || (m.event_at ? new Date(m.event_at).toLocaleDateString("en-BD") : "—");
}

function enrichMovement(m: ProtestMovement): ProtestMovement {
  if (typeof m.lat === "number" && typeof m.lng === "number") return m;
  const coords = resolveUnrestCoords(m.district, m.division, m.place);
  if (!coords) return m;
  return { ...m, lat: coords.lat, lng: coords.lng };
}

function ensureConfidence(m: ProtestMovement): ProtestMovement {
  if (typeof m.source_confidence === "number") return m;
  const unique = new Set(m.articles.map((a) => a.source_name.toLowerCase())).size || 1;
  const volume = Math.min(1, m.article_count / 6);
  const diversity = Math.min(1, unique / 4);
  return {
    ...m,
    unique_sources: unique,
    source_confidence: Number((0.35 * volume + 0.65 * diversity).toFixed(2)),
    timeline:
      m.timeline ??
      [...m.articles]
        .sort((a, b) => new Date(a.published_at).getTime() - new Date(b.published_at).getTime())
        .map((a) => ({
          at: a.published_at,
          title: a.title,
          source_name: a.source_name,
          url: a.url,
        })),
  };
}

export function UnrestPulsePanel() {
  const t = useTranslations("modules.unrest");
  const locale = useLocale();
  const bn = locale === "bn";
  const { data, loading, error, reload } = useUnrestPulse();
  useRealtimeRefresh(reload);

  const [groupBy, setGroupBy] = useState<"issue" | "party" | "division">("issue");
  const [groupFilter, setGroupFilter] = useState<string>("all");
  const [timeFilterDays, setTimeFilterDays] = useState<number>(30);
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "recent" | "cooling" | "historical"
  >("all");
  const [showBlockades, setShowBlockades] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focus, setFocus] = useState<{ lat: number; lng: number } | null>(null);
  const [compareIds, setCompareIds] = useState<[string, string] | null>(null);
  const [citizenReports, setCitizenReports] = useState<ProtestMovement[]>([]);
  const [showCitizenModal, setShowCitizenModal] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const voiceRef = useRef<{ stop: () => void } | null>(null);

  const [citizenForm, setCitizenForm] = useState({
    title: "",
    place: "",
    district: "Dhaka",
    themeId: "gas_fuel" as string,
    partyId: "bnp" as string,
    urgency: "active" as "active" | "recent",
  });

  const movements = useMemo(() => {
    const raw = [...(data?.movements ?? []), ...citizenReports].map((m) =>
      ensureConfidence(enrichMovement(m)),
    );

    const now = new Date();
    let base =
      timeFilterDays === 0
        ? raw
        : raw.filter((m) => {
            const diffDays = Math.ceil(
              Math.abs(now.getTime() - new Date(m.last_seen_at).getTime()) / 86_400_000,
            );
            return diffDays <= timeFilterDays;
          });

    if (groupFilter !== "all") {
      if (groupBy === "issue") {
        base = base.filter((m) => themeKey(m) === groupFilter);
      } else if (groupBy === "party") {
        base = base.filter((m) => (m.party_id || "unaffiliated") === groupFilter);
      } else {
        base = base.filter((m) => (m.division || "National") === groupFilter);
      }
    }
    if (statusFilter !== "all") base = base.filter((m) => m.status === statusFilter);
    return [...base].sort((a, b) => movementWeight(b) - movementWeight(a));
  }, [data?.movements, citizenReports, timeFilterDays, groupBy, groupFilter, statusFilter]);

  const liveMovements = useMemo(
    () => movements.filter((m) => !isHistoricalMovement(m)),
    [movements],
  );

  const historicalMovements = useMemo(
    () =>
      [...movements]
        .filter((m) => isHistoricalMovement(m))
        .sort(
          (a, b) =>
            new Date(b.event_at || b.last_seen_at).getTime() -
            new Date(a.event_at || a.last_seen_at).getTime(),
        ),
    [movements],
  );

  const activeNow = useMemo(
    () => liveMovements.filter((m) => m.status === "active").slice(0, 12),
    [liveMovements],
  );

  const escalations = useMemo(() => {
    return liveMovements
      .filter(
        (m) =>
          m.status === "active" &&
          (m.impact.deaths > 0 ||
            m.impact.injuries >= 5 ||
            m.severity >= 70 ||
            (m.source_confidence ?? 0) >= 0.7),
      )
      .slice(0, 6);
  }, [liveMovements]);

  type GroupCard = {
    id: string;
    label: string;
    label_bn: string;
    items: ProtestMovement[];
    count: number;
  };

  const buildGroups = (
    list: ProtestMovement[],
    keyFn: (m: ProtestMovement) => { id: string; label: string; label_bn: string },
    order?: readonly string[],
  ): GroupCard[] => {
    const map = new Map<string, GroupCard>();
    for (const m of list) {
      const meta = keyFn(m);
      const prev = map.get(meta.id);
      if (!prev) {
        map.set(meta.id, {
          id: meta.id,
          label: meta.label,
          label_bn: meta.label_bn,
          items: [m],
          count: m.article_count,
        });
      } else {
        prev.items.push(m);
        prev.count += m.article_count;
      }
    }
    return [...map.values()].sort((a, b) => {
      if (order) {
        const ia = order.indexOf(a.id);
        const ib = order.indexOf(b.id);
        if (ia !== ib) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
      }
      return b.items.length - a.items.length;
    });
  };

  const allForGroups = useMemo(() => {
    const raw = [...(data?.movements ?? []), ...citizenReports].map((m) =>
      ensureConfidence(enrichMovement(m)),
    );
    const now = new Date();
    return timeFilterDays === 0
      ? raw
      : raw.filter((m) => {
          const diffDays = Math.ceil(
            Math.abs(now.getTime() - new Date(m.last_seen_at).getTime()) / 86_400_000,
          );
          return diffDays <= timeFilterDays;
        });
  }, [data?.movements, citizenReports, timeFilterDays]);

  const themeGroups = useMemo(
    () =>
      buildGroups(
        allForGroups,
        (m) => ({ id: themeKey(m), label: m.theme, label_bn: m.theme_bn }),
        THEME_ORDER,
      ),
    [allForGroups],
  );

  const partyGroups = useMemo(
    () =>
      buildGroups(allForGroups, (m) => ({
        id: m.party_id || "unaffiliated",
        label: m.party || "Unaffiliated / public",
        label_bn: m.party_bn || "অদলীয় / সাধারণ জনতা",
      })),
    [allForGroups],
  );

  const divisionGroups = useMemo(
    () =>
      buildGroups(allForGroups, (m) => {
        const div = m.division || "National";
        return { id: div, label: div, label_bn: div === "National" ? "জাতীয়" : div };
      }),
    [allForGroups],
  );

  const activeGroups =
    groupBy === "issue" ? themeGroups : groupBy === "party" ? partyGroups : divisionGroups;

  const districtChart = useMemo(() => {
    if (!data?.districts?.length) return [];
    return [...data.districts]
      .map((d) => ({
        name: d.district.length > 12 ? `${d.district.slice(0, 11)}…` : d.district,
        fullName: d.district,
        protests: Math.max(d.protest_count, 0),
        score: d.unrest_score,
      }))
      .filter((d) => d.protests > 0)
      .sort((a, b) => b.protests - a.protests)
      .slice(0, 10)
      .reverse();
  }, [data?.districts]);

  const districtOptions = useMemo(() => {
    const names = (data?.districts ?? []).map((d) => d.district);
    return names.length ? names : ["Dhaka", "Chattogram", "Khulna", "Rajshahi", "Sylhet"];
  }, [data?.districts]);

  const comparison = useMemo(() => {
    if (!compareIds || !data?.districts) return null;
    const a = data.districts.find((d) => d.district === compareIds[0]);
    const b = data.districts.find((d) => d.district === compareIds[1]);
    if (!a || !b) return null;
    return { a, b };
  }, [compareIds, data?.districts]);

  const selected = movements.find((m) => m.id === selectedId) ?? null;

  const totals = useMemo(() => {
    let deaths = 0;
    let injuries = 0;
    let active = 0;
    for (const m of movements) {
      deaths += m.impact.deaths;
      injuries += m.impact.injuries;
      if (m.status === "active") active += 1;
    }
    const impact = data?.summary.impact;
    return {
      active: data?.summary.active_movements ?? active,
      districts: data?.summary.districts_at_risk ?? 0,
      deaths: impact?.deaths ?? deaths,
      injuries: impact?.injuries ?? injuries,
    };
  }, [movements, data?.summary]);

  const bp = useBreakpoint();
  const layout = chartLayout(bp);
  const chartHeight = Math.max(
    layout.chartHeightSm,
    districtChart.length * (layout.narrow ? 28 : 30),
  );

  const focusMovement = (m: ProtestMovement) => {
    setSelectedId(m.id);
    if (typeof m.lat === "number" && typeof m.lng === "number") {
      setFocus({ lat: m.lat, lng: m.lng });
    }
  };

  const playBriefing = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    voiceRef.current?.stop();
    const top = activeNow[0];
    const issueLine = themeGroups
      .slice(0, 5)
      .map((g) => `${g.label_bn} ${g.items.filter((x) => x.status === "active").length || g.items.length}টি`)
      .join(", ");
    const text =
      `আন্দোলন ও জনঅসন্তোষ ব্রিফিং। এখন চলমান আন্দোলন ${totals.active}টি। ` +
      `ঝুঁকিপূর্ণ জেলা ${totals.districts}টি। ` +
      (issueLine ? `ইস্যু ক্যাটাগরি: ${issueLine}। ` : "") +
      (top
        ? `প্রধান চলমান: ${top.title_bn}, ইস্যু ${top.theme_bn}, স্থান ${top.place_bn}, শেষ আপডেট ${hoursAgoLabel(top.last_seen_at, true)}। `
        : "") +
      (escalations[0]
        ? `এসকেলেশন সতর্কতা: ${escalations[0].title_bn}। `
        : "") +
      `নিহত আনুমানিক ${totals.deaths}, আহত ${totals.injuries}।`;

    void import("@/lib/bangla-tts").then(({ speakPreparedText }) => {
      void speakPreparedText({
        text,
        lang: "bn",
        onStart: () => setIsSpeaking(true),
        onEnd: () => {
          setIsSpeaking(false);
          voiceRef.current = null;
        },
        onError: () => setIsSpeaking(false),
      }).then((handle) => {
        voiceRef.current = handle;
      });
    });
  };

  const stopBriefing = () => {
    voiceRef.current?.stop();
    voiceRef.current = null;
    if (typeof window !== "undefined") window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  const submitCitizen = (e: React.FormEvent) => {
    e.preventDefault();
    if (!citizenForm.title.trim() || !citizenForm.place.trim()) return;
    const coords = resolveUnrestCoords(citizenForm.district, null, citizenForm.place) ?? {
      lat: 23.81,
      lng: 90.41,
    };
    const now = new Date().toISOString();
    const themeOpt =
      CITIZEN_THEME_OPTIONS.find((x) => x.id === citizenForm.themeId) ?? CITIZEN_THEME_OPTIONS[6];
    const partyOpt =
      CITIZEN_PARTY_OPTIONS.find((x) => x.id === citizenForm.partyId) ?? CITIZEN_PARTY_OPTIONS[7];
    const themeLabel = bn ? themeOpt.bn : themeOpt.en;
    const report: ProtestMovement = {
      id: `citizen-${Date.now()}`,
      title: `${themeLabel} — ${citizenForm.place} (${partyOpt.en})`,
      title_bn: `${themeOpt.bn} — ${citizenForm.place} (${partyOpt.bn})`,
      theme_id: themeOpt.id,
      theme: themeOpt.en,
      theme_bn: themeOpt.bn,
      party_id: partyOpt.id,
      party: partyOpt.en,
      party_bn: partyOpt.bn,
      place: citizenForm.place,
      place_bn: citizenForm.place,
      district: citizenForm.district,
      division: null,
      status: citizenForm.urgency,
      status_bn: citizenForm.urgency === "active" ? "চলমান / সক্রিয়" : "সাম্প্রতিক",
      status_en: citizenForm.urgency === "active" ? "Active now" : "Recent",
      event_at: now,
      event_period_en: new Date(now).toLocaleString("en-BD", { month: "long", year: "numeric" }),
      event_period_bn: new Date(now).toLocaleString("bn-BD", { month: "long", year: "numeric" }),
      temporal_class: "live",
      first_seen_at: now,
      last_seen_at: now,
      article_count: 1,
      severity: citizenForm.urgency === "active" ? 75 : 50,
      impact: {
        deaths: 0,
        civilian_deaths: 0,
        injuries: 0,
        homes_damaged: 0,
        livestock_lost: 0,
        damage_mentions: 0,
        evidence: [],
      },
      summary_bn: `নাগরিক/ফিল্ড রিপোর্ট: ${citizenForm.title} · ইস্যু: ${themeOpt.bn} · দল: ${partyOpt.bn}`,
      summary_en: `Citizen/field report: ${citizenForm.title} · issue: ${themeOpt.en} · party: ${partyOpt.en}`,
      articles: [],
      lat: coords.lat + (Math.random() - 0.5) * 0.05,
      lng: coords.lng + (Math.random() - 0.5) * 0.05,
      source_confidence: 0.35,
      unique_sources: 1,
      timeline: [{ at: now, title: citizenForm.title, source_name: "Citizen", url: "#" }],
      source: "citizen",
    };
    setCitizenReports((prev) => [report, ...prev]);
    setShowCitizenModal(false);
    focusMovement(report);
    setCitizenForm({
      title: "",
      place: "",
      district: "Dhaka",
      themeId: "gas_fuel",
      partyId: "bnp",
      urgency: "active",
    });
  };

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
            <StatCard label={t("activeProtests")} value={totals.active} accent="danger" />
            <StatCard label={t("districtsAtRisk")} value={totals.districts} accent="danger" />
            <StatCard label={t("impactDeaths")} value={totals.deaths} accent="danger" />
            <StatCard label={t("impactInjured")} value={totals.injuries} />
          </StatGrid>
        )
      }
    >
      <PmoLocalUnrestHits />
      {data && (
        <div className="space-y-8">
          {/* Toolbar */}
          <div className="glass-panel flex flex-wrap items-center gap-2 rounded-xl border border-border/50 p-3">
            <Button
              size="sm"
              variant={isSpeaking ? "default" : "outline"}
              className={cn("h-8 gap-1.5 text-xs", isSpeaking && "bg-red-600 hover:bg-red-700")}
              onClick={isSpeaking ? stopBriefing : playBriefing}
            >
              {isSpeaking ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
              {bn ? "ভয়েস ব্রিফিং" : "Voice briefing"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 text-xs border-primary/40 text-primary"
              onClick={() => setShowCitizenModal(true)}
            >
              <PlusCircle className="h-3.5 w-3.5" />
              {bn ? "ফিল্ড/নাগরিক রিপোর্ট" : "Citizen / field report"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className={cn("h-8 gap-1.5 text-xs", showBlockades && "border-orange-400/40 text-orange-200")}
              onClick={() => setShowBlockades((v) => !v)}
            >
              <Route className="h-3.5 w-3.5" />
              {bn ? "অবরোধ ওভারলে" : "Blockade overlay"}
            </Button>
            <Link
              href="/outlook"
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-sky-500/35 bg-sky-500/10 px-3 text-xs font-semibold text-sky-200 hover:bg-sky-500/20"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {bn ? "Outlook ঝুঁকি লিংক" : "Outlook risk link"}
            </Link>
            <div className="ml-auto flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
              <Radio className="h-3.5 w-3.5 text-emerald-400" />
              <span>{t("liveSources")}</span>
              {data.summary.refreshed_at ? (
                <span className="tabular-nums">
                  {t("lastUpdate")}: {new Date(data.summary.refreshed_at).toLocaleString()}
                </span>
              ) : null}
            </div>
          </div>

          {/* Categorize by issue / party / division */}
          {activeGroups.length > 0 ? (
            <section className="rounded-xl border border-border/40 bg-background/40 p-3.5">
              <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h3 className="font-display text-sm font-semibold">
                    {bn ? "আন্দোলন শ্রেণীবিন্যাস" : "Protest classification"}
                  </h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {bn
                      ? "দল · ইস্যু · বিভাগ — কোন আন্দোলন কোথায় চলছে"
                      : "Party · issue · division — which protest, where"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(
                    [
                      ["issue", bn ? "ইস্যু" : "Issue"],
                      ["party", bn ? "দল" : "Party"],
                      ["division", bn ? "বিভাগ" : "Division"],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        setGroupBy(id);
                        setGroupFilter("all");
                      }}
                      className={cn(
                        "rounded-md border px-2.5 py-1 text-[11px] font-semibold transition",
                        groupBy === id
                          ? "border-amber-400/50 bg-amber-500/20 text-amber-100"
                          : "border-border/40 text-muted-foreground hover:border-amber-400/30",
                      )}
                    >
                      {label}
                    </button>
                  ))}
                  {groupFilter !== "all" ? (
                    <button
                      type="button"
                      onClick={() => setGroupFilter("all")}
                      className="rounded-md border border-border/40 px-2.5 py-1 text-[11px] text-muted-foreground hover:text-foreground"
                    >
                      {bn ? "সব দেখুন" : "Show all"}
                    </button>
                  ) : null}
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {activeGroups.map((g) => {
                  const activeCount = g.items.filter((x) => x.status === "active").length;
                  const top = [...g.items].sort((a, b) => movementWeight(b) - movementWeight(a))[0];
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => {
                        setGroupFilter(g.id);
                        if (top) focusMovement(top);
                      }}
                      className={cn(
                        "rounded-lg border px-3 py-2.5 text-left transition",
                        groupFilter === g.id
                          ? "border-amber-400/50 bg-amber-500/15"
                          : "border-border/40 bg-background/50 hover:border-amber-400/35",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold leading-snug">
                          {bn ? g.label_bn : g.label}
                        </p>
                        <Badge
                          variant="outline"
                          className={cn(
                            "shrink-0 text-[10px]",
                            activeCount > 0 && "border-red-500/40 text-red-200",
                          )}
                        >
                          {activeCount > 0
                            ? bn
                              ? `${activeCount} চলমান`
                              : `${activeCount} active`
                            : g.items.length}
                        </Badge>
                      </div>
                      {top ? (
                        <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
                          <span className="font-medium text-sky-200/90">
                            {bn ? top.place_bn : top.place}
                          </span>
                          {top.division ? ` · ${top.division}` : ""}
                          {" — "}
                          {groupBy === "issue"
                            ? bn
                              ? top.party_bn || top.party || "অদলীয়"
                              : top.party || top.party_bn || "Unaffiliated"
                            : bn
                              ? top.theme_bn
                              : top.theme}
                        </p>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </section>
          ) : null}

          {/* Escalation alerts */}
          {escalations.length > 0 ? (
            <section className="rounded-xl border border-red-500/35 bg-red-500/10 p-3.5">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-red-200">
                <Siren className="h-4 w-4 animate-pulse" />
                {bn ? "এসকেলেশন অ্যালার্ট" : "Escalation alerts"}
              </div>
              <ul className="grid gap-2 sm:grid-cols-2">
                {escalations.map((m) => (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => focusMovement(m)}
                      className="w-full rounded-lg border border-red-500/30 bg-background/40 px-3 py-2 text-left text-xs hover:border-red-400/50"
                    >
                      <p className="font-semibold text-foreground">{bn ? m.title_bn : m.title}</p>
                      <p className="mt-0.5 text-muted-foreground">
                        {bn ? m.theme_bn : m.theme} · {bn ? m.place_bn : m.place} ·{" "}
                        {hoursAgoLabel(m.last_seen_at, bn)} ·{" "}
                        {confidenceLabel(m.source_confidence ?? 0, bn)}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {/* Map + ongoing tracker */}
          <section className="grid gap-4 lg:grid-cols-12">
            <div className="space-y-3 lg:col-span-7">
              <div>
                <h3 className="font-display text-sm font-semibold">
                  {bn ? "কোথায় আন্দোলন চলছে — লাইভ ম্যাপ" : "Where protests are active — live map"}
                </h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {bn
                    ? "বিভাগ হিটম্যাপ + নির্দিষ্ট পিন · ক্লিক করে জুম"
                    : "Division heatmap + specific pins · click to zoom"}
                </p>
              </div>
              <div className="relative h-[380px] overflow-hidden rounded-xl border border-border/40 bg-slate-950 lg:h-[500px]">
                <UnrestMapInner
                  districts={data.districts}
                  movements={liveMovements}
                  showBlockades={showBlockades}
                  focus={focus}
                  selectedId={selectedId}
                  bn={bn}
                  onSelectMovement={(id) => {
                    const m = liveMovements.find((x) => x.id === id) ?? movements.find((x) => x.id === id);
                    if (m) focusMovement(m);
                  }}
                />
              </div>
            </div>

            <div className="space-y-3 lg:col-span-5">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-display text-sm font-semibold">
                  {bn ? "এখন চলমান আন্দোলন" : "Ongoing protests now"}
                </h3>
                <Badge variant="outline" className="border-red-500/40 text-red-200">
                  {activeNow.length}
                </Badge>
              </div>
              <ul className="max-h-[460px] space-y-2 overflow-y-auto pr-1">
                {activeNow.length === 0 ? (
                  <li className="rounded-lg border border-dashed border-border/50 p-4 text-center text-xs text-muted-foreground">
                    {bn ? "এই ফিল্টারে চলমান আন্দোলন নেই" : "No active protests in this filter"}
                  </li>
                ) : (
                  activeNow.map((m) => (
                    <li key={m.id}>
                      <button
                        type="button"
                        onClick={() => focusMovement(m)}
                        className={cn(
                          "w-full rounded-xl border px-3 py-2.5 text-left transition",
                          selectedId === m.id
                            ? "border-red-400/50 bg-red-500/15"
                            : "border-border/40 bg-background/50 hover:border-red-400/35",
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold leading-snug">
                            {bn ? m.title_bn : m.title}
                          </p>
                          <span className="shrink-0 text-[10px] text-red-300">
                            {hoursAgoLabel(m.last_seen_at, bn)}
                          </span>
                        </div>
                        <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                          <MapPin className="h-3 w-3 shrink-0" />
                          <span>
                            {bn ? m.place_bn : m.place}
                            {m.district && m.district !== m.place ? ` · ${m.district}` : ""}
                            {m.division ? ` · ${m.division}` : ""}
                          </span>
                        </p>
                        <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-[11px]">
                          <span className="font-medium text-amber-200/90">
                            {bn ? m.theme_bn : m.theme}
                          </span>
                          <span className="text-sky-200/90">
                            {bn ? m.party_bn || m.party || "অদলীয়" : m.party || m.party_bn || "Unaffiliated"}
                          </span>
                          <span className="text-emerald-200/85">
                            {bn ? "সময়:" : "When:"} {eventPeriodLabel(m, bn)}
                          </span>
                        </div>
                        <div className="mt-1.5 flex flex-wrap gap-1.5 text-[10px]">
                          <Badge variant="outline" className="text-[10px]">
                            {m.article_count} {t("reports")}
                          </Badge>
                          <Badge variant="outline" className="text-[10px]">
                            {confidenceLabel(m.source_confidence ?? 0, bn)} (
                            {Math.round((m.source_confidence ?? 0) * 100)}%)
                          </Badge>
                          {m.source === "citizen" ? (
                            <Badge variant="outline" className="border-pink-400/40 text-pink-200 text-[10px]">
                              {bn ? "নাগরিক" : "Citizen"}
                            </Badge>
                          ) : null}
                        </div>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </section>

          {/* Selected detail: timeline + sources */}
          {selected ? (
            <section className="rounded-xl border border-primary/30 bg-background/60 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {bn ? selected.status_bn : selected.status_en} ·{" "}
                    {bn ? selected.theme_bn : selected.theme} ·{" "}
                    {bn
                      ? selected.party_bn || selected.party || "অদলীয়"
                      : selected.party || selected.party_bn || "Unaffiliated"}
                  </p>
                  <h3 className="mt-1 font-display text-base font-bold">
                    {bn ? selected.title_bn : selected.title}
                  </h3>
                  <p className="mt-1 flex items-center gap-1 text-xs text-sky-200/90">
                    <MapPin className="h-3.5 w-3.5" />
                    {bn ? selected.place_bn : selected.place}
                    {selected.district ? ` · ${selected.district}` : ""}
                    {selected.division ? ` · ${selected.division}` : ""}
                  </p>
                  <p className="mt-1 text-xs font-medium text-emerald-200/90">
                    {bn ? "আন্দোলনের সময়:" : "Protest period:"} {eventPeriodLabel(selected, bn)}
                    {isHistoricalMovement(selected)
                      ? bn
                        ? " · আজকের চলমান আন্দোলন নয়"
                        : " · not an active protest today"
                      : ""}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {bn ? selected.summary_bn : selected.summary_en}
                  </p>
                </div>
                <button
                  type="button"
                  className="rounded-md p-1 text-muted-foreground hover:bg-secondary/50"
                  onClick={() => setSelectedId(null)}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-3 grid gap-4 md:grid-cols-2">
                <div>
                  <h4 className="mb-2 text-xs font-semibold text-foreground">
                    {bn ? "টাইমলাইন" : "Timeline"}
                  </h4>
                  <ol className="max-h-48 space-y-2 overflow-y-auto border-l border-border/50 pl-3">
                    {(selected.timeline ?? []).map((ev, i) => (
                      <li key={`${ev.at}-${i}`} className="relative text-xs">
                        <span className="absolute -left-[17px] top-1 h-2 w-2 rounded-full bg-sky-400" />
                        <p className="font-mono text-[10px] text-muted-foreground">
                          {new Date(ev.at).toLocaleString()} · {ev.source_name}
                        </p>
                        <p className="leading-snug text-foreground/90">{ev.title}</p>
                      </li>
                    ))}
                  </ol>
                </div>
                <div>
                  <h4 className="mb-2 text-xs font-semibold text-foreground">
                    {bn ? "সোর্স ও কনফিডেন্স" : "Sources & confidence"}
                  </h4>
                  <p className="mb-2 text-[11px] text-muted-foreground">
                    {confidenceLabel(selected.source_confidence ?? 0, bn)} ·{" "}
                    {selected.unique_sources ?? 1} {bn ? "আউটলেট" : "outlets"} ·{" "}
                    {selected.article_count} {t("reports")}
                  </p>
                  <ul className="space-y-1.5">
                    {selected.articles.slice(0, 4).map((a) => (
                      <li key={a.id}>
                        <SourceLink
                          href={a.url}
                          title={a.title}
                          meta={a.source_name}
                          openText={bn ? "খবর" : "Open"}
                          openLabel={bn ? "সোর্স খবর খুলুন" : "Open source article"}
                        />
                      </li>
                    ))}
                  </ul>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-3 h-8 gap-1.5 text-xs"
                    onClick={() => focusMovement(selected)}
                  >
                    <MapPin className="h-3.5 w-3.5" />
                    {bn ? "ম্যাপে দেখান" : "Show on map"}
                  </Button>
                </div>
              </div>
            </section>
          ) : null}

          {/* District compare */}
          <section className="glass-panel space-y-3 rounded-xl border border-border/50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 font-display text-sm font-semibold">
                <Scale className="h-4 w-4 text-violet-300" />
                {bn ? "জেলা তুলনা" : "District compare"}
              </h3>
              <div className="flex flex-wrap gap-2">
                <AppSelect
                  value={compareIds?.[0] ?? districtOptions[0] ?? "Dhaka"}
                  onValueChange={(v) =>
                    setCompareIds([v, compareIds?.[1] ?? districtOptions[1] ?? "Chattogram"])
                  }
                  triggerClassName="min-w-[9rem]"
                  options={districtOptions.map((d) => ({ value: d, label: d }))}
                />
                <AppSelect
                  value={compareIds?.[1] ?? districtOptions[1] ?? "Chattogram"}
                  onValueChange={(v) =>
                    setCompareIds([compareIds?.[0] ?? districtOptions[0] ?? "Dhaka", v])
                  }
                  triggerClassName="min-w-[9rem]"
                  options={districtOptions.map((d) => ({ value: d, label: d }))}
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs"
                  onClick={() =>
                    setCompareIds([
                      districtOptions[0] ?? "Dhaka",
                      districtOptions[1] ?? "Chattogram",
                    ])
                  }
                >
                  {bn ? "তুলনা করুন" : "Compare"}
                </Button>
              </div>
            </div>
            {comparison ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {[comparison.a, comparison.b].map((d) => (
                  <div key={d.district} className="rounded-lg border border-border/40 bg-background/40 p-3 text-xs">
                    <p className="font-semibold text-foreground">{d.district}</p>
                    <p className="mt-1 text-muted-foreground">
                      {bn ? "স্কোর" : "Score"}: <strong className="text-red-300">{d.unrest_score}</strong>
                      {" · "}
                      {bn ? "বিক্ষোভ" : "Protests"}: {d.protest_count}
                      {" · "}
                      {bn ? "ট্রেন্ড" : "Trend"}: {d.trend}
                    </p>
                    <p className="mt-1 text-muted-foreground">
                      {bn ? "নিহত/আহত" : "Deaths/injuries"}: {d.deaths ?? 0}/{d.injuries ?? 0}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                {bn ? "দুই জেলা বেছে তুলনা চাপুন" : "Pick two districts and compare"}
              </p>
            )}
          </section>

          {districtChart.length > 0 && (
            <section>
              <h3 className="font-display text-sm font-semibold tracking-tight">
                {t("districtChartTitle")}
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">{t("districtChartSubtitle")}</p>
              <div
                className="mt-3 rounded-xl border border-border/40 bg-background/30 px-2 py-3"
                style={{ height: chartHeight }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={districtChart}
                    margin={{ top: 0, right: 12, left: 4, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} tick={layout.tickMuted} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={layout.yAxisCategoryWidth}
                      tick={layout.tick}
                    />
                    <Tooltip
                      {...chartTooltipProps}
                      formatter={(value) => [value as number, t("protest")]}
                      labelFormatter={(_, payload) =>
                        (payload?.[0]?.payload as { fullName?: string } | undefined)?.fullName ?? ""
                      }
                    />
                    <Bar
                      dataKey="protests"
                      fill="rgba(248, 113, 113, 0.88)"
                      radius={[0, 4, 4, 0]}
                      maxBarSize={16}
                      onClick={(entry) => {
                        const name = (entry as { fullName?: string }).fullName;
                        if (!name) return;
                        const hit = movements.find((m) => m.district === name || m.place === name);
                        if (hit) focusMovement(hit);
                      }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          )}

          {/* Historical timeline — July 2024 etc. must not appear as "active today" */}
          {historicalMovements.length > 0 ? (
            <section className="rounded-xl border border-violet-500/30 bg-violet-500/10 p-3.5">
              <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h3 className="font-display text-sm font-semibold text-violet-100">
                    {bn ? "টাইমলাইন · ঐতিহাসিক আন্দোলন" : "Timeline · historical protests"}
                  </h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {bn
                      ? "আজকের খবরে উল্লেখ থাকলেও এগুলো আজ চলমান নয় — আন্দোলনের আসল সময় অনুযায়ী সাজানো"
                      : "Mentioned in today's news, but not active now — ordered by when the protest actually happened"}
                  </p>
                </div>
                <Badge variant="outline" className="border-violet-400/40 text-violet-100">
                  {historicalMovements.length}
                </Badge>
              </div>
              <ol className="relative space-y-2 border-l border-violet-400/30 pl-4">
                {historicalMovements.slice(0, 10).map((m) => (
                  <li key={m.id} className="relative">
                    <span className="absolute -left-[21px] top-2 h-2.5 w-2.5 rounded-full bg-violet-400" />
                    <button
                      type="button"
                      onClick={() => focusMovement(m)}
                      className="w-full rounded-lg border border-violet-500/25 bg-background/40 px-3 py-2 text-left text-xs hover:border-violet-400/45"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold text-foreground">
                          {bn ? m.title_bn : m.title}
                        </p>
                        <span className="shrink-0 font-medium text-violet-200">
                          {eventPeriodLabel(m, bn)}
                        </span>
                      </div>
                      <p className="mt-0.5 text-muted-foreground">
                        {bn ? m.place_bn : m.place}
                        {m.division ? ` · ${m.division}` : ""} ·{" "}
                        {bn ? m.theme_bn : m.theme}
                        {" · "}
                        {bn
                          ? "নিউজ আজকের, আন্দোলন পুরনো"
                          : "news today, protest in the past"}
                      </p>
                    </button>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}

          {/* All movements */}
          <section className="space-y-4">
            <div>
              <h3 className="font-display text-sm font-semibold tracking-tight">
                {t("movementsTitle")}
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">{t("movementsSubtitle")}</p>
            </div>

            {movements.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("noSignals")}</p>
            ) : (
              <>
                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
                  <div className="scroll-x-strip min-w-0 flex-1">
                    <FilterChip
                      active={groupFilter === "all"}
                      onClick={() => setGroupFilter("all")}
                      label={`${t("themeAll")} (${allForGroups.length})`}
                    />
                    {activeGroups.map((g) => (
                      <FilterChip
                        key={g.id}
                        active={groupFilter === g.id}
                        onClick={() => setGroupFilter(g.id)}
                        label={`${bn ? g.label_bn : g.label} (${g.items.length})`}
                        danger
                      />
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <AppSelect
                      value={statusFilter}
                      onValueChange={(v) =>
                        setStatusFilter(
                          v as "all" | "active" | "recent" | "cooling" | "historical",
                        )
                      }
                      triggerClassName="min-w-[8.5rem]"
                      options={[
                        { value: "all", label: bn ? "স্ট্যাটাস: সব" : "Status: all" },
                        { value: "active", label: bn ? "চলমান" : "Active" },
                        { value: "recent", label: bn ? "সাম্প্রতিক" : "Recent" },
                        { value: "cooling", label: bn ? "ঠান্ডা" : "Cooling" },
                        { value: "historical", label: bn ? "ঐতিহাসিক" : "Historical" },
                      ]}
                    />
                    <div className="flex items-center gap-2 rounded-lg border border-border/40 bg-background/50 p-1.5 shadow-sm">
                      <span className="pl-1 text-[11px] font-semibold text-muted-foreground">
                        {bn ? "সময়কাল:" : "Timeframe:"}
                      </span>
                      <AppSelect
                        value={String(timeFilterDays)}
                        onValueChange={(value) => setTimeFilterDays(Number(value))}
                        triggerClassName="min-w-[8rem]"
                        options={[
                          { value: "7", label: bn ? "গত ৭ দিন" : "Last 7 Days" },
                          { value: "15", label: bn ? "গত ১৫ দিন" : "Last 15 Days" },
                          { value: "30", label: bn ? "গত ৩০ দিন" : "Last 30 Days" },
                          { value: "0", label: bn ? "সকল সময়" : "All Time" },
                        ]}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 lg:grid-cols-2">
                  {movements.map((m, idx) => (
                    <MovementCard
                      key={m.id}
                      movement={m}
                      locale={locale}
                      t={t}
                      index={idx}
                      selected={selectedId === m.id}
                      onOpen={() => focusMovement(m)}
                    />
                  ))}
                </div>
              </>
            )}
          </section>
        </div>
      )}

      {showCitizenModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="glass-panel relative w-full max-w-lg space-y-4 rounded-2xl border border-primary/40 bg-background/95 p-6 shadow-2xl">
            <button
              type="button"
              className="absolute right-4 top-4 rounded-lg p-1 text-muted-foreground hover:bg-secondary/60"
              onClick={() => setShowCitizenModal(false)}
            >
              <X className="h-5 w-5" />
            </button>
            <div>
              <h3 className="font-display text-lg font-bold">
                {bn ? "নাগরিক / ফিল্ড রিপোর্ট" : "Citizen / field report"}
              </h3>
              <p className="text-xs text-muted-foreground">
                {bn
                  ? "যাচাইয়ের আগে কম কনফিডেন্স পিন হিসেবে ম্যাপে যোগ হবে"
                  : "Added as a lower-confidence pin until verified"}
              </p>
            </div>
            <form onSubmit={submitCitizen} className="space-y-3 text-xs">
              <AppSelect
                value={citizenForm.district}
                onValueChange={(v) => setCitizenForm({ ...citizenForm, district: v })}
                className="w-full"
                triggerClassName="w-full"
                options={districtOptions.map((d) => ({ value: d, label: d }))}
              />
              <input
                required
                value={citizenForm.place}
                onChange={(e) => setCitizenForm({ ...citizenForm, place: e.target.value })}
                placeholder={bn ? "সুনির্দিষ্ট স্থান" : "Specific place"}
                className="w-full rounded-lg border border-border/50 bg-background px-3 py-2"
              />
              <input
                required
                value={citizenForm.title}
                onChange={(e) => setCitizenForm({ ...citizenForm, title: e.target.value })}
                placeholder={bn ? "ঘটনার শিরোনাম" : "Incident title"}
                className="w-full rounded-lg border border-border/50 bg-background px-3 py-2"
              />
              <AppSelect
                value={citizenForm.themeId}
                onValueChange={(v) => setCitizenForm({ ...citizenForm, themeId: v })}
                className="w-full"
                triggerClassName="w-full"
                options={CITIZEN_THEME_OPTIONS.map((x) => ({
                  value: x.id,
                  label: bn ? x.bn : x.en,
                }))}
              />
              <AppSelect
                value={citizenForm.partyId}
                onValueChange={(v) => setCitizenForm({ ...citizenForm, partyId: v })}
                className="w-full"
                triggerClassName="w-full"
                options={CITIZEN_PARTY_OPTIONS.map((x) => ({
                  value: x.id,
                  label: bn ? x.bn : x.en,
                }))}
              />
              <AppSelect
                value={citizenForm.urgency}
                onValueChange={(v) =>
                  setCitizenForm({ ...citizenForm, urgency: v as "active" | "recent" })
                }
                className="w-full"
                triggerClassName="w-full"
                options={[
                  { value: "active", label: bn ? "এখন চলমান" : "Ongoing now" },
                  { value: "recent", label: bn ? "সাম্প্রতিক" : "Recent" },
                ]}
              />
              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowCitizenModal(false)}>
                  {bn ? "বাতিল" : "Cancel"}
                </Button>
                <Button type="submit" size="sm" className="gap-1.5">
                  <Send className="h-3.5 w-3.5" />
                  {bn ? "জমা দিন" : "Submit"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </ModuleShell>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  danger,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors",
        active
          ? danger
            ? "border-red-400/50 bg-red-500/15 text-red-200"
            : "border-teal-400/50 bg-teal-500/15 text-teal-200"
          : "border-border/60 bg-background/40 text-muted-foreground hover:border-border hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}

function MovementCard({
  movement,
  locale,
  t,
  index = 0,
  selected,
  onOpen,
}: {
  movement: ProtestMovement;
  locale: string;
  t: (key: string) => string;
  index?: number;
  selected?: boolean;
  onOpen: () => void;
}) {
  const bn = locale === "bn";
  const historical = isHistoricalMovement(movement);
  const statusClass =
    movement.status === "active"
      ? "border-red-500/40 bg-red-500/15 text-red-200"
      : movement.status === "recent"
        ? "border-amber-500/40 bg-amber-500/10 text-amber-200"
        : historical
          ? "border-violet-500/40 bg-violet-500/15 text-violet-100"
          : "border-border/50 text-muted-foreground";

  const hasCasualties = movement.impact.deaths > 0 || movement.impact.injuries > 0;
  const hasDamage =
    movement.impact.homes_damaged > 0 || movement.impact.damage_mentions > 0;

  return (
    <FloatCard index={index} danger={movement.status === "active" && !historical}>
      <IntelCard
        accent={
          historical
            ? "default"
            : movement.status === "active"
              ? "danger"
              : hasCasualties
                ? "warning"
                : "default"
        }
        padding="md"
        hoverLift={false}
        float={false}
        shimmer={false}
        className={cn(selected && "ring-1 ring-primary/50", historical && "opacity-95")}
      >
        <button type="button" onClick={onOpen} className="w-full text-left">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-snug tracking-tight">
                {bn ? movement.title_bn : movement.title}
              </p>
              <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                <MapPin className="h-3 w-3 shrink-0 opacity-80" />
                <span>{bn ? movement.place_bn : movement.place}</span>
                {movement.division ? <span className="opacity-70">· {movement.division}</span> : null}
              </p>
              <p className="mt-1 text-[11px] font-medium text-emerald-200/90">
                {bn ? "আন্দোলনের সময়:" : "Protest period:"} {eventPeriodLabel(movement, bn)}
                {historical
                  ? bn
                    ? " · চলমান নয়"
                    : " · not ongoing"
                  : ""}
              </p>
            </div>
            <span className={cn("shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-medium", statusClass)}>
              {bn ? movement.status_bn : movement.status_en}
            </span>
          </div>
        </button>

        {(hasCasualties || hasDamage) && (
          <div className="mt-3 flex flex-wrap gap-2">
            {movement.impact.deaths > 0 && (
              <ImpactChip icon={<AlertTriangle className="h-3 w-3" />} label={t("impactDeaths")} value={movement.impact.deaths} hot />
            )}
            {movement.impact.injuries > 0 && (
              <ImpactChip icon={<Users className="h-3 w-3" />} label={t("impactInjured")} value={movement.impact.injuries} hot />
            )}
            {movement.impact.homes_damaged > 0 && (
              <ImpactChip icon={<Home className="h-3 w-3" />} label={t("impactHomes")} value={movement.impact.homes_damaged} />
            )}
            {movement.impact.damage_mentions > 0 && movement.impact.homes_damaged === 0 && (
              <ImpactChip icon={<Home className="h-3 w-3" />} label={t("impactDamageMentions")} value={movement.impact.damage_mentions} />
            )}
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          <Badge variant="outline" className="text-[10px]">
            <Megaphone className="mr-1 h-3 w-3" />
            {movement.article_count} {t("reports")}
          </Badge>
          <Badge variant="outline" className="text-[10px]">
            <BellRing className="mr-1 h-3 w-3" />
            {confidenceLabel(movement.source_confidence ?? 0, bn)}
          </Badge>
          <span className="tabular-nums">{hoursAgoLabel(movement.last_seen_at, bn)}</span>
        </div>

        {movement.articles.length > 0 && (
          <ul className="mt-3 space-y-1.5 border-t border-border/40 pt-2.5">
            {movement.articles.slice(0, 2).map((a) => (
              <li key={a.id}>
                <SourceLink
                  href={a.url}
                  title={a.title}
                  meta={a.source_name}
                  openText={bn ? "খবর" : "Open"}
                  openLabel={bn ? "সোর্স খবর খুলুন" : "Open source article"}
                />
              </li>
            ))}
          </ul>
        )}
      </IntelCard>
    </FloatCard>
  );
}

function ImpactChip({
  icon,
  label,
  value,
  hot,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  hot?: boolean;
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border px-2 py-1",
        hot ? "border-red-500/40 bg-red-500/10" : "border-border/50 bg-background/30",
      )}
    >
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <span className={cn("text-xs font-semibold tabular-nums", hot && "text-red-300")}>
        {value.toLocaleString()}
      </span>
    </div>
  );
}
