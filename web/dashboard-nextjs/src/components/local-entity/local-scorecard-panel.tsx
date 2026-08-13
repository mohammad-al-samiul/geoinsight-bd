"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Scale } from "lucide-react";
import { DataTable, ModuleShell } from "@/components/modules/module-shell";
import {
  LocalBars,
  LocalKpiSpark,
  LocalKpiSparkGrid,
  LocalVizCard,
} from "@/components/local-entity/local-viz";
import { Button } from "@/components/ui/button";
import { LocalFreshnessBadge } from "@/components/local-entity/local-freshness-badge";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { useRealtimeRefresh } from "@/hooks/use-realtime-refresh";
import { useLocalEntityId } from "@/hooks/use-local-entity-id";
import { useAuth } from "@/hooks/use-auth";

interface ApiOk<T> {
  success: boolean;
  data: T;
}

type Scorecard =
  | {
      mode: "wards";
      generatedAt: string;
      entityId: string;
      averageWpi: number;
      rows: Array<{
        id: string;
        code: string;
        name: string;
        nameBn: string | null;
        wpi: number;
        open: number;
        overdue: number;
        redAlerts: number;
        vsAverage: number;
      }>;
      aiComment?: {
        narrativeEn: string;
        narrativeBn: string;
        highlights: string[];
        llmUsed: boolean;
      };
    }
  | {
      mode: "entities";
      generatedAt: string;
      entityId: string;
      rows: Array<{
        id: string;
        code: string;
        name: string;
        nameBn: string | null;
        wpiAverage: number;
        open: number;
        overdue: number;
        redAlerts: number;
      }>;
      aiComment?: {
        narrativeEn: string;
        narrativeBn: string;
        highlights: string[];
        llmUsed: boolean;
      };
    };

export function LocalScorecardPanel() {
  const t = useTranslations("modules.localScorecard");
  const locale = useLocale();
  const isBn = locale.startsWith("bn");
  const user = useAuth();
  const entityId = useLocalEntityId();
  const [compare, setCompare] = useState<"wards" | "entities">("wards");
  const [data, setData] = useState<Scorecard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const hasDataRef = useRef(false);

  const load = useCallback(async () => {
    if (!hasDataRef.current) setLoading(true);
    setError(null);
    try {
      const parts = [
        entityId ? `entityId=${entityId}` : null,
        `compare=${compare}`,
      ].filter(Boolean);
      const res = await apiClient<ApiOk<Scorecard>>(
        `local-entity/scorecard?${parts.join("&")}`,
      );
      setData(res.data);
      hasDataRef.current = true;
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : t("loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [entityId, compare, t]);

  useEffect(() => {
    void load();
  }, [load]);
  useRealtimeRefresh(load, true, true);

  const bars = useMemo(() => {
    if (!data) return [];
    if (data.mode === "wards") {
      return data.rows.slice(0, 10).map((r) => ({
        name: isBn ? r.nameBn || r.name : r.name,
        value: r.wpi,
      }));
    }
    return data.rows.map((r) => ({
      name: r.code,
      value: r.wpiAverage,
    }));
  }, [data, isBn]);

  return (
    <ModuleShell
      title={t("title")}
      description={t("description")}
      loading={loading && !data}
      error={error}
      onRetry={() => void load()}
      stats={
        data?.mode === "wards" ? (
          <LocalKpiSparkGrid>
            <LocalKpiSpark
              label={t("avgWpi")}
              value={String(data.averageWpi)}
              base={data.averageWpi}
              color="#34d399"
            />
            <LocalKpiSpark
              label={t("wards")}
              value={String(data.rows.length)}
              base={data.rows.length}
              color="#38bdf8"
            />
          </LocalKpiSparkGrid>
        ) : data?.mode === "entities" ? (
          <LocalKpiSparkGrid>
            <LocalKpiSpark
              label={t("entities")}
              value={String(data.rows.length)}
              base={data.rows.length}
              color="#38bdf8"
            />
          </LocalKpiSparkGrid>
        ) : undefined
      }
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={compare === "wards" ? "default" : "outline"}
            onClick={() => setCompare("wards")}
          >
            {t("modeWards")}
          </Button>
          {user.role === "PMO" && (
            <Button
              size="sm"
              variant={compare === "entities" ? "default" : "outline"}
              onClick={() => setCompare("entities")}
            >
              {t("modeEntities")}
            </Button>
          )}
        </div>
        <LocalFreshnessBadge lastUpdatedAt={data?.generatedAt} freshness="live" />
      </div>

      <div className="mb-4">
        <LocalVizCard title={t("chart")} icon={Scale} delay={0.05}>
          <LocalBars data={bars} color="#34d399" height={260} layoutDir="horizontal" />
        </LocalVizCard>
      </div>

      {data?.aiComment ? (
        <div className="mb-4 rounded-xl border border-primary/25 bg-primary/5 px-4 py-3">
          <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-primary">
            {t("aiComment")}
            {data.aiComment.llmUsed ? " · AI" : ""}
          </p>
          <p className="text-sm leading-relaxed">
            {isBn ? data.aiComment.narrativeBn : data.aiComment.narrativeEn}
          </p>
        </div>
      ) : null}

      {data?.mode === "wards" && (
        <DataTable
          emptyMessage={t("empty")}
          columns={[
            {
              key: "name",
              label: t("colName"),
              render: (row) => (isBn ? row.nameBn || row.name : row.name),
            },
            { key: "wpi", label: "WPI" },
            { key: "vsAverage", label: t("vsAvg") },
            { key: "open", label: t("open") },
            { key: "overdue", label: t("overdue") },
            { key: "redAlerts", label: t("red") },
          ]}
          rows={data.rows}
        />
      )}
      {data?.mode === "entities" && (
        <DataTable
          emptyMessage={t("empty")}
          columns={[
            { key: "code", label: t("colCode") },
            {
              key: "name",
              label: t("colName"),
              render: (row) => (isBn ? row.nameBn || row.name : row.name),
            },
            { key: "wpiAverage", label: "WPI" },
            { key: "open", label: t("open") },
            { key: "overdue", label: t("overdue") },
            { key: "redAlerts", label: t("red") },
          ]}
          rows={data.rows}
        />
      )}
    </ModuleShell>
  );
}
