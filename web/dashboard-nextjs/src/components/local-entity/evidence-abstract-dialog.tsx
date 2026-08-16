"use client";

import { useLocale, useTranslations } from "next-intl";
import { ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
type EvidenceKind = "THESIS" | "EXPERT" | "POLICY_BRIEF";

type LocaleText = { en: string; bn: string };

export type EvidenceAbstractPayload = {
  kind: EvidenceKind;
  title: string;
  titleBn: string | null;
  abstract: string;
  abstractBn: string | null;
  author: string | null;
  institution: string | null;
  sourceName: string;
  url: string;
  year: number;
  solutions?: {
    now: LocaleText;
    week?: LocaleText;
    days90?: LocaleText;
  };
  doNow?: LocaleText;
};

/** Seed / placeholder hosts that cannot be opened in a browser. */
export function isPublicHttpUrl(url: string | null | undefined): boolean {
  if (!url?.trim()) return false;
  try {
    const parsed = new URL(url.trim());
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
    const host = parsed.hostname.toLowerCase();
    if (
      host === "localhost" ||
      host.endsWith(".local") ||
      host === "example.com" ||
      host.endsWith(".example.com") ||
      host === "example.org" ||
      host.endsWith(".example.org")
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function pickLocale(isBn: boolean, pair?: LocaleText | null) {
  if (!pair) return "";
  return isBn ? pair.bn || pair.en : pair.en;
}

export function EvidenceAbstractDialog({
  item,
  open,
  onOpenChange,
}: {
  item: EvidenceAbstractPayload | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("modules.localEvidence");
  const isBn = useLocale().startsWith("bn");

  if (!item) return null;

  const title = isBn ? item.titleBn || item.title : item.title;
  const abstract = isBn ? item.abstractBn || item.abstract : item.abstract;
  const now = pickLocale(isBn, item.solutions?.now ?? item.doNow);
  const week = pickLocale(isBn, item.solutions?.week);
  const days90 = pickLocale(isBn, item.solutions?.days90);
  const meta = [item.author, item.institution, String(item.year)].filter(Boolean).join(" · ");
  const publicUrl = isPublicHttpUrl(item.url);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="pr-8 text-left text-base leading-snug">{title}</DialogTitle>
          <DialogDescription className="text-left text-xs">
            {t(`kind${item.kind}`)} · {item.sourceName}
            {meta ? ` · ${meta}` : ""}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm" data-testid="evidence-abstract-dialog">
          <section>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {t("abstractLabel")}
            </p>
            <p className="whitespace-pre-wrap leading-relaxed text-foreground/90">{abstract}</p>
          </section>
          {now ? (
            <p className="text-[12px] text-sky-200/90">
              {t("horizonNow")}: {now}
            </p>
          ) : null}
          {week ? (
            <p className="text-[12px] text-amber-100/80">
              {t("horizonWeek")}: {week}
            </p>
          ) : null}
          {days90 ? (
            <p className="text-[12px] text-emerald-200/80">
              {t("horizon90")}: {days90}
            </p>
          ) : null}
          <p className="text-[11px] text-muted-foreground">{t("abstractDialogNote")}</p>
          {publicUrl ? (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[12px] text-primary underline-offset-2 hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              {t("openExternal")}
            </a>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
