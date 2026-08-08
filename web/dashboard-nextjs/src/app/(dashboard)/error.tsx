"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle } from "lucide-react";
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
    <div role="alert" className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="glass-panel w-full max-w-md rounded-2xl p-8 text-center shadow-panel animate-scale-in">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-destructive/30 bg-destructive/10">
          <AlertTriangle className="h-6 w-6 text-destructive" aria-hidden="true" />
        </div>
        <h2 className="font-display text-xl font-semibold tracking-tight text-foreground">
          {t("title")}
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
          {t("body")}
        </p>
        {error.digest && (
          <p className="mt-3 font-mono text-[10px] tracking-wide text-muted-foreground/60">
            {error.digest}
          </p>
        )}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button onClick={() => reset()}>{t("retry")}</Button>
          <Button variant="outline" onClick={() => window.location.reload()}>
            {t("reload")}
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              window.location.href = "/login";
            }}
          >
            {t("signIn")}
          </Button>
        </div>
      </div>
    </div>
  );
}
