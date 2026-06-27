"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAdminFilter } from "@/hooks/use-admin-filter";
import { useAuth } from "@/hooks/use-auth";
import { getBreadcrumb } from "@/lib/admin-units";
import { Badge } from "@/components/ui/badge";
import { Activity, Building2, Flag, TrendingUp } from "lucide-react";

function StatCard({
  label,
  value,
  icon: Icon,
  trend,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: string;
}) {
  return (
    <div className="glass-panel rounded-xl p-5 shadow-panel transition hover:border-primary/30">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-foreground">{value}</p>
          {trend && <p className="mt-1 text-xs text-primary">{trend}</p>}
        </div>
        <div className="rounded-lg bg-primary/10 p-2.5">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </div>
    </div>
  );
}

export default function NationalDashboardPage() {
  const user = useAuth();
  const { filter, isFiltered } = useAdminFilter();
  const searchParams = useSearchParams();
  const breadcrumb = getBreadcrumb(filter);
  const [shareUrl, setShareUrl] = useState("");

  useEffect(() => {
    setShareUrl(window.location.href);
  }, [searchParams]);

  const scopeLabel = isFiltered
    ? breadcrumb.map((b) => b.name).join(" → ")
    : user.adminUnitName ?? "National";

  return (
    <div className="mx-auto max-w-7xl space-y-6 animate-fade-in">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground lg:text-3xl">
            National Overview
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Scoped view: <span className="text-primary">{scopeLabel}</span>
          </p>
        </div>
        <Badge variant="outline" className="w-fit border-primary/30 text-primary">
          Live · {new Date().toLocaleDateString("en-BD", { dateStyle: "medium" })}
        </Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active Projects" value="1,284" icon={Building2} trend="+12 this month" />
        <StatCard label="Open Red Flags" value="47" icon={Flag} trend="3 critical" />
        <StatCard label="KPI Compliance" value="87.4%" icon={TrendingUp} trend="+2.1% QoQ" />
        <StatCard label="Live Feeds" value="24" icon={Activity} trend="Socket connected" />
      </div>

      <div className="glass-panel rounded-xl p-6 shadow-panel">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Shareable URL State
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Administrative filters are encoded in the URL for stakeholder briefings. Copy and share:
        </p>
        <code className="mt-3 block overflow-x-auto rounded-md bg-secondary/60 p-3 text-xs text-primary">
          {shareUrl || `…${searchParams.toString() ? `?${searchParams.toString()}` : ""}`}
        </code>
        <p className="mt-4 text-xs text-muted-foreground">
          Try RBAC tiers: add{" "}
          <code className="text-foreground">?role=pmo</code>,{" "}
          <code className="text-foreground">?role=minister</code>,{" "}
          <code className="text-foreground">?role=dc</code>, or{" "}
          <code className="text-foreground">?role=chairman</code>
        </p>
      </div>
    </div>
  );
}
