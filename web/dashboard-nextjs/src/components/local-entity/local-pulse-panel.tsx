"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CalendarDays, MapPin, Users } from "lucide-react";
import {
  DataTable,
  ModuleShell,
} from "@/components/modules/module-shell";
import {
  LocalAreaTrend,
  LocalBars,
  LocalDonut,
  LocalKpiSpark,
  LocalKpiSparkGrid,
  LocalPulseRing,
  LocalVizCard,
} from "@/components/local-entity/local-viz";
import { LocalUnrestSection } from "@/components/local-entity/local-unrest-section";
import { Button } from "@/components/ui/button";
import { useLocalPulse } from "@/hooks/use-local-osint-pulse";
import { useLocalEntityId } from "@/hooks/use-local-entity-id";
import { apiClient } from "@/lib/api-client";
import { useRealtimeRefresh } from "@/hooks/use-realtime-refresh";

interface PulseEventFeed {
  summary: { upcoming: number; done: number; withInfluencer: number };
  items: Array<{
    id: string;
    kind: string;
    title: string;
    titleBn: string | null;
    startsAt: string;
    locationLabel: string | null;
    done: boolean;
    influencer: { id: string; name: string; nameBn: string | null } | null;
  }>;
}

export function LocalPulsePanel() {
  const t = useTranslations("modules.localPulse");
  const tv = useTranslations("modules.localViz");
  const locale = useLocale();
  const isBn = locale.startsWith("bn");
  const entityId = useLocalEntityId();

  const { data, error, loading, reload } = useLocalPulse(entityId);
  const [events, setEvents] = useState<PulseEventFeed | null>(null);
  const [eventBusy, setEventBusy] = useState<string | null>(null);
  const [eventError, setEventError] = useState<string | null>(null);
  const [markDoneError, setMarkDoneError] = useState<string | null>(null);

  const kindLabel = (kind: string) => {
    switch (kind) {
      case "MEETING":
        return t("kindMeeting");
      case "RALLY":
        return t("kindRally");
      case "OUTREACH":
        return t("kindOutreach");
      case "FOLLOW_UP":
        return t("kindFollowUp");
      default:
        return t("kindOther");
    }
  };

  const loadEvents = useCallback(async () => {
    const qs = entityId ? `?entityId=${entityId}` : "";
    try {
      const res = await apiClient<{ success: boolean; data: PulseEventFeed }>(
        `local-entity/pulse-events${qs}`,
        { cache: "no-store" },
      );
      setEvents(res.data);
      setEventError(null);
    } catch {
      setEvents(null);
      setEventError(t("eventsLoadFailed"));
    }
  }, [entityId, t]);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);
  useRealtimeRefresh(loadEvents, true, true);

  const influenceBars = useMemo(
    () =>
      (data?.influencers ?? [])
        .slice()
        .sort((a, b) => b.influenceScore - a.influenceScore)
        .slice(0, 8)
        .map((row) => ({
          name: isBn ? row.nameBn || row.name : row.name,
          value: row.influenceScore,
        })),
    [data?.influencers, isBn],
  );

  const rolePie = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of data?.influencers ?? []) {
      const key = row.roleType.replaceAll("_", " ");
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [data?.influencers]);

  const voterTrend = useMemo(() => {
    const centers = (data?.pollingCenters ?? []).slice(0, 8);
    return centers.map((c) => ({
      name: isBn ? c.nameBn || c.name : c.name,
      value: c.newVoters,
      registered: c.registeredVoters,
    }));
  }, [data?.pollingCenters, isBn]);

  const markEventDone = async (id: string) => {
    setEventBusy(id);
    setMarkDoneError(null);
    try {
      await apiClient(`local-entity/pulse-events/${id}/done`, {
        method: "PATCH",
        body: JSON.stringify({ done: true }),
      });
      await loadEvents();
    } catch {
      setMarkDoneError(t("markDoneFailed"));
    } finally {
      setEventBusy(null);
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
              label={t("influencers")}
              value={String(data.summary.influencerCount)}
              base={data.summary.influencerCount}
              color="#a78bfa"
            />
            <LocalKpiSpark
              label={t("polling")}
              value={String(data.summary.pollingCenterCount)}
              base={data.summary.pollingCenterCount}
              color="#38bdf8"
            />
            <LocalKpiSpark
              label={t("registered")}
              value={data.summary.registeredVoters.toLocaleString()}
              base={Math.round(data.summary.registeredVoters / 1000)}
              color="#94a3b8"
            />
            <LocalKpiSpark
              label={t("newVoters")}
              value={data.summary.newVoters.toLocaleString()}
              base={data.summary.newVoters}
              color="#34d399"
              accent="success"
              hint={`${data.summary.newVoterPct}%`}
            />
            <LocalKpiSpark
              label={t("upcomingEvents")}
              value={String(events?.summary.upcoming ?? 0)}
              base={events?.summary.upcoming ?? 0}
              color="#fbbf24"
            />
          </LocalKpiSparkGrid>
        )
      }
    >
      <LocalUnrestSection />

      <div className="mb-4 grid gap-4 lg:grid-cols-3">
        <LocalVizCard title={tv("influenceLeaders")} icon={Users} delay={0.05}>
          <div className="flex flex-col items-center gap-3">
            <LocalPulseRing
              value={data?.summary.newVoterPct ?? 0}
              label={tv("newVoterShare")}
            />
            <LocalBars
              data={influenceBars}
              layoutDir="horizontal"
              color="#a78bfa"
              height={200}
            />
          </div>
        </LocalVizCard>
        <LocalVizCard title={tv("roleMix")} icon={Users} delay={0.1}>
          <LocalDonut data={rolePie} height={280} />
        </LocalVizCard>
        <LocalVizCard title={tv("newVoterTrend")} icon={MapPin} delay={0.15}>
          <LocalAreaTrend data={voterTrend} color="#34d399" height={280} />
        </LocalVizCard>
      </div>

      <section className="glass-panel mb-4 rounded-xl p-4 shadow-panel">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">{t("calendarTitle")}</h2>
          </div>
          {eventError ? (
            <Button size="sm" variant="outline" className="h-7" onClick={() => void loadEvents()}>
              {t("retryEvents")}
            </Button>
          ) : null}
        </div>
        {eventError ? (
          <p className="mb-3 text-xs text-destructive">{eventError}</p>
        ) : null}
        {markDoneError ? (
          <p className="mb-3 text-xs text-destructive">{markDoneError}</p>
        ) : null}
        <DataTable
          emptyMessage={t("emptyEvents")}
          columns={[
            {
              key: "title",
              label: t("colEvent"),
              render: (row) => (
                <div>
                  <p className="font-medium">{isBn ? row.titleBn || row.title : row.title}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {kindLabel(row.kind)}
                    {row.influencer
                      ? ` · ${isBn ? row.influencer.nameBn || row.influencer.name : row.influencer.name}`
                      : ""}
                  </p>
                </div>
              ),
            },
            {
              key: "startsAt",
              label: t("colWhen"),
              render: (row) => (
                <span className="text-xs">
                  {new Date(row.startsAt).toLocaleString(locale)}
                </span>
              ),
            },
            {
              key: "locationLabel",
              label: t("colPlace"),
              render: (row) => row.locationLabel || "—",
            },
            {
              key: "id",
              label: t("colAction"),
              render: (row) =>
                row.done ? (
                  <span className="text-[11px] text-emerald-300">{t("done")}</span>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7"
                    disabled={eventBusy === row.id}
                    onClick={() => void markEventDone(row.id)}
                  >
                    {t("markDone")}
                  </Button>
                ),
            },
          ]}
          rows={events?.items ?? []}
        />
      </section>

      <section className="glass-panel mb-4 rounded-xl p-4 shadow-panel">
        <div className="mb-3 flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">{t("directoryTitle")}</h2>
        </div>
        <DataTable
          emptyMessage={t("emptyInfluencers")}
          columns={[
            {
              key: "name",
              label: t("colName"),
              render: (row) => (
                <div>
                  <p className="font-medium">
                    {isBn ? row.nameBn || row.name : row.name}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {row.organization || "—"}
                  </p>
                </div>
              ),
            },
            {
              key: "roleType",
              label: t("colRole"),
              render: (row) => row.roleType.replaceAll("_", " "),
            },
            {
              key: "influenceScore",
              label: t("colScore"),
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
          ]}
          rows={data?.influencers ?? []}
        />
      </section>

      <section className="glass-panel mb-4 rounded-xl p-4 shadow-panel">
        <div className="mb-3 flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">{t("pollingTitle")}</h2>
        </div>
        <DataTable
          emptyMessage={t("emptyPolling")}
          columns={[
            {
              key: "name",
              label: t("colCentre"),
              render: (row) => (
                <div>
                  <p className="font-medium">
                    {isBn ? row.nameBn || row.name : row.name}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {row.code || row.address || "—"}
                  </p>
                </div>
              ),
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
              key: "reg",
              label: t("colRegistered"),
              render: (row) => row.registeredVoters.toLocaleString(),
            },
            {
              key: "new",
              label: t("colNew"),
              render: (row) => (
                <span className="font-semibold text-emerald-300">
                  {row.newVoters.toLocaleString()}
                </span>
              ),
            },
          ]}
          rows={data?.pollingCenters ?? []}
        />
      </section>
    </ModuleShell>
  );
}
