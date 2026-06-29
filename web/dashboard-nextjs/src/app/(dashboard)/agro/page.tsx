"use client";

import { ModuleShell, DataTable, StatCard, StatGrid } from "@/components/modules/module-shell";
import { useAgroMarketsList } from "@/hooks/use-module-data";
import { Badge } from "@/components/ui/badge";
import { resolveUnitName } from "@/lib/unit-names";

const typeColor: Record<string, string> = {
  WHOLESALE: "bg-emerald-500/20 text-emerald-400",
  RETAIL: "bg-blue-500/20 text-blue-400",
  HAAT: "bg-amber-500/20 text-amber-400",
};

export default function AgroPage() {
  const { rows, loading, error, reload } = useAgroMarketsList();

  const wholesale = rows.filter((r) => r.type === "WHOLESALE").length;
  const retail = rows.filter((r) => r.type === "RETAIL").length;
  const haat = rows.filter((r) => r.type === "HAAT").length;

  return (
    <ModuleShell
      title="Agri Markets"
      description="Wholesale mandis, haats, and retail markets — national food security and price monitoring."
      loading={loading}
      error={error}
      onRetry={reload}
      stats={
        !loading && rows.length > 0 ? (
          <StatGrid>
            <StatCard label="Markets" value={rows.length} />
            <StatCard label="Wholesale" value={wholesale} />
            <StatCard label="Retail" value={retail} />
            <StatCard label="Haat" value={haat} />
          </StatGrid>
        ) : undefined
      }
    >
      {!loading && (
        <DataTable
          rows={rows}
          columns={[
            { key: "name", label: "Market" },
            {
              key: "type",
              label: "Type",
              render: (r) => (
                <Badge className={typeColor[r.type] ?? ""}>{r.type}</Badge>
              ),
            },
            {
              key: "adminUnitId",
              label: "District / Unit",
              render: (r) => resolveUnitName(r.adminUnitId),
            },
            {
              key: "lat",
              label: "Coordinates",
              render: (r) => `${Number(r.lat).toFixed(4)}, ${Number(r.lng).toFixed(4)}`,
            },
          ]}
          emptyMessage="No agro markets in this scope."
        />
      )}
    </ModuleShell>
  );
}
