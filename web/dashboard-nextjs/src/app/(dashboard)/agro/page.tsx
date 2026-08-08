"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Calculator,
  CheckCircle2,
  CircleAlert,
  Globe2,
  Leaf,
  MapPinned,
  MapPin,
  Radio,
  ShipWheel,
  Sparkles,
  Store,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { ModuleShell, StatCard, StatGrid } from "@/components/modules/module-shell";
import { useAgroMarketsList } from "@/hooks/use-module-data";
import { Badge } from "@/components/ui/badge";
import { resolveUnitName } from "@/lib/unit-names";
import { useTranslations } from "next-intl";
import { useAdminFilter } from "@/hooks/use-admin-filter";
import { fetchDashboardMetricsSafe } from "@/lib/dashboard-data";
import type { DashboardMetrics, TradeFlow } from "@/types/dashboard";
import { TradeFlowMap } from "@/components/dashboard/trade-flow-map";
import { AgroMarketsMap } from "@/components/agro/agro-markets-map";
import { buildTradeFlowsFromMatrix } from "@/lib/trade-flows";
import { IntelCard } from "@/components/ui/intel-card";
import { FloatCard } from "@/components/ui/module-motion";
import { cn } from "@/lib/utils";

const typeColor: Record<string, string> = {
  WHOLESALE: "bg-emerald-500/20 text-emerald-400",
  RETAIL: "bg-blue-500/20 text-blue-400",
  HAAT: "bg-amber-500/20 text-amber-400",
  MANDI: "bg-violet-500/20 text-violet-300",
};

function formatPrice(value: string | number | null | undefined): string {
  if (value == null || value === "") return "—";
  const n = Number(value);
  if (Number.isNaN(n)) return "—";
  return `৳${n.toFixed(2)}/kg`;
}

function formatUpdated(at: string | null | undefined): string {
  if (!at) return "";
  try {
    return new Date(at).toLocaleString("bn-BD", {
      hour: "2-digit",
      minute: "2-digit",
      day: "numeric",
      month: "short",
    });
  } catch {
    return "";
  }
}

function flowName(flow: TradeFlow, bangla: boolean): string {
  if (!bangla) return flow.countryName;
  const names: Record<string, string> = {
    India: "ভারত",
    Myanmar: "মিয়ানমার",
    Nepal: "নেপাল",
    Thailand: "থাইল্যান্ড",
    Vietnam: "ভিয়েতনাম",
    Turkey: "তুরস্ক",
    Qatar: "কাতার",
    UAE: "সংযুক্ত আরব আমিরাত",
    "United Arab Emirates": "সংযুক্ত আরব আমিরাত",
  };
  return names[flow.countryName] ?? flow.countryName;
}

function flowCommodity(flow: TradeFlow, bangla: boolean): string {
  if (!bangla) return flow.commodity;
  const commodities: Record<string, string> = {
    Rice: "চাল",
    Wheat: "গম",
    Onion: "পেঁয়াজ",
    Lentil: "ডাল",
  };
  return commodities[flow.commodity] ?? flow.commodity;
}

export default function AgroPage() {
  const t = useTranslations("modules.agro");
  const { rows, loading, error, reload } = useAgroMarketsList();
  const { filter } = useAdminFilter();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [tradeLoading, setTradeLoading] = useState(true);
  const [mapView, setMapView] = useState<"domestic" | "trade">("domestic");

  const wholesale = rows.filter((r) => r.type === "WHOLESALE").length;
  const retail = rows.filter((r) => r.type === "RETAIL").length;
  const haat = rows.filter((r) => r.type === "HAAT").length;
  const withLivePrice = rows.filter((r) => r.priceBdtPerKg != null).length;
  const bangla = true;

  useEffect(() => {
    let active = true;
    setTradeLoading(true);
    void fetchDashboardMetricsSafe(filter).then((data) => {
      if (active) {
        setMetrics(data);
        setTradeLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [filter]);

  const importOpportunities = useMemo(
    () =>
      [
        ...(metrics?.tradeFlows?.length
          ? metrics.tradeFlows
          : buildTradeFlowsFromMatrix(metrics?.arbitrageMatrix ?? [])),
      ]
        .filter((flow) => flow.flowType === "import")
        .sort(
          (a, b) =>
            a.landedCostUsd - b.landedCostUsd || b.marginPct - a.marginPct,
        )
        .slice(0, 3),
    [metrics],
  );
  const exportOpportunities = useMemo(
    () =>
      [
        ...(metrics?.tradeFlows?.length
          ? metrics.tradeFlows
          : buildTradeFlowsFromMatrix(metrics?.arbitrageMatrix ?? [])),
      ]
        .filter((flow) => flow.flowType === "export")
        .sort((a, b) => b.marginPct - a.marginPct)
        .slice(0, 3),
    [metrics],
  );
  const topImport = importOpportunities[0];
  const topExport = exportOpportunities[0];
  const localOverview = useMemo(() => {
    const priced = rows.filter((row) => Number.isFinite(Number(row.priceBdtPerKg)));
    const grouped = new Map<
      string,
      { commodity: string; prices: number[]; markets: number }
    >();

    for (const row of priced) {
      const commodity = row.commodityCode?.toUpperCase() || "অন্যান্য পণ্য";
      const current = grouped.get(commodity) ?? {
        commodity,
        prices: [],
        markets: 0,
      };
      current.prices.push(Number(row.priceBdtPerKg));
      current.markets += 1;
      grouped.set(commodity, current);
    }

    const commodities = [...grouped.values()]
      .map((group) => {
        const low = Math.min(...group.prices);
        const high = Math.max(...group.prices);
        return {
          ...group,
          low,
          high,
          average: group.prices.reduce((sum, value) => sum + value, 0) / group.prices.length,
          spread: high - low,
        };
      })
      .sort((a, b) => b.spread - a.spread || b.markets - a.markets)
      .slice(0, 6);

    const newest = [...priced]
      .sort(
        (a, b) =>
          new Date(b.priceUpdatedAt ?? 0).getTime() -
          new Date(a.priceUpdatedAt ?? 0).getTime(),
      )
      .slice(0, 8);

    return { priced, commodities, newest };
  }, [rows]);

  const typeLabel = (type: string) => {
    if (type === "WHOLESALE") return t("wholesale");
    if (type === "RETAIL") return t("retail");
    if (type === "HAAT") return t("haat");
    if (type === "MANDI") return "মাণ্ডি";
    return type;
  };

  return (
    <ModuleShell
      title={t("title")}
      description={t("description")}
      loading={loading}
      error={error}
      onRetry={reload}
      stats={
        !loading && rows.length > 0 ? (
          <StatGrid>
            <StatCard label={t("markets")} value={rows.length} />
            <StatCard label={t("wholesale")} value={wholesale} />
            <StatCard label={t("retail")} value={retail} />
            <StatCard label={t("haat")} value={haat} />
            <StatCard label={t("livePrices")} value={withLivePrice} />
          </StatGrid>
        ) : undefined
      }
    >
      {!loading && (
        <div className="space-y-6">
          <section className="relative overflow-hidden rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/14 via-background/85 to-sky-500/10 p-5 sm:p-6">
            <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-emerald-400/10 blur-3xl" />
            <div className="pointer-events-none absolute bottom-0 left-1/3 h-16 w-1/2 bg-gradient-to-r from-transparent via-emerald-400/10 to-transparent blur-xl" />
            <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-3.5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-400/30 bg-emerald-500/15 text-emerald-300">
                  <Leaf className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-display text-xl font-semibold tracking-tight sm:text-2xl">
                    কৃষি বাণিজ্য কমান্ড
                  </p>
                  <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                    দেশীয় বাজারদর ও আন্তর্জাতিক বাণিজ্য করিডোর মিলিয়ে আমদানি–রপ্তানির সিদ্ধান্ত সহায়তা।
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge className="gap-1.5 border-emerald-500/35 bg-emerald-500/10 text-emerald-200">
                  <Globe2 className="h-3.5 w-3.5" /> আন্তর্জাতিক মূল্য সংকেত
                </Badge>
                <Badge variant="outline" className="gap-1.5 text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5 text-amber-300" /> সিদ্ধান্ত-সহায়ক
                </Badge>
              </div>
            </div>
          </section>

          <section className="grid gap-4 xl:grid-cols-5">
            <FloatCard index={0} className="xl:col-span-3">
              <IntelCard
                accent="success"
                padding="sm"
                float={false}
                shimmer={false}
                className="h-full"
              >
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/40 px-2 pb-3 pt-1">
                  <div className="flex items-start gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-400/25 bg-emerald-500/10 text-emerald-300">
                      <MapPinned className="h-4 w-4" />
                    </div>
                    <div>
                      <h2 className="font-display text-base font-semibold">
                        {mapView === "domestic" ? "দেশীয় কৃষি বাজার GeoMap" : "আন্তর্জাতিক কৃষি GeoMap"}
                      </h2>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {mapView === "domestic"
                          ? "বাজার marker-এ ধরন, পণ্য ও সর্বশেষ কেজি-দর দেখুন"
                          : "সবুজ রেখা: কম দামের আমদানি উৎস · সোনালি রেখা: উচ্চমূল্যের রপ্তানি বাজার"}
                      </p>
                    </div>
                  </div>
                  <div className="flex rounded-lg border border-border/50 bg-background/45 p-0.5 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setMapView("domestic")}
                      className={cn(
                        "rounded-md px-2.5 py-1.5 font-semibold transition-colors",
                        mapView === "domestic" ? "bg-emerald-500/20 text-emerald-200" : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      দেশীয় বাজার
                    </button>
                    <button
                      type="button"
                      onClick={() => setMapView("trade")}
                      className={cn(
                        "rounded-md px-2.5 py-1.5 font-semibold transition-colors",
                        mapView === "trade" ? "bg-sky-500/20 text-sky-200" : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      আন্তর্জাতিক বাণিজ্য
                    </button>
                  </div>
                </div>
                <div className="pt-3">
                  {mapView === "domestic" ? (
                    <AgroMarketsMap filter={filter} markets={rows} />
                  ) : (
                    <TradeFlowMap
                      flows={metrics?.tradeFlows ?? []}
                      matrixFallback={metrics?.arbitrageMatrix ?? []}
                      pulseKey={
                        tradeLoading || !metrics
                          ? undefined
                          : new Date(metrics.timestamp).getTime()
                      }
                    />
                  )}
                </div>
              </IntelCard>
            </FloatCard>

            <div className="space-y-4 xl:col-span-2">
              <FloatCard index={1} danger={Boolean(topImport)} shimmer>
                <IntelCard accent="success" padding="md" float={false} shimmer={false}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 text-sm font-semibold text-emerald-200">
                      <ArrowDownLeft className="h-4 w-4" /> সাশ্রয়ী আমদানি
                    </span>
                    <Badge className="border-emerald-500/35 bg-emerald-500/10 text-[10px] text-emerald-200">
                      Top source
                    </Badge>
                  </div>
                  {topImport ? (
                    <div className="mt-4">
                      <p className="font-display text-xl font-semibold">{flowName(topImport, bangla)}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {flowCommodity(topImport, bangla)} · landed cost ${topImport.landedCostUsd.toFixed(0)}/MT
                      </p>
                      <div className="mt-3 flex items-center gap-2 text-xs text-emerald-300">
                        <TrendingDown className="h-3.5 w-3.5" /> সম্ভাব্য সুবিধা {topImport.marginPct.toFixed(1)}%
                      </div>
                    </div>
                  ) : (
                    <p className="mt-4 text-sm text-muted-foreground">আন্তর্জাতিক মূল্য তথ্য সিঙ্ক হচ্ছে…</p>
                  )}
                </IntelCard>
              </FloatCard>

              <FloatCard index={2} shimmer>
                <IntelCard accent="warning" padding="md" float={false} shimmer={false}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 text-sm font-semibold text-amber-200">
                      <ArrowUpRight className="h-4 w-4" /> উচ্চমূল্যের রপ্তানি
                    </span>
                    <Badge className="border-amber-500/35 bg-amber-500/10 text-[10px] text-amber-200">
                      Top market
                    </Badge>
                  </div>
                  {topExport ? (
                    <div className="mt-4">
                      <p className="font-display text-xl font-semibold">{flowName(topExport, bangla)}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {flowCommodity(topExport, bangla)} · market signal ${topExport.unitPriceUsd.toFixed(0)}/MT
                      </p>
                      <div className="mt-3 flex items-center gap-2 text-xs text-amber-300">
                        <TrendingUp className="h-3.5 w-3.5" /> সম্ভাব্য মার্জিন {topExport.marginPct.toFixed(1)}%
                      </div>
                    </div>
                  ) : (
                    <p className="mt-4 text-sm text-muted-foreground">রপ্তানি বাজারের মূল্য তথ্য সিঙ্ক হচ্ছে…</p>
                  )}
                </IntelCard>
              </FloatCard>
            </div>
          </section>

          <section className="grid gap-3 md:grid-cols-3">
            {[
              {
                icon: Calculator,
                title: "Landed Cost ক্যালকুলেটর",
                detail: "পণ্যের দাম, freight, শুল্ক ও ডলার রেট মিলিয়ে প্রকৃত আমদানি খরচ নির্ণয়।",
                color: "text-sky-300 border-sky-500/25 bg-sky-500/8",
              },
              {
                icon: ShipWheel,
                title: "রুট ও বন্দর পরামর্শ",
                detail: "চট্টগ্রাম/মোংলা/স্থলবন্দরের সময়, খরচ ও বিকল্প রুট তুলনা।",
                color: "text-violet-300 border-violet-500/25 bg-violet-500/8",
              },
              {
                icon: CircleAlert,
                title: "বাণিজ্য ঝুঁকি সতর্কতা",
                detail: "মূল্য অস্থিরতা, export ban, currency ও সরবরাহ বিঘ্নের সতর্ক সংকেত।",
                color: "text-orange-300 border-orange-500/25 bg-orange-500/8",
              },
            ].map((feature, i) => {
              const Icon = feature.icon;
              return (
                <FloatCard key={feature.title} index={i + 3} shimmer={false}>
                  <div className={cn("h-full rounded-2xl border p-4", feature.color)}>
                    <Icon className="h-5 w-5" />
                    <h3 className="mt-3 font-display text-sm font-semibold">{feature.title}</h3>
                    <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{feature.detail}</p>
                    <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium text-foreground/80">
                      <CheckCircle2 className="h-3.5 w-3.5" /> পরিকল্পিত ফিচার
                    </span>
                  </div>
                </FloatCard>
              );
            })}
          </section>

          <section className="space-y-3">
            <div className="relative overflow-hidden rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/12 via-background/80 to-sky-500/8 p-5 sm:p-6">
              <div className="pointer-events-none absolute right-0 top-0 h-36 w-2/5 bg-gradient-to-l from-emerald-400/10 to-transparent blur-2xl" />
              <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                <div className="flex items-start gap-3.5">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-emerald-400/30 bg-emerald-500/15 text-emerald-300">
                    <Store className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-display text-xl font-semibold tracking-tight">
                      দেশীয় বাজার পর্যবেক্ষণ
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      কোন পণ্যে কত দামের ব্যবধান, কোন বাজারে সর্বশেষ আপডেট—এক নজরে দেখুন।
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "মূল্যযুক্ত বাজার", value: localOverview.priced.length, tone: "text-emerald-300" },
                    { label: "পণ্যের ধরন", value: localOverview.commodities.length, tone: "text-sky-300" },
                    { label: "সর্বোচ্চ ব্যবধান", value: localOverview.commodities[0] ? `৳${localOverview.commodities[0].spread.toFixed(0)}` : "—", tone: "text-amber-300" },
                  ].map((item) => (
                    <div key={item.label} className="min-w-[90px] rounded-xl border border-white/10 bg-background/35 px-3 py-2 text-center">
                      <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">{item.label}</p>
                      <p className={cn("mt-1 font-display text-lg font-bold tabular-nums", item.tone)}>{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {localOverview.commodities.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {localOverview.commodities.map((commodity, index) => {
                  const spreadPct = commodity.low > 0 ? (commodity.spread / commodity.low) * 100 : 0;
                  const hot = spreadPct >= 15;
                  return (
                    <FloatCard key={commodity.commodity} index={index} danger={hot} shimmer={hot}>
                      <div className="relative overflow-hidden rounded-2xl border border-border/35 bg-secondary/15 p-4">
                        <div className={cn(
                          "absolute inset-y-0 left-0 w-1 bg-gradient-to-b",
                          hot ? "from-red-500 to-orange-400" : "from-emerald-400 to-sky-400",
                        )} />
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <Badge variant="outline" className="border-primary/25 bg-primary/5 text-[10px] text-primary">
                              মূল্য স্প্রেড
                            </Badge>
                            <h3 className="mt-2 font-display text-lg font-semibold">{commodity.commodity.toLowerCase()}</h3>
                          </div>
                          <div className={cn(
                            "rounded-xl border px-2.5 py-1.5 text-right",
                            hot ? "border-red-500/30 bg-red-500/10 text-red-200" : "border-emerald-500/25 bg-emerald-500/10 text-emerald-200",
                          )}>
                            <p className="text-[9px] font-semibold uppercase tracking-wide opacity-75">বৈচিত্র্য</p>
                            <p className="font-display text-base font-bold tabular-nums">৳{commodity.spread.toFixed(1)}</p>
                          </div>
                        </div>
                        <div className="mt-4">
                          <div className="flex items-end justify-between gap-2 text-xs">
                            <div><p className="text-muted-foreground">সর্বনিম্ন</p><p className="mt-0.5 font-mono font-semibold text-emerald-300">৳{commodity.low.toFixed(1)}</p></div>
                            <div className="pb-1 text-center text-[10px] text-muted-foreground">{commodity.markets} বাজার</div>
                            <div className="text-right"><p className="text-muted-foreground">সর্বোচ্চ</p><p className="mt-0.5 font-mono font-semibold text-orange-300">৳{commodity.high.toFixed(1)}</p></div>
                          </div>
                          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/8">
                            <div
                              className={cn("h-full rounded-full bg-gradient-to-r", hot ? "from-emerald-400 via-amber-400 to-red-500" : "from-emerald-400 to-sky-400")}
                              style={{ width: `${Math.min(100, Math.max(15, spreadPct * 2.5))}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </FloatCard>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-border/40 bg-secondary/10 py-10 text-center text-sm text-muted-foreground">
                {t("emptyScope")}
              </div>
            )}

            <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
              <IntelCard accent="info" padding="md" float={false} shimmer={false}>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-display text-base font-semibold">সর্বশেষ বাজার আপডেট</p>
                    <p className="mt-1 text-xs text-muted-foreground">দামসহ সর্বশেষ সিঙ্ক হওয়া বাজারসমূহ</p>
                  </div>
                  <Radio className="h-4 w-4 text-emerald-300" />
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {localOverview.newest.map((market, index) => (
                    <div key={market.id} className="group flex items-center gap-3 rounded-xl border border-border/30 bg-background/25 p-3 transition-colors hover:border-emerald-500/35 hover:bg-emerald-500/5">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border/40 bg-secondary/35 text-[10px] font-bold text-muted-foreground">
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-foreground">{market.name}</p>
                        <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                          {market.commodityCode?.toLowerCase() ?? "পণ্য সিঙ্ক হয়নি"} · {resolveUnitName(market.adminUnitId)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-xs font-semibold text-emerald-300">{formatPrice(market.priceBdtPerKg)}</p>
                        <p className="mt-0.5 text-[9px] text-muted-foreground">{formatUpdated(market.priceUpdatedAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </IntelCard>

              <IntelCard accent="warning" padding="md" float={false} shimmer={false}>
                <div className="flex items-center gap-2">
                  <CircleAlert className="h-4 w-4 text-amber-300" />
                  <div>
                    <p className="font-display text-base font-semibold">দ্রুত সিদ্ধান্ত নির্দেশনা</p>
                    <p className="mt-1 text-xs text-muted-foreground">বাজারদর দেখার সহজ নিয়ম</p>
                  </div>
                </div>
                <div className="mt-4 space-y-3">
                  {[
                    ["সবুজ", "কম দামের বাজার—সরবরাহ/ক্রয় যাচাই করুন"],
                    ["সোনালি", "দামের ব্যবধান—পরিবহনসহ লাভ হিসাব করুন"],
                    ["লাল", "বড় মূল্য স্প্রেড—দ্রুত মাঠ যাচাই প্রয়োজন"],
                  ].map(([tone, text]) => (
                    <div key={tone} className="flex gap-2.5 rounded-xl border border-border/30 bg-background/25 p-3 text-xs text-muted-foreground">
                      <span className={cn("mt-1 h-2 w-2 shrink-0 rounded-full", tone === "সবুজ" ? "bg-emerald-400" : tone === "সোনালি" ? "bg-amber-400" : "bg-red-400")} />
                      <span><strong className="text-foreground">{tone}:</strong> {text}</span>
                    </div>
                  ))}
                </div>
              </IntelCard>
            </div>
          </section>
        </div>
      )}
    </ModuleShell>
  );
}
