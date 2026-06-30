"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("error");

  useEffect(() => {
    console.error("[dashboard]", error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <h2 className="text-xl font-semibold text-foreground">{t("title")}</h2>
      <p className="max-w-md text-sm text-muted-foreground">{t("body")}</p>
      <div className="flex flex-wrap justify-center gap-3">
        <Button onClick={() => reset()}>{t("retry")}</Button>
        <Button variant="outline" onClick={() => window.location.reload()}>
          {t("reload")}
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            window.location.href = "/login";
          }}
        >
          {t("signIn")}
        </Button>
      </div>
    </div>
  );
}
