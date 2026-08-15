"use client";

import { useTranslations } from "next-intl";
import { NotificationCenter } from "@/components/layout/notification-center";

export default function NotificationsPage() {
  const t = useTranslations("notifications");
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border/80 bg-background/70 p-6 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("description")}</p>
      </div>
      <div className="rounded-2xl border border-border/80 bg-background/70 p-4 shadow-sm">
        <NotificationCenter inline />
      </div>
    </div>
  );
}
