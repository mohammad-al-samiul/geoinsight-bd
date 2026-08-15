"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useGlobalSearch, type SearchResult } from "@/hooks/use-search";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  BarChart3,
  FolderKanban,
  LayoutGrid,
  Search,
  UserRound,
} from "lucide-react";

const TYPE_ICONS: Record<SearchResult["type"], typeof Search> = {
  page: LayoutGrid,
  project: FolderKanban,
  representative: UserRound,
  kpi: BarChart3,
  alert: AlertTriangle,
};

const PAGE_HREF_TO_NAV: Record<string, string> = {
  "/": "nationalOverview",
  "/local": "localEntity",
  "/local/complaints": "localComplaints",
  "/local/heatmap": "localHeatmap",
  "/local/visits": "localVisits",
  "/local/wpi": "localWpi",
  "/local/scorecard": "localScorecard",
  "/local/budget": "localBudget",
  "/local/osint": "localOsint",
  "/local/pulse": "localPulse",
  "/local/evidence": "localEvidence",
  "/local/education": "localEducation",
  "/local/health": "localHealth",
  "/local/jobs": "localJobs",
  "/local/crime": "localCrime",
  "/local/corruption": "localCorruption",
  "/local/command": "localCommand",
  "/local/specialty": "localSpecialty",
  "/local/outage": "localOutage",
  "/local/field": "localField",
  "/local/alerts": "localAlerts",
  "/local/security": "localSecurity",
  "/security": "localSecurity",
  "/briefing": "briefing",
  "/divisional-crisis": "divisionalCrisis",
  "/sectors": "nationalSectors",
  "/narrative-shield": "narrativeShield",
  "/sovereign-ai": "sovereignAi",
  "/digital-twin": "digitalTwin",
  "/sentiment": "sentiment",
  "/unrest": "unrest",
  "/anti-phishing": "antiPhishing",
  "/simulator": "simulator",
  "/procurement": "procurement",
  "/kpis": "kpis",
  "/projects": "projects",
  "/alerts": "alerts",
  "/documents": "documents",
  "/audit-trail": "auditTrail",
  "/citizen-chat": "citizenChat",
  "/hazards": "hazards",
  "/proximity": "proximity",
  "/face-intel": "faceIntel",
  "/representatives": "representatives",
  "/tools": "tools",
  "/ops": "ops",
};

export function CommandSearch() {
  const router = useRouter();
  const t = useTranslations("search");
  const tn = useTranslations("nav");
  const tc = useTranslations("common");
  const { query, setQuery, results, loading, failed, clear } = useGlobalSearch();
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const showDropdown = open && query.trim().length >= 2;

  useEffect(() => {
    setActiveIdx(0);
  }, [results]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (e.key === "Escape") {
        setOpen(false);
        inputRef.current?.blur();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const navigate = (href: string) => {
    clear();
    setOpen(false);
    router.push(href);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === "Enter" && results[activeIdx]) {
      e.preventDefault();
      navigate(results[activeIdx].href);
    }
  };

  const typeLabel = (type: SearchResult["type"]) => t(`types.${type}`);

  const displayTitle = (item: SearchResult) => {
    if (item.type === "page") {
      const key = PAGE_HREF_TO_NAV[item.href];
      if (key) return tn(key);
    }
    return item.title;
  };

  return (
    <div ref={rootRef} className="relative w-full">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        ref={inputRef}
        type="search"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={t("placeholder")}
        className="h-9 w-full rounded-lg border border-border/70 bg-secondary/35 pl-9 pr-3 text-sm outline-none transition placeholder:text-muted-foreground focus:border-primary/35 focus:bg-secondary/50 focus:ring-2 focus:ring-primary/15"
        aria-label={t("placeholder")}
        aria-expanded={showDropdown}
        role="combobox"
      />

      {showDropdown && (
        <div className="absolute left-0 right-0 top-full z-[200] mt-1.5 max-h-80 overflow-y-auto rounded-xl border border-border/70 bg-popover/95 shadow-panel backdrop-blur-xl">
          {loading && results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted-foreground">{t("searching")}</p>
          ) : failed ? (
            <p className="px-4 py-3 text-sm text-destructive">{t("failed")}</p>
          ) : results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted-foreground">
              {t("noResults", { query })}
            </p>
          ) : (
            <ul className="py-1.5">
              {results.map((item, idx) => {
                const Icon = TYPE_ICONS[item.type];
                return (
                  <li key={`${item.type}-${item.id}`}>
                    <button
                      type="button"
                      onMouseEnter={() => setActiveIdx(idx)}
                      onClick={() => navigate(item.href)}
                      className={cn(
                        "flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors",
                        idx === activeIdx ? "bg-primary/10 text-foreground" : "hover:bg-accent/60",
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium tracking-tight">{displayTitle(item)}</p>
                        {item.subtitle && (
                          <p className="truncate text-xs text-muted-foreground">{item.subtitle}</p>
                        )}
                      </div>
                      <span className="shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground">
                        {typeLabel(item.type)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
