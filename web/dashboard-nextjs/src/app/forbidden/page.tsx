"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { ShieldAlert } from "lucide-react";

function ForbiddenContent() {
  const searchParams = useSearchParams();
  const t = useTranslations("forbidden");
  const reason = searchParams.get("reason") ?? t("defaultReason");
  const [homeHref, setHomeHref] = useState("/");

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/auth/me", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (cancelled || !json?.success) return;
        const role = json.data?.role as string | undefined;
        if (role === "MP" || role === "MAYOR") setHomeHref("/local");
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-center">
      <div className="absolute right-4 top-4">
        <LocaleSwitcher />
      </div>
      <div className="glass-panel max-w-lg rounded-xl p-8 shadow-panel">
        <ShieldAlert className="mx-auto h-12 w-12 text-destructive" />
        <h1 className="mt-4 text-2xl font-bold">{t("title")}</h1>
        <p className="mt-3 text-sm text-muted-foreground">{reason}</p>
        <p className="mt-2 text-xs text-muted-foreground">{t("rbacNote")}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link href={homeHref}>{t("overview")}</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/login">{t("switchAccount")}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function ForbiddenPage() {
  const tc = useTranslations("common");
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">{tc("loading")}</div>
      }
    >
      <ForbiddenContent />
    </Suspense>
  );
}
