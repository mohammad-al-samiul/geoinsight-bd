"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/use-auth";
import { UserProfile } from "@/components/layout/user-profile";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { isLocalEntityRole } from "@/types";
import { withLocalEntityHref } from "@/hooks/use-local-entity-id";
import { useNavPulse } from "@/hooks/use-nav-pulse";
import {
  AlertTriangle,
  BarChart3,
  BellRing,
  Boxes,
  Building2,
  CalendarDays,
  ChevronLeft,
  CloudRain,
  FileText,
  Flame,
  GraduationCap,
  Gauge,
  Globe2,
  Landmark,
  Link2,
  LineChart,
  MessageSquare,
  Newspaper,
  Package,
  Radio,
  Scale,
  School,
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
  Siren,
  Smartphone,
  Sprout,
  Sun,
  Users,
  Wallet,
  Zap,
  ScanFace,
  HeartPulse,
  Briefcase,
  Layers3,
  Wrench,
} from "lucide-react";

interface NavItem {
  href: string;
  key: string;
  icon: React.ComponentType<{ className?: string }>;
  minTier: number;
  /** If set, only these roles see the item (in addition to PMO). */
  roles?: string[];
}

const NATIONAL_NAV: NavItem[] = [
  { href: "/", key: "nationalOverview", icon: Globe2, minTier: 2 },
  { href: "/briefing", key: "briefing", icon: Sun, minTier: 1 },
  { href: "/narrative-shield", key: "narrativeShield", icon: ShieldOff, minTier: 1 },
  { href: "/outlook", key: "outlook", icon: LineChart, minTier: 1 },
  { href: "/unrest", key: "unrest", icon: Scale, minTier: 1 },
  { href: "/divisional-crisis", key: "divisionalCrisis", icon: Flame, minTier: 2 },
  { href: "/sectors", key: "nationalSectors", icon: GraduationCap, minTier: 1, roles: ["PMO", "MINISTER"] },
  { href: "/anti-phishing", key: "antiPhishing", icon: ShieldAlert, minTier: 1 },
  { href: "/hazards", key: "hazards", icon: CloudRain, minTier: 2 },
  { href: "/agro", key: "agro", icon: Sprout, minTier: 3 },
  { href: "/procurement", key: "procurement", icon: Package, minTier: 1 },
  { href: "/kpis", key: "kpis", icon: BarChart3, minTier: 2 },
  { href: "/projects", key: "projects", icon: Landmark, minTier: 2 },
  { href: "/alerts", key: "alerts", icon: AlertTriangle, minTier: 2 },
  { href: "/documents", key: "documents", icon: FileText, minTier: 2 },
  { href: "/audit-trail", key: "auditTrail", icon: Link2, minTier: 2 },
  { href: "/notifications", key: "notifications", icon: BellRing, minTier: 1 },
  { href: "/security", key: "localSecurity", icon: ShieldCheck, minTier: 1, roles: ["PMO", "MINISTER"] },
  { href: "/representatives", key: "representatives", icon: Users, minTier: 4 },
  { href: "/face-intel", key: "faceIntel", icon: ScanFace, minTier: 4 },
  { href: "/tools", key: "tools", icon: Wrench, minTier: 1, roles: ["PMO", "MINISTER"] },
  // PMO oversight entry into Local DSS (not the full local nav tree)
  { href: "/local", key: "localEntity", icon: Building2, minTier: 1, roles: ["PMO"] },
];

const LOCAL_NAV: NavItem[] = [
  { href: "/local", key: "localEntity", icon: Building2, minTier: 5 },
  { href: "/local/field", key: "localField", icon: Smartphone, minTier: 5 },
  { href: "/local/complaints", key: "localComplaints", icon: Siren, minTier: 5 },
  { href: "/local/heatmap", key: "localHeatmap", icon: Flame, minTier: 5 },
  { href: "/local/visits", key: "localVisits", icon: CalendarDays, minTier: 5 },
  { href: "/local/wpi", key: "localWpi", icon: Gauge, minTier: 5 },
  { href: "/local/scorecard", key: "localScorecard", icon: Scale, minTier: 5 },
  { href: "/local/budget", key: "localBudget", icon: Wallet, minTier: 5 },
  { href: "/local/osint", key: "localOsint", icon: Newspaper, minTier: 5 },
  { href: "/local/pulse", key: "localPulse", icon: Radio, minTier: 5 },
  { href: "/local/evidence", key: "localEvidence", icon: GraduationCap, minTier: 5 },
  { href: "/local/education", key: "localEducation", icon: School, minTier: 5 },
  { href: "/local/health", key: "localHealth", icon: HeartPulse, minTier: 5 },
  { href: "/local/jobs", key: "localJobs", icon: Briefcase, minTier: 5 },
  { href: "/local/crime", key: "localCrime", icon: ShieldAlert, minTier: 5 },
  { href: "/local/corruption", key: "localCorruption", icon: Landmark, minTier: 5 },
  { href: "/local/command", key: "localCommand", icon: Layers3, minTier: 5 },
  { href: "/local/specialty", key: "localSpecialty", icon: Boxes, minTier: 5 },
  { href: "/local/outage", key: "localOutage", icon: Zap, minTier: 5 },
  { href: "/local/alerts", key: "localAlerts", icon: MessageSquare, minTier: 5 },
  { href: "/local/security", key: "localSecurity", icon: ShieldCheck, minTier: 5 },
];

const TIER: Record<string, number> = {
  PMO: 1,
  MINISTER: 2,
  DC: 3,
  UNION_CHAIRMAN: 4,
  MP: 5,
  MAYOR: 5,
};

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useAuth();
  const t = useTranslations("nav");
  const ts = useTranslations("shell");
  const isBn = useLocale().startsWith("bn");
  const { byKey, pulse } = useNavPulse();
  const userTier = TIER[user.role] ?? 4;
  const localRole = isLocalEntityRole(user.role);
  const scopedEntityId =
    (localRole ? user.adminUnitId : null) ?? searchParams.get("entityId");

  useEffect(() => {
    if (!localRole) return;
    if (pathname === "/" || pathname === "/dashboard") {
      router.replace(withLocalEntityHref("/local", scopedEntityId));
    }
  }, [localRole, pathname, router, scopedEntityId]);

  const sourceNav = localRole ? LOCAL_NAV : NATIONAL_NAV;
  const visibleNav = sourceNav.filter((item) => {
    if (localRole) return true;
    if (item.roles) {
      return item.roles.includes(user.role) || user.role === "PMO";
    }
    if (user.role === "PMO") return true;
    return item.minTier >= userTier;
  });

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r border-sidebar-border/80 bg-sidebar/95 backdrop-blur-xl transition-[width] duration-300 ease-in-out",
        collapsed ? "w-[72px]" : "w-[272px]",
      )}
    >
      <div className="flex h-14 items-center justify-between border-b border-sidebar-border/80 px-3">
        {!collapsed && (
          <div className="flex min-w-0 flex-col pl-1">
            <span className="font-display text-gradient-gov text-[15px] font-bold tracking-tight">
              GeoInsight BD
            </span>
            <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              {localRole ? ts("localSubtitle") : ts("brandSubtitle")}
            </span>
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

      <Separator className="bg-sidebar-border/80" />

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-2.5">
        {visibleNav.map((item, index) => {
          const href = withLocalEntityHref(item.href, scopedEntityId);
          const active =
            item.href === "/"
              ? pathname === "/"
              : item.href === "/local"
                ? pathname === "/local"
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const label = t(item.key);
          const Icon = item.icon;
          const pulseItem = byKey[item.key];
          const hot = pulseItem?.status === "ALERT";
          const watch = pulseItem?.status === "WATCH";
          const count = pulseItem?.count ?? 0;
          const hint = pulseItem
            ? isBn
              ? pulseItem.headlineBn
              : pulseItem.headline
            : undefined;
          const link = (
            <Link
              href={href}
              title={collapsed ? (hint ? `${label} — ${hint}` : label) : hint}
              className={cn(
                "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                active
                  ? "bg-primary/12 text-primary"
                  : "text-sidebar-foreground/65 hover:bg-accent/80 hover:text-foreground",
                collapsed && "justify-center px-2",
              )}
            >
              {active && (
                <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-primary" />
              )}
              <span className="relative shrink-0">
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0 transition-colors",
                    active ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
                  )}
                />
                {hot ? (
                  <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-destructive" />
                ) : watch ? (
                  <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-amber-400" />
                ) : pulseItem ? (
                  <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-emerald-400/80" />
                ) : null}
              </span>
              {!collapsed && <span className="min-w-0 flex-1 truncate">{label}</span>}
              {!collapsed && count > 0 && (hot || watch) ? (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
                    hot ? "bg-destructive/15 text-destructive" : "bg-amber-400/15 text-amber-300",
                  )}
                >
                  {count > 99 ? "99+" : count}
                </span>
              ) : null}
            </Link>
          );

          if (!localRole) return <div key={item.href}>{link}</div>;

          return (
            <motion.div
              key={item.href}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.04, duration: 0.35 }}
              whileHover={{ x: 2 }}
            >
              {link}
            </motion.div>
          );
        })}
      </nav>

      {!collapsed && (
        <div className="border-t border-sidebar-border/80 p-3.5 text-[10px] leading-relaxed tracking-wide text-muted-foreground">
          <p className="mb-1 font-semibold uppercase tracking-[0.14em] text-emerald-400/90">
            {ts("liveNav")}
          </p>
          <p>{ts("liveNavHint")}</p>
          {pulse?.pipelineAt ? (
            <p className="mt-1 text-muted-foreground/80">
              {ts("pipelineAt")} {new Date(pulse.pipelineAt).toLocaleTimeString()}
            </p>
          ) : null}
          <p className="mt-2">{localRole ? ts("localFooter") : ts("classifiedFooter")}</p>
        </div>
      )}
    </aside>
  );
}
