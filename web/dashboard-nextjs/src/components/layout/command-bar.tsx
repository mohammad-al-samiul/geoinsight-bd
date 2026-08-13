"use client";

import { AdminCascadeFilter } from "@/components/filters/admin-cascade-filter";
import { CommandSearch } from "@/components/layout/command-search";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { NotificationCenter } from "@/components/layout/notification-center";
import { useAuth, useAuthActions, useAuthContext } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { AlertTriangle, LogOut, Menu, Radio } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import { isLocalEntityRole } from "@/types";

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
  const { isLoading: authLoading } = useAuthContext();
  const { logout } = useAuthActions();
  const t = useTranslations("shell");
  const tr = useTranslations("roles");
  const pathname = usePathname();
  const authReady = !authLoading && user.id !== "loading";
  const localRole = authReady && isLocalEntityRole(user.role);
  const showNationalChrome = authReady && !localRole;

  // Production polish:
  // Show "proshashonik elaka" cascade only where it is actually needed (Hazards / risk context).
  // Everywhere else, drill-down can still work via map clicks (filter stays in URL).
  const showAdminCascadeFilter =
    showNationalChrome && (pathname?.startsWith("/hazards") ?? false);

  return (
    <header className="sticky top-0 z-[100] overflow-visible border-b border-command-border/80 bg-command/90 shadow-panel backdrop-blur-xl">
      {/* Live data pulse tracing along the bottom edge of the command bar */}
      <span aria-hidden="true" className="data-pulse-line pointer-events-none absolute inset-x-0 bottom-0 h-px" />
      <div className="flex h-14 items-center gap-3 px-4 lg:px-6">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenuClick}
          aria-label={t("openNav")}
        >
          <Menu className="h-5 w-5" />
        </Button>

        <div className="hidden items-center gap-3 sm:flex">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-primary/25 bg-primary/10">
            <span className="absolute inset-0 rounded-lg bg-primary/10 blur-md" />
            <Radio className="relative h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="font-display text-sm font-semibold leading-none tracking-tight">
              {localRole ? t("localSubtitle") : t("commandCenter")}
            </p>
            <p className="mt-0.5 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              {localRole
                ? user.adminUnitName ?? t("localSubtitle")
                : t("commandSubtitle")}
            </p>
          </div>
        </div>

        <div className="mx-2 min-w-0 flex-1 max-w-md sm:mx-auto">
          <CommandSearch />
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
          <LocaleSwitcher />
          <Badge
            variant="outline"
            className={cn(
              "hidden border-primary/30 bg-primary/10 text-[10px] font-semibold uppercase tracking-wider text-primary lg:inline-flex",
            )}
          >
            {tr(user.role)}
          </Badge>
          {showNationalChrome && onToggleFeed && (
            <Button
              variant={feedOpen ? "secondary" : "ghost"}
              size="icon"
              className="lg:inline-flex"
              onClick={onToggleFeed}
              aria-label={t("toggleFeed")}
              aria-pressed={feedOpen}
            >
              <AlertTriangle className="h-4 w-4" />
            </Button>
          )}
          {showNationalChrome && <NotificationCenter />}
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground"
            onClick={() => logout()}
            aria-label={t("signOut")}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {showAdminCascadeFilter ? (
        <div
          className={cn(
            "border-t border-command-border/40 bg-background/20 px-3 py-2.5 sm:px-4 sm:py-3 lg:px-6",
            sidebarCollapsed && "lg:pl-4",
          )}
        >
          <AdminCascadeFilter variant="solid" />
        </div>
      ) : null}
    </header>
  );
}
