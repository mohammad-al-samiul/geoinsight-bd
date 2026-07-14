"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { ModuleShell, StatCard, StatGrid } from "@/components/modules/module-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { IntelCard } from "@/components/ui/intel-card";
import { AnimatedSlider } from "@/components/ui/animated-slider";
import { ProgressMeter } from "@/components/ui/progress-meter";
import { cn } from "@/lib/utils";
import {
  useAntiPhishing,
  type PhishingStatus,
} from "@/hooks/use-anti-phishing";
import {
  AlertTriangle,
  Globe2,
  Link2,
  Loader2,
  Play,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
  ListChecks,
} from "lucide-react";

const SAMPLE_SUSPICIOUS = "https://bangladesh-gov-bd-secure-login.example/login";
const FALLBACK_OFFICIAL = [
  "https://bangladesh.gov.bd",
  "https://land.gov.bd",
  "https://cabinet.gov.bd",
  "https://pmo.gov.bd",
  "https://nidw.gov.bd",
  "https://nbr.gov.bd",
].join("\n");

const STATUS_ACCENT: Record<PhishingStatus, "danger" | "success" | "warning" | "info" | "default"> = {
  RED_FLAG: "danger",
  CLEAN: "success",
  WATCH: "warning",
  CLEAR: "info",
  ERROR: "default",
};

const STATUS_TEXT: Record<PhishingStatus, string> = {
  RED_FLAG: "text-red-400",
  CLEAN: "text-emerald-400",
  WATCH: "text-amber-400",
  CLEAR: "text-sky-400",
  ERROR: "text-muted-foreground",
};

export function AntiPhishingPanel() {
  const t = useTranslations("modules.antiPhishing");
  const tc = useTranslations("common");
  const [url, setUrl] = useState("");
  const [threshold, setThreshold] = useState(0.9);
  const [officialUrls, setOfficialUrls] = useState(FALLBACK_OFFICIAL);
  const {
    result,
    loading,
    error,
    registerMsg,
    catalog,
    scan,
    registerOfficial,
    registerAllDefaults,
  } = useAntiPhishing();

  // When seed catalog loads, prefill the register textarea with every official URL
  useEffect(() => {
    if (catalog?.seed_urls?.length) {
      setOfficialUrls(catalog.seed_urls.join("\n"));
    }
  }, [catalog]);

  const handleScan = () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    void scan(trimmed, threshold);
  };

  const handleRegister = () => {
    const urls = officialUrls
      .split(/[\n,]+/)
      .map((u) => u.trim())
      .filter(Boolean);
    if (!urls.length) return;
    void registerOfficial(urls);
  };

  const scorePct = result ? Math.round(result.similarity_score * 100) : 0;

  return (
    <ModuleShell
      title={t("title")}
      description={t("description")}
      loading={loading && !result}
      error={error}
      onRetry={handleScan}
      stats={
        result && (
          <StatGrid>
            <StatCard
              label={t("similarity")}
              value={`${scorePct}%`}
              accent={result.status === "RED_FLAG" ? "danger" : result.status === "CLEAN" ? "success" : "warning"}
            />
            <StatCard label={t("verdict")} value={t(`status.${result.status}`)} />
            <StatCard
              label={t("hostname")}
              value={result.domain_details.hostname}
              hint={result.domain_details.registrable_domain}
            />
            <StatCard
              label={t("bestMatch")}
              value={result.best_match?.registrable_domain ?? "—"}
              hint={
                result.domain_details.is_official
                  ? t("status.CLEAN")
                  : t("notOfficial")
              }
            />
          </StatGrid>
        )
      }
    >
      <IntelCard accent="info" padding="lg" hoverLift={false} className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 font-display text-sm font-semibold tracking-tight">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/25 bg-primary/10">
              <ShieldQuestion className="h-4 w-4 text-primary" />
            </span>
            {t("scanTitle")}
          </h3>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setUrl(SAMPLE_SUSPICIOUS)}
              className="gap-1.5 text-xs"
            >
              <Link2 className="h-3.5 w-3.5" />
              {t("loadSample")}
            </Button>
            <Button size="sm" onClick={handleScan} disabled={loading || !url.trim()} className="gap-2">
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
              {loading ? t("scanning") : t("scan")}
            </Button>
          </div>
        </div>

        <p className="text-xs leading-relaxed text-muted-foreground">{t("scanHint")}</p>

        <div className="space-y-2">
          <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {t("urlLabel")}
          </label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={t("urlPlaceholder")}
            className="w-full rounded-xl border border-border/60 bg-background/50 px-3.5 py-3 font-mono text-sm outline-none ring-primary/25 transition focus:border-primary/40 focus:ring-2"
          />
        </div>

        <AnimatedSlider
          index={0}
          label={t("threshold")}
          value={threshold}
          onChange={setThreshold}
          min={0.5}
          max={0.99}
          step={0.01}
          format="percent"
        />
      </IntelCard>

      <IntelCard accent="default" padding="lg" hoverLift={false} className="mt-4 space-y-4" index={1}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 font-display text-sm font-semibold tracking-tight">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-500/25 bg-emerald-500/10">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
            </span>
            {t("registerTitle")}
          </h3>
          {catalog && (
            <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-[10px] text-emerald-400">
              {t("seedCount", { count: catalog.seed_url_count })}
            </Badge>
          )}
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">{t("registerHint")}</p>
        <textarea
          value={officialUrls}
          onChange={(e) => setOfficialUrls(e.target.value)}
          rows={8}
          className="w-full rounded-xl border border-border/60 bg-background/50 px-3.5 py-3 font-mono text-xs outline-none ring-primary/25 transition focus:border-primary/40 focus:ring-2"
          placeholder={t("registerPlaceholder")}
        />
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            size="sm"
            disabled={loading}
            onClick={() => void registerAllDefaults()}
            className="gap-2"
          >
            <ListChecks className="h-3.5 w-3.5" />
            {t("registerAll")}
          </Button>
          <Button type="button" size="sm" variant="outline" disabled={loading} onClick={handleRegister}>
            {t("register")}
          </Button>
          {registerMsg && (
            <p className="font-mono text-[11px] text-muted-foreground">{registerMsg}</p>
          )}
        </div>
        {catalog && catalog.domains.length > 0 && (
          <p className="text-[11px] text-muted-foreground">
            {t("allowListHint", {
              domains: catalog.domains.length,
              signatures: catalog.signature_count,
            })}
          </p>
        )}
      </IntelCard>

      {!result && !loading && (
        <IntelCard hoverLift={false} accent="default" padding="lg" className="mt-6">
          <div className="flex min-h-[120px] flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
            <ShieldAlert className="h-8 w-8 opacity-35" />
            <p>{t("emptyResult")}</p>
          </div>
        </IntelCard>
      )}

      {result && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 space-y-4"
        >
          <IntelCard
            hoverLift={false}
            accent={STATUS_ACCENT[result.status]}
            padding="md"
          >
            <p className={cn("text-sm font-medium leading-relaxed", STATUS_TEXT[result.status])}>
              {result.status === "RED_FLAG" ? (
                <AlertTriangle className="mr-1.5 inline h-4 w-4" />
              ) : (
                <Globe2 className="mr-1.5 inline h-4 w-4" />
              )}
              {result.message}
              {result.status === "RED_FLAG" && (
                <span className="mt-1 block text-xs opacity-90">{t("redFlagHint")}</span>
              )}
            </p>
          </IntelCard>

          <div className="grid gap-3 md:grid-cols-2">
            <IntelCard index={0} accent={result.status === "RED_FLAG" ? "danger" : "default"} className="h-full">
              <div className="flex items-start justify-between gap-2">
                <p className="font-display text-sm font-semibold tracking-tight">{t("similarity")}</p>
                <Badge
                  variant="outline"
                  className={cn(
                    "border-primary/30 bg-primary/10 text-[10px]",
                    STATUS_TEXT[result.status],
                  )}
                >
                  {scorePct}/100
                </Badge>
              </div>
              <div className="mt-3">
                <ProgressMeter
                  value={scorePct}
                  invert={result.status === "RED_FLAG" || result.status === "WATCH"}
                  delay={0.08}
                />
              </div>
              <p className="mt-2.5 text-xs text-muted-foreground">
                {t("status." + result.status)}
              </p>
            </IntelCard>

            {result.cosine_score != null && (
              <IntelCard index={1} accent="info" className="h-full">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-display text-sm font-semibold tracking-tight">{t("cosine")}</p>
                  <Badge variant="outline" className="border-sky-500/30 bg-sky-500/10 text-[10px] text-sky-400">
                    {Math.round(result.cosine_score * 100)}/100
                  </Badge>
                </div>
                <div className="mt-3">
                  <ProgressMeter value={Math.round(result.cosine_score * 100)} delay={0.12} />
                </div>
              </IntelCard>
            )}

            {result.levenshtein_score != null && (
              <IntelCard index={2} accent="warning" className="h-full">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-display text-sm font-semibold tracking-tight">{t("levenshtein")}</p>
                  <Badge
                    variant="outline"
                    className="border-amber-500/30 bg-amber-500/10 text-[10px] text-amber-400"
                  >
                    {Math.round(result.levenshtein_score * 100)}/100
                  </Badge>
                </div>
                <div className="mt-3">
                  <ProgressMeter
                    value={Math.round(result.levenshtein_score * 100)}
                    delay={0.16}
                  />
                </div>
              </IntelCard>
            )}

            <IntelCard index={3} accent="default" className="h-full">
              <p className="font-display text-sm font-semibold tracking-tight">{t("domainDetails")}</p>
              <dl className="mt-3 space-y-2 text-xs">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">{t("hostname")}</dt>
                  <dd className="break-all text-right font-mono">{result.domain_details.hostname}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">{t("registrable")}</dt>
                  <dd className="break-all text-right font-mono">
                    {result.domain_details.registrable_domain}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">{t("official")}</dt>
                  <dd>{result.domain_details.is_official ? tc("yes") : tc("no")}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">{t("bestMatch")}</dt>
                  <dd className="break-all text-right font-mono">
                    {result.best_match?.registrable_domain ?? "—"}
                  </dd>
                </div>
              </dl>
            </IntelCard>
          </div>

          {result.error && (
            <IntelCard hoverLift={false} accent="warning" padding="md">
              <p className="text-xs text-amber-300">{result.error}</p>
            </IntelCard>
          )}
        </motion.div>
      )}
    </ModuleShell>
  );
}
