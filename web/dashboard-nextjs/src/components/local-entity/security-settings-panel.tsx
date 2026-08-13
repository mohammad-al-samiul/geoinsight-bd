"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { KeyRound, ShieldCheck } from "lucide-react";
import {
  ModuleShell,
  StatCard,
  StatGrid,
} from "@/components/modules/module-shell";
import {
  LocalPulseRing,
  LocalVizCard,
} from "@/components/local-entity/local-viz";
import { Button } from "@/components/ui/button";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { MotionSection } from "@/components/ui/module-motion";

interface ApiOk<T> {
  success: boolean;
  data: T;
}

interface Profile {
  id: string;
  email: string;
  phone: string | null;
  role: string;
  mfaEnabled: boolean;
}

interface MfaSetup {
  secret: string;
  otpauthUrl: string;
  issuer: string;
}

export function SecuritySettingsPanel() {
  const t = useTranslations("modules.security");
  const tv = useTranslations("modules.localViz");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [setup, setSetup] = useState<MfaSetup | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient<ApiOk<Profile>>("auth/me");
      setProfile(res.data);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : t("loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const startSetup = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await apiClient<ApiOk<MfaSetup>>("auth/mfa/setup", {
        method: "POST",
        body: "{}",
      });
      setSetup(res.data);
      setCode("");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : t("setupFailed"));
    } finally {
      setBusy(false);
    }
  };

  const enable = async () => {
    if (!setup || code.length !== 6) return;
    setBusy(true);
    setError(null);
    try {
      await apiClient("auth/mfa/enable", {
        method: "POST",
        body: JSON.stringify({ secret: setup.secret, code }),
      });
      setSetup(null);
      setCode("");
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : t("enableFailed"));
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    if (code.length !== 6) return;
    setBusy(true);
    setError(null);
    try {
      await apiClient("auth/mfa/disable", {
        method: "POST",
        body: JSON.stringify({ code }),
      });
      setCode("");
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : t("disableFailed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModuleShell
      title={t("title")}
      description={t("description")}
      loading={loading && !profile}
      error={error}
      onRetry={() => void load()}
      stats={
        profile && (
          <StatGrid>
            <StatCard
              label={t("mfaStatus")}
              value={profile.mfaEnabled ? t("enabled") : t("disabled")}
            />
            <StatCard label={t("account")} value={profile.email} />
            <StatCard label={t("phone")} value={profile.phone ?? "—"} />
          </StatGrid>
        )
      }
    >
      <div className="mb-4 grid gap-4 md:grid-cols-[220px_1fr]">
        <LocalVizCard title={tv("mfaReady")} icon={ShieldCheck} delay={0.05}>
          <div className="flex justify-center py-4">
            <LocalPulseRing
              value={profile?.mfaEnabled ? 100 : 18}
              label={profile?.mfaEnabled ? t("enabled") : t("disabled")}
            />
          </div>
        </LocalVizCard>
        <MotionSection delay={0.1} className="space-y-4 rounded-xl border border-border/60 bg-secondary/20 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <KeyRound className="h-4 w-4 text-primary" />
          {t("totpTitle")}
        </div>
        <p className="text-sm text-muted-foreground">{t("totpHelp")}</p>

        {!profile?.mfaEnabled && !setup && (
          <Button onClick={() => void startSetup()} disabled={busy}>
            {t("beginSetup")}
          </Button>
        )}

        {setup && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">{t("scanOrEnter")}</p>
            <code className="block break-all rounded-lg bg-background/60 px-3 py-2 font-mono text-xs">
              {setup.secret}
            </code>
            <p className="break-all text-[10px] text-muted-foreground">{setup.otpauthUrl}</p>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="w-full max-w-xs rounded-lg border border-input bg-background px-3 py-2 font-mono tracking-widest"
              placeholder="000000"
            />
            <div className="flex gap-2">
              <Button onClick={() => void enable()} disabled={busy || code.length !== 6}>
                {t("confirmEnable")}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setSetup(null);
                  setCode("");
                }}
              >
                {t("cancel")}
              </Button>
            </div>
          </div>
        )}

        {profile?.mfaEnabled && !setup && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{t("disableHelp")}</p>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="w-full max-w-xs rounded-lg border border-input bg-background px-3 py-2 font-mono tracking-widest"
              placeholder="000000"
            />
            <Button
              variant="outline"
              onClick={() => void disable()}
              disabled={busy || code.length !== 6}
            >
              {t("disable")}
            </Button>
          </div>
        )}
        </MotionSection>
      </div>
    </ModuleShell>
  );
}
