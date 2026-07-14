"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import type { EthicalReportCard } from "@/hooks/use-face-intel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AlertTriangle, ShieldAlert, Sparkles, X } from "lucide-react";

interface FaceAlertOverlayCardProps {
  card: EthicalReportCard | null;
  onClose?: () => void;
  className?: string;
}

function scoreTone(score: number | null): string {
  if (score == null) return "text-muted-foreground";
  if (score >= 75) return "text-emerald-400";
  if (score >= 50) return "text-amber-400";
  return "text-red-400";
}

/**
 * Real-time Alert Overlay Card — float above the face-intel (or command) view
 * when a VIP face match returns an Ethical Report Card.
 */
export function FaceAlertOverlayCard({ card, onClose, className }: FaceAlertOverlayCardProps) {
  const t = useTranslations("modules.faceIntel");

  return (
    <AnimatePresence>
      {card?.vip_name && card.ethical_score != null && (
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.98 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className={cn(
            "pointer-events-auto absolute bottom-4 right-4 z-40 w-[min(100%,22rem)] overflow-hidden rounded-2xl border border-red-500/35 bg-gradient-to-br from-zinc-950/95 via-zinc-900/95 to-red-950/40 p-4 shadow-[0_20px_60px_-15px_rgba(239,68,68,0.45)] backdrop-blur-xl",
            className,
          )}
        >
          <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-red-500 via-amber-400 to-transparent" />

          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-red-500/40 bg-red-500/15">
                <ShieldAlert className="h-4.5 w-4.5 text-red-400" />
              </span>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-red-300/90">
                  {t("overlayTitle")}
                </p>
                <p className="font-display text-base font-semibold tracking-tight text-white">
                  {card.vip_name}
                </p>
              </div>
            </div>
            {onClose && (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-muted-foreground hover:text-white"
                onClick={onClose}
                aria-label={t("closeOverlay")}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>

          <p className="mt-1 text-xs text-zinc-400">
            {card.designation_bn ?? card.designation}
            {card.party ? ` · ${card.party}` : ""}
          </p>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-zinc-500">{t("ethicalScore")}</p>
              <p className={cn("font-display text-2xl font-bold", scoreTone(card.ethical_score))}>
                {card.ethical_score}
                <span className="text-sm font-medium text-zinc-500">/100</span>
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/30 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-zinc-500">{t("redFlags")}</p>
              <p className="font-display text-2xl font-bold text-red-400">
                {card.red_flags_count ?? 0}
              </p>
            </div>
          </div>

          {card.match && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <Badge
                variant="outline"
                className="border-emerald-500/30 bg-emerald-500/10 text-[10px] text-emerald-300"
              >
                <Sparkles className="mr-1 h-3 w-3" />
                {(card.match.confidence * 100).toFixed(0)}% match
              </Badge>
              {card.match.engine && (
                <Badge variant="outline" className="border-white/15 text-[10px] text-zinc-400">
                  {card.match.engine}
                </Badge>
              )}
            </div>
          )}

          <div className="mt-3 space-y-1.5">
            <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-amber-300/90">
              <AlertTriangle className="h-3 w-3" />
              {t("keyAllegations")}
            </p>
            <ul className="max-h-28 space-y-1 overflow-y-auto text-xs leading-relaxed text-zinc-300">
              {(card.key_allegations?.length ? card.key_allegations : [t("noAllegations")]).map(
                (a) => (
                  <li key={a} className="rounded-lg border border-white/5 bg-white/5 px-2 py-1.5">
                    {a}
                  </li>
                ),
              )}
            </ul>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
