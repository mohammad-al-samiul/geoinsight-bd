"use client";

import { useMemo, useState } from "react";
import { useLocale } from "next-intl";
import { Users, Flag, Landmark, Filter, CheckCircle2, AlertTriangle } from "lucide-react";
import { ModuleShell } from "@/components/modules/module-shell";
import { LocalDeskIntel } from "@/components/local-entity/local-desk-intel";
import { LocalKpiSpark, LocalKpiSparkGrid } from "@/components/local-entity/local-viz";
import { Button } from "@/components/ui/button";
import { useLocalEntityId } from "@/hooks/use-local-entity-id";
import { useLocalEntityOverview } from "@/hooks/use-local-entity";
import { useLocalLiveIntel } from "@/hooks/use-local-live-intel";

export function LocalPoliticsPanel() {
  const locale = useLocale();
  const isBn = locale.startsWith("bn");
  const entityId = useLocalEntityId();
  const { data: overview } = useLocalEntityOverview(entityId);
  const { data: partyFeed, loading, error, reload } = useLocalLiveIntel(entityId, "PARTY", 40);

  const [activeFilter, setActiveFilter] = useState<string>("ALL");

  const seatName = overview
    ? isBn
      ? overview.catalog?.nameBn || overview.entity.name
      : overview.catalog?.nameEn || overview.entity.name
    : isBn
      ? "এই আসন"
      : "Current Seat";

  const stats = useMemo(() => {
    const total = partyFeed?.summary.total ?? 0;
    const last24h = partyFeed?.summary.last24h ?? 0;
    const last7d = partyFeed?.summary.last7d ?? 0;
    return { total, last24h, last7d };
  }, [partyFeed]);

  return (
    <ModuleShell
      title={isBn ? `${seatName} — দলীয় রাজনীতি ও স্থানীয় সমাবেশ` : `${seatName} — Local Party Politics & Rallies`}
      description={
        isBn
          ? "স্থানীয় দলীয় সভা, রাজনৈতিক সমাবেশ, নির্বাচনমুখী প্রচার ও কোন্দল মনিটর"
          : "Seat-scoped tracker for party rallies, election outreach, grassroots political meetings & friction"
      }
      loading={loading && !partyFeed}
      error={error}
      onRetry={reload}
      stats={
        <LocalKpiSparkGrid>
          <LocalKpiSpark
            label={isBn ? "২৪ ঘণ্টায় দলীয় খবর" : "24h Party Activity"}
            value={String(stats.last24h)}
            base={stats.last24h}
            color="#c084fc"
          />
          <LocalKpiSpark
            label={isBn ? "৭ দিনে রাজনৈতিক কভারেজ" : "7d Party Hits"}
            value={String(stats.last7d)}
            base={stats.last7d}
            color="#a78bfa"
          />
          <LocalKpiSpark
            label={isBn ? "আসন ট্র্যাকিং স্ট্যাটাস" : "Seat Tracking Status"}
            value={isBn ? "সক্রিয়" : "ACTIVE"}
            base={1}
            color="#34d399"
            accent="success"
          />
        </LocalKpiSparkGrid>
      }
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-purple-500/30 bg-purple-500/10 p-3.5 text-purple-200">
        <div className="flex items-center gap-2.5">
          <Users className="h-5 w-5 shrink-0 text-purple-400" />
          <div className="text-xs sm:text-sm">
            <span className="font-semibold">
              {isBn ? "স্মার্ট ক্লাসিফায়ার ফিল্টার:" : "Smart Classifier Guarantee:"}
            </span>{" "}
            {isBn
              ? "মেয়র বা সরকারি নিয়মিত ইনফ্রাস্ট্রাকচার উদ্বোধন কাজ দলীয় রাজনীতির ট্যাগে আসবে না। দলীয় নাম ও সমাবেশ থাকলে তবেই 'দল' ট্যাগ।"
              : "Mayor inaugurations and official civic works without political rallies are filtered out from party tags."}
          </div>
        </div>
      </div>

      <LocalDeskIntel />
    </ModuleShell>
  );
}
