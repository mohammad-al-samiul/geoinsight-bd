"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { BookOpen, GraduationCap, Landmark, Newspaper } from "lucide-react";
import { ModuleShell } from "@/components/modules/module-shell";
import {
  LocalKpiSpark,
  LocalKpiSparkGrid,
} from "@/components/local-entity/local-viz";
import { LocalEvidenceFeed, type EvidenceFeed } from "@/components/local-entity/local-evidence-feed";
import { apiClient } from "@/lib/api-client";
import { useLocalEntityId } from "@/hooks/use-local-entity-id";
import { useRealtimeRefresh } from "@/hooks/use-realtime-refresh";

export function LocalEvidencePanel() {
  const t = useTranslations("modules.localEvidence");
  const entityId = useLocalEntityId();
  const [data, setData] = useState<EvidenceFeed | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const qs = entityId ? `?entityId=${entityId}&limit=40` : "?limit=40";
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient<{ success: boolean; data: EvidenceFeed }>(
        `local-entity/evidence${qs}`,
        { cache: "no-store" },
      );
      setData(res.data);
    } catch {
      setError(t("loadError"));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [entityId, t]);

  useEffect(() => {
    void load();
  }, [load]);
  useRealtimeRefresh(load, true, true);

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
              label={t("total")}
              value={String(data.summary.total)}
              base={data.summary.total}
              color="#c084fc"
            />
            <LocalKpiSpark
              label={t("kindTHESIS")}
              value={String(data.summary.thesis)}
              base={data.summary.thesis}
              color="#a78bfa"
            />
            <LocalKpiSpark
              label={t("kindEXPERT")}
              value={String(data.summary.expert)}
              base={data.summary.expert}
              color="#fbbf24"
            />
            <LocalKpiSpark
              label={t("kindPOLICY_BRIEF")}
              value={String(data.summary.policy)}
              base={data.summary.policy}
              color="#38bdf8"
            />
          </LocalKpiSparkGrid>
        ) : undefined
      }
    >
      <div className="mb-4 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1 rounded-full border border-violet-400/30 px-2 py-0.5">
          <GraduationCap className="h-3 w-3" /> {t("kindTHESIS")}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 px-2 py-0.5">
          <Newspaper className="h-3 w-3" /> {t("kindEXPERT")}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-sky-400/30 px-2 py-0.5">
          <Landmark className="h-3 w-3" /> {t("kindPOLICY_BRIEF")}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-border/50 px-2 py-0.5">
          <BookOpen className="h-3 w-3" /> {t("copyrightNote")}
        </span>
      </div>
      <LocalEvidenceFeed />
    </ModuleShell>
  );
}
