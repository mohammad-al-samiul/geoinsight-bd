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
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="glass-panel w-full max-w-md rounded-xl p-8 shadow-panel">
        <div className="mb-6 flex justify-end">
          <LocaleSwitcher />
        </div>
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-gradient-gov">GeoInsight BD</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t("email")}
            </label>
            <input
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-input bg-secondary/50 px-3 py-2.5 text-sm outline-none ring-primary focus:ring-1"
              placeholder={t("emailPlaceholder")}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t("password")}
            </label>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-input bg-secondary/50 px-3 py-2.5 text-sm outline-none ring-primary focus:ring-1"
            />
          </div>

          {error && (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t("submitting") : t("submit")}
          </Button>
        </form>

        <p className="mt-6 text-center text-[10px] text-muted-foreground">{t("footer")}</p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const t = useTranslations("auth");
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">{t("loading")}</div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
