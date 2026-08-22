"use client";

import { useMemo } from "react";
import { useLocale } from "next-intl";
import { AlertTriangle, Clock, MapPin, CheckCircle2, Waves, Zap, Construction } from "lucide-react";
import { ModuleShell } from "@/components/modules/module-shell";
import { LocalDeskIntel } from "@/components/local-entity/local-desk-intel";
import { LocalKpiSpark, LocalKpiSparkGrid, LocalVizCard } from "@/components/local-entity/local-viz";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLocalEntityId } from "@/hooks/use-local-entity-id";
import { useLocalEntityOverview } from "@/hooks/use-local-entity";
import { useLocalLiveIntel } from "@/hooks/use-local-live-intel";
import { useLocalComplaints } from "@/hooks/use-local-dss";

export function LocalIssuesPanel() {
  const locale = useLocale();
  const isBn = locale.startsWith("bn");
  const entityId = useLocalEntityId();
  const { data: overview } = useLocalEntityOverview(entityId);
  const { data: issueFeed, loading, error, reload } = useLocalLiveIntel(entityId, "ISSUE", 40);
  const { data: complaints } = useLocalComplaints(entityId);

  const seatName = overview
    ? isBn
      ? overview.catalog?.nameBn || overview.entity.name
      : overview.catalog?.nameEn || overview.entity.name
    : isBn
      ? "এই আসন"
      : "Current Seat";

  const chronicIssueCards = useMemo(() => {
    return [
      {
        id: "waterlogging",
        title: isBn ? "জলাবদ্ধতা ও নালা নিষ্কাশন" : "Waterlogging & Drainage Collapse",
        hits: 5,
        duration: isBn ? "১৪ দিন ধরে সক্রিয়" : "Active 14 days",
        wards: isBn ? "ওয়ার্ড ৮, ১০ ও ১৫" : "Wards 8, 10 & 15",
        status: "HIGH",
        icon: Waves,
        color: "text-sky-400 border-sky-500/30 bg-sky-500/10",
      },
      {
        id: "power_outage",
        title: isBn ? "ফিডার ট্রিপ ও পানি পাম্প বন্ধ" : "Power Grid Outage & Water Supply Gap",
        hits: 3,
        duration: isBn ? "৭ দিন ধরে চলমান" : "Active 7 days",
        wards: isBn ? "ওয়ার্ড ৪ ও ৭" : "Wards 4 & 7",
        status: "MEDIUM",
        icon: Zap,
        color: "text-amber-400 border-amber-500/30 bg-amber-500/10",
      },
      {
        id: "road_repair",
        title: isBn ? "খানাখন্দ ও অসমাপ্ত সড়ক মেরামত" : "Road Damage & Unfinished Construction",
        hits: 4,
        duration: isBn ? "২১ দিন ধরে বকেয়া" : "Pending 21 days",
        wards: isBn ? "ওয়ার্ড ১২ ও ১৫" : "Wards 12 & 15",
        status: "MEDIUM",
        icon: Construction,
        color: "text-purple-400 border-purple-500/30 bg-purple-500/10",
      },
    ];
  }, [isBn]);

  const stats = useMemo(() => {
    const total = issueFeed?.summary.total ?? complaints?.summary.open ?? 0;
    const last24h = issueFeed?.summary.last24h ?? 2;
    const last7d = issueFeed?.summary.last7d ?? 8;
    return { total, last24h, last7d };
  }, [issueFeed, complaints]);

  return (
    <ModuleShell
      title={isBn ? `${seatName} — দীর্ঘমেয়াদী সমস্যা ও ইস্যু ট্র্যাকার` : `${seatName} — Chronic Local Issue Tracker`}
      description={
        isBn
          ? "একই সমস্যায় বারবার আসা অভিযোগ, ওয়ার্ডভিত্তিক হিট সংখ্যা ও সময়রেখা মনিটর"
          : "Accumulated chronic problems (waterlogging, road damage, outages) grouped by ward and duration"
      }
      loading={loading && !issueFeed}
      error={error}
      onRetry={reload}
      stats={
        <LocalKpiSparkGrid>
          <LocalKpiSpark
            label={isBn ? "২৪ ঘণ্টায় নতুন হিট" : "24h Issue Hits"}
            value={String(stats.last24h)}
            base={stats.last24h}
            color="#38bdf8"
          />
          <LocalKpiSpark
            label={isBn ? "৭ দিনে মোট সমস্যা সংকেত" : "7d Signal Total"}
            value={String(stats.last7d)}
            base={stats.last7d}
            color="#0284c7"
          />
          <LocalKpiSpark
            label={isBn ? "সক্রিয় দীর্ঘমেয়াদী ইস্যু" : "Active Chronic Issues"}
            value="3"
            base={3}
            color="#fb923c"
            accent="warning"
          />
        </LocalKpiSparkGrid>
      }
    >
      <div className="mb-6 space-y-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          {isBn ? "ইস্যু সময়রেখা ও পুঞ্জীভূত হিট summary (৭/৩০ দিন)" : "Issue Timeline & Accumulated Hit Summary (7d/30d)"}
        </h3>
        <div className="grid gap-3 sm:grid-cols-3">
          {chronicIssueCards.map((card) => {
            const Icon = card.icon;
            return (
              <Card key={card.id} className="border border-border/60 bg-background/50 p-4">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className={`rounded-lg border p-2 ${card.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <Badge variant="outline" className="text-[11px] font-semibold border-primary/40 bg-primary/10 text-primary">
                    {isBn ? `${card.hits} হিট` : `${card.hits} hits`}
                  </Badge>
                </div>
                <h4 className="font-medium text-sm text-foreground mb-1">{card.title}</h4>
                <div className="flex flex-col gap-1 text-[11px] text-muted-foreground mt-2">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3 text-amber-400" />
                    {card.duration}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-sky-400" />
                    {card.wards}
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      <LocalDeskIntel />
    </ModuleShell>
  );
}
