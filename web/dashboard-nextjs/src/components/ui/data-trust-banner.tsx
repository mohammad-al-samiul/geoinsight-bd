"use client";

import { AlertTriangle, Beaker, FlaskConical, MessageSquareOff, Radio, ScanFace, Waves } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export type DataTrustKind = "seed" | "mock" | "dry-run" | "demo" | "error" | "live" | "synthetic";

const TONE: Record<DataTrustKind, string> = {
  seed: "border-amber-500/35 bg-amber-500/10 text-amber-100",
  mock: "border-orange-500/40 bg-orange-500/12 text-orange-100",
  "dry-run": "border-amber-500/45 bg-amber-500/15 text-amber-50",
  demo: "border-violet-500/40 bg-violet-500/10 text-violet-100",
  error: "border-destructive/35 bg-destructive/10 text-destructive",
  live: "border-emerald-500/35 bg-emerald-500/10 text-emerald-100",
  synthetic: "border-sky-500/35 bg-sky-500/10 text-sky-100",
};

function TrustIcon({ kind }: { kind: DataTrustKind }) {
  const className = "mt-0.5 h-4 w-4 shrink-0";
  if (kind === "seed") return <Beaker className={className} />;
  if (kind === "mock") return <FlaskConical className={className} />;
  if (kind === "dry-run") return <MessageSquareOff className={className} />;
  if (kind === "demo") return <ScanFace className={className} />;
  if (kind === "live") return <Radio className={className} />;
  if (kind === "synthetic") return <Waves className={className} />;
  return <AlertTriangle className={className} />;
}

function trustCopy(
  kind: DataTrustKind,
  t: (key: "seedTitle" | "seedBody" | "mockTitle" | "mockBody" | "dryRunTitle" | "dryRunBody" | "demoTitle" | "demoBody" | "liveTitle" | "liveBody" | "syntheticTitle" | "syntheticBody" | "errorTitle" | "errorBody") => string,
): { title: string; body: string } {
  if (kind === "seed") return { title: t("seedTitle"), body: t("seedBody") };
  if (kind === "mock") return { title: t("mockTitle"), body: t("mockBody") };
  if (kind === "dry-run") return { title: t("dryRunTitle"), body: t("dryRunBody") };
  if (kind === "demo") return { title: t("demoTitle"), body: t("demoBody") };
  if (kind === "live") return { title: t("liveTitle"), body: t("liveBody") };
  if (kind === "synthetic") return { title: t("syntheticTitle"), body: t("syntheticBody") };
  return { title: t("errorTitle"), body: t("errorBody") };
}

export function DataTrustBanner({
  kind,
  className,
  body,
}: {
  kind: DataTrustKind;
  className?: string;
  body?: string;
}) {
  const t = useTranslations("modules.trust");
  const copy = trustCopy(kind, t);
  const title = copy.title;
  const text = body ?? copy.body;

  return (
    <div
      role={kind === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-3 rounded-xl border p-3.5 text-sm",
        TONE[kind],
        className,
      )}
    >
      <TrustIcon kind={kind} />
      <div>
        <p className="font-medium">{title}</p>
        <p className="mt-1 text-[13px] leading-relaxed opacity-90">{text}</p>
      </div>
    </div>
  );
}

export function DataTrustBadge({
  kind,
  className,
}: {
  kind: Exclude<DataTrustKind, "error">;
  className?: string;
}) {
  const t = useTranslations("modules.trust");
  const label =
    kind === "seed"
      ? t("seedBadge")
      : kind === "mock"
        ? t("mockBadge")
        : kind === "dry-run"
          ? t("dryRunBadge")
          : kind === "demo"
            ? t("demoBadge")
            : kind === "live"
              ? t("liveBadge")
              : t("syntheticBadge");

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        TONE[kind],
        className,
      )}
    >
      {label}
    </span>
  );
}

export function ProvenanceBadge({
  provenance,
  className,
}: {
  provenance?: "LIVE" | "SEED" | "SYNTHETIC" | null;
  className?: string;
}) {
  if (!provenance) return null;
  const kind = provenance === "LIVE" ? "live" : provenance === "SYNTHETIC" ? "synthetic" : "seed";
  return <DataTrustBadge kind={kind} className={className} />;
}
