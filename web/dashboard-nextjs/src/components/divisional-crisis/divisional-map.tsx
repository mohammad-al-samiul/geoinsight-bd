"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocale } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import {
  BellRing,
  Droplets,
  Flame,
  Fuel,
  MapPin,
  Pause,
  Play,
  Route,
  ShieldAlert,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MapSkeleton } from "@/components/ui/skeleton";
import {
  DIVISION_SHORTAGE_SITES,
  HIGHWAY_CORRIDORS,
  type DistrictInfo,
  type DivisionCrisisData,
  type LiveIncidentAlert,
  type ShortageKind,
  type ShortageSite,
} from "@/lib/divisional-crisis-data";

const DivisionalCrisisMapInner = dynamic(
  () =>
    import("@/components/divisional-crisis/divisional-crisis-map-inner").then(
      (m) => m.DivisionalCrisisMapInner,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[320px] items-center justify-center rounded-xl">
        <MapSkeleton />
      </div>
    ),
  },
);

interface DivisionalMapProps {
  divisions: DivisionCrisisData[];
  selectedDivisionId: string;
  onSelectDivision: (id: string) => void;
  liveUpdatedAt?: string | null;
  shortageSites?: ShortageSite[];
  compareDivisionIds?: [string, string] | null;
  onComparePick?: (divisionId: string) => void;
  liveAlerts?: LiveIncidentAlert[];
  onAlertFromSite?: (site: ShortageSite) => void;
  onSelectDistrict?: (district: DistrictInfo, division: DivisionCrisisData) => void;
  stressSurgePercentage?: number;
  onStressChange?: (value: number) => void;
  timelineHour?: number | null;
  onTimelineHourChange?: (hour: number | null) => void;
  timelinePlaying?: boolean;
  onTimelinePlayingChange?: (playing: boolean) => void;
}

const KIND_META: Record<
  ShortageKind,
  { color: string; labelBn: string; labelEn: string; Icon: typeof Flame }
> = {
  gas: { color: "#f59e0b", labelBn: "গ্যাস/সিএনজি", labelEn: "Gas / CNG", Icon: Flame },
  fuel: { color: "#f97316", labelBn: "তেল/পাম্প", labelEn: "Fuel pumps", Icon: Fuel },
  power: { color: "#a855f7", labelBn: "বিদ্যুৎ", labelEn: "Power", Icon: Zap },
  water: { color: "#06b6d4", labelBn: "পানি", labelEn: "Water", Icon: Droplets },
};

type LayerFilter = "all" | ShortageKind;

export function DivisionalMap({
  divisions,
  selectedDivisionId,
  onSelectDivision,
  liveUpdatedAt,
  shortageSites = DIVISION_SHORTAGE_SITES,
  compareDivisionIds = null,
  onComparePick,
  liveAlerts = [],
  onAlertFromSite,
  onSelectDistrict,
  stressSurgePercentage = 0,
  onStressChange,
  timelineHour = null,
  onTimelineHourChange,
  timelinePlaying = false,
  onTimelinePlayingChange,
}: DivisionalMapProps) {
  const locale = useLocale();
  const bn = locale === "bn";
  const [layer, setLayer] = useState<LayerFilter>("all");
  const [activeSiteId, setActiveSiteId] = useState<string | null>(null);
  const [activeAlertId, setActiveAlertId] = useState<string | null>(null);
  const [showCorridors, setShowCorridors] = useState(true);
  const [showAlertPins, setShowAlertPins] = useState(true);
  const [activeCorridorId, setActiveCorridorId] = useState<string | null>(null);

  const displayHour = timelineHour ?? new Date().getHours();

  const liveSites = useMemo(() => {
    const byId = new Map(divisions.map((d) => [d.id, d]));
    return shortageSites.map((site) => {
      const div = byId.get(site.divisionId);
      if (!div) return site;
      let score = 0;
      if (site.kind === "gas") score = div.resources.gas.deficitPercentage;
      else if (site.kind === "fuel") score = div.resources.fuelOil.stockDeficitPercentage * 2;
      else if (site.kind === "power")
        score = Math.min(100, Math.round(div.resources.electricity.avgLoadSheddingHours * 14));
      else score = div.resources.water.scarcityIndex;
      const severity: ShortageSite["severity"] =
        score >= 70 ? "critical" : score >= 45 ? "high" : "moderate";
      return { ...site, severity };
    });
  }, [shortageSites, divisions]);

  const visibleSites = useMemo(() => {
    return liveSites.filter((site) => layer === "all" || site.kind === layer);
  }, [liveSites, layer]);

  const mapAlerts = useMemo(() => {
    return liveAlerts.filter((a) => typeof a.lat === "number" && typeof a.lng === "number");
  }, [liveAlerts]);

  const activeSite = liveSites.find((s) => s.id === activeSiteId) ?? null;
  const activeAlert = mapAlerts.find((a) => a.id === activeAlertId) ?? null;
  const activeCorridor = HIGHWAY_CORRIDORS.find((c) => c.id === activeCorridorId) ?? null;
  const selectedDiv = divisions.find((d) => d.id === selectedDivisionId);
  const compareA = compareDivisionIds?.[0];
  const compareB = compareDivisionIds?.[1];

  const siteCounts = useMemo(() => {
    const counts: Record<ShortageKind, number> = { gas: 0, fuel: 0, power: 0, water: 0 };
    for (const site of liveSites) counts[site.kind] += 1;
    return counts;
  }, [liveSites]);

  useEffect(() => {
    if (!activeSiteId) return;
    if (!visibleSites.some((s) => s.id === activeSiteId)) setActiveSiteId(null);
  }, [visibleSites, activeSiteId]);

  return (
    <div className="glass-panel relative overflow-hidden rounded-2xl border border-border/50 bg-background/60 p-3 backdrop-blur-md sm:p-4">
      <div className="mb-3 flex flex-col gap-2 border-b border-border/40 pb-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 shrink-0 text-primary" />
            <h3 className="font-display text-sm font-semibold text-foreground">
              {bn
                ? "বাংলাদেশ মানচিত্র — ৮ বিভাগীয় সংকট ম্যাপ"
                : "Bangladesh Map — 8 Division Shortage View"}
            </h3>
          </div>
          <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
            {bn
              ? "আসল বিভাগীয় সীমানা · পাম্প/গ্রিড পিন · করিডোর · লাইভ স্কোর"
              : "Real division boundaries · pump/grid pins · corridors · live scores"}
            {liveUpdatedAt ? (
              <span className="ml-2 font-mono text-emerald-400/90">
                · {bn ? "লাইভ" : "Live"} {new Date(liveUpdatedAt).toLocaleTimeString()}
              </span>
            ) : null}
            {stressSurgePercentage > 0 ? (
              <span className="ml-2 text-amber-300">· What-if +{stressSurgePercentage}%</span>
            ) : null}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              ["all", bn ? "সব" : "All"],
              ["gas", bn ? "গ্যাস" : "Gas"],
              ["fuel", bn ? "তেল" : "Fuel"],
              ["power", bn ? "বিদ্যুৎ" : "Power"],
              ["water", bn ? "পানি" : "Water"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setLayer(id);
                setActiveSiteId(null);
              }}
              className={cn(
                "rounded-md border px-2.5 py-1 text-[10px] font-semibold transition",
                layer === id
                  ? "border-primary/50 bg-primary/20 text-primary"
                  : "border-border/50 bg-background/40 text-muted-foreground hover:border-border hover:text-foreground",
              )}
            >
              {label}
              {id !== "all" ? ` (${siteCounts[id]})` : ""}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowCorridors((v) => !v)}
            className={cn(
              "inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-[10px] font-semibold transition",
              showCorridors
                ? "border-sky-500/40 bg-sky-500/15 text-sky-300"
                : "border-border/50 bg-background/40 text-muted-foreground",
            )}
          >
            <Route className="h-3 w-3" />
            {bn ? "করিডোর" : "Corridors"}
          </button>
          <button
            type="button"
            onClick={() => setShowAlertPins((v) => !v)}
            className={cn(
              "inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-[10px] font-semibold transition",
              showAlertPins
                ? "border-rose-500/40 bg-rose-500/15 text-rose-300"
                : "border-border/50 bg-background/40 text-muted-foreground",
            )}
          >
            <BellRing className="h-3 w-3" />
            {bn ? `অ্যালার্ট (${mapAlerts.length})` : `Alerts (${mapAlerts.length})`}
          </button>
        </div>
      </div>

      <div className="mb-3 grid gap-3 rounded-xl border border-border/40 bg-background/40 p-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2 text-[11px]">
            <span className="font-semibold text-foreground">
              {bn ? "২৪ ঘণ্টা হিটম্যাপ স্ক্রাব" : "24h heatmap scrub"}
            </span>
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-cyan-300">
                {String(displayHour).padStart(2, "0")}:00
                {timelineHour == null ? (bn ? " · লাইভ" : " · live") : ""}
              </span>
              <button
                type="button"
                onClick={() => onTimelinePlayingChange?.(!timelinePlaying)}
                className="rounded border border-border/50 p-1 text-muted-foreground hover:text-foreground"
                aria-label={timelinePlaying ? "Pause" : "Play"}
              >
                {timelinePlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              </button>
              <button
                type="button"
                onClick={() => {
                  onTimelinePlayingChange?.(false);
                  onTimelineHourChange?.(null);
                }}
                className="rounded border border-border/50 px-1.5 py-0.5 text-[10px] text-muted-foreground hover:text-foreground"
              >
                {bn ? "রিসেট" : "Reset"}
              </button>
            </div>
          </div>
          <input
            type="range"
            min={0}
            max={23}
            step={1}
            value={displayHour}
            onChange={(e) => onTimelineHourChange?.(Number(e.target.value))}
            className="w-full accent-cyan-500"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-semibold text-foreground">
              {bn ? "হোয়াট-ইফ: জাতীয় ঘাটতি সার্জ" : "What-if: national shortage surge"}
            </span>
            <strong className="font-mono text-amber-300">+{stressSurgePercentage}%</strong>
          </div>
          <input
            type="range"
            min={0}
            max={40}
            step={1}
            value={stressSurgePercentage}
            onChange={(e) => onStressChange?.(Number(e.target.value))}
            className="w-full accent-amber-500"
          />
          <div className="flex flex-wrap gap-1">
            {[0, 10, 20, 30].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => onStressChange?.(v)}
                className={cn(
                  "rounded border px-2 py-0.5 text-[10px] font-semibold",
                  stressSurgePercentage === v
                    ? "border-amber-400/50 bg-amber-500/20 text-amber-200"
                    : "border-border/40 text-muted-foreground",
                )}
              >
                {v === 0 ? (bn ? "নরমাল" : "Normal") : `+${v}%`}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500" /> {bn ? "ঝুঁকি ৮০+" : "Risk 80+"}
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> 70–79
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" /> {bn ? "নিম্ন ঝুঁকি" : "Lower risk"}
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: KIND_META.gas.color }} /> {bn ? "গ্যাস" : "Gas"}
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: KIND_META.fuel.color }} /> {bn ? "তেল" : "Fuel"}
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: KIND_META.power.color }} /> {bn ? "বিদ্যুৎ" : "Power"}
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: KIND_META.water.color }} /> {bn ? "পানি" : "Water"}
        </span>
        {compareDivisionIds ? (
          <span className="text-violet-300">
            {bn ? "কম্পেয়ার" : "Compare"}: {compareA}/{compareB}
          </span>
        ) : null}
      </div>

      <div className="grid items-stretch gap-4 lg:grid-cols-12">
        <div className="relative min-h-[360px] overflow-hidden rounded-xl border border-border/40 lg:col-span-7 lg:min-h-[480px]">
          <DivisionalCrisisMapInner
            divisions={divisions}
            selectedDivisionId={selectedDivisionId}
            compareDivisionIds={compareDivisionIds}
            sites={visibleSites}
            alerts={mapAlerts}
            corridors={HIGHWAY_CORRIDORS}
            showCorridors={showCorridors}
            showAlertPins={showAlertPins}
            activeSiteId={activeSiteId}
            activeAlertId={activeAlertId}
            activeCorridorId={activeCorridorId}
            bn={bn}
            onSelectDivision={onSelectDivision}
            onComparePick={onComparePick}
            onSiteClick={(siteId, divisionId) => {
              setActiveSiteId(siteId);
              setActiveAlertId(null);
              setActiveCorridorId(null);
              onSelectDivision(divisionId);
            }}
            onAlertClick={(alertId, divisionId) => {
              setActiveAlertId(alertId);
              setActiveSiteId(null);
              setActiveCorridorId(null);
              onSelectDivision(divisionId);
            }}
            onCorridorClick={(corridorId) => {
              setActiveCorridorId(corridorId);
              setActiveSiteId(null);
              setActiveAlertId(null);
            }}
          />
          <p className="pointer-events-none absolute bottom-2 left-1/2 z-[400] -translate-x-1/2 rounded bg-background/80 px-2 py-0.5 text-[10px] text-muted-foreground backdrop-blur">
            {bn ? "ডাবল-ক্লিক = কম্পেয়ার · জুম/প্যান করুন" : "Double-click = compare · zoom/pan"}
          </p>
        </div>

        <div className="space-y-3 lg:col-span-5">
          <AnimatePresence mode="wait">
            {activeSite ? (
              <motion.div
                key={activeSite.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                className="space-y-2 rounded-xl border border-amber-500/35 bg-background/90 p-4 shadow-lg"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      {bn ? KIND_META[activeSite.kind].labelBn : KIND_META[activeSite.kind].labelEn}
                      {" · "}
                      {activeSite.severity === "critical"
                        ? bn
                          ? "সংকটজনক"
                          : "Critical"
                        : activeSite.severity === "high"
                          ? bn
                            ? "উচ্চ"
                            : "High"
                          : bn
                            ? "মাঝারি"
                            : "Moderate"}
                    </p>
                    <h4 className="mt-1 font-display text-base font-bold text-foreground">
                      {bn ? activeSite.nameBn : activeSite.nameEn}
                    </h4>
                  </div>
                  <button
                    type="button"
                    className="rounded-md px-2 py-1 text-[10px] text-muted-foreground hover:bg-secondary/50"
                    onClick={() => setActiveSiteId(null)}
                  >
                    {bn ? "বন্ধ" : "Close"}
                  </button>
                </div>
                <p className="text-sm leading-relaxed text-foreground/90">
                  {bn ? activeSite.detailBn : activeSite.detailEn}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {bn ? "বিভাগ:" : "Division:"}{" "}
                  <strong className="text-foreground">
                    {bn
                      ? divisions.find((d) => d.id === activeSite.divisionId)?.nameBn
                      : divisions.find((d) => d.id === activeSite.divisionId)?.nameEn}
                  </strong>
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {onAlertFromSite ? (
                    <button
                      type="button"
                      onClick={() => onAlertFromSite(activeSite)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-500/15 px-3 py-1.5 text-[11px] font-semibold text-rose-200 hover:bg-rose-500/25"
                    >
                      <BellRing className="h-3.5 w-3.5" />
                      {bn ? "এই পিন থেকে অ্যালার্ট" : "Alert from this pin"}
                    </button>
                  ) : null}
                  {onComparePick ? (
                    <button
                      type="button"
                      onClick={() => onComparePick(activeSite.divisionId)}
                      className="rounded-lg border border-violet-500/40 bg-violet-500/15 px-3 py-1.5 text-[11px] font-semibold text-violet-200 hover:bg-violet-500/25"
                    >
                      {bn ? "কম্পেয়ারে যোগ" : "Add to compare"}
                    </button>
                  ) : null}
                </div>
              </motion.div>
            ) : activeAlert ? (
              <motion.div
                key={activeAlert.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                className="space-y-2 rounded-xl border border-rose-500/35 bg-background/90 p-4 shadow-lg"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-rose-300/90">
                      {activeAlert.source === "citizen"
                        ? bn
                          ? "নাগরিক রিপোর্ট"
                          : "Citizen report"
                        : activeAlert.source === "pin-alert"
                          ? bn
                            ? "পিন অ্যালার্ট"
                            : "Pin alert"
                          : bn
                            ? "অপস অ্যালার্ট"
                            : "Ops alert"}
                    </p>
                    <h4 className="mt-1 font-display text-base font-bold text-foreground">
                      {bn ? activeAlert.titleBn : activeAlert.titleEn}
                    </h4>
                  </div>
                  <button
                    type="button"
                    className="rounded-md px-2 py-1 text-[10px] text-muted-foreground hover:bg-secondary/50"
                    onClick={() => setActiveAlertId(null)}
                  >
                    {bn ? "বন্ধ" : "Close"}
                  </button>
                </div>
                <p className="text-sm text-foreground/90">
                  {bn ? activeAlert.locationBn : activeAlert.locationEn}
                </p>
                <p className="text-[11px] text-muted-foreground">{activeAlert.timestamp}</p>
              </motion.div>
            ) : activeCorridor ? (
              <motion.div
                key={activeCorridor.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                className="space-y-2 rounded-xl border border-sky-500/35 bg-background/90 p-4 shadow-lg"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-300">
                      {bn ? "হাইওয়ে করিডোর" : "Highway corridor"}
                    </p>
                    <h4 className="mt-1 font-display text-base font-bold">
                      {bn ? activeCorridor.nameBn : activeCorridor.nameEn}
                    </h4>
                  </div>
                  <button
                    type="button"
                    className="rounded-md px-2 py-1 text-[10px] text-muted-foreground hover:bg-secondary/50"
                    onClick={() => setActiveCorridorId(null)}
                  >
                    {bn ? "বন্ধ" : "Close"}
                  </button>
                </div>
                <p className="text-sm leading-relaxed text-foreground/90">
                  {bn ? activeCorridor.stressHintBn : activeCorridor.stressHintEn}
                </p>
              </motion.div>
            ) : selectedDiv ? (
              (() => {
                const displayDiv = selectedDiv;
                const divSites = liveSites.filter((s) => s.divisionId === displayDiv.id);
                const divAlerts = mapAlerts.filter((a) => a.divisionId === displayDiv.id);
                return (
                  <div className="space-y-3 rounded-xl border border-primary/30 bg-background/80 p-4 shadow-lg">
                    <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2">
                      <div className="min-w-0">
                        <h4 className="font-display text-base font-bold text-foreground">
                          {bn ? displayDiv.nameBn : displayDiv.nameEn} {bn ? "বিভাগ" : "Division"}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          {bn
                            ? `${divSites.length}টি সংকট পয়েন্ট · ${divAlerts.length}টি অ্যালার্ট · সদর: ${displayDiv.headquarters_bn}`
                            : `${divSites.length} shortage pts · ${divAlerts.length} alerts · HQ: ${displayDiv.headquarters}`}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "shrink-0 rounded-lg border px-2.5 py-1 font-mono text-xl font-bold",
                          displayDiv.overallSeverityScore >= 80
                            ? "border-red-500/40 bg-red-500/20 text-red-300"
                            : displayDiv.overallSeverityScore >= 70
                              ? "border-amber-500/40 bg-amber-500/20 text-amber-300"
                              : "border-emerald-500/40 bg-emerald-500/20 text-emerald-300",
                        )}
                      >
                        {displayDiv.overallSeverityScore}/100
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <Metric
                        icon={<Flame className="h-3 w-3 text-amber-400" />}
                        label={bn ? "গ্যাস ঘাটতি" : "Gas deficit"}
                        value={`${displayDiv.resources.gas.deficitPercentage}%`}
                        valueClass="text-amber-400"
                      />
                      <Metric
                        icon={<Fuel className="h-3 w-3 text-orange-400" />}
                        label={bn ? "তেল মজুদ ঘাটতি" : "Fuel stock deficit"}
                        value={`${displayDiv.resources.fuelOil.stockDeficitPercentage}%`}
                        valueClass="text-orange-300"
                      />
                      <Metric
                        icon={<Zap className="h-3 w-3 text-violet-300" />}
                        label={bn ? "লোডশেডিং" : "Load-shedding"}
                        value={`${displayDiv.resources.electricity.avgLoadSheddingHours} hrs`}
                        valueClass="text-violet-300"
                      />
                      <Metric
                        icon={<Droplets className="h-3 w-3 text-cyan-400" />}
                        label={bn ? "পানি সংকট" : "Water index"}
                        value={`${displayDiv.resources.water.scarcityIndex}`}
                        valueClass="text-cyan-300"
                      />
                    </div>

                    {displayDiv.districts.length > 0 ? (
                      <div className="space-y-1.5">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                          {bn
                            ? `জেলা ড্রিল-ডাউন (${displayDiv.districts.length}/${displayDiv.districtsCount})`
                            : `District drill-down (${displayDiv.districts.length}/${displayDiv.districtsCount})`}
                        </p>
                        <div className="flex max-h-24 flex-wrap gap-1.5 overflow-y-auto">
                          {displayDiv.districts.map((district) => (
                            <button
                              key={district.id}
                              type="button"
                              onClick={() => onSelectDistrict?.(district, displayDiv)}
                              className={cn(
                                "rounded-md border px-2 py-1 text-[10px] font-medium transition",
                                district.severityScore >= 75
                                  ? "border-red-500/40 bg-red-500/10 text-red-200"
                                  : "border-border/40 bg-background/50 text-foreground/90 hover:border-primary/40",
                              )}
                              title={bn ? district.topHotspot_bn : district.topHotspot}
                            >
                              {bn ? district.nameBn : district.nameEn}
                              <span className="ml-1 font-mono text-muted-foreground">
                                {district.severityScore}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    <div className="space-y-1.5">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                        {bn ? "ম্যাপের সংকট পয়েন্ট" : "Shortage points on map"}
                      </p>
                      <ul className="max-h-32 space-y-1 overflow-y-auto sm:max-h-36">
                        {divSites.map((site) => {
                          const meta = KIND_META[site.kind];
                          return (
                            <li key={site.id}>
                              <button
                                type="button"
                                onClick={() => setActiveSiteId(site.id)}
                                className="flex w-full items-center gap-2 rounded-lg border border-border/30 bg-background/40 px-2.5 py-1.5 text-left text-[11px] transition hover:border-primary/40"
                              >
                                <span
                                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                                  style={{ background: meta.color }}
                                />
                                <span className="min-w-0 flex-1 font-medium leading-snug text-foreground">
                                  {bn ? site.nameBn : site.nameEn}
                                </span>
                                <span className="shrink-0 text-muted-foreground">
                                  {bn ? meta.labelBn : meta.labelEn}
                                </span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => onSelectDivision("all")}
                        className="rounded-lg border border-border/50 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
                      >
                        {bn ? "সব বিভাগ" : "All divisions"}
                      </button>
                      {onComparePick ? (
                        <button
                          type="button"
                          onClick={() => onComparePick(displayDiv.id)}
                          className="rounded-lg border border-violet-500/40 bg-violet-500/15 py-1.5 text-xs font-semibold text-violet-200"
                        >
                          {bn ? "কম্পেয়ার" : "Compare"}
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })()
            ) : (
              <div className="space-y-1 rounded-xl border border-dashed border-border/50 p-6 text-center text-xs text-muted-foreground">
                <ShieldAlert className="mx-auto h-6 w-6 text-muted-foreground" />
                <p className="font-medium text-foreground">
                  {bn ? "বাংলাদেশ ম্যাপে বিভাগ / পিন ক্লিক করুন" : "Click a division or pin on the Bangladesh map"}
                </p>
                <p>
                  {bn
                    ? "৮ বিভাগের আসল সীমানায় গ্যাস, তেল, বিদ্যুৎ ও পানি সংকট দেখাবে"
                    : "Shows gas, fuel, power & water shortages on real 8-division boundaries"}
                </p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
  valueClass,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded border border-border/30 bg-background/50 p-2">
      <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
        {icon}
        {label}
      </span>
      <strong className={cn("text-sm tabular-nums text-foreground", valueClass)}>{value}</strong>
    </div>
  );
}
