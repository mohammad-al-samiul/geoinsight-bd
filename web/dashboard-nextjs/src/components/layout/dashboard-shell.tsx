"use client";

import { useState, type ReactNode } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { CommandBar } from "@/components/layout/command-bar";
import { AnomalyFeedPanel } from "@/components/alerts/anomaly-feed-panel";
import { cn } from "@/lib/utils";

export function DashboardShell({ children }: { children: ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [feedOpen, setFeedOpen] = useState(true);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex">
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed((c) => !c)}
        />
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full animate-slide-in">
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
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <main
            className={cn(
              "flex-1 overflow-y-auto bg-gradient-to-b from-background to-secondary/20 p-4 lg:p-6",
            )}
          >
            {children}
          </main>
          {feedOpen && (
            <aside className="hidden w-[min(100%,340px)] shrink-0 border-l border-border/60 bg-background/50 p-3 xl:block">
              <AnomalyFeedPanel compact className="h-full" />
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}
