"use client";

import { useLocale, useTranslations } from "next-intl";
import { AccountabilityPanel } from "@/components/representatives/accountability-panel";
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
  UNION_CHAIRMAN: "bg-amber-500/20 text-amber-300",
};

export default function RepresentativesPage() {
  const t = useTranslations("modules.representatives");
  const tc = useTranslations("common");
  const locale = useLocale();
  const bn = locale === "bn";
  const { rows, loading, error, reload } = useRepresentativesList();

  const ministers = rows.filter((r) => r.role === "MINISTER").length;
  const mps = rows.filter((r) => r.role === "MP").length;
  const dcs = rows.filter((r) => r.role === "DC").length;
  const mandate = rows[0]?.government;
  const avgCompletion = (() => {
    const vals = rows
      .map((r) => r.completionPct)
      .filter((v): v is number => typeof v === "number");
    if (!vals.length) return null;
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  })();

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
            {avgCompletion != null ? (
              <StatCard
                label={t("colCompletion")}
                value={`${avgCompletion}%`}
                accent="success"
              />
            ) : null}
          </StatGrid>
        ) : undefined
      }
    >
      {mandate ? (
        <p className="mb-3 rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-xs text-sky-100">
          {t("mandateHint")}: {bn ? mandate.label_bn : mandate.label_en}
        </p>
      ) : null}
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
              render: (r) => r.adminUnit?.name ?? resolveUnitName(r.adminUnitId),
            },
            {
              key: "completionPct",
              label: t("colCompletion"),
              render: (r) =>
                typeof r.completionPct === "number" ? (
                  <span className="tabular-nums font-semibold text-emerald-300">
                    {Math.round(r.completionPct)}%
                  </span>
                ) : (
                  tc("dash")
                ),
            },
            {
              key: "budgetUtilPct",
              label: t("colBudgetUtil"),
              render: (r) =>
                typeof r.budgetUtilPct === "number" ? (
                  <span className="tabular-nums">{Math.round(r.budgetUtilPct)}%</span>
                ) : (
                  tc("dash")
                ),
            },
            {
              key: "liveMentions",
              label: t("colLive"),
              render: (r) =>
                (r.liveMentions ?? 0) > 0 ? (
                  <span className="text-sky-300">{r.liveMentions}</span>
                ) : (
                  "0"
                ),
            },
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
