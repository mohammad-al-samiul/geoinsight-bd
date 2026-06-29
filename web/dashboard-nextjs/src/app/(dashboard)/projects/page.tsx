"use client";

import { useState } from "react";
import { ModuleShell, DataTable, StatCard, StatGrid } from "@/components/modules/module-shell";
import { ProjectDetailModal } from "@/components/projects/project-detail-modal";
import { useProjectsList } from "@/hooks/use-module-data";
import { Badge } from "@/components/ui/badge";
import { formatLakh } from "@/lib/format";
import type { ProjectRow } from "@/lib/module-types";

const statusColor: Record<string, string> = {
  ONGOING: "bg-primary/20 text-primary",
  COMPLETED: "bg-emerald-500/20 text-emerald-400",
  STALLED: "bg-amber-500/20 text-amber-400",
  PLANNED: "bg-blue-500/20 text-blue-400",
  CANCELLED: "bg-red-500/20 text-red-400",
};

export default function ProjectsPage() {
  const { rows, loading, error, reload } = useProjectsList();
  const [selected, setSelected] = useState<ProjectRow | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const totalAllocated = rows.reduce((s, r) => s + Number(r.budgetAllocated), 0);
  const totalSpent = rows.reduce((s, r) => s + Number(r.budgetSpent), 0);
  const redFlagTotal = rows.reduce(
    (s, r) => s + (r._count?.redFlagAlerts ?? 0),
    0,
  );
  const ongoing = rows.filter((r) => r.status === "ONGOING").length;

  const openProject = (row: ProjectRow) => {
    setSelected(row);
    setModalOpen(true);
  };

  return (
    <ModuleShell
      title="Project Tracker"
      description="National development projects — budget, status, and red-flag counts by administrative scope."
      loading={loading}
      error={error}
      onRetry={reload}
      stats={
        !loading && rows.length > 0 ? (
          <StatGrid>
            <StatCard label="Projects" value={rows.length} />
            <StatCard label="Ongoing" value={ongoing} accent="default" />
            <StatCard
              label="Total Budget"
              value={formatLakh(totalAllocated)}
              hint={`Spent: ${formatLakh(totalSpent)}`}
            />
            <StatCard
              label="Red Flags"
              value={redFlagTotal}
              accent={redFlagTotal > 0 ? "danger" : "success"}
            />
          </StatGrid>
        ) : undefined
      }
    >
      {!loading && (
        <>
          <DataTable
            rows={rows}
            onRowClick={openProject}
            columns={[
              { key: "title", label: "Project" },
              {
                key: "status",
                label: "Status",
                render: (r) => (
                  <Badge className={statusColor[String(r.status)] ?? ""}>
                    {String(r.status)}
                  </Badge>
                ),
              },
              {
                key: "budgetAllocated",
                label: "Allocated",
                render: (r) => formatLakh(r.budgetAllocated),
              },
              {
                key: "budgetSpent",
                label: "Spent",
                render: (r) => formatLakh(r.budgetSpent),
              },
              {
                key: "_count",
                label: "Red Flags",
                render: (r) => {
                  const count = r._count?.redFlagAlerts ?? 0;
                  return count > 0 ? (
                    <span className="font-semibold text-red-400">{count}</span>
                  ) : (
                    "0"
                  );
                },
              },
              {
                key: "blockchainTx",
                label: "Blockchain",
                render: (r) => (r.blockchainTx ? "Anchored" : "Pending"),
              },
            ]}
            emptyMessage="No projects in this scope. Clear filter for national view."
          />
          <p className="text-center text-xs text-muted-foreground">
            Click a row for full project details and red-flag history.
          </p>
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
