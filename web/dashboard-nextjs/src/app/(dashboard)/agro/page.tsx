"use client";

import { ModuleShell, DataTable, StatCard, StatGrid } from "@/components/modules/module-shell";
import { useAgroMarketsList } from "@/hooks/use-module-data";
import { Badge } from "@/components/ui/badge";
import { resolveUnitName } from "@/lib/unit-names";
import { useTranslations } from "next-intl";

const typeColor: Record<string, string> = {
  WHOLESALE: "bg-emerald-500/20 text-emerald-400",
  RETAIL: "bg-blue-500/20 text-blue-400",
  HAAT: "bg-amber-500/20 text-amber-400",
};

function formatPrice(value: string | number | null | undefined): string {
  if (value == null || value === "") return "—";
  const n = Number(value);
  if (Number.isNaN(n)) return "—";
  return `৳${n.toFixed(2)}/kg`;
}

function formatUpdated(at: string | null | undefined): string {
  if (!at) return "";
  try {
    return new Date(at).toLocaleString("bn-BD", {
      hour: "2-digit",
      minute: "2-digit",
      day: "numeric",
      month: "short",
    });
  } catch {
    return "";
  }
}

export default function AgroPage() {
  const t = useTranslations("modules.agro");
  const { rows, loading, error, reload } = useAgroMarketsList();

  const wholesale = rows.filter((r) => r.type === "WHOLESALE").length;
  const retail = rows.filter((r) => r.type === "RETAIL").length;
  const haat = rows.filter((r) => r.type === "HAAT").length;
  const withLivePrice = rows.filter((r) => r.priceBdtPerKg != null).length;

  const typeLabel = (type: string) => {
    if (type === "WHOLESALE") return t("wholesale");
    if (type === "RETAIL") return t("retail");
    if (type === "HAAT") return t("haat");
    return type;
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
            <StatCard label={t("markets")} value={rows.length} />
            <StatCard label={t("wholesale")} value={wholesale} />
            <StatCard label={t("retail")} value={retail} />
            <StatCard label={t("haat")} value={haat} />
            <StatCard label={t("livePrices")} value={withLivePrice} />
          </StatGrid>
        ) : undefined
      }
    >
      {!loading && (
        <DataTable
          rows={rows}
          columns={[
            { key: "name", label: t("colMarket") },
            {
              key: "type",
              label: t("colType"),
              render: (r) => (
                <Badge className={typeColor[r.type] ?? ""}>{typeLabel(r.type)}</Badge>
              ),
            },
            {
              key: "priceBdtPerKg",
              label: t("colPrice"),
              render: (r) => (
                <span className="font-mono text-emerald-300">
                  {formatPrice(r.priceBdtPerKg)}
                  {r.commodityCode ? (
                    <span className="ml-1 text-xs text-muted-foreground">
                      ({r.commodityCode.toLowerCase()})
                    </span>
                  ) : null}
                </span>
              ),
            },
            {
              key: "priceUpdatedAt",
              label: t("colUpdated"),
              render: (r) => (
                <span className="text-xs text-muted-foreground">
                  {formatUpdated(r.priceUpdatedAt)}
                </span>
              ),
            },
            {
              key: "adminUnitId",
              label: t("colDistrict"),
              render: (r) => resolveUnitName(r.adminUnitId),
            },
            {
              key: "lat",
              label: t("colCoordinates"),
              render: (r) => `${Number(r.lat).toFixed(4)}, ${Number(r.lng).toFixed(4)}`,
            },
          ]}
          emptyMessage={t("emptyScope")}
        />
      )}
    </ModuleShell>
  );
}
