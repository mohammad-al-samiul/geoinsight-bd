"use client";

import { AnomalyFeedPanel } from "@/components/alerts/anomaly-feed-panel";
import { PredictiveAlertsPanel } from "@/components/alerts/predictive-alerts-panel";
import { useAdminHierarchy } from "@/hooks/use-admin-hierarchy";
import { useTranslations } from "next-intl";

export default function AlertsPage() {
  const t = useTranslations("modules.alerts");
  useAdminHierarchy();

  return (
    <div className="mx-auto max-w-4xl animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("pageDescription")}</p>
      </div>
      <PredictiveAlertsPanel />
      <AnomalyFeedPanel />
    </div>
  );
}
