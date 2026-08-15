"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Sidebar } from "@/components/layout/sidebar";
import { CommandBar } from "@/components/layout/command-bar";
import { AnomalyFeedPanel } from "@/components/alerts/anomaly-feed-panel";
import { DataFlowBackground } from "@/components/ui/data-flow-background";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { loadAdminHierarchy } from "@/lib/admin-hierarchy";
import { fetchSocketToken } from "@/lib/socket-token";
import { useAuth, useAuthContext } from "@/hooks/use-auth";
import { isLocalEntityRole } from "@/types";
import { NavPulseProvider } from "@/hooks/use-nav-pulse";

export function DashboardShell({ children }: { children: ReactNode }) {
  const user = useAuth();
  const { isLoading: authLoading } = useAuthContext();
  const tSec = useTranslations("modules.security");
  const authReady = !authLoading && user.id !== "loading";
  const localRole = authReady && isLocalEntityRole(user.role);
  const showMfaBanner = authReady && user.mfaRequired && !user.mfaEnabled;
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [feedOpen, setFeedOpen] = useState(false);

  // Warm shared caches as soon as chrome mounts — before modules ask for them.
  // Wait for real role so MP/Mayor never boot national endpoints as fake-PMO.
  useEffect(() => {
    if (!authReady || localRole) return;
    void loadAdminHierarchy();
    void fetchSocketToken();
  }, [authReady, localRole]);

  // Desktop feed open by default for national roles; local DSS stays focused.
  useEffect(() => {
    if (!authReady || localRole) {
      setFeedOpen(false);
      return;
    }
    const mq = window.matchMedia("(min-width: 1280px)");
    const sync = () => setFeedOpen(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, [authReady, localRole]);

  return (
    <NavPulseProvider>
    <div className="flex h-[100dvh] overflow-hidden bg-background">
      <div className="hidden lg:flex">
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed((c) => !c)}
        />
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full max-w-[min(100%,300px)] animate-slide-in shadow-soft">
            <Sidebar collapsed={false} onToggle={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <CommandBar
          onMenuClick={() => setMobileOpen(true)}
          sidebarCollapsed={sidebarCollapsed}
          onToggleFeed={() => setFeedOpen((o) => !o)}
          feedOpen={feedOpen}
        />
        <div className="app-atmosphere relative flex min-h-0 flex-1 overflow-hidden">
          <DataFlowBackground className="absolute inset-0 z-0" intensity="ambient" />
          <main className="relative z-10 min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4 lg:p-7">
            {showMfaBanner && (
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm">
                <p>{tSec("enrollBanner")}</p>
                <Link
                  href={localRole ? "/local/security" : "/security"}
                  className="font-semibold text-primary underline-offset-2 hover:underline"
                >
                  {tSec("enrollBannerCta")}
                </Link>
              </div>
            )}
            {children}
          </main>

          {/* Desktop persistent feed */}
          {feedOpen && (
            <aside
              className={cn(
                "relative z-10 hidden h-full min-h-0 w-[min(100%,360px)] shrink-0 flex-col border-l border-border/50",
                "bg-sidebar/80 p-3 backdrop-blur-md xl:flex",
              )}
            >
              <AnomalyFeedPanel compact className="h-full min-h-0" />
            </aside>
          )}

          {/* Tablet/mobile feed drawer */}
          {feedOpen && (
            <div className="fixed inset-0 z-[60] xl:hidden">
              <button
                type="button"
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                aria-label="Close alert feed"
                onClick={() => setFeedOpen(false)}
              />
              <aside
                className={cn(
                  "absolute right-0 top-0 flex h-full w-[min(100%,360px)] flex-col",
                  "border-l border-border/50 bg-sidebar/95 p-3 shadow-soft backdrop-blur-md animate-slide-in",
                )}
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">Live alerts</p>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setFeedOpen(false)}
                    aria-label="Close"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="min-h-0 flex-1 overflow-hidden">
                  <AnomalyFeedPanel compact className="h-full" />
                </div>
              </aside>
            </div>
          )}
        </div>
      </div>
    </div>
    </NavPulseProvider>
  );
}
