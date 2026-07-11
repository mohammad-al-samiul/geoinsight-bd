"use client";



import { Badge } from "@/components/ui/badge";

import { cn } from "@/lib/utils";

import { formatDate, formatPercent } from "@/lib/format";

import type { KpiDefinition, KpiRecord } from "@/lib/module-types";

import { resolveUnitName } from "@/lib/unit-names";

import { useAppLang } from "@/hooks/use-app-lang";

import { CheckCircle2, Info, TrendingUp, Users } from "lucide-react";

import { useMemo } from "react";



interface KpiOverviewProps {

  definitions: KpiDefinition[];

  records: KpiRecord[];

}



const KPI_META: Record<

  string,

  { labelBn: string; labelEn: string; descBn: string; descEn: string }

> = {

  COMPLETION: {

    labelBn: "প্রকল্প সম্পন্ন হার",

    labelEn: "Project Completion",

    descBn: "জেলায় চলমান উন্নয়ন কাজ কতটা এগিয়েছে",

    descEn: "How far development work has progressed in the district",

  },

  BUDGET_UTIL: {

    labelBn: "বাজেট ব্যবহার",

    labelEn: "Budget Utilization",

    descBn: "বরাদ্দকৃত বাজেট কতটা ব্যবহার হয়েছে",

    descEn: "Share of allocated budget actually spent",

  },

  GRIEVANCE: {

    labelBn: "অভিযোগ নিষ্পত্তি",

    labelEn: "Grievance Resolution",

    descBn: "সংবাদ ও অভিযোগের ভিত্তিতে জনসেবা সন্তোষ",

    descEn: "Public service satisfaction from news & grievance signals",

  },

  AGRI_GROWTH: {

    labelBn: "কৃষি প্রবৃদ্ধি",

    labelEn: "Agricultural Growth",

    descBn: "চাল/কৃষি পণ্যের বাজার ও উৎপাদন সূচক",

    descEn: "Rice & agri commodity market production index",

  },

  ATTENDANCE: {

    labelBn: "সংসদ উপস্থিতি",

    labelEn: "Parliament Attendance",

    descBn: "সংসদীয় কার্যক্রমে উপস্থিতির হার",

    descEn: "Attendance rate in parliamentary sessions",

  },

  DIGITAL_SERVICE: {

    labelBn: "ডিজিটাল সেবা",

    labelEn: "Digital Service Delivery",

    descBn: "অনলাইন/ডিজিটাল সেবা প্রদানের মান",

    descEn: "Quality of online and digital public services",

  },

  HEALTH_COVERAGE: {

    labelBn: "স্বাস্থ্য সেবা",

    labelEn: "Health Coverage",

    descBn: "স্বাস্থ্য সেবার আওতাভুক্তি",

    descEn: "Population covered by health services",

  },

  ROAD_COMPLETION: {

    labelBn: "সড়ক উন্নয়ন",

    labelEn: "Road Completion",

    descBn: "সড়ক অবকাঠামো নির্মাণের অগ্রগতি",

    descEn: "Road infrastructure build progress",

  },

};



function progressColor(value: number): string {

  if (value >= 85) return "bg-emerald-500";

  if (value >= 70) return "bg-amber-500";

  return "bg-red-500";

}



function kpiLabel(code: string, fallback: string, lang: "bn" | "en"): string {

  const meta = KPI_META[code];

  if (!meta) return fallback;

  return lang === "bn" ? meta.labelBn : meta.labelEn;

}



function kpiDesc(code: string, lang: "bn" | "en"): string {

  const meta = KPI_META[code];

  if (!meta) return "";

  return lang === "bn" ? meta.descBn : meta.descEn;

}



export function KpiOverview({ definitions, records }: KpiOverviewProps) {

  const lang = useAppLang();

  const isBn = lang === "bn";



  const byRep = useMemo(() => {

    const map = new Map<string, { rep: KpiRecord["representative"]; items: KpiRecord[] }>();

    for (const rec of records) {

      const id = rec.representative.id;

      const existing = map.get(id);

      if (existing) existing.items.push(rec);

      else map.set(id, { rep: rec.representative, items: [rec] });

    }

    return Array.from(map.values()).sort((a, b) => b.items.length - a.items.length);

  }, [records]);



  const catalogStats = useMemo(() => {

    const map = new Map<string, { sum: number; count: number; latest?: KpiRecord }>();

    for (const rec of records) {

      const code = rec.kpiDef.code;

      const entry = map.get(code) ?? { sum: 0, count: 0 };

      entry.sum += Number(rec.value);

      entry.count += 1;

      if (!entry.latest || new Date(rec.recordedAt) > new Date(entry.latest.recordedAt)) {

        entry.latest = rec;

      }

      map.set(code, entry);

    }

    return map;

  }, [records]);



  const verifiedCount = records.filter((r) => r.verified).length;



  const avgCompletion = useMemo(() => {

    const completion = records.filter((r) => r.kpiDef.code === "COMPLETION");

    if (!completion.length) return null;

    return completion.reduce((a, r) => a + Number(r.value), 0) / completion.length;

  }, [records]);



  const liveMetricCount = new Set(records.map((r) => r.kpiDef.code)).size;



  return (

    <div className="space-y-6">

      <div className="flex gap-3 rounded-xl border border-sky-500/30 bg-sky-500/5 p-4 text-sm">

        <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-400" />

        <div className="text-foreground/90">

          {isBn ? (

            <>

              <strong>এগুলো কী?</strong> প্রতিনিধি/জেলা ভিত্তিক পারফরম্যান্স স্কোর — বাস্তব

              সংবাদ, প্রকল্প সিগনাল ও বাজার ডেটা থেকে pipeline প্রতি ৩০ মিনিটে হিসাব করে।

              ক্যাটালগ = মেট্রিকের ধরন; নিচে প্রতিনিধি অনুযায়ী আসল সংখ্যা দেখুন।

            </>

          ) : (

            <>

              <strong>What are these?</strong> District-level performance scores computed from live

              news, project signals, and market data every ~30 minutes. The catalog lists metric

              types; scroll down for actual scores per official.

            </>

          )}

        </div>

      </div>



      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

        <div className="glass-panel rounded-xl p-4 shadow-panel">

          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">

            {isBn ? "মেট্রিকের ধরন" : "Metric Types"}

          </p>

          <p className="mt-2 text-2xl font-bold">{definitions.length}</p>

          <p className="mt-1 text-xs text-muted-foreground">

            {isBn ? "জাতীয় তত্ত্বাবধান সূচক" : "National oversight indicators"}

          </p>

        </div>

        <div className="glass-panel rounded-xl p-4 shadow-panel">

          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">

            {isBn ? "লাইভ স্কোর" : "Live Scores"}

          </p>

          <p className="mt-2 text-2xl font-bold">{records.length}</p>

          <p className="mt-1 text-xs text-muted-foreground">

            {isBn

              ? `${liveMetricCount} ধরনের মেট্রিক · ${byRep.length} জন প্রতিনিধি`

              : `${liveMetricCount} metric types · ${byRep.length} officials`}

          </p>

        </div>

        <div className="glass-panel rounded-xl p-4 shadow-panel">

          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">

            {isBn ? "যাচাইকৃত" : "Verified"}

          </p>

          <p className="mt-2 text-2xl font-bold text-emerald-400">{verifiedCount}</p>

          <p className="mt-1 text-xs text-muted-foreground">

            {records.length

              ? `${Math.round((verifiedCount / records.length) * 100)}% ${isBn ? "pipeline" : "pipeline"}`

              : "—"}

          </p>

        </div>

        <div className="glass-panel rounded-xl p-4 shadow-panel">

          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">

            {isBn ? "গড় সম্পন্ন হার" : "Avg Completion"}

          </p>

          <p className="mt-2 text-2xl font-bold text-primary">

            {avgCompletion != null ? formatPercent(avgCompletion) : "—"}

          </p>

          <p className="mt-1 text-xs text-muted-foreground">

            {isBn ? "সকল জেলার প্রকল্প KPI" : "Project completion across districts"}

          </p>

        </div>

      </div>



      {definitions.length > 0 && (

        <section>

          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">

            <TrendingUp className="h-4 w-4 text-primary" />

            {isBn ? "KPI ক্যাটালগ (জাতীয় গড়)" : "KPI Catalog (national average)"}

          </h2>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

            {definitions.map((def) => {

              const stats = catalogStats.get(def.code);

              const avg = stats && stats.count > 0 ? stats.sum / stats.count : null;

              return (

                <div key={def.id} className="glass-panel rounded-lg border border-border/40 p-3">

                  <p className="text-sm font-semibold">

                    {kpiLabel(def.code, def.name, lang)}

                  </p>

                  <p className="mt-1 text-xs text-muted-foreground line-clamp-2">

                    {kpiDesc(def.code, lang) || def.name}

                  </p>

                  <p className="mt-3 text-2xl font-bold tabular-nums text-primary">

                    {avg != null ? formatPercent(avg, def.unit) : "—"}

                  </p>

                  <p className="mt-1 text-[10px] text-muted-foreground">

                    {stats?.count

                      ? isBn

                        ? `${stats.count}টি রেকর্ড`

                        : `${stats.count} records`

                      : isBn

                        ? "এখনও ডেটা নেই"

                        : "No data yet"}

                  </p>

                </div>

              );

            })}

          </div>

        </section>

      )}



      {byRep.length > 0 ? (

        <section className="space-y-4">

          <h2 className="flex items-center gap-2 text-sm font-semibold">

            <Users className="h-4 w-4 text-primary" />

            {isBn ? "প্রতিনিধি অনুযায়ী পারফরম্যান্স" : "Performance by Representative"}

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

                      {rep.adminUnit?.nameBn ?? rep.adminUnit?.name ?? resolveUnitName(rep.adminUnitId)}

                    </p>

                  </div>

                  <Badge variant="outline">

                    {items.length} {isBn ? "টি KPI" : "KPIs"}

                  </Badge>

                </div>

              </div>

              <div className="divide-y divide-border/40">

                {items.map((rec) => {

                  const val = Number(rec.value);

                  const isPercent = rec.kpiDef.unit === "%";

                  return (

                    <div key={rec.id} className="grid gap-3 px-4 py-3 sm:grid-cols-[1fr_auto]">

                      <div>

                        <p className="text-sm font-medium">

                          {kpiLabel(rec.kpiDef.code, rec.kpiDef.name, lang)}

                        </p>

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

                              {isBn ? "যাচাইকৃত" : "Verified"}

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

          {isBn

            ? "এখনও KPI রেকর্ড নেই। Pipeline প্রতি ৩০ মিনিটে সিঙ্ক করে — Sync চালান বা অপেক্ষা করুন।"

            : "No KPI records yet. Pipeline syncs every 30 minutes — run Sync or wait."}

        </div>

      )}

    </div>

  );

}


