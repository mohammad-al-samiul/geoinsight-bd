"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Bolt, Droplets, RefreshCw, Route, Wifi } from "lucide-react";
import { DataTable, ModuleShell } from "@/components/modules/module-shell";
import {
  LocalBars,
  LocalDonut,
  LocalKpiSpark,
  LocalKpiSparkGrid,
  LocalVizCard,
} from "@/components/local-entity/local-viz";
import { Button } from "@/components/ui/button";
import { AppSelect } from "@/components/ui/app-select";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { useRealtimeRefresh } from "@/hooks/use-realtime-refresh";
import { useLocalEntityId } from "@/hooks/use-local-entity-id";
import { useLocalEntityOverview } from "@/hooks/use-local-entity";
import { cn } from "@/lib/utils";

interface ApiOk<T> {
  success: boolean;
  data: T;
}

type OutageKind = "POWER" | "WATER" | "DRAINAGE" | "ROAD" | "INTERNET" | "OTHER";
type OutageStatus = "ACTIVE" | "WATCH" | "RESOLVED";

interface OutageItem {
  id: string;
  kind: OutageKind;
  status: OutageStatus;
  title: string;
  titleBn: string | null;
  detail: string | null;
  detailBn: string | null;
  severity: number;
  affectedCount: number;
  startedAt: string;
  etaRestoreAt: string | null;
  ward: { id: string; code: string; name: string; nameBn: string | null } | null;
}

interface OutageFeed {
  entityId: string;
  summary: {
    active: number;
    watch: number;
    resolved: number;
    affectedPeople: number;
    byKind: Record<string, number>;
  };
  items: OutageItem[];
}

const KIND_ICON: Record<OutageKind, typeof Bolt> = {
  POWER: Bolt,
  WATER: Droplets,
  DRAINAGE: Droplets,
  ROAD: Route,
  INTERNET: Wifi,
  OTHER: Bolt,
};

export function LocalOutagePanel() {
  const t = useTranslations("modules.localOutage");
  const tv = useTranslations("modules.localViz");
  const locale = useLocale();
  const isBn = locale.startsWith("bn");
  const entityId = useLocalEntityId();
  const { data: overview } = useLocalEntityOverview(entityId);

  const [data, setData] = useState<OutageFeed | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"ALL" | OutageStatus>("ALL");
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<OutageKind>("POWER");
  const [wardId, setWardId] = useState("");
  const hasDataRef = useRef(false);

  const load = useCallback(async () => {
    if (!hasDataRef.current) setLoading(true);
    setError(null);
    try {
      const parts = [
        entityId ? `entityId=${entityId}` : null,
        statusFilter !== "ALL" ? `status=${statusFilter}` : null,
      ].filter(Boolean);
      const qs = parts.length ? `?${parts.join("&")}` : "";
      const res = await apiClient<ApiOk<OutageFeed>>(`local-entity/outages${qs}`);
      setData(res.data);
      hasDataRef.current = true;
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : t("loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [entityId, statusFilter, t]);

  useEffect(() => {
    void load();
  }, [load]);
  useRealtimeRefresh(load, true, true);

  const kindBars = useMemo(
    () =>
      Object.entries(data?.summary.byKind ?? {}).map(([name, value]) => ({
        name: t(`kind${name}` as "kindPOWER"),
        value,
      })),
    [data?.summary.byKind, t],
  );

  const statusPie = useMemo(
    () => [
      { name: t("statusActive"), value: data?.summary.active ?? 0, color: "#f87171" },
      { name: t("statusWatch"), value: data?.summary.watch ?? 0, color: "#fbbf24" },
      { name: t("statusResolved"), value: data?.summary.resolved ?? 0, color: "#34d399" },
    ],
    [data?.summary, t],
  );

  const wardOptions = useMemo(
    () => [
      { value: "", label: t("allWards") },
      ...(overview?.wards ?? []).map((w) => ({
        value: w.id,
        label: isBn ? w.nameBn || w.name : w.name,
      })),
    ],
    [overview?.wards, isBn, t],
  );

  const create = async () => {
    if (title.trim().length < 3) return;
    setBusyId("create");
    try {
      await apiClient("local-entity/outages", {
        method: "POST",
        body: JSON.stringify({
          entityId: entityId ?? undefined,
          wardId: wardId || undefined,
          kind,
          title: title.trim(),
        }),
      });
      setTitle("");
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : t("createFailed"));
    } finally {
      setBusyId(null);
    }
  };

  const resolve = async (id: string) => {
    setBusyId(id);
    try {
      await apiClient(`local-entity/outages/${id}/resolve`, { method: "PATCH" });
      await load();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <ModuleShell
      title={t("title")}
      description={t("description")}
      loading={loading && !data}
      error={error}
      onRetry={() => void load()}
      stats={
        data ? (
          <LocalKpiSparkGrid>
            <LocalKpiSpark
              label={t("statusActive")}
              value={String(data.summary.active)}
              base={data.summary.active}
              color="#f87171"
              accent="danger"
            />
            <LocalKpiSpark
              label={t("statusWatch")}
              value={String(data.summary.watch)}
              base={data.summary.watch}
              color="#fbbf24"
              accent="warning"
            />
            <LocalKpiSpark
              label={t("affected")}
              value={String(data.summary.affectedPeople)}
              base={data.summary.affectedPeople}
              color="#38bdf8"
            />
            <LocalKpiSpark
              label={t("statusResolved")}
              value={String(data.summary.resolved)}
              base={data.summary.resolved}
              color="#34d399"
              accent="success"
            />
          </LocalKpiSparkGrid>
        ) : undefined
      }
    >
      <div className="mb-4 flex flex-wrap gap-2">
        {(["ALL", "ACTIVE", "WATCH", "RESOLVED"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            className={cn(
              "rounded-md border px-2.5 py-1 text-[11px] font-medium transition",
              statusFilter === s
                ? "border-primary/40 bg-primary/15 text-primary"
                : "border-border/50 bg-background/40 text-muted-foreground",
            )}
          >
            {s === "ALL" ? t("filterAll") : t(`status${s === "ACTIVE" ? "Active" : s === "WATCH" ? "Watch" : "Resolved"}`)}
          </button>
        ))}
        <Button size="sm" variant="outline" className="ml-auto" onClick={() => void load()}>
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
          {t("refresh")}
        </Button>
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <LocalVizCard title={t("byStatus")} icon={Bolt} delay={0.05}>
          <LocalDonut data={statusPie} height={220} />
        </LocalVizCard>
        <LocalVizCard title={t("byKind")} icon={Droplets} delay={0.1}>
          <LocalBars data={kindBars} color="#fbbf24" height={220} layoutDir="horizontal" />
        </LocalVizCard>
      </div>

      <section className="glass-panel mb-4 rounded-xl p-4">
        <h3 className="mb-3 text-sm font-medium">{t("logNew")}</h3>
        <div className="grid gap-3 md:grid-cols-4">
          <AppSelect
            value={kind}
            onValueChange={(v) => setKind(v as OutageKind)}
            options={(["POWER", "WATER", "DRAINAGE", "ROAD", "INTERNET", "OTHER"] as const).map(
              (k) => ({ value: k, label: t(`kind${k}`) }),
            )}
            triggerClassName="h-10"
          />
          <AppSelect
            value={wardId || "__none__"}
            onValueChange={(v) => setWardId(v === "__none__" ? "" : v)}
            options={wardOptions.map((o) => ({
              value: o.value || "__none__",
              label: o.label,
            }))}
            triggerClassName="h-10"
          />
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="h-10 rounded-lg border border-input bg-secondary/40 px-3 text-sm md:col-span-2"
            placeholder={t("titlePlaceholder")}
          />
        </div>
        <Button
          className="mt-3"
          size="sm"
          disabled={busyId === "create" || title.trim().length < 3}
          onClick={() => void create()}
        >
          {t("create")}
        </Button>
      </section>

      <DataTable
        emptyMessage={t("empty")}
        columns={[
          {
            key: "kind",
            label: t("colKind"),
            render: (row) => {
              const Icon = KIND_ICON[row.kind];
              return (
                <span className="inline-flex items-center gap-1.5 text-xs">
                  <Icon className="h-3.5 w-3.5" />
                  {t(`kind${row.kind}`)}
                </span>
              );
            },
          },
          {
            key: "title",
            label: t("colTitle"),
            render: (row) => (
              <div>
                <p className="font-medium">{isBn ? row.titleBn || row.title : row.title}</p>
                <p className="line-clamp-1 text-[11px] text-muted-foreground">
                  {isBn ? row.detailBn || row.detail : row.detail}
                </p>
              </div>
            ),
          },
          {
            key: "status",
            label: t("colStatus"),
            render: (row) => (
              <span
                className={cn(
                  "rounded-full border px-2 py-0.5 text-[11px]",
                  row.status === "ACTIVE" && "border-destructive/40 text-destructive",
                  row.status === "WATCH" && "border-amber-500/40 text-amber-200",
                  row.status === "RESOLVED" && "border-emerald-500/40 text-emerald-200",
                )}
              >
                {t(
                  `status${row.status === "ACTIVE" ? "Active" : row.status === "WATCH" ? "Watch" : "Resolved"}`,
                )}
              </span>
            ),
          },
          {
            key: "affected",
            label: t("colAffected"),
            render: (row) => row.affectedCount,
          },
          {
            key: "ward",
            label: t("colWard"),
            render: (row) =>
              row.ward
                ? isBn
                  ? row.ward.nameBn || row.ward.name
                  : row.ward.name
                : "—",
          },
          {
            key: "actions",
            label: t("colActions"),
            render: (row) =>
              row.status === "RESOLVED" ? (
                "—"
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busyId === row.id}
                  onClick={() => void resolve(row.id)}
                >
                  {t("resolve")}
                </Button>
              ),
          },
        ]}
        rows={data?.items ?? []}
      />
    </ModuleShell>
  );
}
