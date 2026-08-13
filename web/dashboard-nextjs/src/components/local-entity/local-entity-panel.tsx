"use client";

import Link from "next/link";
import { useMemo, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { motion } from "framer-motion";
import {
  Boxes,
  Building2,
  Gauge,
  KeyRound,
  LayoutGrid,
  MapPinned,
  MessageSquare,
  Newspaper,
  Radio,
  Siren,
  Sparkles,
  Zap,
} from "lucide-react";
import { ModuleShell } from "@/components/modules/module-shell";
import { Button } from "@/components/ui/button";
import { MotionSection } from "@/components/ui/module-motion";
import {
  LocalAreaTrend,
  LocalBars,
  LocalDonut,
  LocalKpiSpark,
  LocalKpiSparkGrid,
  LocalPulseRing,
  LocalQuickNav,
  LocalVizCard,
} from "@/components/local-entity/local-viz";
import { LocalWardMap } from "@/components/local-entity/local-ward-map";
import { LocalMorningBriefPanel } from "@/components/local-entity/local-morning-brief";
import { LocalFreshnessBadge } from "@/components/local-entity/local-freshness-badge";
import { useAuth } from "@/hooks/use-auth";
import { useLocalComplaints, useLocalWpi } from "@/hooks/use-local-dss";
import {
  useLocalEntityCatalog,
  useLocalEntityOverview,
} from "@/hooks/use-local-entity";
import { useLocalEntityId, withLocalEntityHref } from "@/hooks/use-local-entity-id";
import { isLocalEntityRole } from "@/types";
import { cn } from "@/lib/utils";
import type { LocalWardScore } from "@/lib/local-ward-geo";
import {
  buildLocalWardGeoJson,
  resolveEntityAnchor,
  wardCentroidIndex,
} from "@/lib/local-ward-geo";
import type { LocalMapMarker } from "@/components/local-entity/local-ward-map-inner";

function phasePct(phase?: string) {
  const n = Number(String(phase ?? "P0").replace(/\D/g, "")) || 0;
  return Math.min(100, 40 + n * 14);
}

function WardChip({ children, index }: { children: ReactNode; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.02, 0.4), duration: 0.35 }}
      className="rounded-lg border border-border/50 bg-secondary/20 px-3 py-2"
    >
      {children}
    </motion.div>
  );
}

export function LocalEntityPanel() {
  const t = useTranslations("modules.localEntity");
  const tv = useTranslations("modules.localViz");
  const locale = useLocale();
  const isBn = locale.startsWith("bn");
  const user = useAuth();
  const entityId = useLocalEntityId();

  const { data, error, loading, reload } = useLocalEntityOverview(entityId);
  const { rows: catalog } = useLocalEntityCatalog();
  const entityKey = entityId ?? data?.entity.id ?? null;
  const { data: complaints } = useLocalComplaints(entityKey);
  const { data: wpi } = useLocalWpi(entityKey);

  const catalogDef = data?.catalog;
  const title = catalogDef
    ? isBn
      ? catalogDef.nameBn
      : catalogDef.nameEn
    : data?.entity.name ?? t("title");
  const subtitle = catalogDef
    ? isBn
      ? catalogDef.subtitleBn
      : catalogDef.subtitleEn
    : t("description");

  const modulePie = useMemo(() => {
    const active = (data?.coreModules ?? []).filter((m) => m.status === "active").length;
    const planned = (data?.coreModules ?? []).filter((m) => m.status !== "active").length;
    return [
      { name: t("active"), value: active, color: "#34d399" },
      { name: t("planned"), value: planned, color: "#fbbf24" },
    ];
  }, [data?.coreModules, t]);

  const slaPie = useMemo(() => {
    if (!complaints) return [];
    return [
      { name: tv("open"), value: complaints.summary.open, color: "#fbbf24" },
      { name: tv("inProgress"), value: complaints.summary.inProgress, color: "#38bdf8" },
      { name: tv("overdue"), value: complaints.summary.overdue, color: "#f87171" },
      { name: tv("resolved"), value: complaints.summary.resolved, color: "#34d399" },
    ];
  }, [complaints, tv]);

  const wpiBars = useMemo(() => {
    return (wpi?.items ?? [])
      .slice()
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map((row) => ({
        name: isBn ? row.ward.nameBn || row.ward.name : row.ward.name,
        value: row.score,
      }));
  }, [wpi?.items, isBn]);

  const readinessTrend = useMemo(() => {
    const phaseNum = Number(String(data?.phase ?? "P0").replace(/\D/g, "")) || 0;
    return [
      { name: "P0", value: phaseNum >= 0 ? 35 : 10 },
      { name: "P1", value: phaseNum >= 1 ? 55 : 20 },
      { name: "P2", value: phaseNum >= 2 ? 70 : 30 },
      { name: "P3", value: phaseNum >= 3 ? 85 : 40 },
      { name: "P4", value: phaseNum >= 4 ? 96 : 50 },
    ];
  }, [data?.phase]);

  const roleFocus = catalogDef?.role ?? (user.role === "MAYOR" ? "MAYOR" : "MP");
  const isMayorHome = roleFocus === "MAYOR";

  const quickNav = useMemo(() => {
    const all = [
      {
        href: withLocalEntityHref("/local/complaints", entityKey),
        label: t("openComplaints"),
        hint: tv("navSla"),
        icon: Siren,
        weight: isMayorHome ? 100 : 95,
      },
      {
        href: withLocalEntityHref("/local/outage", entityKey),
        label: t("openOutage"),
        hint: tv("navOutage"),
        icon: Zap,
        weight: isMayorHome ? 92 : 55,
      },
      {
        href: withLocalEntityHref("/local/wpi", entityKey),
        label: t("openWpi"),
        hint: tv("navWpi"),
        icon: Gauge,
        weight: isMayorHome ? 88 : 85,
      },
      {
        href: withLocalEntityHref("/local/pulse", entityKey),
        label: t("openPulse"),
        hint: tv("navPulse"),
        icon: Radio,
        weight: isMayorHome ? 50 : 90,
      },
      {
        href: withLocalEntityHref("/local/osint", entityKey),
        label: t("openOsint"),
        hint: tv("navOsint"),
        icon: Newspaper,
        weight: isMayorHome ? 60 : 80,
      },
      {
        href: withLocalEntityHref("/local/specialty", entityKey),
        label: t("openSpecialty"),
        hint: tv("navSpecialty"),
        icon: Boxes,
        weight: 70,
      },
      {
        href: withLocalEntityHref("/local/alerts", entityKey),
        label: t("openAlerts"),
        hint: tv("navAlerts"),
        icon: MessageSquare,
        weight: 45,
      },
      {
        href: withLocalEntityHref("/local/security", entityKey),
        label: t("openSecurity"),
        hint: tv("navSecurity"),
        icon: KeyRound,
        weight: 20,
      },
    ];
    return all.sort((a, b) => b.weight - a.weight).map(({ weight: _w, ...rest }) => rest);
  }, [entityKey, isMayorHome, t, tv]);

  const avgWpi = wpi?.summary.averageScore ?? 0;

  const wardScores: LocalWardScore[] = useMemo(() => {
    const openByWard = new Map<string, number>();
    const redByWard = new Map<string, number>();
    for (const item of complaints?.items ?? []) {
      openByWard.set(
        item.wardId,
        (openByWard.get(item.wardId) ?? 0) +
          (item.status === "RESOLVED" ? 0 : 1),
      );
      if (item.isRedAlert) {
        redByWard.set(item.wardId, (redByWard.get(item.wardId) ?? 0) + 1);
      }
    }
    if (wpi?.items?.length) {
      return wpi.items.map((row) => ({
        wardId: row.wardId,
        score: row.score,
        openComplaints: row.openComplaints,
        redAlerts: redByWard.get(row.wardId) ?? 0,
      }));
    }
    return (data?.wards ?? []).map((w) => ({
      wardId: w.id,
      score: Math.max(35, 92 - (openByWard.get(w.id) ?? 0) * 8),
      openComplaints: openByWard.get(w.id) ?? 0,
      redAlerts: redByWard.get(w.id) ?? 0,
    }));
  }, [wpi?.items, complaints?.items, data?.wards]);

  const mapMarkers: LocalMapMarker[] = useMemo(() => {
    const code = data?.entity.code ?? "CCC";
    const wards = data?.wards ?? [];
    const centroids = wardCentroidIndex(
      buildLocalWardGeoJson(code, wards, wardScores),
    );
    const anchor = resolveEntityAnchor(code);
    return (complaints?.items ?? [])
      .filter((c) => c.isRedAlert || c.operationalStatus === "OVERDUE")
      .slice(0, 16)
      .map((c, i) => {
        const fromWard = centroids.get(c.wardId);
        const lat =
          c.lat ??
          fromWard?.lat ??
          anchor.lat + Math.sin(i) * 0.01;
        const lng =
          c.lng ??
          fromWard?.lng ??
          anchor.lng + Math.cos(i) * 0.012;
        return {
          id: c.id,
          lat,
          lng,
          severity: c.severity,
          label: isBn ? c.titleBn || c.title : c.title,
        };
      });
  }, [complaints?.items, data?.entity.code, data?.wards, wardScores, isBn]);

  return (
    <ModuleShell
      title={title}
      description={subtitle}
      loading={loading && !data}
      error={error}
      onRetry={reload}
      stats={
        data && (
          <LocalKpiSparkGrid>
            <LocalKpiSpark
              label={t("wardCount")}
              value={String(data.wardCount)}
              base={data.wardCount}
              color="#34d399"
              accent="success"
              hint={data.entity.code}
            />
            <LocalKpiSpark
              label={tv("opsHealth")}
              value={`${Math.round(avgWpi || phasePct(data.phase))}%`}
              base={avgWpi || phasePct(data.phase)}
              color="#38bdf8"
              hint={data.phase}
            />
            <LocalKpiSpark
              label={tv("open")}
              value={String(complaints?.summary.open ?? 0)}
              base={complaints?.summary.open ?? 0}
              color="#fbbf24"
              accent="warning"
            />
            <LocalKpiSpark
              label={tv("overdue")}
              value={String(complaints?.summary.overdue ?? 0)}
              base={complaints?.summary.overdue ?? 0}
              color="#f87171"
              accent="danger"
            />
            <LocalKpiSpark
              label={tv("resolved")}
              value={String(complaints?.summary.resolved ?? 0)}
              base={complaints?.summary.resolved ?? 0}
              color="#34d399"
              accent="success"
            />
            <LocalKpiSpark
              label={t("redAlerts")}
              value={String(complaints?.summary.redAlerts ?? 0)}
              base={complaints?.summary.redAlerts ?? 0}
              color="#fb7185"
              accent="warning"
            />
          </LocalKpiSparkGrid>
        )
      }
    >
      {user.role === "PMO" && catalog.length > 0 && (
        <MotionSection className="glass-panel mb-4 rounded-xl p-4 shadow-panel">
          <div className="mb-3 flex items-center gap-2">
            <LayoutGrid className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold tracking-tight">{t("gatewayTitle")}</h2>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
            {catalog.map((row) => {
              const active = data?.entity.id === row.unit?.id;
              const label = isBn ? row.definition.nameBn : row.definition.nameEn;
              return (
                <Link
                  key={row.code}
                  href={row.unit ? `/local?entityId=${row.unit.id}` : "/local"}
                  className={cn(
                    "rounded-lg border px-3 py-2.5 text-sm transition",
                    active
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border/60 bg-secondary/30 text-muted-foreground hover:border-primary/30 hover:text-foreground",
                  )}
                >
                  <div className="font-medium text-foreground">{label}</div>
                  <div className="mt-0.5 text-[11px] uppercase tracking-wide">
                    {row.definition.role} · {row.code}
                  </div>
                </Link>
              );
            })}
          </div>
        </MotionSection>
      )}

      <MotionSection delay={0.05} className="mb-4">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {tv("commandDeck")}
            </p>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              {isMayorHome ? t("mayorFocus") : t("mpFocus")}
            </p>
          </div>
          <LocalFreshnessBadge
            lastUpdatedAt={data?.lastUpdatedAt}
            freshness={data?.dataFreshness}
          />
        </div>
        <LocalQuickNav items={quickNav} />
      </MotionSection>

      {/* PMO multi-entity brief when no single entity selected */}
      {user.role === "PMO" && !entityKey ? (
        <LocalMorningBriefPanel scope="all" />
      ) : (
        <LocalMorningBriefPanel entityId={entityKey} />
      )}

      {data && (
        <MotionSection delay={0.07} className="mb-4">
          <LocalWardMap
            entityCode={data.entity.code}
            wards={data.wards}
            scores={wardScores}
            markers={mapMarkers}
            heightClassName="min-h-[340px] h-[380px]"
          />
        </MotionSection>
      )}

      <div className="mb-4 grid gap-4 lg:grid-cols-3">
        <LocalVizCard title={tv("moduleMix")} icon={Sparkles} delay={0.08}>
          <LocalDonut data={modulePie} height={260} />
        </LocalVizCard>
        <LocalVizCard title={tv("slaMix")} icon={Siren} delay={0.12}>
          <LocalDonut data={slaPie} height={260} />
        </LocalVizCard>
        <LocalVizCard title={tv("readiness")} icon={Gauge} delay={0.16}>
          <div className="flex flex-col items-center gap-4 py-2">
            <LocalPulseRing value={avgWpi || phasePct(data?.phase)} label={tv("opsHealth")} />
            <LocalAreaTrend data={readinessTrend} color="#a78bfa" height={140} />
          </div>
        </LocalVizCard>
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <LocalVizCard title={tv("wpiLeaders")} icon={Gauge} delay={0.18}>
          <LocalBars data={wpiBars} layoutDir="horizontal" color="#34d399" height={280} />
        </LocalVizCard>

        <LocalVizCard title={t("specialtyModules")} icon={Building2} delay={0.22}>
          <ul className="max-h-[280px] space-y-2 overflow-y-auto">
            {(catalogDef?.specialtyModules ?? []).map((m) => (
              <li
                key={m.id}
                className="flex items-start justify-between gap-3 rounded-lg border border-border/50 bg-secondary/20 px-3 py-2.5"
              >
                <div>
                  <p className="text-sm font-medium">
                    {isBn ? m.titleBn : m.titleEn}
                  </p>
                  <p className="text-[11px] text-muted-foreground">{m.id}</p>
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-md border px-2 py-0.5 text-[10px] uppercase tracking-wide",
                    m.status === "active"
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                      : "border-amber-500/30 bg-amber-500/10 text-amber-200",
                  )}
                >
                  {m.status === "active" ? t("active") : t("planned")}
                </span>
              </li>
            ))}
            {!catalogDef?.specialtyModules?.length && (
              <li className="text-sm text-muted-foreground">{t("noSpecialty")}</li>
            )}
          </ul>
        </LocalVizCard>
      </div>

      <LocalVizCard
        title={t("wardsTitle")}
        icon={MapPinned}
        delay={0.26}
        action={
          <span className="text-xs text-muted-foreground">
            {data?.wardCount ?? 0} {t("units")}
          </span>
        }
      >
        <div className="grid max-h-72 gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {(data?.wards ?? []).map((w, i) => (
            <WardChip key={w.id} index={i}>
              <p className="text-sm font-medium">
                {isBn ? w.nameBn || w.name : w.name}
              </p>
              <p className="text-[11px] text-muted-foreground">{w.code}</p>
            </WardChip>
          ))}
        </div>
      </LocalVizCard>

      {user.role === "PMO" && (
        <div className="mt-4">
          <Button asChild variant="outline" size="sm">
            <Link href="/">{t("backNational")}</Link>
          </Button>
        </div>
      )}

      {isLocalEntityRole(user.role) && (
        <p className="mt-4 text-xs text-muted-foreground">{t("scopedNote")}</p>
      )}
    </ModuleShell>
  );
}
