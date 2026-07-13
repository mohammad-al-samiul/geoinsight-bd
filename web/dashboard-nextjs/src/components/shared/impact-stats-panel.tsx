"use client";

import { IntelCard } from "@/components/ui/intel-card";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  Home,
  PawPrint,
  UserRound,
  Users,
  HeartPulse,
} from "lucide-react";

export interface ImpactStats {
  deaths?: number;
  civilian_deaths?: number;
  injuries?: number;
  homes_damaged?: number;
  livestock_lost?: number;
  damage_mentions?: number;
  evidence?: string[];
  disclaimer?: string;
}

interface ImpactStatsPanelProps {
  title: string;
  subtitle?: string;
  stats: ImpactStats;
  labels: {
    deaths: string;
    civilian: string;
    injuries: string;
    homes: string;
    livestock: string;
    damageMentions: string;
    evidence: string;
  };
  className?: string;
}

function StatTile({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <div className={cn("rounded-xl border p-3", accent)}>
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-[10px] font-semibold uppercase tracking-wider">{label}</span>
      </div>
      <p className="mt-2 font-display text-2xl font-semibold tabular-nums">{value.toLocaleString()}</p>
    </div>
  );
}

export function ImpactStatsPanel({
  title,
  subtitle,
  stats,
  labels,
  className,
}: ImpactStatsPanelProps) {
  return (
    <IntelCard accent="danger" padding="lg" hoverLift={false} className={className}>
      <h3 className="font-display text-sm font-semibold tracking-tight">{title}</h3>
      {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}

      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatTile
          icon={<Users className="h-3.5 w-3.5 text-red-400" />}
          label={labels.deaths}
          value={stats.deaths ?? 0}
          accent="border-red-500/30 bg-red-500/5"
        />
        <StatTile
          icon={<UserRound className="h-3.5 w-3.5 text-orange-400" />}
          label={labels.civilian}
          value={stats.civilian_deaths ?? 0}
          accent="border-orange-500/30 bg-orange-500/5"
        />
        <StatTile
          icon={<HeartPulse className="h-3.5 w-3.5 text-amber-400" />}
          label={labels.injuries}
          value={stats.injuries ?? 0}
          accent="border-amber-500/30 bg-amber-500/5"
        />
        <StatTile
          icon={<Home className="h-3.5 w-3.5 text-sky-400" />}
          label={labels.homes}
          value={stats.homes_damaged ?? 0}
          accent="border-sky-500/30 bg-sky-500/5"
        />
        <StatTile
          icon={<PawPrint className="h-3.5 w-3.5 text-emerald-400" />}
          label={labels.livestock}
          value={stats.livestock_lost ?? 0}
          accent="border-emerald-500/30 bg-emerald-500/5"
        />
        <StatTile
          icon={<AlertTriangle className="h-3.5 w-3.5 text-violet-400" />}
          label={labels.damageMentions}
          value={stats.damage_mentions ?? 0}
          accent="border-violet-500/30 bg-violet-500/5"
        />
      </div>

      {stats.evidence && stats.evidence.length > 0 && (
        <div className="mt-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {labels.evidence}
          </p>
          <ul className="mt-2 space-y-1">
            {stats.evidence.slice(0, 6).map((e) => (
              <li key={e} className="truncate text-xs text-muted-foreground">
                • {e}
              </li>
            ))}
          </ul>
        </div>
      )}

      {stats.disclaimer && (
        <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground/90">{stats.disclaimer}</p>
      )}
    </IntelCard>
  );
}
