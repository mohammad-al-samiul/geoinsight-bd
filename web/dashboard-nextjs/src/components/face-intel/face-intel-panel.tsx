"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ModuleShell, StatCard, StatGrid } from "@/components/modules/module-shell";
import { IntelCard } from "@/components/ui/intel-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FaceAlertOverlayCard } from "@/components/face-intel/face-alert-overlay-card";
import { useAppLang } from "@/hooks/use-app-lang";
import { useFaceIntel } from "@/hooks/use-face-intel";
import {
  Camera,
  Fingerprint,
  IdCard,
  Loader2,
  ScanFace,
  Upload,
} from "lucide-react";

export function FaceIntelPanel() {
  const t = useTranslations("modules.faceIntel");
  const lang = useAppLang();
  const fileRef = useRef<HTMLInputElement>(null);
  const [camOn, setCamOn] = useState(false);
  const {
    card,
    setCard,
    gallery,
    loading,
    error,
    videoRef,
    identifyFile,
    identifyNid,
    startCamera,
    stopCamera,
    captureAndIdentify,
  } = useFaceIntel();

  const toggleCam = async () => {
    if (camOn) {
      stopCamera();
      setCamOn(false);
      return;
    }
    await startCamera();
    setCamOn(true);
  };

  const onSampleMatch = async (vipId: string, nid: string) => {
    // Prefer sample photo → face match; fall back to NID dossier
    try {
      const res = await fetch(`/api/proxy/intelligence/face-intel/sample/${vipId}`, {
        credentials: "include",
      });
      if (res.ok && (res.headers.get("content-type") || "").includes("image")) {
        const blob = await res.blob();
        const file = new File([blob], `${vipId}.jpg`, { type: "image/jpeg" });
        await identifyFile(file, lang);
        return;
      }
    } catch {
      /* NID fallback */
    }
    await identifyNid(nid, lang);
  };

  return (
    <div className="relative">
      <ModuleShell
        title={t("title")}
        description={t("description")}
        loading={false}
        error={error}
        onRetry={() => setCard(null)}
        stats={
          card?.ethical_score != null && (
            <StatGrid>
              <StatCard
                label={t("ethicalScore")}
                value={`${card.ethical_score}/100`}
                accent={card.ethical_score < 50 ? "danger" : card.ethical_score < 75 ? "warning" : "success"}
              />
              <StatCard label={t("redFlags")} value={card.red_flags_count ?? 0} accent="danger" />
              <StatCard label={t("activities")} value={card.public_activity_count ?? 0} />
              <StatCard label={t("complaints")} value={card.complaint_proxy_count ?? 0} />
            </StatGrid>
          )
        }
      >
        <IntelCard accent="info" padding="lg" hoverLift={false} className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="flex items-center gap-2 font-display text-sm font-semibold tracking-tight">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/25 bg-primary/10">
                <ScanFace className="h-4 w-4 text-primary" />
              </span>
              {t("captureTitle")}
            </h3>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => void toggleCam()}>
                <Camera className="h-3.5 w-3.5" />
                {camOn ? t("stopCamera") : t("startCamera")}
              </Button>
              <Button
                size="sm"
                className="gap-1.5"
                disabled={loading || !camOn}
                onClick={() => void captureAndIdentify(lang)}
              >
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Fingerprint className="h-3.5 w-3.5" />}
                {t("scanFrame")}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() => fileRef.current?.click()}
                disabled={loading}
              >
                <Upload className="h-3.5 w-3.5" />
                {t("upload")}
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void identifyFile(f, lang);
                }}
              />
            </div>
          </div>

          <p className="text-xs text-muted-foreground">{t("captureHint")}</p>

          <div className="overflow-hidden rounded-xl border border-border/50 bg-black/40">
            <video
              ref={videoRef}
              muted
              playsInline
              className="aspect-video w-full object-cover"
            />
          </div>
        </IntelCard>

        <IntelCard accent="default" padding="lg" hoverLift={false} className="mt-4 space-y-3">
          <h3 className="flex items-center gap-2 font-display text-sm font-semibold">
            <IdCard className="h-4 w-4 text-primary" />
            {t("galleryTitle")}
          </h3>
          <p className="text-xs text-muted-foreground">{t("galleryHint")}</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {gallery.map((v) => (
              <button
                key={v.vip_id}
                type="button"
                disabled={loading}
                onClick={() => void onSampleMatch(v.vip_id, v.nid)}
                className="rounded-xl border border-border/60 bg-background/40 p-3 text-left transition hover:border-primary/40 hover:bg-primary/5"
              >
                <p className="text-sm font-semibold tracking-tight">{v.name}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {lang === "bn" ? v.designation_bn : v.designation}
                </p>
                <Badge variant="outline" className="mt-2 border-primary/20 text-[10px] text-primary">
                  NID {v.nid}
                </Badge>
              </button>
            ))}
            {!gallery.length && (
              <p className="text-xs text-muted-foreground">{t("galleryEmpty")}</p>
            )}
          </div>
        </IntelCard>
      </ModuleShell>

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <FaceAlertOverlayCard card={card} onClose={() => setCard(null)} />
      </div>
    </div>
  );
}
