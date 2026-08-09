"use client";

import { useState } from "react";
import { useProcurementAdvisor } from "@/hooks/use-procurement-advisor";
import { ModuleShell, DataTable, StatCard, StatGrid } from "@/components/modules/module-shell";
import { Button } from "@/components/ui/button";
import { AppSelect } from "@/components/ui/app-select";
import { useAppLang } from "@/hooks/use-app-lang";
import { useTranslations } from "next-intl";
import { Package, Search } from "lucide-react";

const COMMODITY_KEYS = ["rice", "onion", "wheat", "lentil"] as const;
const COMMODITY_VALUES = ["rice", "onion", "wheat", "lentil"] as const;

export function ProcurementAdvisorPanel() {
  const lang = useAppLang();
  const t = useTranslations("modules.procurement");
  const [commodity, setCommodity] = useState("rice");
  const [quantity, setQuantity] = useState(10000);
  const { advice, loading, error, advise } = useProcurementAdvisor();

  const handleAdvise = () => void advise(commodity, quantity, lang);

  return (
    <ModuleShell
      title={t("title")}
      description={t("description")}
      loading={loading && !advice}
      error={error}
      onRetry={handleAdvise}
      stats={
        advice && (
          <StatGrid>
            <StatCard label={t("commodity")} value={advice.commodity} />
            <StatCard label={t("quantityMt")} value={advice.quantity_mt.toLocaleString()} />
            <StatCard
              label={t("bestLandedCost")}
              value={`$${advice.best_option.landed_cost_usd.toLocaleString()}`}
              accent="success"
            />
            <StatCard
              label={t("leadTime")}
              value={`${advice.best_option.lead_time_days} days`}
              hint={advice.best_option.port_congestion}
            />
          </StatGrid>
        )
      }
    >
      <div className="glass-panel flex flex-wrap items-end gap-4 rounded-xl p-4 shadow-panel">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-muted-foreground">{t("commodity")}</label>
          <AppSelect
            value={commodity}
            onValueChange={setCommodity}
            size="default"
            triggerClassName="h-10 min-w-[9rem]"
            options={COMMODITY_VALUES.map((value, i) => ({
              value,
              label: t(COMMODITY_KEYS[i]),
            }))}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-muted-foreground">{t("quantityMt")}</label>
          <input
            type="number"
            min={100}
            step={100}
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            className="h-10 w-36 rounded-md border border-border bg-card px-3 text-sm"
          />
        </div>
        <Button onClick={handleAdvise} disabled={loading} className="gap-2">
          <Search className="h-4 w-4" />
          {t("getAdvice")}
        </Button>
      </div>

      {advice && (
        <div className="mt-6 space-y-4">
          <div className="glass-panel rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
            <Package className="mb-2 h-4 w-4 text-emerald-400" />
            <p className="text-sm leading-relaxed">
              {lang === "bn" ? advice.recommendation_bn : advice.recommendation}
            </p>
          </div>

          <DataTable
            rows={[advice.best_option, ...advice.alternatives].map((o, i) => ({
              id: o.country_code,
              rank: i === 0 ? t("bestRank") : `#${i + 1}`,
              country: o.country_name,
              landed: `$${o.landed_cost_usd.toLocaleString()}`,
              lead: `${o.lead_time_days}d`,
              port: o.port_congestion,
              reliability: `${(o.reliability_score * 100).toFixed(0)}%`,
            }))}
            columns={[
              { key: "rank", label: t("rank") },
              { key: "country", label: t("source") },
              { key: "landed", label: t("landedCost") },
              { key: "lead", label: t("leadTime") },
              { key: "port", label: t("port") },
              { key: "reliability", label: t("reliability") },
            ]}
            emptyMessage={t("noOptions")}
          />
        </div>
      )}
    </ModuleShell>
  );
}
