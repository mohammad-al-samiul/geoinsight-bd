"use client";

import { usePredictiveScan } from "@/hooks/use-predictive-scan";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Brain, Loader2, ShieldAlert } from "lucide-react";

interface PredictiveAlertsPanelProps {
  lang?: "bn" | "en";
  compact?: boolean;
}

export function PredictiveAlertsPanel({ lang = "bn", compact }: PredictiveAlertsPanelProps) {
  const { result, loading, error, scan } = usePredictiveScan(lang);

  return (
    <div
      className={cn(
        "glass-panel rounded-xl shadow-panel",
        compact ? "p-4" : "p-5",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Brain className="h-4 w-4 text-primary" />
            Predictive Red Flag
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            7–14 day forward risk from budget trend + contractor history
          </p>
        </div>
        <Button size="sm" onClick={() => void scan()} disabled={loading} className="gap-2">
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldAlert className="h-3.5 w-3.5" />}
          Run AI scan
        </Button>
      </div>

      {error && (
        <p className="mt-3 text-xs text-destructive">{error}</p>
      )}

      {result && (
        <div className="mt-4 space-y-3">
          <p className="text-xs text-muted-foreground">
            Scanned {result.scores.length} risks · {result.alerts_created} alert(s) created
          </p>
          {result.scores.length === 0 ? (
            <p className="text-sm text-muted-foreground">No high-confidence risks in current scope.</p>
          ) : (
            <ul className="space-y-2">
              {result.scores.slice(0, compact ? 3 : 8).map((score) => (
                <li
                  key={score.project_id}
                  className="rounded-lg border border-border/60 bg-secondary/20 px-3 py-2.5"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px]",
                        score.confidence >= 80
                          ? "border-red-500/50 text-red-400"
                          : "border-amber-500/50 text-amber-400",
                      )}
                    >
                      AI Confidence {score.confidence}%
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {score.horizon_days}d horizon
                    </span>
                  </div>
                  <p className="mt-1 text-sm font-medium">{score.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {lang === "bn" ? score.explanation_bn : score.explanation_en}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
