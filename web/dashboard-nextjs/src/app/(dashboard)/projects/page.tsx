"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ModuleShell, DataTable, StatCard, StatGrid } from "@/components/modules/module-shell";
import { ProjectDetailModal } from "@/components/projects/project-detail-modal";
import { useProjectsList } from "@/hooks/use-module-data";
import { usePlatformFeatures } from "@/hooks/use-platform-features";
import { Badge } from "@/components/ui/badge";
import { formatCrore } from "@/lib/format";
import type { ProjectRow } from "@/lib/module-types";

const statusColor: Record<string, string> = {
  ONGOING: "bg-primary/20 text-primary",
  COMPLETED: "bg-emerald-500/20 text-emerald-400",
  STALLED: "bg-amber-500/20 text-amber-400",
  PLANNED: "bg-blue-500/20 text-blue-400",
  CANCELLED: "bg-red-500/20 text-red-400",
};

export default function ProjectsPage() {
  const t = useTranslations("modules.projects");
  const locale = useLocale();
  const bn = locale === "bn";
  const { rows, loading, error, reload } = useProjectsList();
  const { fabricEnabled } = usePlatformFeatures();
  const [selected, setSelected] = useState<ProjectRow | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const totalAllocated = rows.reduce((s, r) => s + Number(r.budgetAllocated), 0);
  const totalSpent = rows.reduce((s, r) => s + Number(r.budgetSpent), 0);
  const redFlagTotal = rows.reduce((s, r) => s + (r._count?.redFlagAlerts ?? 0), 0);
  const ongoing = rows.filter((r) => r.status === "ONGOING").length;
  const completed = rows.filter((r) => r.status === "COMPLETED").length;
  const mandate = rows[0]?.government;

  const openProject = (row: ProjectRow) => {
    setSelected(row);
    setModalOpen(true);
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
            <StatCard label={t("total")} value={rows.length} />
            <StatCard label={t("ongoing")} value={ongoing} accent="default" />
            <StatCard label={t("completed")} value={completed} accent="success" />
            <StatCard
              label={t("totalBudget")}
              value={formatCrore(totalAllocated)}
              hint={t("hintSpent", { amount: formatCrore(totalSpent) })}
            />
            <StatCard
              label={t("redFlags")}
              value={redFlagTotal}
              accent={redFlagTotal > 0 ? "danger" : "success"}
            />
          </StatGrid>
        ) : undefined
      }
    >
      {!loading && (
        <>
          {mandate ? (
            <p className="mb-3 rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-xs text-sky-100">
              {t("mandateHint")}: {bn ? mandate.label_bn : mandate.label_en}
            </p>
          ) : null}
          <DataTable
            rows={rows}
            onRowClick={openProject}
            columns={[
              { key: "title", label: t("colTitle") },
              {
                key: "responsibleName",
                label: t("colOwner"),
                render: (r) => (
                  <span className="text-xs">
                    {r.responsibleName ?? "—"}
                    {r.responsibleParty ? (
                      <span className="ml-1 text-muted-foreground">({r.responsibleParty})</span>
                    ) : null}
                  </span>
                ),
              },
              {
                key: "status",
                label: t("colStatus"),
                render: (r) => (
                  <Badge className={statusColor[String(r.status)] ?? ""}>
                    {String(r.status)}
                  </Badge>
                ),
              },
              {
                key: "progressPct",
                label: t("colProgress"),
                render: (r) => {
                  const pct =
                    typeof r.progressPct === "number"
                      ? r.progressPct
                      : Math.min(
                          100,
                          Math.round(
                            (Number(r.budgetSpent) / Math.max(Number(r.budgetAllocated), 1)) * 100,
                          ),
                        );
                  return (
                    <span className="tabular-nums font-semibold text-emerald-300">{pct}%</span>
                  );
                },
              },
              {
                key: "budgetAllocated",
                label: t("colAllocated"),
                render: (r) => formatCrore(r.budgetAllocated),
              },
              {
                key: "budgetSpent",
                label: t("colSpent"),
                render: (r) => formatCrore(r.budgetSpent),
              },
              {
                key: "_count",
                label: t("colAlerts"),
                render: (r) => {
                  const count = r._count?.redFlagAlerts ?? 0;
                  const live = r.liveSignalCount ?? 0;
                  return (
                    <span>
                      {count > 0 ? (
                        <span className="font-semibold text-red-400">{count}</span>
                      ) : (
                        "0"
                      )}
                      {live > 0 ? (
                        <span className="ml-1 text-[10px] text-sky-300">+{live} live</span>
                      ) : null}
                    </span>
                  );
                },
              },
              ...(fabricEnabled
                ? [
                    {
                      key: "blockchainTx",
                      label: t("colBlockchain"),
                      render: (r: ProjectRow) => (r.blockchainTx ? t("anchored") : t("pending")),
                    },
                  ]
                : []),
            ]}
            emptyMessage={t("emptyScope")}
          />
          <p className="text-center text-xs text-muted-foreground">{t("clickHint")}</p>
          <ProjectDetailModal
            project={selected}
            open={modalOpen}
            onOpenChange={setModalOpen}
          />
        </>
      )}
    </ModuleShell>
  );
}
