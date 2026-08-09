"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { CommandBar } from "@/components/layout/command-bar";
import { AnomalyFeedPanel } from "@/components/alerts/anomaly-feed-panel";
import { DataFlowBackground } from "@/components/ui/data-flow-background";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { loadAdminHierarchy } from "@/lib/admin-hierarchy";
import { fetchSocketToken } from "@/lib/socket-token";

export function DashboardShell({ children }: { children: ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [feedOpen, setFeedOpen] = useState(false);

  // Warm shared caches as soon as chrome mounts — before modules ask for them.
  useEffect(() => {
    void loadAdminHierarchy();
    void fetchSocketToken();
  }, []);

  // Desktop feed open by default; stay closed on smaller screens until toggled.
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1280px)");
    const sync = () => setFeedOpen(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return (
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
  );
}
