"use client";

import { AdminCascadeFilter } from "@/components/filters/admin-cascade-filter";
import { useAuth, useAuthActions } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ROLE_META } from "@/types";
import { AlertTriangle, Bell, LogOut, Menu, Radio, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface CommandBarProps {
  onMenuClick: () => void;
  sidebarCollapsed: boolean;
  onToggleFeed?: () => void;
  feedOpen?: boolean;
}

export function CommandBar({
  onMenuClick,
  sidebarCollapsed,
  onToggleFeed,
  feedOpen,
}: CommandBarProps) {
  const user = useAuth();
  const { logout } = useAuthActions();
  const meta = ROLE_META[user.role];

  return (
    <header className="sticky top-0 z-40 border-b border-command-border bg-command/95 backdrop-blur-md">
      <div className="flex h-14 items-center gap-3 px-4 lg:px-6">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenuClick}
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </Button>

        <div className="hidden items-center gap-2 sm:flex">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/20">
            <Radio className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-none">National Command Center</p>
            <p className="text-[10px] text-muted-foreground">Real-time governance intelligence</p>
          </div>
        </div>

        <div className="mx-auto hidden max-w-md flex-1 lg:flex">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              placeholder="Search KPIs, projects, representatives…"
              className="h-9 w-full rounded-md border border-input bg-secondary/40 pl-9 pr-3 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Badge
            variant="outline"
            className={cn("hidden border text-[10px] font-bold uppercase sm:inline-flex", meta.badgeClass)}
          >
            {user.role.replace("_", " ")}
          </Badge>
          {onToggleFeed && (
            <Button
              variant={feedOpen ? "secondary" : "ghost"}
              size="icon"
              className="hidden xl:inline-flex"
              onClick={onToggleFeed}
              aria-label="Toggle anomaly feed"
            >
              <AlertTriangle className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="relative text-muted-foreground">
            <Bell className="h-4 w-4" />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground"
            onClick={() => logout()}
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className={cn("border-t border-command-border/50 px-4 py-3 lg:px-6", sidebarCollapsed && "lg:pl-4")}>
        <AdminCascadeFilter />
      </div>
    </header>
  );
}
