"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useDeskAlerts, type DeskAlertItem } from "@/hooks/use-desk-alerts";
import { useLocalEntityId, withLocalEntityHref } from "@/hooks/use-local-entity-id";
import { cn } from "@/lib/utils";
import { Bell, CheckCheck, ChevronRight, ExternalLink, RefreshCw, Siren } from "lucide-react";

const READ_KEY = "geoinsight-local-desk-read-ids";

const SEVERITY_DOT: Record<DeskAlertItem["severity"], string> = {
  LOW: "bg-sky-500",
  MEDIUM: "bg-amber-500",
  HIGH: "bg-orange-500",
  CRITICAL: "bg-destructive",
};

function getReadIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(READ_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function LocalNotificationCenter() {
  const { items, loading, refresh } = useDeskAlerts();
  const entityId = useLocalEntityId();
  const t = useTranslations("notifications");
  const tc = useTranslations("common");
  const locale = useLocale();
  const isBn = locale.startsWith("bn");
  const [open, setOpen] = useState(false);
  const [readIds, setReadIds] = useState<string[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setReadIds(getReadIds());
  }, []);

  const unreadCount = useMemo(
    () => items.filter((item) => !readIds.includes(item.id)).length,
    [items, readIds],
  );

  const markAllRead = useCallback(() => {
    const allIds = items.map((item) => item.id);
    localStorage.setItem(READ_KEY, JSON.stringify(allIds));
    setReadIds(allIds);
  }, [items]);

  const markOneRead = useCallback((id: string) => {
    setReadIds((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      localStorage.setItem(READ_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!panelRef.current?.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const kindLabel = (kind: DeskAlertItem["kind"]) => {
    if (kind === "RED_ALERT") return t("kindRed");
    if (kind === "SLA_OVERDUE") return t("kindSla");
    if (kind === "OUTAGE_OVERDUE") return t("kindOutage");
    return t("kindDelivery");
  };

  const preview = items.slice(0, 8);

  return (
    <div ref={panelRef} className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="relative rounded-full border border-border/60 bg-background/90 p-2.5 text-muted-foreground shadow-sm transition hover:border-primary/40 hover:bg-primary/5"
        onClick={() => {
          setOpen((o) => {
            if (!o) markAllRead();
            return !o;
          });
        }}
        aria-label={unreadCount > 0 ? t("unread", { count: unreadCount }) : t("title")}
        aria-expanded={open}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-0.5 text-[9px] font-bold text-destructive-foreground">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 top-full z-[200] mt-2 w-[min(100vw-2rem,420px)] overflow-hidden rounded-2xl border border-border bg-popover shadow-xl">
          <div className="border-b border-border/60 bg-gradient-to-r from-primary/10 via-background to-background p-4">
            <div className="flex items-start gap-3">
              <div className="rounded-xl border border-primary/20 bg-primary/10 p-2 text-primary">
                <Bell className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">{t("localTitle")}</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("active", { count: items.length })}
                </p>
              </div>
            </div>
          </div>

          <div className="max-h-[26rem] overflow-y-auto">
            {loading ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                {tc("loading")}
              </div>
            ) : preview.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-muted/60 text-muted-foreground">
                  <Siren className="h-5 w-5" />
                </div>
                <p className="mt-3 text-sm text-muted-foreground">{t("localEmpty")}</p>
              </div>
            ) : (
              <ul className="divide-y divide-border/50">
                {preview.map((item) => {
                  const unread = !readIds.includes(item.id);
                  const href = withLocalEntityHref(item.href, entityId);
                  return (
                    <li key={item.id}>
                      <Link
                        href={href}
                        onClick={() => {
                          markOneRead(item.id);
                          setOpen(false);
                        }}
                        className={cn(
                          "flex w-full items-start gap-3 px-4 py-3.5 text-left transition-all hover:bg-accent/60",
                          unread && "bg-primary/5",
                        )}
                      >
                        <span
                          className={cn(
                            "mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full",
                            SEVERITY_DOT[item.severity],
                          )}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p
                              className={cn(
                                "text-sm leading-snug",
                                unread ? "font-semibold text-foreground" : "text-foreground/90",
                              )}
                            >
                              {isBn ? item.headlineBn : item.headline}
                            </p>
                            <Badge variant="outline" className="text-[10px]">
                              {kindLabel(item.kind)}
                            </Badge>
                          </div>
                          <p className="mt-1 line-clamp-1 text-[11px] text-muted-foreground">
                            {isBn ? item.detailBn : item.detail} ·{" "}
                            {new Date(item.createdAt).toLocaleString(locale)}
                          </p>
                        </div>
                        <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 bg-muted/20 px-3 py-2.5">
            <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => markAllRead()}>
              <CheckCheck className="h-3.5 w-3.5" />
              {t("markRead")}
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => void refresh()}>
                <RefreshCw className="h-3.5 w-3.5" />
                {tc("refresh")}
              </Button>
              <Button variant="ghost" size="sm" className="gap-1 text-xs" asChild>
                <Link
                  href={withLocalEntityHref("/local/complaints", entityId)}
                  onClick={() => setOpen(false)}
                >
                  {t("localViewAll")}
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
