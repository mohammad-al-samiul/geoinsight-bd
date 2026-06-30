"use client";

import { ModuleShell } from "@/components/modules/module-shell";
import { KpiOverview } from "@/components/kpis/kpi-overview";
import { useKpiData } from "@/hooks/use-module-data";
import { useTranslations } from "next-intl";

export default function KpisPage() {
  const t = useTranslations("modules.kpis");
  const { definitions, records, loading, error, reload } = useKpiData();

  return (
    <ModuleShell
      title={t("title")}
      description={t("description")}
      loading={loading}
      error={error}
      onRetry={reload}
    >
      {!loading && <KpiOverview definitions={definitions} records={records} />}
    </ModuleShell>
  );
}
