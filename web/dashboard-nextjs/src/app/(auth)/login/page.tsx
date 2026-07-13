"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { authFetch, ApiClientError } from "@/lib/api-client";
import { Shield } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/";
  const t = useTranslations("auth");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await authFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      router.replace(redirect);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : t("failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-atmosphere relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -right-16 bottom-0 h-80 w-80 rounded-full bg-sky-500/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md animate-rise">
        <div className="mb-4 flex justify-end">
          <LocaleSwitcher />
        </div>

        <div className="glass-panel overflow-hidden rounded-2xl p-8 sm:p-9">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10">
              <Shield className="h-7 w-7 text-primary" />
            </div>
            <h1 className="font-display text-gradient-gov text-3xl font-bold tracking-tight">
              GeoInsight BD
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t("subtitle")}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {t("email")}
              </label>
              <input
                type="email"
                required
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-input bg-secondary/40 px-3.5 py-2.5 text-sm outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
                placeholder={t("emailPlaceholder")}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {t("password")}
              </label>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-input bg-secondary/40 px-3.5 py-2.5 text-sm outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {error && (
              <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            <Button type="submit" className="mt-2 w-full" size="lg" disabled={loading}>
              {loading ? t("submitting") : t("submit")}
            </Button>
          </form>

          <p className="mt-7 text-center text-[10px] tracking-wide text-muted-foreground">
            {t("footer")}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const t = useTranslations("auth");
  return (
    <Suspense
      fallback={
        <div className="app-atmosphere flex min-h-screen items-center justify-center text-sm text-muted-foreground">
          {t("loading")}
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
