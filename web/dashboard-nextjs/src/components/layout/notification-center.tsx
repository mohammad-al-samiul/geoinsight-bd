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
import { AlertTriangle, Bell, CheckCheck, ChevronRight, ExternalLink, RefreshCw } from "lucide-react";

const READ_KEY = "geoinsight-notifications-read-at";
const READ_IDS_KEY = "geoinsight-notifications-read-ids";

const SEVERITY_META: Record<AnomalyAlert["severity"], { dot: string; label: string }> = {
  LOW: { dot: "bg-sky-500", label: "Low" },
  MEDIUM: { dot: "bg-amber-500", label: "Medium" },
  HIGH: { dot: "bg-orange-500", label: "High" },
  CRITICAL: { dot: "bg-destructive", label: "Critical" },
};

function getLastReadAt(): number {
  if (typeof window === "undefined") return 0;
  const raw = localStorage.getItem(READ_KEY);
  return raw ? Number(raw) : 0;
}

function getReadIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(READ_IDS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

interface NotificationCenterProps {
  inline?: boolean;
}

export function NotificationCenter({
  inline = false,
}: NotificationCenterProps) {
  const { filter } = useAdminFilter();
  const { alerts, loading, refresh } = useAnomalyFeed(filter);
  const t = useTranslations("notifications");
  const tc = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [lastReadAt, setLastReadAt] = useState(0);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [selected, setSelected] = useState<AnomalyAlert | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLastReadAt(getLastReadAt());
    setReadIds(getReadIds());
  }, []);

  const sortedAlerts = useMemo(() => {
    return [...alerts].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [alerts]);

  const isUnread = useCallback(
    (alert: AnomalyAlert) => {
      if (readIds.includes(alert.id)) return false;
      return new Date(alert.createdAt).getTime() > lastReadAt || alert.isNew;
    },
    [lastReadAt, readIds],
  );

  const unreadCount = useMemo(() => sortedAlerts.filter(isUnread).length, [sortedAlerts, isUnread]);

  const severitySummary = useMemo(() => {
    return sortedAlerts.reduce<Record<AnomalyAlert["severity"], number>>(
      (acc, alert) => {
        acc[alert.severity] += 1;
        return acc;
      },
      { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 },
    );
  }, [sortedAlerts]);

  const markAllRead = useCallback(() => {
    const now = Date.now();
    const allIds = sortedAlerts.map((alert) => alert.id);
    localStorage.setItem(READ_IDS_KEY, JSON.stringify(allIds));
    localStorage.setItem(READ_KEY, String(now));
    setReadIds(allIds);
    setLastReadAt(now);
  }, [sortedAlerts]);

  const markOneRead = useCallback((id: string) => {
    setReadIds((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      localStorage.setItem(READ_IDS_KEY, JSON.stringify(next));
      return next;
    });
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
    markOneRead(alert.id);
    setSelected(alert);
    setModalOpen(true);
    setOpen(false);
  };

  const preview = sortedAlerts.slice(0, inline ? 10 : 8);

  const content = (
    <div className={cn("overflow-hidden rounded-2xl border border-border/80 bg-background/80 shadow-sm", inline ? "" : "") }>
      <div className="border-b border-border/60 bg-gradient-to-r from-primary/10 via-background to-background p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="rounded-xl border border-primary/20 bg-primary/10 p-2 text-primary">
              <Bell className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold">{t("title")}</h3>
                {unreadCount > 0 && (
                  <Badge className="bg-destructive/10 text-destructive">{unreadCount} new</Badge>
                )}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("active", { count: sortedAlerts.length })} · {unreadCount > 0 ? "Needs attention" : "All caught up"}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {(["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const).map((level) => (
              <Badge key={level} variant="outline" className="text-[10px]">
                {level}: {severitySummary[level]}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      <div className={cn("max-h-[26rem] overflow-y-auto", inline ? "max-h-none" : "")}>
        {loading ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">{tc("loading")}</div>
        ) : preview.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-muted/60 text-muted-foreground">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{t("empty")}</p>
          </div>
        ) : (
          <ul className="divide-y divide-border/50">
            {preview.map((alert) => {
              const unread = isUnread(alert);
              return (
                <li key={alert.id}>
                  <button
                    type="button"
                    onClick={() => openAlert(alert)}
                    className={cn(
                      "flex w-full items-start gap-3 px-4 py-3.5 text-left transition-all hover:bg-accent/60",
                      unread && "bg-primary/5",
                    )}
                  >
                    <span className={cn("mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full", SEVERITY_META[alert.severity].dot)} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className={cn("text-sm leading-snug", unread ? "font-semibold text-foreground" : "text-foreground/90")}>{alert.headline}</p>
                        <Badge variant="outline" className="text-[10px]">
                          {SEVERITY_META[alert.severity].label}
                        </Badge>
                      </div>
                      <p className="mt-1 line-clamp-1 text-[11px] text-muted-foreground">
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

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 bg-muted/20 px-3 py-2.5">
        <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => markAllRead()}>
          <CheckCheck className="h-3.5 w-3.5" />
          Mark all read
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => refresh()}>
            <RefreshCw className="h-3.5 w-3.5" />
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
    </div>
  );

  if (inline) {
    return (
      <div className="space-y-3">
        {content}
        <AlertDetailModal
          alert={selected}
          open={modalOpen}
          onOpenChange={setModalOpen}
          onResolved={refresh}
        />
      </div>
    );
  }

  return (
    <>
      <div ref={panelRef} className="relative">
        <Button
          variant="ghost"
          size="icon"
          className="relative rounded-full border border-border/60 bg-background/90 p-2.5 text-muted-foreground shadow-sm transition hover:border-primary/40 hover:bg-primary/5"
          onClick={toggle}
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
            {content}
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
