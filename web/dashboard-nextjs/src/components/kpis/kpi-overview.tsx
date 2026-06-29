"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatDate, formatPercent } from "@/lib/format";
import type { KpiDefinition, KpiRecord } from "@/lib/module-types";
import { resolveUnitName } from "@/lib/unit-names";
import { CheckCircle2, TrendingUp, Users } from "lucide-react";
import { useMemo } from "react";

interface KpiOverviewProps {
  definitions: KpiDefinition[];
  records: KpiRecord[];
}

function progressColor(value: number): string {
  if (value >= 85) return "bg-emerald-500";
  if (value >= 70) return "bg-amber-500";
  return "bg-red-500";
}

export function KpiOverview({ definitions, records }: KpiOverviewProps) {
  const byRep = useMemo(() => {
    const map = new Map<string, { rep: KpiRecord["representative"]; items: KpiRecord[] }>();
    for (const rec of records) {
      const id = rec.representative.id;
      const existing = map.get(id);
      if (existing) existing.items.push(rec);
      else map.set(id, { rep: rec.representative, items: [rec] });
    }
    return Array.from(map.values());
  }, [records]);

  const verifiedCount = records.filter((r) => r.verified).length;
  const avgCompletion = useMemo(() => {
    const completion = records.filter((r) => r.kpiDef.code === "COMPLETION");
    if (!completion.length) return null;
    const sum = completion.reduce((a, r) => a + Number(r.value), 0);
    return sum / completion.length;
  }, [records]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="glass-panel rounded-xl p-4 shadow-panel">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            KPI Definitions
          </p>
          <p className="mt-2 text-2xl font-bold">{definitions.length}</p>
          <p className="mt-1 text-xs text-muted-foreground">National oversight metrics</p>
        </div>
        <div className="glass-panel rounded-xl p-4 shadow-panel">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Recorded Values
          </p>
          <p className="mt-2 text-2xl font-bold">{records.length}</p>
          <p className="mt-1 text-xs text-muted-foreground">Across all representatives</p>
        </div>
        <div className="glass-panel rounded-xl p-4 shadow-panel">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Verified
          </p>
          <p className="mt-2 text-2xl font-bold text-emerald-400">{verifiedCount}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {records.length ? `${Math.round((verifiedCount / records.length) * 100)}% verified` : "—"}
          </p>
        </div>
        <div className="glass-panel rounded-xl p-4 shadow-panel">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Avg Completion
          </p>
          <p className="mt-2 text-2xl font-bold text-primary">
            {avgCompletion != null ? formatPercent(avgCompletion) : "—"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Project completion KPI</p>
        </div>
      </div>

      {definitions.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <TrendingUp className="h-4 w-4 text-primary" />
            KPI Catalog
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {definitions.map((def) => (
              <div key={def.id} className="glass-panel rounded-lg border border-border/40 p-3">
                <p className="text-[10px] font-mono uppercase text-muted-foreground">{def.code}</p>
                <p className="mt-1 text-sm font-medium">{def.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Unit: {def.unit} · Applies to: {def.appliesTo}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {byRep.length > 0 ? (
        <section className="space-y-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Users className="h-4 w-4 text-primary" />
            Performance by Representative
          </h2>
          {byRep.map(({ rep, items }) => (
            <div key={rep.id} className="glass-panel overflow-hidden rounded-xl shadow-panel">
              <div className="border-b border-border/60 bg-secondary/20 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold">{rep.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {rep.role}
                      {rep.party ? ` · ${rep.party}` : ""}
                      {" · "}
                      {rep.adminUnit?.name ?? resolveUnitName(rep.adminUnitId)}
                    </p>
                  </div>
                  <Badge variant="outline">{items.length} KPIs</Badge>
                </div>
              </div>
              <div className="divide-y divide-border/40">
                {items.map((rec) => {
                  const val = Number(rec.value);
                  const isPercent = rec.kpiDef.unit === "%";
                  return (
                    <div key={rec.id} className="grid gap-3 px-4 py-3 sm:grid-cols-[1fr_auto]">
                      <div>
                        <p className="text-sm font-medium">{rec.kpiDef.name}</p>
                        <p className="text-xs text-muted-foreground">
                          FY {rec.fiscalYear} · {formatDate(rec.recordedAt)}
                        </p>
                        {isPercent && !Number.isNaN(val) && (
                          <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
                            <div
                              className={cn("h-full rounded-full transition-all", progressColor(val))}
                              style={{ width: `${Math.min(100, Math.max(0, val))}%` }}
                            />
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1 text-right">
                        <span className="text-lg font-bold tabular-nums text-primary">
                          {formatPercent(rec.value, rec.kpiDef.unit)}
                        </span>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px]",
                              rec.status === "VERIFIED" && "border-emerald-500/40 text-emerald-400",
                            )}
                          >
                            {rec.status}
                          </Badge>
                          {rec.verified && (
                            <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                              <CheckCircle2 className="h-3 w-3" />
                              Verified
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </section>
      ) : (
        <div className="glass-panel rounded-xl p-8 text-center text-sm text-muted-foreground">
          No KPI records in this scope. Clear the admin filter for national view or run seed data.
        </div>
      )}
    </div>
  );
}
