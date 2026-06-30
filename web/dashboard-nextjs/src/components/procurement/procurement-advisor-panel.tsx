"use client";

import { useState } from "react";
import { useProcurementAdvisor } from "@/hooks/use-procurement-advisor";
import { ModuleShell, DataTable, StatCard, StatGrid } from "@/components/modules/module-shell";
import { Button } from "@/components/ui/button";
import { Package, Search } from "lucide-react";

const COMMODITIES = [
  { value: "rice", label: "Rice / চাল" },
  { value: "onion", label: "Onion / পেঁয়াজ" },
  { value: "wheat", label: "Wheat / গম" },
  { value: "lentil", label: "Lentil / ডাল" },
];

export function ProcurementAdvisorPanel() {
  const [lang, setLang] = useState<"bn" | "en">("bn");
  const [commodity, setCommodity] = useState("rice");
  const [quantity, setQuantity] = useState(10000);
  const { advice, loading, error, advise } = useProcurementAdvisor();

  const handleAdvise = () => void advise(commodity, quantity, lang);

  return (
    <ModuleShell
      title="Procurement Arbitrage Advisor"
      description="চাল ১০,০০০ MT — India vs Vietnam — landed cost + lead time + port congestion."
      loading={loading && !advice}
      error={error}
      onRetry={handleAdvise}
      stats={
        advice && (
          <StatGrid>
            <StatCard label="Commodity" value={advice.commodity} />
            <StatCard label="Quantity (MT)" value={advice.quantity_mt.toLocaleString()} />
            <StatCard
              label="Best landed cost"
              value={`$${advice.best_option.landed_cost_usd.toLocaleString()}`}
              accent="success"
            />
            <StatCard
              label="Lead time"
              value={`${advice.best_option.lead_time_days} days`}
              hint={advice.best_option.port_congestion}
            />
          </StatGrid>
        )
      }
    >
      <div className="glass-panel flex flex-wrap items-end gap-4 rounded-xl p-4 shadow-panel">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-muted-foreground">Commodity</label>
          <select
            value={commodity}
            onChange={(e) => setCommodity(e.target.value)}
            className="h-10 rounded-md border border-border bg-card px-3 text-sm"
          >
            {COMMODITIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-muted-foreground">Quantity (MT)</label>
          <input
            type="number"
            min={100}
            step={100}
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            className="h-10 w-36 rounded-md border border-border bg-card px-3 text-sm"
          />
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant={lang === "bn" ? "default" : "outline"} onClick={() => setLang("bn")}>
            বাংলা
          </Button>
          <Button size="sm" variant={lang === "en" ? "default" : "outline"} onClick={() => setLang("en")}>
            EN
          </Button>
        </div>
        <Button onClick={handleAdvise} disabled={loading} className="gap-2">
          <Search className="h-4 w-4" />
          Get advice
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
              rank: i === 0 ? "★ Best" : `#${i + 1}`,
              country: o.country_name,
              landed: `$${o.landed_cost_usd.toLocaleString()}`,
              lead: `${o.lead_time_days}d`,
              port: o.port_congestion,
              reliability: `${(o.reliability_score * 100).toFixed(0)}%`,
            }))}
            columns={[
              { key: "rank", label: "Rank" },
              { key: "country", label: "Source" },
              { key: "landed", label: "Landed cost" },
              { key: "lead", label: "Lead time" },
              { key: "port", label: "Port" },
              { key: "reliability", label: "Reliability" },
            ]}
            emptyMessage="No options."
          />
        </div>
      )}
    </ModuleShell>
  );
}
