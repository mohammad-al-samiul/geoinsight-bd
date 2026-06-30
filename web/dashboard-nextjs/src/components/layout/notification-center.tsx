"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { AlertDetailModal } from "@/components/alerts/alert-detail-modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAnomalyFeed } from "@/hooks/use-anomaly-feed";
import { useAdminFilter } from "@/hooks/use-admin-filter";
import type { AnomalyAlert } from "@/types/alerts";
import { cn } from "@/lib/utils";
import { AlertTriangle, Bell, ChevronRight, ExternalLink } from "lucide-react";

const READ_KEY = "geoinsight-notifications-read-at";

const SEVERITY_DOT: Record<AnomalyAlert["severity"], string> = {
  LOW: "bg-sky-500",
  MEDIUM: "bg-amber-500",
  HIGH: "bg-orange-500",
  CRITICAL: "bg-destructive",
};

function getLastReadAt(): number {
  if (typeof window === "undefined") return 0;
  const raw = localStorage.getItem(READ_KEY);
  return raw ? Number(raw) : 0;
}

export function NotificationCenter() {
  const { filter } = useAdminFilter();
  const { alerts, loading, refresh } = useAnomalyFeed(filter);
  const t = useTranslations("notifications");
  const tc = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [lastReadAt, setLastReadAt] = useState(0);
  const [selected, setSelected] = useState<AnomalyAlert | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLastReadAt(getLastReadAt());
  }, []);

  const unreadCount = useMemo(() => {
    if (!lastReadAt) return alerts.length;
    return alerts.filter((a) => new Date(a.createdAt).getTime() > lastReadAt).length;
  }, [alerts, lastReadAt]);

  const markAllRead = useCallback(() => {
    const now = Date.now();
    localStorage.setItem(READ_KEY, String(now));
    setLastReadAt(now);
  }, []);

  const toggle = () => {
    setOpen((o) => {
      if (!o) markAllRead();
      return !o;
    });
  };

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!panelRef.current?.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const openAlert = (alert: AnomalyAlert) => {
    setSelected(alert);
    setModalOpen(true);
    setOpen(false);
  };

  const preview = alerts.slice(0, 8);

  return (
    <>
      <div ref={panelRef} className="relative">
        <Button
          variant="ghost"
          size="icon"
          className="relative text-muted-foreground"
          onClick={toggle}
          aria-label={
            unreadCount > 0 ? t("unread", { count: unreadCount }) : t("title")
          }
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
          <div className="absolute right-0 top-full z-[200] mt-2 w-[min(100vw-2rem,380px)] overflow-hidden rounded-xl border border-border bg-popover shadow-xl">
            <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <h3 className="text-sm font-semibold">{t("title")}</h3>
              </div>
              <Badge variant="outline" className="text-[10px]">
                {t("active", { count: alerts.length })}
              </Badge>
            </div>

            <div className="max-h-80 overflow-y-auto">
              {loading ? (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">{tc("loading")}</p>
              ) : preview.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">{t("empty")}</p>
              ) : (
                <ul className="divide-y divide-border/50">
                  {preview.map((alert) => {
                    const isUnread =
                      new Date(alert.createdAt).getTime() > lastReadAt || alert.isNew;
                    return (
                      <li key={alert.id}>
                        <button
                          type="button"
                          onClick={() => openAlert(alert)}
                          className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/50"
                        >
                          <span
                            className={cn(
                              "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                              SEVERITY_DOT[alert.severity],
                            )}
                          />
                          <div className="min-w-0 flex-1">
                            <p
                              className={cn(
                                "text-xs leading-snug",
                                isUnread ? "font-semibold text-foreground" : "text-foreground/90",
                              )}
                            >
                              {alert.headline}
                            </p>
                            <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
                              {alert.unitName} · {new Date(alert.createdAt).toLocaleString()}
                            </p>
                          </div>
                          <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-border/60 px-3 py-2">
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => refresh()}>
                {tc("refresh")}
              </Button>
              <Button variant="ghost" size="sm" className="gap-1 text-xs" asChild>
                <Link href="/alerts" onClick={() => setOpen(false)}>
                  {tc("viewAll")}
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </Button>
            </div>
          </div>
        )}
      </div>

      <AlertDetailModal
        alert={selected}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onResolved={refresh}
      />
    </>
  );
}
