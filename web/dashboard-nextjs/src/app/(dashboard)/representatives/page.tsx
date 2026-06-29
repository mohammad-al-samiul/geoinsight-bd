"use client";

import { ModuleShell, DataTable, StatCard, StatGrid } from "@/components/modules/module-shell";
import { useRepresentativesList } from "@/hooks/use-module-data";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";
import { resolveUnitName } from "@/lib/unit-names";

const roleColor: Record<string, string> = {
  MINISTER: "bg-purple-500/20 text-purple-300",
  MP: "bg-primary/20 text-primary",
  DC: "bg-sky-500/20 text-sky-300",
  UP_CHAIRMAN: "bg-amber-500/20 text-amber-300",
};

export default function RepresentativesPage() {
  const { rows, loading, error, reload } = useRepresentativesList();

  const ministers = rows.filter((r) => r.role === "MINISTER").length;
  const mps = rows.filter((r) => r.role === "MP").length;
  const dcs = rows.filter((r) => r.role === "DC").length;

  return (
    <ModuleShell
      title="Representatives"
      description="MPs, Ministers, DCs, and local government leaders — tenure and party affiliation by unit."
      loading={loading}
      error={error}
      onRetry={reload}
      stats={
        !loading && rows.length > 0 ? (
          <StatGrid>
            <StatCard label="Total" value={rows.length} />
            <StatCard label="Ministers" value={ministers} />
            <StatCard label="MPs" value={mps} />
            <StatCard label="DCs" value={dcs} />
          </StatGrid>
        ) : undefined
      }
    >
      {!loading && (
        <DataTable
          rows={rows}
          columns={[
            { key: "name", label: "Name" },
            {
              key: "role",
              label: "Role",
              render: (r) => (
                <Badge className={roleColor[r.role] ?? ""}>{r.role}</Badge>
              ),
            },
            { key: "party", label: "Party", render: (r) => r.party ?? "—" },
            {
              key: "adminUnitId",
              label: "Constituency / Unit",
              render: (r) => resolveUnitName(r.adminUnitId),
            },
            { key: "nid", label: "NID" },
            {
              key: "tenureStart",
              label: "Tenure",
              render: (r) => {
                const end = r.tenureEnd ? formatDate(r.tenureEnd) : "Present";
                return `${formatDate(r.tenureStart)} → ${end}`;
              },
            },
          ]}
          emptyMessage="No representatives in this scope."
        />
      )}
    </ModuleShell>
  );
}
