"use client";

import { AccountabilityPanel } from "@/components/representatives/accountability-panel";
import { ModuleShell, DataTable, StatCard, StatGrid } from "@/components/modules/module-shell";
import { useRepresentativesList } from "@/hooks/use-module-data";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";
import { resolveUnitName } from "@/lib/unit-names";
import { useTranslations } from "next-intl";

const roleColor: Record<string, string> = {
  MINISTER: "bg-purple-500/20 text-purple-300",
  MP: "bg-primary/20 text-primary",
  DC: "bg-sky-500/20 text-sky-300",
  UP_CHAIRMAN: "bg-amber-500/20 text-amber-300",
};

export default function RepresentativesPage() {
  const t = useTranslations("modules.representatives");
  const tc = useTranslations("common");
  const { rows, loading, error, reload } = useRepresentativesList();

  const ministers = rows.filter((r) => r.role === "MINISTER").length;
  const mps = rows.filter((r) => r.role === "MP").length;
  const dcs = rows.filter((r) => r.role === "DC").length;

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
            <StatCard label={t("ministers")} value={ministers} />
            <StatCard label={t("mps")} value={mps} />
            <StatCard label={t("dcs")} value={dcs} />
          </StatGrid>
        ) : undefined
      }
    >
      <AccountabilityPanel />
      {!loading && (
        <DataTable
          rows={rows}
          columns={[
            { key: "name", label: t("colName") },
            {
              key: "role",
              label: t("colRole"),
              render: (r) => (
                <Badge className={roleColor[r.role] ?? ""}>{r.role}</Badge>
              ),
            },
            { key: "party", label: t("colParty"), render: (r) => r.party ?? tc("dash") },
            {
              key: "adminUnitId",
              label: t("colConstituency"),
              render: (r) => resolveUnitName(r.adminUnitId),
            },
            { key: "nid", label: t("colNid") },
            {
              key: "tenureStart",
              label: t("colTenure"),
              render: (r) => {
                const end = r.tenureEnd ? formatDate(r.tenureEnd) : t("present");
                return `${formatDate(r.tenureStart)} → ${end}`;
              },
            },
          ]}
          emptyMessage={t("emptyScope")}
        />
      )}
    </ModuleShell>
  );
}
