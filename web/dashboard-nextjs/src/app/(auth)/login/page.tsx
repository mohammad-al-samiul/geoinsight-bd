"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { DataFlowBackground } from "@/components/ui/data-flow-background";
import { authFetch, ApiClientError } from "@/lib/api-client";
import { Shield } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/";
  const t = useTranslations("auth");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [enrollToken, setEnrollToken] = useState<string | null>(null);
  const [enrollSecret, setEnrollSecret] = useState<string | null>(null);
  const [enrollOtpauth, setEnrollOtpauth] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const resetMfa = () => {
    setMfaToken(null);
    setEnrollToken(null);
    setEnrollSecret(null);
    setEnrollOtpauth(null);
    setMfaCode("");
    setError(null);
  };

  const finishLogin = async (role: string | null | undefined) => {
    let resolvedRole = role ?? null;
    if (!resolvedRole) {
      try {
        const me = await authFetch<{
          success: boolean;
          data: { role: string };
        }>("/api/auth/me");
        resolvedRole = me.data.role;
      } catch {
        // keep null
      }
    }

    let next = redirect || "/";
    const isLocal = resolvedRole === "MP" || resolvedRole === "MAYOR";
    if (isLocal) {
      // Local DSS accounts always stay in /local/* (ignore national deep-links)
      next = next.startsWith("/local") ? next : "/local";
    } else if (next === "/dashboard") {
      next = "/";
    }

    router.replace(next);
    router.refresh();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (enrollToken && enrollSecret) {
        const enrollRes = await authFetch<{
          success: boolean;
          data?: { user?: { role?: string } };
        }>("/api/auth/mfa/enroll", {
          method: "POST",
          body: JSON.stringify({
            enrollToken,
            secret: enrollSecret,
            code: mfaCode,
          }),
        });
        await finishLogin(enrollRes.data?.user?.role);
        return;
      }

      if (mfaToken) {
        const verifyRes = await authFetch<{
          success: boolean;
          data?: { user?: { role?: string } };
        }>("/api/auth/mfa/verify", {
          method: "POST",
          body: JSON.stringify({ mfaToken, code: mfaCode }),
        });
        await finishLogin(verifyRes.data?.user?.role);
        return;
      }

      const loginRes = await authFetch<{
        success: boolean;
        data?: {
          requiresMfa?: boolean;
          requiresMfaEnrollment?: boolean;
          mfaToken?: string;
          enrollToken?: string;
          secret?: string;
          otpauthUrl?: string;
          user?: { role?: string };
        };
      }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      if (loginRes.data?.requiresMfa && loginRes.data.mfaToken) {
        setMfaToken(loginRes.data.mfaToken);
        setMfaCode("");
        return;
      }

      if (
        loginRes.data?.requiresMfaEnrollment &&
        loginRes.data.enrollToken &&
        loginRes.data.secret
      ) {
        setEnrollToken(loginRes.data.enrollToken);
        setEnrollSecret(loginRes.data.secret);
        setEnrollOtpauth(loginRes.data.otpauthUrl ?? null);
        setMfaCode("");
        return;
      }

      await finishLogin(loginRes.data?.user?.role);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : t("failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-atmosphere relative flex min-h-dvh items-center justify-center overflow-hidden p-4">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -right-16 bottom-0 h-80 w-80 rounded-full bg-sky-500/10 blur-3xl" />
      </div>
      <DataFlowBackground className="absolute inset-0" intensity="rich" />

      <div className="relative w-full max-w-md animate-rise">
        <div className="mb-4 flex justify-end">
          <LocaleSwitcher />
        </div>

        <div className="glass-panel overflow-hidden rounded-2xl p-5 sm:p-8 sm:p-9">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10">
              <Shield className="h-7 w-7 text-primary" />
            </div>
            <h1 className="font-display text-gradient-gov text-3xl font-bold tracking-tight">
              GeoInsight BD
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {enrollToken
                ? t("enrollSubtitle")
                : mfaToken
                  ? t("mfaSubtitle")
                  : t("subtitle")}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!mfaToken && !enrollToken ? (
              <>
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
              </>
            ) : (
              <div className="space-y-3">
                {enrollSecret && (
                  <>
                    <p className="text-xs text-muted-foreground">{t("enrollSecret")}</p>
                    <code className="block break-all rounded-lg bg-secondary/40 px-3 py-2 font-mono text-xs">
                      {enrollSecret}
                    </code>
                    {enrollOtpauth && (
                      <p className="break-all text-[10px] text-muted-foreground">{enrollOtpauth}</p>
                    )}
                  </>
                )}
                <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  {t("mfaCode")}
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                  autoComplete="one-time-code"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="w-full rounded-lg border border-input bg-secondary/40 px-3.5 py-2.5 text-center font-mono text-lg tracking-[0.35em] outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
                  placeholder="000000"
                />
                <button
                  type="button"
                  className="mt-2 text-xs text-muted-foreground underline-offset-2 hover:underline"
                  onClick={resetMfa}
                >
                  {t("mfaBack")}
                </button>
              </div>
            )}

            {error && (
              <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            <Button type="submit" className="mt-2 w-full" size="lg" disabled={loading}>
              {loading
                ? t("submitting")
                : enrollToken
                  ? t("enrollSubmit")
                  : mfaToken
                    ? t("mfaSubmit")
                    : t("submit")}
            </Button>
          </form>

          <p className="mt-7 text-center text-[10px] tracking-wide text-muted-foreground">
            {t("footer")}
          </p>
          <div className="mt-4 space-y-3 rounded-lg border border-border/50 bg-secondary/20 p-3 text-[10px] leading-relaxed text-muted-foreground">
            <div>
              <p className="mb-1 font-semibold uppercase tracking-wide text-foreground/80">
                PMO · National dashboard
              </p>
              <p>pmo@geoinsight.gov.bd · ChangeMe@123</p>
            </div>
            <div>
              <p className="mb-1 font-semibold uppercase tracking-wide text-foreground/80">
                Local DSS · MP / Mayor
              </p>
              <p>mp.ctg8@geoinsight.gov.bd · ChangeMe@123</p>
              <p>mp.ctg9@geoinsight.gov.bd · ChangeMe@123</p>
              <p>mp.ctg10@geoinsight.gov.bd · ChangeMe@123</p>
              <p>mp.ctg11@geoinsight.gov.bd · ChangeMe@123</p>
              <p>mayor.ccc@geoinsight.gov.bd · ChangeMe@123</p>
              <p>mayor.cocc@geoinsight.gov.bd · ChangeMe@123</p>
            </div>
          </div>
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
        <div className="app-atmosphere flex min-h-dvh items-center justify-center text-sm text-muted-foreground">
          {t("loading")}
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
