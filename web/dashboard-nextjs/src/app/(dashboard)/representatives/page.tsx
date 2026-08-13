"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AccountabilityPanel } from "@/components/representatives/accountability-panel";
import { ModuleShell, DataTable, StatCard, StatGrid } from "@/components/modules/module-shell";
import { useRepresentativesList } from "@/hooks/use-module-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { resolveUnitName } from "@/lib/unit-names";
import type { RepresentativeRow } from "@/lib/module-types";

const roleColor: Record<string, string> = {
  MINISTER: "bg-purple-500/20 text-purple-300",
  MP: "bg-primary/20 text-primary",
  DC: "bg-sky-500/20 text-sky-300",
  UPAZILA_CHAIRMAN: "bg-amber-500/20 text-amber-300",
  UNION_CHAIRMAN: "bg-amber-500/20 text-amber-300",
  MAYOR: "bg-amber-500/20 text-amber-300",
};

type RoleFilter = "ALL" | "MINISTER" | "MP" | "DC" | "LOCAL";

function partyLabel(party: string | null | undefined, bn: boolean): string {
  const p = (party ?? "").trim();
  if (!p) return "—";
  if (/^bnp$/i.test(p)) return bn ? "বিএনপি" : "BNP";
  if (/bcs/i.test(p)) return bn ? "বিসিএস (প্রশাসন)" : p;
  if (/local/i.test(p)) return bn ? "স্থানীয় সরকার" : p;
  return p;
}

function rowName(r: RepresentativeRow): string {
  return r.displayName || r.name.replace(/\s*\([^)]+\)\s*$/, "").trim() || r.name;
}

function rowPortfolio(r: RepresentativeRow): string | null {
  if (r.portfolio) return r.portfolio;
  const m = /\(([^)]+)\)\s*$/.exec(r.name.trim());
  return m?.[1]?.trim() || null;
}

export default function RepresentativesPage() {
  const t = useTranslations("modules.representatives");
  const tc = useTranslations("common");
  const locale = useLocale();
  const bn = locale === "bn";
  const { rows, loading, error, reload } = useRepresentativesList();
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("ALL");

  const filtered = useMemo(() => {
    if (roleFilter === "ALL") return rows;
    if (roleFilter === "LOCAL") {
      return rows.filter(
        (r) =>
          r.role === "UNION_CHAIRMAN" ||
          r.role === "UPAZILA_CHAIRMAN" ||
          r.role === "MAYOR",
      );
    }
    return rows.filter((r) => r.role === roleFilter);
  }, [rows, roleFilter]);

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

  const filters: { key: RoleFilter; label: string }[] = [
    { key: "ALL", label: bn ? "সব" : "All" },
    { key: "MINISTER", label: t("ministers") },
    { key: "MP", label: t("mps") },
    { key: "DC", label: t("dcs") },
    { key: "LOCAL", label: bn ? "স্থানীয়" : "Local" },
  ];

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
          {" · "}
          {bn ? "ক্ষমতাসীন দল" : "Ruling party"}:{" "}
          <span className="font-semibold text-sky-50">
            {partyLabel(mandate.ruling_party, bn)}
          </span>
        </p>
      ) : null}

      <div className="mb-3 flex flex-wrap gap-2">
        {filters.map((f) => (
          <Button
            key={f.key}
            size="sm"
            variant={roleFilter === f.key ? "default" : "outline"}
            onClick={() => setRoleFilter(f.key)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      <AccountabilityPanel />
      {!loading && (
        <DataTable
          rows={filtered}
          columns={[
            {
              key: "name",
              label: t("colName"),
              render: (r) => (
                <div className="min-w-[10rem]">
                  <p className="font-medium tracking-tight">{rowName(r)}</p>
                  {rowPortfolio(r) ? (
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{rowPortfolio(r)}</p>
                  ) : null}
                </div>
              ),
            },
            {
              key: "role",
              label: t("colRole"),
              render: (r) => (
                <Badge className={roleColor[r.role] ?? ""}>{r.role}</Badge>
              ),
            },
            {
              key: "party",
              label: t("colParty"),
              render: (r) => (
                <Badge
                  variant="outline"
                  className={
                    /^bnp$/i.test(r.party ?? "")
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                      : ""
                  }
                >
                  {partyLabel(r.party, bn)}
                </Badge>
              ),
            },
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
