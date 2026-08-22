"use client";

import { useMemo, useState } from "react";
import { useLocale } from "next-intl";
import { Flame, ShieldAlert, Users, Filter, AlertOctagon, Radio } from "lucide-react";
import { ModuleShell } from "@/components/modules/module-shell";
import { LocalDeskIntel } from "@/components/local-entity/local-desk-intel";
import { LocalKpiSpark, LocalKpiSparkGrid, LocalVizCard } from "@/components/local-entity/local-viz";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLocalEntityId } from "@/hooks/use-local-entity-id";
import { useLocalEntityOverview } from "@/hooks/use-local-entity";
import { useLocalLiveIntel } from "@/hooks/use-local-live-intel";
import { cn } from "@/lib/utils";

export function LocalUnrestPanel() {
  const locale = useLocale();
  const isBn = locale.startsWith("bn");
  const entityId = useLocalEntityId();
  const { data: overview } = useLocalEntityOverview(entityId);
  const { data: unrestFeed, loading, error, reload } = useLocalLiveIntel(entityId, "UNREST", 40);

  const [activeFilter, setActiveFilter] = useState<string>("ALL");

  const seatName = overview
    ? isBn
      ? overview.catalog?.nameBn || overview.entity.name
      : overview.catalog?.nameEn || overview.entity.name
    : isBn
      ? "এই আসন"
      : "Current Seat";

  const stats = useMemo(() => {
    const total = unrestFeed?.summary.total ?? 0;
    const last24h = unrestFeed?.summary.last24h ?? 0;
    const last7d = unrestFeed?.summary.last7d ?? 0;
    const negative = unrestFeed?.summary.negative ?? 0;
    return { total, last24h, last7d, negative };
  }, [unrestFeed]);

  const filteredItems = useMemo(() => {
    if (!unrestFeed?.items) return [];
    if (activeFilter === "ALL") return unrestFeed.items;
    if (activeFilter === "CLASH") {
      return unrestFeed.items.filter(
        (it) => it.title.includes("সংঘর্ষ") || it.title.includes("clash"),
      );
    }
    if (activeFilter === "BLOCKADE") {
      return unrestFeed.items.filter(
        (it) =>
          it.title.includes("অবরোধ") ||
          it.title.includes("blockade") ||
          it.title.includes("হরতাল") ||
          it.title.includes("strike"),
      );
    }
    if (activeFilter === "PROTEST") {
      return unrestFeed.items.filter(
        (it) =>
          it.title.includes("বিক্ষোভ") ||
          it.title.includes("মিছিল") ||
          it.title.includes("সমাবেশ") ||
          it.title.includes("protest") ||
          it.title.includes("rally"),
      );
    }
    return unrestFeed.items;
  }, [unrestFeed?.items, activeFilter]);

  return (
    <ModuleShell
      title={isBn ? `${seatName} — আন্দোলন ও বিক্ষোভ মনিটর` : `${seatName} — Local Unrest & Protest Monitor`}
      description={
        isBn
          ? "শুধুমাত্র এই আসনের মিছিল, বিক্ষোভ, হরতাল, অবরোধ ও জনঅসন্তোষ ট্র্যাকার (জাতীয় ফিড থেকে আলাদা)"
          : "Seat-scoped tracker for protests, rallies, hartals, blockades & local unrest (isolated from national board)"
      }
      loading={loading && !unrestFeed}
      error={error}
      onRetry={reload}
      stats={
        <LocalKpiSparkGrid>
          <LocalKpiSpark
            label={isBn ? "২৪ ঘণ্টায় ঘটনা" : "24h Unrest Hits"}
            value={String(stats.last24h)}
            base={stats.last24h}
            color="#fb923c"
            accent={stats.last24h > 0 ? "warning" : "default"}
          />
          <LocalKpiSpark
            label={isBn ? "৭ দিনে মোট সংকেত" : "7d Signal Total"}
            value={String(stats.last7d)}
            base={stats.last7d}
            color="#f97316"
          />
          <LocalKpiSpark
            label={isBn ? "উচ্চ তীব্রতা/সংঘর্ষ" : "High Severity"}
            value={String(stats.negative)}
            base={stats.negative}
            color="#f87171"
            accent={stats.negative > 0 ? "danger" : "default"}
          />
        </LocalKpiSparkGrid>
      }
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-amber-200">
        <div className="flex items-center gap-2.5">
          <Flame className="h-5 w-5 shrink-0 text-amber-400" />
          <div className="text-xs sm:text-sm">
            <span className="font-semibold">
              {isBn ? "আসন স্কোপ নীতি:" : "Seat Scope Standard:"}
            </span>{" "}
            {isBn
              ? "ঢাকা বা অন্য জেলার আন্দোলন এখানে আসবে না। শুধু এই আসনের নির্দিষ্ট ওয়ার্ড ও এলাকা ফিল্টার করা।"
              : "Dhaka and foreign seat protests are excluded. Only events verified inside this constituency boundaries appear here."}
          </div>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
          <Filter className="h-3.5 w-3.5" />
          {isBn ? "ফিল্টার:" : "Filter:"}
        </span>
        {[
          { key: "ALL", labelBn: "সব আন্দোলন", labelEn: "All Unrest" },
          { key: "PROTEST", labelBn: "বিক্ষোভ ও মিছিল", labelEn: "Protests & Rallies" },
          { key: "CLASH", labelBn: "সংঘর্ষ ও অস্থিতিশীলতা", labelEn: "Clashes & Conflicts" },
          { key: "BLOCKADE", labelBn: "অবরোধ ও ধর্মঘট", labelEn: "Blockades & Strikes" },
        ].map((f) => (
          <Button
            key={f.key}
            size="sm"
            variant={activeFilter === f.key ? "default" : "outline"}
            onClick={() => setActiveFilter(f.key)}
            className="text-xs h-8"
          >
            {isBn ? f.labelBn : f.labelEn}
          </Button>
        ))}
      </div>

      <LocalDeskIntel />
    </ModuleShell>
  );
}
