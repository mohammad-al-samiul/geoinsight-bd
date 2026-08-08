"use client";

import { useAuditTrail } from "@/hooks/use-audit-trail";
import { ModuleShell } from "@/components/modules/module-shell";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";
import { Link2, ShieldCheck } from "lucide-react";

export function AuditTrailPanel() {
  const t = useTranslations("modules.audit");
  const { timeline, loading, error, reload } = useAuditTrail();

  return (
    <ModuleShell
      title={t("title")}
      description={t("description")}
      loading={loading && timeline.length === 0}
      error={error}
      onRetry={reload}
    >
      <ul className="space-y-3">
        {timeline.map((item) =>
          item.type === "ai_alert" ? (
            <li
              key={`alert-${item.id}`}
              className="glass-panel rounded-xl border border-border/50 p-4 shadow-panel"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="text-red-400">
                  {t("aiAlert")}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {new Date(item.timestamp as string).toLocaleString()}
                </span>
              </div>
              <p className="mt-2 text-sm font-medium">{String(item.projectTitle)}</p>
              <p className="mt-1 text-xs text-muted-foreground">{String(item.aiExplanation)}</p>
              {item.blockchainHash ? (
                <p className="mt-2 flex items-center gap-1 font-mono text-[10px] text-primary">
                  <Link2 className="h-3 w-3" />
                  {String(item.blockchainHash).slice(0, 24)}…
                  {item.blockchainVerified ? (
                    <ShieldCheck className="ml-1 h-3 w-3 text-emerald-400" />
                  ) : null}
                </p>
              ) : null}
            </li>
          ) : (
            <li
              key={`audit-${item.id}`}
              className="rounded-lg border border-border/40 bg-secondary/20 px-3 py-2 text-xs"
            >
              <span className="font-medium">{String(item.action)}</span>
              <span className="text-muted-foreground"> · {String(item.actor)}</span>
              <span className="ml-2 text-muted-foreground">
                {new Date(item.timestamp as string).toLocaleString()}
              </span>
            </li>
          ),
        )}
      </ul>
    </ModuleShell>
  );
}
