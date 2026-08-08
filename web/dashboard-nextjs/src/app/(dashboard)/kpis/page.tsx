"use client";

import { ModuleShell } from "@/components/modules/module-shell";
import { KpiOverview } from "@/components/kpis/kpi-overview";
import { useKpiData } from "@/hooks/use-module-data";
import { useLocale } from "next-intl";

export default function KpisPage() {
  const locale = useLocale();
  const bn = locale === "bn";
  const { definitions, records, loading, error, reload } = useKpiData();

  return (
    <ModuleShell
      title={bn ? "জাতীয় কর্মদক্ষতা সূচক" : "National Performance Indicators"}
      description={
        bn
          ? "সর্বশেষ সংরক্ষিত KPI রেকর্ড, যাচাইকরণ অবস্থা এবং প্রতিনিধি-ভিত্তিক অগ্রগতি।"
          : "Latest stored KPI records, verification status, and representative-level progress."
      }
      loading={loading}
      loadingLabel={bn ? "সর্বশেষ KPI ডেটা সিঙ্ক হচ্ছে…" : "Syncing the latest KPI data…"}
      error={error}
      onRetry={reload}
    >
      <KpiOverview definitions={definitions} records={records} />
    </ModuleShell>
  );
}
