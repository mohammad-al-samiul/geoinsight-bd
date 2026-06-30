"use client";

import { AdminCascadeFilter } from "@/components/filters/admin-cascade-filter";
import { CommandSearch } from "@/components/layout/command-search";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { NotificationCenter } from "@/components/layout/notification-center";
import { useAuth, useAuthActions } from "@/hooks/use-auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { AlertTriangle, LogOut, Menu, Radio } from "lucide-react";
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
  const t = useTranslations("shell");
  const tr = useTranslations("roles");

  return (
    <header className="sticky top-0 z-[100] overflow-visible border-b border-command-border bg-command shadow-panel">
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

        <div className="hidden items-center gap-2 sm:flex">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/20">
            <Radio className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-none">{t("commandCenter")}</p>
            <p className="text-[10px] text-muted-foreground">{t("commandSubtitle")}</p>
          </div>
        </div>

        <div className="mx-auto hidden max-w-md flex-1 md:flex">
          <CommandSearch />
        </div>

        <div className="ml-auto flex items-center gap-2">
          <LocaleSwitcher />
          <Badge
            variant="outline"
            className={cn("hidden border text-[10px] font-bold uppercase sm:inline-flex")}
          >
            {tr(user.role)}
          </Badge>
          {onToggleFeed && (
            <Button
              variant={feedOpen ? "secondary" : "ghost"}
              size="icon"
              className="hidden xl:inline-flex"
              onClick={onToggleFeed}
              aria-label={t("toggleFeed")}
            >
              <AlertTriangle className="h-4 w-4" />
            </Button>
          )}
          <NotificationCenter />
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

      <div className={cn("border-t border-command-border/50 px-4 py-3 lg:px-6", sidebarCollapsed && "lg:pl-4")}>
        <AdminCascadeFilter variant="solid" />
      </div>
    </header>
  );
}
