"use client";

import { ModuleShell } from "@/components/modules/module-shell";
import { KpiOverview } from "@/components/kpis/kpi-overview";
import { useKpiData } from "@/hooks/use-module-data";

export default function KpisPage() {
  const { definitions, records, loading, error, reload } = useKpiData();

  return (
    <ModuleShell
      title="Representative KPIs"
      description="Performance indicators for MPs, Ministers, and DCs — verified national oversight metrics."
      loading={loading}
      error={error}
      onRetry={reload}
    >
      {!loading && <KpiOverview definitions={definitions} records={records} />}
    </ModuleShell>
  );
}
