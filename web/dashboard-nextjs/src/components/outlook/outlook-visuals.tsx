"use client";

import { motion } from "framer-motion";
import {
  Bar,
  BarChart,
  Cell,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";
import { chartTooltipProps } from "@/lib/chart-tooltip";
import { Badge } from "@/components/ui/badge";
import { ProgressMeter } from "@/components/ui/progress-meter";
import { IntelCard, MotionList, fadeUp } from "@/components/ui/intel-card";
import type {
  GaugeItem,
  PreventionItem,
  PressureItem,
  RiskItem,
  SolutionItem,
} from "@/hooks/use-strategic-outlook";

export function IntensityBar({ value, tone = "warn" }: { value: number; tone?: string }) {
  return (
    <ProgressMeter
      value={value}
      tone={tone === "bad" ? "bad" : tone === "good" ? "good" : "warn"}
      delay={0.12}
    />
  );
}

export function GaugeGrid({ gauges }: { gauges: GaugeItem[] }) {
  if (!gauges.length) return null;
  const chartData = gauges.map((g) => ({
    name: g.label,
    value: g.value,
    fill:
      g.tone === "bad" ? "#ef4444" : g.tone === "warn" ? "#f59e0b" : g.tone === "good" ? "#10b981" : "#38bdf8",
  }));

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <IntelCard index={0} className="min-h-[260px] sm:p-4" hoverLift={false}>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 12, top: 8, bottom: 8 }}>
            <XAxis type="number" domain={[0, 100]} tick={{ fill: "#94a3b8", fontSize: 11 }} />
            <YAxis type="category" dataKey="name" width={110} tick={{ fill: "#cbd5e1", fontSize: 11 }} />
            <Tooltip {...chartTooltipProps} />
            <Bar dataKey="value" radius={[0, 6, 6, 0]}>
              {chartData.map((d) => (
                <Cell key={d.name} fill={d.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </IntelCard>
      <IntelCard index={1} className="min-h-[260px] sm:p-4" hoverLift={false}>
        <ResponsiveContainer width="100%" height={240}>
          <RadarChart data={chartData}>
            <PolarGrid stroke="#334155" />
            <PolarAngleAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 10 }} />
            <Radar dataKey="value" stroke="#38bdf8" fill="#38bdf8" fillOpacity={0.35} />
            <Tooltip {...chartTooltipProps} />
          </RadarChart>
        </ResponsiveContainer>
      </IntelCard>
    </div>
  );
}

export function PressureCards({
  items,
  evidenceLabel,
}: {
  items: PressureItem[];
  evidenceLabel: string;
}) {
  return (
    <MotionList className="grid gap-3 md:grid-cols-2">
      {items.map((p, i) => (
        <motion.div key={p.id} variants={fadeUp} custom={i}>
          <IntelCard
            index={i}
            accent={p.intensity >= 70 ? "danger" : p.intensity >= 45 ? "warning" : "default"}
            className="h-full"
          >
            <div className="mb-3 flex items-start justify-between gap-2">
              <h4 className="font-display text-sm font-semibold leading-snug tracking-tight">
                {p.title}
              </h4>
              <Badge
                variant="outline"
                className={cn(
                  "shrink-0 text-[10px] uppercase tracking-wide",
                  p.status === "rising" && "border-red-500/50 bg-red-500/10 text-red-300",
                  p.status === "easing" && "border-emerald-500/50 bg-emerald-500/10 text-emerald-300",
                  p.status === "active" && "border-amber-500/40 bg-amber-500/10 text-amber-200",
                )}
              >
                {p.status} · {p.intensity}
              </Badge>
            </div>
            <IntensityBar value={p.intensity} tone={p.intensity >= 60 ? "bad" : "warn"} />
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{p.summary}</p>
            {p.evidence?.length > 0 && (
              <ul className="mt-3 space-y-1 border-t border-border/40 pt-2.5">
                {p.evidence.slice(0, 2).map((e) => (
                  <li key={e} className="truncate text-[10px] text-muted-foreground/90">
                    {evidenceLabel}: {e}
                  </li>
                ))}
              </ul>
            )}
          </IntelCard>
        </motion.div>
      ))}
    </MotionList>
  );
}

export function RiskCards({ items }: { items: RiskItem[] }) {
  const likeliAccent = (l: string) =>
    l === "high" ? "danger" : l === "medium" ? "warning" : "info";

  return (
    <MotionList className="grid gap-3 lg:grid-cols-2">
      {items.map((r, i) => (
        <motion.div key={r.id} variants={fadeUp} custom={i}>
          <IntelCard index={i} accent={likeliAccent(r.likelihood) as "danger" | "warning" | "info"}>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <h4 className="font-display text-sm font-semibold">{r.title}</h4>
              <Badge variant="outline" className="text-[10px] uppercase">
                {r.likelihood}
              </Badge>
              <Badge variant="outline" className="text-[10px]">
                {r.horizon}
              </Badge>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">{r.summary}</p>
            {r.early_signals?.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {r.early_signals.map((s) => (
                  <span
                    key={s}
                    className="rounded-md bg-secondary/80 px-1.5 py-0.5 text-[10px] text-foreground/80"
                  >
                    {s}
                  </span>
                ))}
              </div>
            )}
          </IntelCard>
        </motion.div>
      ))}
    </MotionList>
  );
}

export function SolutionCards({ items }: { items: SolutionItem[] }) {
  return (
    <MotionList className="grid gap-3 lg:grid-cols-3">
      {items.map((s, i) => (
        <motion.div key={s.id} variants={fadeUp} custom={i}>
          <IntelCard index={i} accent="info" className="flex h-full flex-col">
            <h4 className="font-display text-sm font-semibold">{s.title}</h4>
            {s.timeframe && (
              <Badge variant="outline" className="mt-2 w-fit text-[10px]">
                {s.timeframe}
              </Badge>
            )}
            <ol className="mt-3 list-decimal space-y-1.5 pl-4 text-xs leading-relaxed text-muted-foreground">
              {s.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <p className="mt-auto border-t border-border/40 pt-3 text-xs text-foreground/85">
              {s.expected_effect}
            </p>
          </IntelCard>
        </motion.div>
      ))}
    </MotionList>
  );
}

export function PreventionCards({ items }: { items: PreventionItem[] }) {
  return (
    <MotionList className="grid gap-3 md:grid-cols-3">
      {items.map((p, i) => (
        <motion.div key={p.id} variants={fadeUp} custom={i}>
          <IntelCard index={i} accent="success">
            <h4 className="font-display text-sm font-semibold">{p.title}</h4>
            {p.owner_hint && (
              <p className="mt-1 text-[10px] uppercase tracking-wide text-emerald-300/80">
                {p.owner_hint}
              </p>
            )}
            <ul className="mt-3 space-y-1.5 text-xs leading-relaxed text-muted-foreground">
              {p.actions.map((a) => (
                <li key={a} className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                  {a}
                </li>
              ))}
            </ul>
          </IntelCard>
        </motion.div>
      ))}
    </MotionList>
  );
}

export function SectionHead({
  title,
  hint,
  icon,
}: {
  title: string;
  hint?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="mb-3">
      <h3 className="flex items-center gap-2 font-display text-sm font-semibold tracking-tight">
        {icon}
        {title}
      </h3>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
