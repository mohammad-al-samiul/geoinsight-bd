"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  Camera,
  CheckCircle2,
  Clock3,
  Filter,
  Layers3,
  MapPin,
  MessageSquare,
  PieChart,
  RefreshCw,
  Siren,
  Sparkles,
  UserRound,
} from "lucide-react";
import {
  DataTable,
  ModuleShell,
} from "@/components/modules/module-shell";
import {
  LocalBars,
  LocalDonut,
  LocalKpiSpark,
  LocalKpiSparkGrid,
  LocalVizCard,
} from "@/components/local-entity/local-viz";
import { LocalWardMap } from "@/components/local-entity/local-ward-map";
import { LocalMapLayerBar } from "@/components/local-entity/local-map-layer-bar";
import { LocalSourceBadge } from "@/components/local-entity/local-source-badge";
import { LocalEvidenceFeed } from "@/components/local-entity/local-evidence-feed";
import { PhotoFileField } from "@/components/local-entity/photo-file-field";
import { Button } from "@/components/ui/button";
import { AppSelect } from "@/components/ui/app-select";
import {
  type CitizenComplaint,
  type ComplaintCategory,
  type ComplaintOperationalStatus,
  type SignalSource,
  useComplaintAssignees,
  useComplaintTimeline,
  useLocalComplaints,
} from "@/hooks/use-local-dss";
import { useLocalEntityOverview } from "@/hooks/use-local-entity";
import { useLocalEntityId, withLocalEntityHref } from "@/hooks/use-local-entity-id";
import {
  resolveEntityAnchor,
  buildLocalWardGeoJson,
  wardCentroidIndex,
} from "@/lib/local-ward-geo";
import { cn } from "@/lib/utils";
import { complaintPhotoSrc } from "@/lib/complaint-photo";
import { remainingClock } from "@/lib/live-countdown";
import { apiClient } from "@/lib/api-client";
import type { LocalMapMarker } from "@/components/local-entity/local-ward-map-inner";
import { useLayerFilterState } from "@/hooks/use-layer-filter-state";
import {
  COMPLAINT_LAYERS,
  complaintCategoryToLayer,
  filterLayerEvents,
  isSignalSource,
  type LayerEvent,
} from "@/lib/local-map-layers";

const CATEGORIES: ComplaintCategory[] = [
  "INFRASTRUCTURE",
  "UTILITIES",
  "DRAINAGE",
  "WASTE",
  "SAFETY",
  "CRIME",
  "CORRUPTION",
  "TRAFFIC",
  "EDUCATION",
  "HEALTH",
  "UNEMPLOYMENT",
  "HILL_CUTTING",
  "HERITAGE",
  "OTHER",
];

const STATUS_FILTERS: Array<ComplaintOperationalStatus | "ALL"> = [
  "ALL",
  "OPEN",
  "IN_PROGRESS",
  "OVERDUE",
  "RESOLVED",
];

function statusClass(status: string) {
  switch (status) {
    case "OVERDUE":
      return "border-destructive/40 bg-destructive/15 text-destructive";
    case "OPEN":
      return "border-amber-500/30 bg-amber-500/10 text-amber-200";
    case "IN_PROGRESS":
      return "border-sky-500/30 bg-sky-500/10 text-sky-200";
    case "RESOLVED":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
    default:
      return "border-border/50 bg-secondary/30 text-muted-foreground";
  }
}

function severityClass(severity: string) {
  switch (severity) {
    case "CRITICAL":
      return "border-destructive/30 bg-destructive/10 text-destructive";
    case "HIGH":
      return "border-amber-500/30 bg-amber-500/10 text-amber-200";
    case "MEDIUM":
      return "border-sky-500/30 bg-sky-500/10 text-sky-200";
    default:
      return "border-border/50 bg-secondary/30 text-muted-foreground";
  }
}

function looksLatin(text: string | null | undefined): boolean {
  if (!text) return false;
  const letters = text.replace(/[^A-Za-z\u0980-\u09FF]/g, "");
  if (!letters) return false;
  const latin = (letters.match(/[A-Za-z]/g) ?? []).length;
  return latin / letters.length > 0.55;
}

function slaCountdown(
  deadlineIso: string,
  status: string,
  locale: string,
  units: { hour: string; minute: string; overduePrefix: string },
) {
  if (status === "RESOLVED") {
    return { text: "—", breached: false, tone: "text-muted-foreground" };
  }
  const ms = new Date(deadlineIso).getTime() - Date.now();
  const breached = ms < 0;
  const absH = Math.abs(ms) / 3_600_000;
  const hours = Math.floor(absH);
  const mins = Math.round((absH - hours) * 60);
  const clock = new Date(deadlineIso).toLocaleString(locale, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const span = `${hours}${units.hour} ${mins}${units.minute}`;
  if (breached) {
    return {
      text: `${units.overduePrefix}${span} · ${clock}`,
      breached: true,
      tone: "text-destructive",
    };
  }
  return {
    text: `${span} · ${clock}`,
    breached: false,
    tone: hours < 4 ? "text-amber-300" : "text-emerald-300",
  };
}

function photoQaClass(status: string | null | undefined) {
  if (status === "FAIL") return "border-destructive/40 bg-destructive/10 text-destructive";
  if (status === "WARN") return "border-amber-500/40 bg-amber-500/10 text-amber-200";
  if (status === "PASS") return "border-emerald-500/40 bg-emerald-500/10 text-emerald-200";
  return "border-primary/25 bg-primary/5 text-primary";
}

export function LocalComplaintsPanel() {
  const t = useTranslations("modules.localComplaints");
  const tv = useTranslations("modules.localViz");
  const ts = useTranslations("modules.localMapLayers");
  const locale = useLocale();
  const isBn = locale.startsWith("bn");
  const entityId = useLocalEntityId();

  const [statusFilter, setStatusFilter] = useState<ComplaintOperationalStatus | "ALL">("ALL");
  const [redOnly, setRedOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: overview } = useLocalEntityOverview(entityId);
  const scopedEntity = entityId ?? overview?.entity.id ?? null;
  const { data, error, loading, reload, start, resolve, assign, addNote, create, triage, busyId } =
    useLocalComplaints(scopedEntity, {
      status: statusFilter,
      redAlertOnly: redOnly,
      limit: 80,
    });
  const assignees = useComplaintAssignees(scopedEntity);
  const { events: timeline, reload: reloadTimeline } = useComplaintTimeline(selectedId);
  const [timelineNote, setTimelineNote] = useState("");

  const [wardId, setWardId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<ComplaintCategory>("INFRASTRUCTURE");
  const [severity, setSeverity] = useState("HIGH");
  const [citizenName, setCitizenName] = useState("");
  const [citizenPhone, setCitizenPhone] = useState("");
  const [locationLabel, setLocationLabel] = useState("");
  const [isRedAlert, setIsRedAlert] = useState(false);
  const [beforeUrl, setBeforeUrl] = useState("");
  const [resolveUrl, setResolveUrl] = useState("");
  const [resolveNote, setResolveNote] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [triageBusy, setTriageBusy] = useState(false);
  const [triageHint, setTriageHint] = useState<string | null>(null);
  const [slaHours, setSlaHours] = useState(24);
  const [assistMsg, setAssistMsg] = useState("");
  const [assistBusy, setAssistBusy] = useState(false);
  const [assistReply, setAssistReply] = useState<string | null>(null);
  const [source, setSource] = useState<SignalSource>("CITIZEN");
  const layerState = useLayerFilterState();
  const [, setNowTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setNowTick((n) => n + 1), 1_000);
    return () => window.clearInterval(id);
  }, []);

  const wards = overview?.wards ?? [];
  const selectedWard = wardId || wards[0]?.id || "";
  const slaUnits = {
    hour: t("unitHour"),
    minute: t("unitMinute"),
    overduePrefix: t("overduePrefix"),
  };

  const complaintTitle = (row: CitizenComplaint) =>
    isBn ? row.titleBn || row.title : row.title;

  const complaintSubtitle = (row: CitizenComplaint) => {
    const ward = isBn ? row.ward.nameBn || row.ward.name : row.ward.name;
    if (isBn) {
      // Avoid stacking Bangla title with English seed description/location.
      if (row.locationLabel && !looksLatin(row.locationLabel)) return row.locationLabel;
      return ward;
    }
    return row.description || row.locationLabel || ward;
  };

  const complaintDescription = (row: CitizenComplaint) => {
    if (!row.description) return null;
    if (isBn && looksLatin(row.description)) return null;
    return row.description;
  };

  const complaintLocation = (row: CitizenComplaint) => {
    const ward = isBn ? row.ward.nameBn || row.ward.name : row.ward.name;
    if (isBn && looksLatin(row.locationLabel)) return ward;
    return row.locationLabel || ward;
  };

  const severityLabel = (s: string) => {
    if (s === "CRITICAL") return t("severityCritical");
    if (s === "HIGH") return t("severityHigh");
    if (s === "MEDIUM") return t("severityMedium");
    if (s === "LOW") return t("severityLow");
    return s;
  };

  useEffect(() => {
    if (severity === "CRITICAL" || severity === "HIGH") setIsRedAlert(true);
  }, [severity]);

  const wardOptions = useMemo(
    () =>
      wards.map((w) => ({
        value: w.id,
        label: isBn ? w.nameBn || w.name : w.name,
      })),
    [wards, isBn],
  );

  const categoryLabel = (c: string) => {
    const map: Record<string, string> = {
      INFRASTRUCTURE: t("catInfrastructure"),
      DRAINAGE: t("catDrainage"),
      WASTE: t("catWaste"),
      SAFETY: t("catSafety"),
      TRAFFIC: t("catTraffic"),
      HILL_CUTTING: t("catHillCutting"),
      HERITAGE: t("catHeritage"),
      UTILITIES: t("catUtilities"),
      CRIME: t("catCrime"),
      CORRUPTION: t("catCorruption"),
      EDUCATION: t("catEducation"),
      HEALTH: t("catHealth"),
      UNEMPLOYMENT: t("catUnemployment"),
      OTHER: t("catOther"),
    };
    return map[c] ?? c;
  };

  const statusLabel = (s: string) => {
    if (s === "OPEN") return t("statusOpen");
    if (s === "IN_PROGRESS") return t("statusInProgress");
    if (s === "OVERDUE") return t("statusOverdue");
    if (s === "RESOLVED") return t("statusResolved");
    if (s === "ALL") return t("filterAll");
    return s;
  };

  const statusPie = useMemo(() => {
    if (!data) return [];
    return [
      { name: tv("open"), value: data.summary.open, color: "#fbbf24" },
      { name: tv("inProgress"), value: data.summary.inProgress, color: "#38bdf8" },
      { name: tv("overdue"), value: data.summary.overdue, color: "#f87171" },
      { name: tv("resolved"), value: data.summary.resolved, color: "#34d399" },
    ];
  }, [data, tv]);

  const severityBars = useMemo(() => {
    const counts: Record<string, number> = {
      CRITICAL: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0,
    };
    for (const item of data?.items ?? []) {
      counts[item.severity] = (counts[item.severity] ?? 0) + 1;
    }
    return [
      { name: t("severityCritical"), value: counts.CRITICAL },
      { name: t("severityHigh"), value: counts.HIGH },
      { name: t("severityMedium"), value: counts.MEDIUM },
      { name: t("severityLow"), value: counts.LOW },
    ];
  }, [data?.items, t]);

  const categoryBars = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of data?.items ?? []) {
      map.set(item.category, (map.get(item.category) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .map(([name, value]) => ({ name: categoryLabel(name), value }))
      .sort((a, b) => b.value - a.value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.items, locale]);

  const wardBars = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of data?.items ?? []) {
      const label = isBn ? item.ward.nameBn || item.ward.name : item.ward.name;
      map.set(label, (map.get(label) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [data?.items, isBn]);

  const wardScores = useMemo(() => {
    const openByWard = new Map<string, number>();
    const redByWard = new Map<string, number>();
    for (const item of data?.items ?? []) {
      if (item.status !== "RESOLVED") {
        openByWard.set(item.wardId, (openByWard.get(item.wardId) ?? 0) + 1);
      }
      if (item.isRedAlert) {
        redByWard.set(item.wardId, (redByWard.get(item.wardId) ?? 0) + 1);
      }
    }
    return (overview?.wards ?? []).map((w) => {
      const open = openByWard.get(w.id) ?? 0;
      return {
        wardId: w.id,
        score: Math.max(20, 95 - open * 10 - (redByWard.get(w.id) ?? 0) * 8),
        openComplaints: open,
        redAlerts: redByWard.get(w.id) ?? 0,
      };
    });
  }, [data?.items, overview?.wards]);

  const mapMarkers: LocalMapMarker[] = useMemo(() => {
    const code = overview?.entity.code ?? "CCC";
    const wardList = overview?.wards ?? [];
    const centroids = wardCentroidIndex(
      buildLocalWardGeoJson(code, wardList, wardScores),
    );
    const anchor = resolveEntityAnchor(code);
    const events: LayerEvent[] = (data?.items ?? [])
      .filter((c) => c.status !== "RESOLVED")
      .slice(0, 80)
      .map((c, i) => {
        const fromWard = centroids.get(c.wardId);
        return {
          id: c.id,
          layer: complaintCategoryToLayer(c.category),
          lat: c.lat ?? fromWard?.lat ?? anchor.lat + Math.sin(i) * 0.01,
          lng: c.lng ?? fromWard?.lng ?? anchor.lng + Math.cos(i) * 0.012,
          severity: c.severity,
          source: isSignalSource(c.source) ? c.source : "CITIZEN",
          occurredAt: c.createdAt,
          wardId: c.wardId,
          label: isBn ? c.titleBn || c.title : c.title,
          kind: c.category,
        };
      });
    return filterLayerEvents(events, layerState.filter).map((e) => ({
      id: e.id,
      lat: e.lat,
      lng: e.lng,
      severity: e.severity,
      label: e.label,
      layer: e.layer,
      source: e.source,
    }));
  }, [data?.items, overview?.entity.code, overview?.wards, wardScores, isBn, layerState.filter]);

  const selected: CitizenComplaint | null = useMemo(() => {
    if (!selectedId) return data?.items[0] ?? null;
    return data?.items.find((i) => i.id === selectedId) ?? data?.items[0] ?? null;
  }, [data?.items, selectedId]);

  const breachRate = useMemo(() => {
    if (!data) return 0;
    const openLike = data.summary.open + data.summary.inProgress + data.summary.overdue;
    if (!openLike) return 0;
    return Math.round((data.summary.overdue / openLike) * 100);
  }, [data]);

  const onCreate = async () => {
    setFormError(null);
    if (!selectedWard || title.trim().length < 3) {
      setFormError(t("formInvalid"));
      return;
    }
    try {
      await create({
        wardId: selectedWard,
        title: title.trim(),
        description: description.trim() || undefined,
        category,
        source,
        severity: severity as "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
        citizenName: citizenName.trim() || undefined,
        citizenPhone: citizenPhone.trim() || undefined,
        locationLabel: locationLabel.trim() || undefined,
        beforePhotoUrl: beforeUrl || undefined,
        isRedAlert,
        slaHours,
        entityId: overview?.entity.id,
      });
      setTitle("");
      setDescription("");
      setCitizenName("");
      setCitizenPhone("");
      setLocationLabel("");
      setTriageHint(null);
      setSlaHours(24);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t("createFailed"));
    }
  };

  const onAiTriage = async () => {
    if (title.trim().length < 2) {
      setFormError(t("formInvalid"));
      return;
    }
    setTriageBusy(true);
    setFormError(null);
    try {
      const suggestion = await triage({
        title: title.trim(),
        description: description.trim() || undefined,
        lang: isBn ? "bn" : "en",
      });
      setCategory(suggestion.category);
      setSeverity(suggestion.severity);
      setIsRedAlert(suggestion.isRedAlert);
      setSlaHours(suggestion.slaHours);
      setTriageHint(
        `${t("aiTriageHint")} · ${isBn ? suggestion.rationaleBn : suggestion.rationaleEn}`,
      );
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t("createFailed"));
    } finally {
      setTriageBusy(false);
    }
  };

  return (
    <ModuleShell
      title={t("title")}
      description={t("description")}
      loading={loading && !data}
      error={error}
      onRetry={reload}
      stats={
        data && (
          <LocalKpiSparkGrid>
            <LocalKpiSpark
              label={t("open")}
              value={String(data.summary.open)}
              base={data.summary.open}
              color="#fbbf24"
              accent="warning"
            />
            <LocalKpiSpark
              label={t("inProgress")}
              value={String(data.summary.inProgress)}
              base={data.summary.inProgress}
              color="#38bdf8"
            />
            <LocalKpiSpark
              label={t("overdue")}
              value={String(data.summary.overdue)}
              base={data.summary.overdue}
              color="#f87171"
              accent="danger"
            />
            <LocalKpiSpark
              label={t("resolved")}
              value={String(data.summary.resolved)}
              base={data.summary.resolved}
              color="#34d399"
              accent="success"
            />
            <LocalKpiSpark
              label={t("redAlerts")}
              value={String(data.summary.redAlerts)}
              base={data.summary.redAlerts}
              color="#fb7185"
              accent="warning"
            />
            <LocalKpiSpark
              label={t("breachRate")}
              value={`${breachRate}%`}
              base={breachRate}
              color="#f59e0b"
              accent="warning"
            />
          </LocalKpiSparkGrid>
        )
      }
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-secondary/20 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={cn(
                "rounded-md border px-2.5 py-1 text-[11px] font-medium tracking-wide transition",
                statusFilter === s
                  ? "border-primary/40 bg-primary/15 text-primary"
                  : "border-border/50 bg-background/40 text-muted-foreground hover:text-foreground",
                !isBn && "uppercase",
              )}
            >
              {statusLabel(s)}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setRedOnly((v) => !v)}
            className={cn(
              "inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-[11px] font-medium transition",
              redOnly
                ? "border-destructive/40 bg-destructive/15 text-destructive"
                : "border-border/50 bg-background/40 text-muted-foreground hover:text-foreground",
            )}
          >
            <Siren className="h-3.5 w-3.5" />
            {t("filterRed")}
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href={withLocalEntityHref("/local/alerts", scopedEntity)}>
              <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
              {t("openAlerts")}
            </Link>
          </Button>
          <Button size="sm" variant="outline" onClick={() => void reload()}>
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            {t("refresh")}
          </Button>
        </div>
      </div>

      {overview && (
        <div className="mb-4">
          <LocalMapLayerBar
            filter={layerState.filter}
            layers={COMPLAINT_LAYERS}
            wards={overview.wards}
            isBn={isBn}
            onToggleLayer={layerState.toggleLayer}
            onToggleSource={layerState.toggleSource}
            onToggleSeverity={layerState.toggleSeverity}
            onTimeRange={layerState.setTimeRange}
            onWard={layerState.setWardId}
            onReset={layerState.reset}
          />
          <LocalWardMap
            entityCode={overview.entity.code}
            wards={overview.wards}
            scores={wardScores}
            markers={mapMarkers}
            title={tv("slaChoropleth")}
            heightClassName="min-h-[300px] h-[360px]"
          />
        </div>
      )}

      <div className="mb-4 grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
        <LocalVizCard title={tv("slaMix")} icon={PieChart} delay={0.05}>
          <LocalDonut data={statusPie} height={230} />
        </LocalVizCard>
        <LocalVizCard title={tv("severityMix")} icon={Siren} delay={0.1}>
          <LocalBars data={severityBars} color="#f87171" height={230} />
        </LocalVizCard>
        <LocalVizCard title={t("categoryMix")} icon={Layers3} delay={0.12}>
          <LocalBars data={categoryBars} color="#a78bfa" height={230} layoutDir="horizontal" />
        </LocalVizCard>
        <LocalVizCard title={tv("wardLoad")} icon={Clock3} delay={0.15}>
          <LocalBars data={wardBars} layoutDir="horizontal" color="#38bdf8" height={230} />
        </LocalVizCard>
      </div>

      <section className="glass-panel mb-4 rounded-xl p-4 shadow-panel">
        <div className="mb-2 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">{t("assistTitle")}</h2>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            className="h-10 flex-1 rounded-md border border-border/60 bg-background px-3 text-sm"
            value={assistMsg}
            onChange={(e) => setAssistMsg(e.target.value)}
            placeholder={t("assistPlaceholder")}
          />
          <Button
            type="button"
            size="sm"
            className="h-10"
            disabled={assistBusy || assistMsg.trim().length < 2}
            onClick={() => {
              setAssistBusy(true);
              setAssistReply(null);
              void (async () => {
                try {
                  const res = await apiClient<{
                    success: boolean;
                    data: {
                      reply: string;
                      replyBn: string;
                      draftTitle?: string | null;
                      draftCategory?: string | null;
                      draftSeverity?: string | null;
                    };
                  }>("local-entity/citizen-assist", {
                    method: "POST",
                    body: JSON.stringify({
                      message: assistMsg.trim(),
                      lang: isBn ? "bn" : "en",
                      entityId: overview?.entity.id,
                    }),
                  });
                  setAssistReply(isBn ? res.data.replyBn : res.data.reply);
                  if (res.data.draftTitle) setTitle(res.data.draftTitle);
                  if (res.data.draftCategory) {
                    setCategory(res.data.draftCategory as ComplaintCategory);
                  }
                  if (res.data.draftSeverity) setSeverity(res.data.draftSeverity);
                } catch {
                  setAssistReply(null);
                } finally {
                  setAssistBusy(false);
                }
              })();
            }}
          >
            {assistBusy ? t("assistBusy") : t("assistSend")}
          </Button>
        </div>
        {assistReply ? (
          <p className="mt-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm leading-relaxed">
            {assistReply}
          </p>
        ) : null}
      </section>

      <section className="glass-panel mb-4 rounded-xl p-4 shadow-panel">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Siren className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">{t("newComplaint")}</h2>
          <span className="text-[11px] text-muted-foreground">{t("slaHint")}</span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="ml-auto h-7"
            disabled={triageBusy || busyId === "create"}
            onClick={() => void onAiTriage()}
          >
            {triageBusy ? t("aiTriageBusy") : t("aiTriage")}
          </Button>
        </div>
        {triageHint ? (
          <p className="mb-3 rounded-lg border border-primary/25 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
            {triageHint} · {t("slaHoursLabel", { hours: slaHours })}
          </p>
        ) : null}
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">{t("ward")}</label>
            <AppSelect
              value={selectedWard}
              onValueChange={setWardId}
              options={wardOptions}
              size="default"
              triggerClassName="h-10"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">{t("category")}</label>
            <AppSelect
              value={category}
              onValueChange={(v) => setCategory(v as ComplaintCategory)}
              options={CATEGORIES.map((c) => ({ value: c, label: categoryLabel(c) }))}
              size="default"
              triggerClassName="h-10"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">{t("sourceLabel")}</label>
            <AppSelect
              value={source}
              onValueChange={(v) => setSource(v as SignalSource)}
              options={[
                { value: "CITIZEN", label: ts("sourceCitizen") },
                { value: "OFFICIAL", label: ts("sourceOfficial") },
                { value: "NEWS", label: ts("sourceNews") },
                { value: "ACADEMIC", label: ts("sourceAcademic") },
              ]}
              size="default"
              triggerClassName="h-10"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">{t("severity")}</label>
            <AppSelect
              value={severity}
              onValueChange={setSeverity}
              options={[
                { value: "CRITICAL", label: t("severityCritical") },
                { value: "HIGH", label: t("severityHigh") },
                { value: "MEDIUM", label: t("severityMedium") },
                { value: "LOW", label: t("severityLow") },
              ]}
              size="default"
              triggerClassName="h-10"
            />
          </div>
          <label className="flex items-end gap-2 pb-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={isRedAlert}
              onChange={(e) => setIsRedAlert(e.target.checked)}
              className="rounded border-border"
            />
            {t("markRed")}
          </label>
          <div className="flex flex-col gap-1.5 md:col-span-2">
            <label className="text-xs text-muted-foreground">{t("titleLabel")}</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-10 rounded-lg border border-input bg-secondary/40 px-3 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
              placeholder={t("titlePlaceholder")}
            />
          </div>
          <div className="flex flex-col gap-1.5 md:col-span-2">
            <label className="text-xs text-muted-foreground">{t("descriptionLabel")}</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="h-10 rounded-lg border border-input bg-secondary/40 px-3 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
              placeholder={t("descriptionPlaceholder")}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">{t("citizenName")}</label>
            <input
              value={citizenName}
              onChange={(e) => setCitizenName(e.target.value)}
              className="h-10 rounded-lg border border-input bg-secondary/40 px-3 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">{t("citizenPhone")}</label>
            <input
              value={citizenPhone}
              onChange={(e) => setCitizenPhone(e.target.value)}
              className="h-10 rounded-lg border border-input bg-secondary/40 px-3 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="flex flex-col gap-1.5 md:col-span-2">
            <label className="text-xs text-muted-foreground">{t("locationLabel")}</label>
            <input
              value={locationLabel}
              onChange={(e) => setLocationLabel(e.target.value)}
              className="h-10 rounded-lg border border-input bg-secondary/40 px-3 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
              placeholder={t("locationPlaceholder")}
            />
          </div>
          <div className="md:col-span-2 xl:col-span-3">
            <PhotoFileField
              label={t("beforePhoto")}
              value={beforeUrl}
              onChange={setBeforeUrl}
              placeholder={t("photoPlaceholder")}
              imageOnlyError={t("photoImageOnly")}
              uploadFailedError={t("photoUploadFailed")}
            />
          </div>
          <div className="flex items-end">
            <Button
              className="w-full"
              onClick={() => void onCreate()}
              disabled={busyId === "create"}
            >
              {busyId === "create" ? t("creating") : t("create")}
            </Button>
          </div>
        </div>
        {formError && <p className="mt-3 text-sm text-destructive">{formError}</p>}
      </section>

      <section className="glass-panel mb-4 rounded-xl p-4 shadow-panel">
        <div className="mb-3 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">{t("resolveHelper")}</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <PhotoFileField
            label={t("afterPhoto")}
            value={resolveUrl}
            onChange={setResolveUrl}
            placeholder={t("photoPlaceholder")}
            imageOnlyError={t("photoImageOnly")}
            uploadFailedError={t("photoUploadFailed")}
          />
          <input
            value={resolveNote}
            onChange={(e) => setResolveNote(e.target.value)}
            className="h-10 rounded-lg border border-input bg-secondary/40 px-3 text-sm outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
            placeholder={t("resolutionNote")}
          />
        </div>
      </section>

      {selected && (
        <section className="glass-panel mb-4 overflow-hidden rounded-2xl border border-border/50 shadow-panel">
          <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-3 p-5">
              <div className="flex flex-wrap items-center gap-2">
                {selected.isRedAlert && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-destructive/40 bg-destructive/15 px-2.5 py-0.5 text-[11px] font-medium text-destructive">
                    <Siren className="h-3 w-3" /> {t("red")}
                  </span>
                )}
                <span
                  className={cn(
                    "rounded-full border px-2.5 py-0.5 text-[11px] font-medium",
                    statusClass(selected.operationalStatus),
                  )}
                >
                  {statusLabel(selected.operationalStatus)}
                </span>
                <span
                  className={cn(
                    "rounded-full border px-2.5 py-0.5 text-[11px] font-medium",
                    severityClass(selected.severity),
                  )}
                >
                  {severityLabel(selected.severity)}
                </span>
                <span className="rounded-full border border-border/50 bg-secondary/40 px-2.5 py-0.5 text-[11px] text-muted-foreground">
                  {categoryLabel(selected.category)}
                </span>
              </div>
              <h3 className="font-display text-lg font-semibold tracking-tight text-foreground">
                {complaintTitle(selected)}
              </h3>
              {complaintDescription(selected) && (
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {complaintDescription(selected)}
                </p>
              )}
              <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-primary/80" />
                  {complaintLocation(selected)}
                </span>
                {(selected.citizenName || selected.citizenPhone) && (
                  <span className="inline-flex items-center gap-1.5">
                    <UserRound className="h-3.5 w-3.5 text-primary/80" />
                    {[selected.citizenName, selected.citizenPhone].filter(Boolean).join(" · ")}
                  </span>
                )}
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 font-medium",
                    slaCountdown(selected.slaDeadline, selected.status, locale, slaUnits).tone,
                  )}
                >
                  <Clock3 className="h-3.5 w-3.5" />
                  {slaCountdown(selected.slaDeadline, selected.status, locale, slaUnits).text}
                </span>
              </div>
              {selected.status !== "RESOLVED" && (
                <div
                  className={cn(
                    "rounded-xl border px-4 py-3",
                    slaCountdown(selected.slaDeadline, selected.status, locale, slaUnits).breached
                      ? "border-destructive/40 bg-destructive/10"
                      : "border-primary/25 bg-primary/5",
                  )}
                >
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    {slaCountdown(selected.slaDeadline, selected.status, locale, slaUnits).breached
                      ? t("slaOverdueLive")
                      : t("slaLive")}
                  </p>
                  <p
                    className={cn(
                      "mt-1 font-display text-3xl font-semibold tabular-nums tracking-tight",
                      slaCountdown(selected.slaDeadline, selected.status, locale, slaUnits).tone,
                    )}
                  >
                    {(() => {
                      const clock = remainingClock(selected.slaDeadline);
                      const hh = String(clock.hours).padStart(2, "0");
                      const mm = String(clock.mins).padStart(2, "0");
                      const ss = String(clock.secs).padStart(2, "0");
                      return `${clock.breached ? "−" : ""}${hh}:${mm}:${ss}`;
                    })()}
                  </p>
                </div>
              )}
              {selected.resolutionNote && (
                <p className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs leading-relaxed text-emerald-100">
                  <span className="font-medium text-emerald-200">{t("resolutionNote")}: </span>
                  {selected.resolutionNote}
                </p>
              )}
              {selected.photoQaStatus ? (
                <p className={cn("rounded-xl border px-3 py-2 text-xs", photoQaClass(selected.photoQaStatus))}>
                  {t("photoQa", { status: selected.photoQaStatus })}
                  {selected.photoQaNote ? ` — ${selected.photoQaNote}` : ""}
                </p>
              ) : selected.beforePhotoUrl && selected.status !== "RESOLVED" ? (
                <p className="rounded-xl border border-border/50 bg-secondary/20 px-3 py-2 text-xs text-muted-foreground">
                  {t("photoQaPending")}
                </p>
              ) : null}

              <div className="rounded-xl border border-border/50 bg-secondary/20 p-3">
                <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  {t("assignTitle")}
                </p>
                <div className="flex flex-wrap gap-2">
                  <AppSelect
                    value={selected.assigneeId ?? "__none__"}
                    onValueChange={(v) =>
                      void assign(selected.id, v === "__none__" ? null : v).then(() =>
                        reloadTimeline(),
                      )
                    }
                    options={[
                      { value: "__none__", label: t("unassigned") },
                      ...assignees.map((u) => ({
                        value: u.id,
                        label: `${u.email} (${u.role})`,
                      })),
                    ]}
                    triggerClassName="h-9 w-full min-w-0 sm:min-w-[220px] sm:flex-1"
                  />
                </div>
                {selected.assignee && (
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    {t("assignedTo")}: {selected.assignee.email}
                  </p>
                )}
              </div>

              <div className="rounded-xl border border-border/50 bg-secondary/20 p-3">
                <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  {t("timelineTitle")}
                </p>
                <div className="mb-3 max-h-40 space-y-2 overflow-y-auto">
                  {timeline.length === 0 && (
                    <p className="text-[11px] text-muted-foreground">{t("timelineEmpty")}</p>
                  )}
                  {timeline.map((ev) => (
                    <div
                      key={ev.id}
                      className="rounded-lg border border-border/40 bg-background/40 px-2.5 py-1.5 text-[11px]"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-foreground">{t(`event${ev.kind}`)}</span>
                        <span className="text-muted-foreground">
                          {new Date(ev.createdAt).toLocaleString(locale, {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                            hourCycle: "h23",
                          })}
                        </span>
                      </div>
                      {ev.note && <p className="mt-0.5 text-muted-foreground">{ev.note}</p>}
                      {ev.actor && (
                        <p className="mt-0.5 text-[10px] text-muted-foreground/80">{ev.actor.email}</p>
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    value={timelineNote}
                    onChange={(e) => setTimelineNote(e.target.value)}
                    className="h-9 flex-1 rounded-lg border border-input bg-secondary/40 px-3 text-xs outline-none focus:border-primary/40"
                    placeholder={t("notePlaceholder")}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busyId === selected.id || timelineNote.trim().length < 2}
                    onClick={() =>
                      void addNote(selected.id, timelineNote).then(() => {
                        setTimelineNote("");
                        void reloadTimeline();
                      })
                    }
                  >
                    {t("addNote")}
                  </Button>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-px border-t border-border/40 bg-border/40 lg:border-l lg:border-t-0">
              <div className="relative bg-background/80">
                {selected.beforePhotoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={complaintPhotoSrc(selected.beforePhotoUrl) ?? undefined}
                    alt={t("beforePhoto")}
                    className="h-44 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-44 flex-col items-center justify-center gap-2 text-muted-foreground">
                    <Camera className="h-5 w-5" />
                    <span className="text-[11px]">{t("noPhoto")}</span>
                  </div>
                )}
                <span className="absolute bottom-2 left-2 rounded-md bg-background/85 px-2 py-0.5 text-[10px] font-medium tracking-wide text-foreground backdrop-blur">
                  {t("beforePhoto")}
                </span>
              </div>
              <div className="relative bg-background/80">
                {selected.afterPhotoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={complaintPhotoSrc(selected.afterPhotoUrl) ?? undefined}
                    alt={t("afterPhoto")}
                    className="h-44 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-44 flex-col items-center justify-center gap-2 text-muted-foreground">
                    <Camera className="h-5 w-5" />
                    <span className="text-[11px]">{t("noPhoto")}</span>
                  </div>
                )}
                <span className="absolute bottom-2 left-2 rounded-md bg-background/85 px-2 py-0.5 text-[10px] font-medium tracking-wide text-foreground backdrop-blur">
                  {t("afterPhoto")}
                </span>
              </div>
            </div>
          </div>
        </section>
      )}

      <DataTable
        emptyMessage={t("empty")}
        columns={[
          {
            key: "alert",
            label: t("colAlert"),
            render: (row) =>
              row.isRedAlert ? (
                <span className="inline-flex items-center gap-1 text-xs text-destructive">
                  <Siren className="h-3.5 w-3.5" /> {t("red")}
                </span>
              ) : (
                "—"
              ),
          },
          {
            key: "title",
            label: t("colTitle"),
            render: (row) => (
              <button
                type="button"
                className="max-w-[280px] text-left"
                onClick={() => setSelectedId(row.id)}
              >
                <p className="font-medium hover:text-primary">{complaintTitle(row)}</p>
                <p className="line-clamp-1 text-[11px] text-muted-foreground">
                  {complaintSubtitle(row)}
                </p>
              </button>
            ),
          },
          {
            key: "category",
            label: t("colCategory"),
            render: (row) => (
              <span className="text-xs text-muted-foreground">{categoryLabel(row.category)}</span>
            ),
          },
          {
            key: "source",
            label: t("colSource"),
            render: (row) => <LocalSourceBadge source={row.source} />,
          },
          {
            key: "severity",
            label: t("colSeverity"),
            render: (row) => (
              <span
                className={cn(
                  "inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium",
                  severityClass(row.severity),
                )}
              >
                {severityLabel(row.severity)}
              </span>
            ),
          },
          {
            key: "status",
            label: t("colStatus"),
            render: (row) => (
              <span
                className={cn(
                  "rounded-full border px-2.5 py-0.5 text-[11px] font-medium",
                  statusClass(row.operationalStatus),
                )}
              >
                {statusLabel(row.operationalStatus)}
              </span>
            ),
          },
          {
            key: "sla",
            label: t("colSla"),
            render: (row) => {
              const sla = slaCountdown(row.slaDeadline, row.status, locale, slaUnits);
              return (
                <span className={cn("inline-flex items-center gap-1 text-xs tabular-nums", sla.tone)}>
                  <Clock3 className="h-3.5 w-3.5 shrink-0" />
                  {sla.text}
                </span>
              );
            },
          },
          {
            key: "citizen",
            label: t("colCitizen"),
            render: (row) => (
              <span className="text-xs text-muted-foreground">
                {row.citizenName || row.citizenPhone || "—"}
              </span>
            ),
          },
          {
            key: "photos",
            label: t("colPhotos"),
            render: (row) => (
              <div className="flex items-center gap-2">
                {row.beforePhotoUrl && (
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={complaintPhotoSrc(row.beforePhotoUrl) ?? undefined}
                      alt={t("beforePhoto")}
                      className="h-10 w-14 rounded-md object-cover ring-1 ring-border/60"
                    />
                    <span className="absolute inset-x-0 bottom-0 truncate bg-background/80 px-0.5 text-center text-[8px] leading-3">
                      {t("beforeShort")}
                    </span>
                  </div>
                )}
                {row.afterPhotoUrl && (
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={complaintPhotoSrc(row.afterPhotoUrl) ?? undefined}
                      alt={t("afterPhoto")}
                      className="h-10 w-14 rounded-md object-cover ring-1 ring-border/60"
                    />
                    <span className="absolute inset-x-0 bottom-0 truncate bg-background/80 px-0.5 text-center text-[8px] leading-3">
                      {t("afterShort")}
                    </span>
                  </div>
                )}
                {!row.beforePhotoUrl && !row.afterPhotoUrl && (
                  <Camera className="h-4 w-4 text-muted-foreground" />
                )}
                {row.photoQaStatus && (
                  <span className={cn("rounded-md border px-1.5 py-0.5 text-[9px]", photoQaClass(row.photoQaStatus))}>
                    {row.photoQaStatus}
                  </span>
                )}
              </div>
            ),
          },
          {
            key: "actions",
            label: t("colActions"),
            render: (row) =>
              row.status === "RESOLVED" ? (
                <span className="text-xs text-emerald-300">{t("done")}</span>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {row.status === "OPEN" && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyId === row.id}
                      onClick={() => void start(row.id)}
                    >
                      {t("start")}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    disabled={busyId === row.id || !resolveUrl}
                    onClick={() =>
                      void resolve(row.id, resolveUrl, resolveNote || undefined)
                    }
                  >
                    {t("resolve")}
                  </Button>
                </div>
              ),
          },
        ]}
        rows={data?.items ?? []}
      />
      <div className="mt-4">
        <LocalEvidenceFeed
          compact
          topics={["CRIME", "CORRUPTION", "EDUCATION", "HEALTH", "UNEMPLOYMENT", "DRAINAGE"]}
        />
      </div>
    </ModuleShell>
  );
}
