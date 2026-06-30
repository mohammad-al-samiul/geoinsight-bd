"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "@/hooks/use-auth";
import { UserProfile } from "@/components/layout/user-profile";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  BarChart3,
  ChevronLeft,
  CloudRain,
  Cpu,
  FileText,
  Globe2,
  Landmark,
  LayoutDashboard,
  Link2,
  Map,
  MessageCircle,
  MessageSquareWarning,
  Package,
  Shield,
  SlidersHorizontal,
  Sprout,
  Sun,
  Users,
} from "lucide-react";

interface NavItem {
  href: string;
  key: string;
  icon: React.ComponentType<{ className?: string }>;
  minTier: number;
}

const NAV: NavItem[] = [
  { href: "/", key: "nationalOverview", icon: Globe2, minTier: 1 },
  { href: "/dashboard", key: "commandDashboard", icon: LayoutDashboard, minTier: 1 },
  { href: "/briefing", key: "briefing", icon: Sun, minTier: 1 },
  { href: "/sovereign-ai", key: "sovereignAi", icon: Shield, minTier: 1 },
  { href: "/digital-twin", key: "digitalTwin", icon: Cpu, minTier: 1 },
  { href: "/sentiment", key: "sentiment", icon: MessageSquareWarning, minTier: 1 },
  { href: "/simulator", key: "simulator", icon: SlidersHorizontal, minTier: 1 },
  { href: "/procurement", key: "procurement", icon: Package, minTier: 1 },
  { href: "/kpis", key: "kpis", icon: BarChart3, minTier: 2 },
  { href: "/projects", key: "projects", icon: Landmark, minTier: 2 },
  { href: "/alerts", key: "alerts", icon: AlertTriangle, minTier: 2 },
  { href: "/documents", key: "documents", icon: FileText, minTier: 2 },
  { href: "/audit-trail", key: "auditTrail", icon: Link2, minTier: 2 },
  { href: "/citizen-chat", key: "citizenChat", icon: MessageCircle, minTier: 2 },
  { href: "/hazards", key: "hazards", icon: CloudRain, minTier: 2 },
  { href: "/agro", key: "agro", icon: Sprout, minTier: 3 },
  { href: "/map", key: "map", icon: Map, minTier: 3 },
  { href: "/representatives", key: "representatives", icon: Users, minTier: 4 },
];

const TIER: Record<string, number> = {
  PMO: 1,
  MINISTER: 2,
  DC: 3,
  UNION_CHAIRMAN: 4,
};

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const user = useAuth();
  const t = useTranslations("nav");
  const ts = useTranslations("shell");
  const userTier = TIER[user.role] ?? 4;

  const visibleNav = NAV.filter((item) => item.minTier >= userTier || user.role === "PMO");

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-300 ease-in-out",
        collapsed ? "w-[68px]" : "w-64",
      )}
    >
      <div className="flex h-14 items-center justify-between border-b border-sidebar-border px-3">
        {!collapsed && (
          <div className="flex flex-col">
            <span className="text-gradient-gov text-sm font-bold tracking-tight">GeoInsight BD</span>
            <span className="text-[10px] text-muted-foreground">{ts("brandSubtitle")}</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="shrink-0 text-muted-foreground hover:text-foreground"
          aria-label={collapsed ? ts("expandSidebar") : ts("collapseSidebar")}
        >
          <ChevronLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
        </Button>
      </div>

      <UserProfile collapsed={collapsed} />

      <Separator className="bg-sidebar-border" />

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
        {visibleNav.map((item) => {
          const active = pathname === item.href;
          const label = t(item.key);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? label : undefined}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent/30 text-primary shadow-glow"
                  : "text-sidebar-foreground/70 hover:bg-accent hover:text-foreground",
                collapsed && "justify-center px-2",
              )}
            >
              <Icon className={cn("h-4 w-4 shrink-0", active && "text-primary")} />
              {!collapsed && <span className="truncate">{label}</span>}
            </Link>
          );
        })}
      </nav>

      {!collapsed && (
        <div className="border-t border-sidebar-border p-3 text-[10px] text-muted-foreground">
          {ts("classifiedFooter")}
        </div>
      )}
    </aside>
  );
}
