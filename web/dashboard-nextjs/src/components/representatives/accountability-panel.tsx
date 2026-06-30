"use client";

import { useState } from "react";
import { useAccountabilityScores } from "@/hooks/use-accountability";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { RefreshCw, TrendingDown, TrendingUp, Users } from "lucide-react";

export function AccountabilityPanel() {
  const [lang, setLang] = useState<"bn" | "en">("bn");
  const { scores, loading, error, reload } = useAccountabilityScores(lang);

  if (loading) {
    return (
      <div className="glass-panel rounded-xl p-6 text-sm text-muted-foreground">
        Scoring representative accountability…
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-xl p-5 shadow-panel">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Users className="h-4 w-4 text-primary" />
            Representative Accountability AI
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            KPI trend + peer comparison — grievance resolution vs district average
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant={lang === "bn" ? "default" : "outline"} onClick={() => setLang("bn")}>
            বাংলা
          </Button>
          <Button size="sm" variant="outline" onClick={reload} className="gap-1">
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {error && <p className="mt-3 text-xs text-destructive">{error}</p>}

      <ul className="mt-4 space-y-2">
        {scores.length === 0 ? (
          <li className="text-sm text-muted-foreground">No representatives in scope.</li>
        ) : (
          scores.map((s) => (
            <li
              key={s.representative_id}
              className="rounded-lg border border-border/50 bg-secondary/20 px-3 py-2.5"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-sm">{s.name}</span>
                <Badge variant="outline" className="text-[10px]">
                  Score {s.accountability_score}/100
                </Badge>
                <span
                  className={cn(
                    "flex items-center gap-0.5 text-[10px]",
                    s.peer_delta_pct >= 0 ? "text-emerald-400" : "text-red-400",
                  )}
                >
                  {s.peer_delta_pct >= 0 ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {s.peer_delta_pct > 0 ? "+" : ""}
                  {s.peer_delta_pct}% vs peer
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {lang === "bn" ? s.explanation_bn : s.explanation}
              </p>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
