"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Briefcase, GraduationCap, HeartPulse } from "lucide-react";
import { DataTable, ModuleShell } from "@/components/modules/module-shell";
import { Button } from "@/components/ui/button";
import { LocalKpiSpark, LocalKpiSparkGrid } from "@/components/local-entity/local-viz";
import {
  useNationalSectors,
  type NationalDistrictSlice,
  type NationalJobAction,
} from "@/hooks/use-national-sectors";
import { cn } from "@/lib/utils";
import { DataTrustBanner, ProvenanceBadge } from "@/components/ui/data-trust-banner";

type Tab = "education" | "health" | "jobs";
type StatusFilter = "ALL" | "ALERT" | "WATCH" | "OK";

function csvCell(value: string | number): string {
  const s = String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function actionKey(
  id: NationalJobAction["id"],
):
  | "actionJOB_FAIR"
  | "actionSKILL_TRAINING"
  | "actionVACANCY_DRIVE"
  | "actionRURAL_WORKS"
  | "actionINDUSTRY_LINK" {
  if (id === "SKILL_TRAINING") return "actionSKILL_TRAINING";
  if (id === "VACANCY_DRIVE") return "actionVACANCY_DRIVE";
  if (id === "RURAL_WORKS") return "actionRURAL_WORKS";
  if (id === "INDUSTRY_LINK") return "actionINDUSTRY_LINK";
  return "actionJOB_FAIR";
}

function metric(row: NationalDistrictSlice, key: string): number {
  const v = row.metrics[key];
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

export function NationalSectorsPanel() {
  const t = useTranslations("modules.nationalSectors");
  const isBn = useLocale().startsWith("bn");
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab");
  const initialDiv = searchParams.get("division");
  const [tab, setTab] = useState<Tab>(
    initialTab === "health" || initialTab === "jobs" ? initialTab : "education",
  );
  const [divisionId, setDivisionId] = useState(initialDiv ?? "all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const { data, error, loading, reload, allowed } = useNationalSectors();

  const rows = useMemo(() => {
    if (!data) return [] as NationalDistrictSlice[];
    const list =
      tab === "health" ? data.districts.health : tab === "jobs" ? data.districts.jobs : data.districts.education;
    const byDiv = divisionId === "all" ? list : list.filter((r) => r.divisionId === divisionId);
    return statusFilter === "ALL" ? byDiv : byDiv.filter((r) => r.status === statusFilter);
  }, [data, tab, divisionId, statusFilter]);

  const exportCsv = () => {
    const extra =
      tab === "education"
        ? ["attendancePct", "dropoutPct", "teacherGap"]
        : tab === "health"
          ? ["dengueCases7d", "occupancyPct", "orsStockDays"]
          : ["unemploymentPct", "youthUnempPct", "vacanciesListed"];
    const header = ["district", "division", "status", "pressure", ...extra];
    const lines = [
      header.join(","),
      ...rows.map((row) =>
        [
          csvCell(isBn ? row.nameBn || row.name : row.name),
          csvCell(isBn ? row.divisionNameBn || row.divisionName : row.divisionName),
          csvCell(row.status),
          csvCell(row.pressure),
          ...extra.map((key) => csvCell(metric(row, key))),
        ].join(","),
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `national-sectors-${tab}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!allowed) {
    return (
      <ModuleShell title={t("title")} description={t("description")}>
        <p className="text-sm text-muted-foreground">{t("pmoOnly")}</p>
      </ModuleShell>
    );
  }

  const summary = data?.summary;
  const hottest = rows[0];
  const extraColumns =
    tab === "education"
      ? [
          {
            key: "attendance",
            label: t("attendance"),
            render: (row: NationalDistrictSlice) => `${metric(row, "attendancePct")}%`,
          },
          {
            key: "dropout",
            label: t("dropout"),
            render: (row: NationalDistrictSlice) => String(metric(row, "dropoutPct")),
          },
          {
            key: "teacherGap",
            label: t("teacherGap"),
            render: (row: NationalDistrictSlice) => String(metric(row, "teacherGap")),
          },
        ]
      : tab === "health"
        ? [
            {
              key: "dengue",
              label: t("dengue7d"),
              render: (row: NationalDistrictSlice) => String(metric(row, "dengueCases7d")),
            },
            {
              key: "occupancy",
              label: t("occupancy"),
              render: (row: NationalDistrictSlice) => `${metric(row, "occupancyPct")}%`,
            },
            {
              key: "ors",
              label: t("orsDays"),
              render: (row: NationalDistrictSlice) => String(metric(row, "orsStockDays")),
            },
          ]
        : [
            {
              key: "unemp",
              label: t("unemployment"),
              render: (row: NationalDistrictSlice) => `${metric(row, "unemploymentPct")}%`,
            },
            {
              key: "youth",
              label: t("youthUnemp"),
              render: (row: NationalDistrictSlice) => `${metric(row, "youthUnempPct")}%`,
            },
            {
              key: "vacancies",
              label: t("vacancies"),
              render: (row: NationalDistrictSlice) => String(metric(row, "vacanciesListed")),
            },
          ];

  return (
    <ModuleShell
      title={t("title")}
      description={t("description")}
      loading={loading && !data}
      error={error}
      onRetry={() => void reload()}
      stats={
        summary ? (
          <LocalKpiSparkGrid>
            <LocalKpiSpark
              label={t("colEducation")}
              value={String(summary.educationAlerts)}
              base={summary.educationAlerts}
              color="#38bdf8"
            />
            <LocalKpiSpark
              label={t("colHealth")}
              value={String(summary.healthAlerts)}
              base={summary.healthAlerts}
              color="#f43f5e"
            />
            <LocalKpiSpark
              label={t("colJobs")}
              value={String(summary.jobsAlerts)}
              base={summary.jobsAlerts}
              color="#fbbf24"
            />
            <LocalKpiSpark
              label={t("unemployment")}
              value={`${summary.unemploymentAvg}%`}
              base={summary.unemploymentAvg}
              color="#34d399"
            />
          </LocalKpiSparkGrid>
        ) : undefined
      }
    >
      {data ? (
        <DataTrustBanner
          kind={(data.csvDistricts ?? 0) > 0 ? "live" : "seed"}
          className="mb-4"
          body={
            (data.csvDistricts ?? 0) > 0
              ? t("csvPartial", { csv: data.csvDistricts ?? 0, seed: data.seedDistricts ?? 0 })
              : undefined
          }
        />
      ) : null}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant={tab === "education" ? "default" : "outline"} onClick={() => setTab("education")}>
            <GraduationCap className="mr-1.5 h-3.5 w-3.5" />
            {t("tabEducation")}
          </Button>
          <Button size="sm" variant={tab === "health" ? "default" : "outline"} onClick={() => setTab("health")}>
            <HeartPulse className="mr-1.5 h-3.5 w-3.5" />
            {t("tabHealth")}
          </Button>
          <Button size="sm" variant={tab === "jobs" ? "default" : "outline"} onClick={() => setTab("jobs")}>
            <Briefcase className="mr-1.5 h-3.5 w-3.5" />
            {t("tabJobs")}
          </Button>
        </div>
        <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
          {t("filterStatus")}
          <select
            className="rounded-md border border-border/60 bg-background px-2 py-1 text-xs text-foreground"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          >
            <option value="ALL">{t("statusAll")}</option>
            <option value="ALERT">{t("statusAlert")}</option>
            <option value="WATCH">{t("statusWatch")}</option>
            <option value="OK">{t("statusOk")}</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
          {t("filterDivision")}
          <select
            className="rounded-md border border-border/60 bg-background px-2 py-1 text-xs text-foreground"
            value={divisionId}
            onChange={(e) => setDivisionId(e.target.value)}
          >
            <option value="all">{t("allDivisions")}</option>
            {(data?.divisions ?? []).map((d) => (
              <option key={d.id} value={d.id}>
                {isBn ? d.nameBn || d.name : d.name}
              </option>
            ))}
          </select>
        </label>
        <Button size="sm" variant="outline" onClick={exportCsv} disabled={!rows.length}>
          {t("exportCsv")}
        </Button>
      </div>

      {data ? (
        <div className="mb-4 grid gap-1.5 sm:grid-cols-2 xl:grid-cols-4">
          {data.divisions.map((div) => {
            const slice = tab === "health" ? div.health : tab === "jobs" ? div.jobs : div.education;
            const label = isBn ? div.nameBn || div.name : div.name;
            return (
              <button
                key={div.id}
                type="button"
                onClick={() => setDivisionId(div.id)}
                className={cn(
                  "rounded-lg border px-3 py-2 text-left text-sm",
                  slice.alert > 0
                    ? "border-destructive/40 bg-destructive/10"
                    : "border-border/50 bg-secondary/20",
                  divisionId === div.id && "ring-1 ring-primary/50",
                )}
              >
                <p className="truncate font-medium">{label}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {t("alerts")} {slice.alert} · {t("pressure")} {slice.pressureAvg}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {tab === "education"
                    ? `${t("attendance")} ${slice.attendanceAvg}% · ${t("teacherGap")} ${slice.teacherGap}`
                    : tab === "health"
                      ? `${t("dengue7d")} ${slice.dengue7d} · ${t("stockouts")} ${slice.stockouts}`
                      : `${t("unemployment")} ${slice.unemploymentAvg}% · ${t("jobFairGaps")} ${slice.jobFairGaps}`}
                </p>
              </button>
            );
          })}
        </div>
      ) : null}

      {hottest ? (
        <p className="mb-3 text-xs text-muted-foreground">
          {t("doNow")} {isBn ? hottest.opsHint.bn : hottest.opsHint.en}
        </p>
      ) : null}

      <DataTable
        emptyMessage={t("empty")}
        columns={[
          {
            key: "name",
            label: t("colDistrict"),
            render: (row) => (
              <span className="inline-flex items-center gap-1.5">
                {isBn ? row.nameBn || row.name : row.name}
                {row.metrics.origin === "csv" ? <ProvenanceBadge provenance="LIVE" /> : null}
              </span>
            ),
          },
          {
            key: "divisionName",
            label: t("colDivision"),
            render: (row) => (isBn ? row.divisionNameBn || row.divisionName : row.divisionName),
          },
          { key: "status", label: t("colStatus") },
          { key: "pressure", label: t("pressure") },
          ...extraColumns,
        ]}
        rows={rows}
      />

      {tab === "jobs" && data?.jobActions.length ? (
        <div className="mt-5">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {t("jobsHowTitle")}
          </p>
          <p className="mb-3 text-xs text-muted-foreground">{t("jobsHowNote")}</p>
          <div className="grid gap-2 md:grid-cols-2">
            {data.jobActions.map((action) => (
              <div key={action.id} className="rounded-lg border border-border/50 bg-secondary/20 px-3 py-2.5">
                <p className="text-sm font-medium">{t(actionKey(action.id))}</p>
                <p className="mt-1 text-[12px] text-muted-foreground">
                  {isBn ? action.detailBn : action.detail}
                </p>
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  {t("affectedDistricts")} {action.affectedDistricts}
                  {action.targetDivisions.length
                    ? ` · ${action.targetDivisions.join(", ")}`
                    : ""}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {data?.evidence.length ? (
        <div className="mt-5">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {t("evidenceTitle")}
          </p>
          <div className="space-y-2">
            {data.evidence.map((item) => (
              <div key={item.id} className="rounded-lg border border-border/50 px-3 py-2">
                <p className="text-sm font-medium">{isBn ? item.titleBn || item.title : item.title}</p>
                <p className="mt-1 text-[12px] text-muted-foreground">
                  {isBn ? item.abstractBn || item.abstract : item.abstract}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {t("doNow")} {isBn ? item.doNow.bn : item.doNow.en}
                </p>
                <Link href={item.url} target="_blank" className="mt-1 inline-block text-[11px] text-primary hover:underline">
                  {item.sourceName} · {item.year}
                </Link>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </ModuleShell>
  );
}
